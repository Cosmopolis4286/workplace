import { Injectable, Logger } from '@nestjs/common';
import { ReputationEntityType } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { ReputationFacade, ReputationScoreView } from './reputation.facade';

interface OutcomeCounts {
  completed: number;
  cancelled: number;
  disputed: number;
  punctualityRate: number | null; // null = sin señal de puntualidad disponible para este tipo
  satisfactionRate: number | null; // avgRating de Review normalizado a 0-1; null = sin reviews todavía
  repeatCustomerRate: number | null; // % de clientes con ≥2 transacciones; null = no aplica a este entityType (DRIVER)
}

// Pesos de la fórmula v2 — constantes deliberadas, no configurables por admin
// todavía (se vuelve configurable solo si en la práctica hace falta ajustar
// por vertical, con datos reales, no de antemano). completionRate sigue
// pesando más porque es la señal más directa de "cumplió o no"; satisfaction
// y repeatCustomer se agregaron para acercarse al "WorkPlace Score" de
// WORKPLACE_VISION.md §10 (antes el score solo medía cumplimiento
// operacional, nunca si al cliente le gustó ni si vuelve).
const WEIGHT_COMPLETION = 0.3;
const WEIGHT_NON_CANCELLATION = 0.2;
const WEIGHT_PUNCTUALITY = 0.15;
const WEIGHT_NON_DISPUTE = 0.15;
const WEIGHT_SATISFACTION = 0.15;
const WEIGHT_REPEAT_CUSTOMER = 0.05;

// Umbral de transacciones con un mismo cliente/solicitante para contarlo
// como "recurrente" — 2 es el mínimo que distingue "volvió" de "fue la
// única vez". No configurable todavía, mismo criterio que CONFIDENCE_FLOOR.
const REPEAT_CUSTOMER_THRESHOLD = 2;

// Bajo este número de operaciones, el score se amortigua hacia el centro en
// vez de poder tocar 0 o 100 con una sola transacción — evita que 2-3
// operaciones controladas muevan el score a un extremo (anti-gaming).
const CONFIDENCE_FLOOR = 10;

@Injectable()
export class ReputationService implements ReputationFacade {
  private readonly logger = new Logger(ReputationService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getScore(
    entityType: ReputationEntityType,
    entityId: string,
  ): Promise<ReputationScoreView | null> {
    const row = await this.prisma.reputationScore.findUnique({
      where: { entityType_entityId: { entityType, entityId } },
    });
    if (!row) return null;
    return {
      score: row.score,
      sampleSize: row.sampleSize,
      breakdown: row.breakdown as Record<string, number | null>,
      calculatedAt: row.calculatedAt,
    };
  }

  // Recalcula y persiste el score de una entidad. Se llama de forma síncrona
  // desde el punto donde cada dominio ya muta una transacción a un estado
  // terminal (ServicesService.updateServiceRequest, OrdersService.update,
  // DeliveryService.updateDeliveryStatus, ReportsService.moderate) — mismo
  // patrón que ProfilesService.recalculateCommerceRating. No falla la
  // operación que lo dispara si el recálculo falla: el score es una
  // proyección derivada, nunca debe poder bloquear una venta o un cierre de
  // solicitud real.
  async recalculate(entityType: ReputationEntityType, entityId: string): Promise<void> {
    try {
      const counts = await this.getOutcomeCounts(entityType, entityId);
      const total = counts.completed + counts.cancelled;
      const sampleSize = total;

      if (total === 0) {
        // Sin transacciones terminales todavía — no hay nada que puntuar.
        return;
      }

      const completionRate = counts.completed / total;
      const cancellationRate = counts.cancelled / total;
      const disputeRate = total > 0 ? Math.min(1, counts.disputed / total) : 0;
      const punctualityRate = counts.punctualityRate ?? completionRate; // sin señal propia: usa completion como proxy

      // satisfactionRate y repeatCustomerRate SÍ se excluyen de verdad cuando
      // faltan (a diferencia de punctuality, no tiene sentido aproximar
      // "¿le gustó?" o "¿volvió?" con otra señal) — mismo criterio de
      // confidence que MatchingService/BusinessHealthService: el promedio
      // ponderado normaliza solo sobre las señales realmente disponibles.
      const signals: Array<{ weight: number; value: number | null }> = [
        { weight: WEIGHT_COMPLETION, value: completionRate },
        { weight: WEIGHT_NON_CANCELLATION, value: 1 - cancellationRate },
        { weight: WEIGHT_PUNCTUALITY, value: punctualityRate },
        { weight: WEIGHT_NON_DISPUTE, value: 1 - disputeRate },
        { weight: WEIGHT_SATISFACTION, value: counts.satisfactionRate },
        { weight: WEIGHT_REPEAT_CUSTOMER, value: counts.repeatCustomerRate },
      ];
      const available = signals.filter((s) => s.value != null);
      const totalWeight = available.reduce((sum, s) => sum + s.weight, 0);
      const dataConfidence = available.length / signals.length;
      const rawScore =
        totalWeight > 0
          ? available.reduce((sum, s) => sum + s.weight * (s.value as number), 0) / totalWeight
          : 0;

      const confidenceMultiplier = Math.min(1, sampleSize / CONFIDENCE_FLOOR) * dataConfidence;
      const score = Math.round(rawScore * 100 * confidenceMultiplier);

      const breakdown = {
        completionRate: Number(completionRate.toFixed(4)),
        cancellationRate: Number(cancellationRate.toFixed(4)),
        punctualityRate: Number(punctualityRate.toFixed(4)),
        disputeRate: Number(disputeRate.toFixed(4)),
        satisfactionRate: counts.satisfactionRate != null ? Number(counts.satisfactionRate.toFixed(4)) : null,
        repeatCustomerRate: counts.repeatCustomerRate != null ? Number(counts.repeatCustomerRate.toFixed(4)) : null,
        confidenceMultiplier: Number(confidenceMultiplier.toFixed(4)),
      };

      await this.prisma.reputationScore.upsert({
        where: { entityType_entityId: { entityType, entityId } },
        create: { entityType, entityId, score, breakdown, sampleSize },
        update: { score, breakdown, sampleSize },
      });
    } catch (err) {
      // Best-effort a propósito: un fallo acá no debe revertir ni bloquear
      // la transacción real que disparó el recálculo.
      this.logger.error(
        `No se pudo recalcular ReputationScore de ${entityType}:${entityId}`,
        err instanceof Error ? err.stack : String(err),
      );
    }
  }

  private async getOutcomeCounts(
    entityType: ReputationEntityType,
    entityId: string,
  ): Promise<OutcomeCounts> {
    switch (entityType) {
      case 'COMMERCE':
        return this.getCommerceOutcomes(entityId);
      case 'PROFESSIONAL':
        return this.getProfessionalOutcomes(entityId);
      case 'DRIVER':
        return this.getDriverOutcomes(entityId);
    }
  }

  private async getCommerceOutcomes(commerceId: string): Promise<OutcomeCounts> {
    const commerce = await this.prisma.commerce.findUnique({
      where: { id: commerceId },
      select: { userId: true },
    });

    const [completed, cancelled, disputed, satisfactionRate, repeatCustomerRate] = await Promise.all([
      this.prisma.order.count({ where: { commerceId, status: 'DELIVERED' } }),
      this.prisma.order.count({ where: { commerceId, status: 'CANCELLED' } }),
      this.prisma.report.count({
        where: {
          entityType: 'ORDER',
          status: { in: ['PENDING', 'IN_REVIEW', 'RESOLVED'] },
          entityId: { in: await this.orderIdsForCommerce(commerceId) },
        },
      }),
      commerce ? this.getSatisfactionRate(commerce.userId) : Promise.resolve(null),
      this.getRepeatCustomerRateForCommerce(commerceId),
    ]);
    return { completed, cancelled, disputed, punctualityRate: null, satisfactionRate, repeatCustomerRate };
  }

  // % de reviews (Review.rating, 1-5) del dueño de la entidad con isHidden:
  // false, normalizado a 0-1 — mismo dato que Commerce.avgRating, pero
  // calculado directo desde Review para que también aplique a PROFESSIONAL
  // (que no tiene avgRating cacheado, ver ProfilesService.recalculateCommerceRating).
  private async getSatisfactionRate(userId: string): Promise<number | null> {
    const agg = await this.prisma.review.aggregate({
      where: { targetId: userId, isHidden: false },
      _avg: { rating: true },
    });
    return agg._avg.rating != null ? (agg._avg.rating - 1) / 4 : null;
  }

  // % de Customer con ≥ REPEAT_CUSTOMER_THRESHOLD órdenes en este comercio —
  // "clientes recurrentes" real (WORKPLACE_VISION.md §10), no el
  // CustomerSegment manual (VIP/PREMIUM/REGULAR/NEW) que hoy no se deriva de
  // ningún dato. null si el comercio todavía no tiene ningún Customer con
  // órdenes (no hay base sobre la que calcular un %).
  private async getRepeatCustomerRateForCommerce(commerceId: string): Promise<number | null> {
    const customers = await this.prisma.order.groupBy({
      by: ['customerId'],
      where: { commerceId, customerId: { not: null } },
      _count: { _all: true },
    });
    if (customers.length === 0) return null;
    const repeat = customers.filter((c) => c._count._all >= REPEAT_CUSTOMER_THRESHOLD).length;
    return repeat / customers.length;
  }

  private async orderIdsForCommerce(commerceId: string): Promise<string[]> {
    const orders = await this.prisma.order.findMany({
      where: { commerceId },
      select: { id: true },
    });
    return orders.map((o) => o.id);
  }

  private async getProfessionalOutcomes(providerId: string): Promise<OutcomeCounts> {
    const [completed, cancelled, rejected, disputed, satisfactionRate, repeatCustomerRate] = await Promise.all([
      this.prisma.serviceRequest.count({ where: { providerId, status: 'CLOSED' } }),
      this.prisma.serviceRequest.count({ where: { providerId, status: 'CANCELLED' } }),
      this.prisma.serviceRequest.count({ where: { providerId, status: 'REJECTED' } }),
      this.prisma.report.count({
        where: {
          entityType: 'SERVICE_REQUEST',
          status: { in: ['PENDING', 'IN_REVIEW', 'RESOLVED'] },
          entityId: { in: await this.serviceRequestIdsForProvider(providerId) },
        },
      }),
      this.getSatisfactionRate(providerId), // providerId ya es User.id acá
      this.getRepeatCustomerRateForProfessional(providerId),
    ]);
    return {
      completed,
      cancelled: cancelled + rejected,
      disputed,
      punctualityRate: null,
      satisfactionRate,
      repeatCustomerRate,
    };
  }

  // % de solicitantes (User.id vía ServiceRequest.requesterId) con
  // ≥ REPEAT_CUSTOMER_THRESHOLD solicitudes a este profesional. Solicitudes
  // sin requesterId (cliente no registrado) se excluyen del conteo — no se
  // puede saber si son la misma persona repitiendo.
  private async getRepeatCustomerRateForProfessional(providerId: string): Promise<number | null> {
    const requesters = await this.prisma.serviceRequest.groupBy({
      by: ['requesterId'],
      where: { providerId, requesterId: { not: null } },
      _count: { _all: true },
    });
    if (requesters.length === 0) return null;
    const repeat = requesters.filter((r) => r._count._all >= REPEAT_CUSTOMER_THRESHOLD).length;
    return repeat / requesters.length;
  }

  private async serviceRequestIdsForProvider(providerId: string): Promise<string[]> {
    const requests = await this.prisma.serviceRequest.findMany({
      where: { providerId },
      select: { id: true },
    });
    return requests.map((r) => r.id);
  }

  private async getDriverOutcomes(driverId: string): Promise<OutcomeCounts> {
    const [completed, cancelled, failed] = await Promise.all([
      this.prisma.delivery.count({ where: { driverId, status: 'DELIVERED' } }),
      this.prisma.delivery.count({ where: { driverId, status: 'CANCELLED' } }),
      this.prisma.delivery.count({ where: { driverId, status: 'FAILED' } }),
    ]);
    // Deliveries no tienen Report vinculado hoy (ReportEntityType no incluye
    // DELIVERY) — sin señal de disputa propia todavía, solo completitud.
    // satisfactionRate: Driver no es User.id necesariamente (cuenta propia
    // opcional, ver Driver.userId) y Review no lo referencia — sin fuente real.
    // repeatCustomerRate: las asignaciones son del comercio, no "clientes
    // propios" del driver — no aplica el concepto.
    return {
      completed,
      cancelled: cancelled + failed,
      disputed: 0,
      punctualityRate: null,
      satisfactionRate: null,
      repeatCustomerRate: null,
    };
  }
}
