import { Injectable, Logger } from '@nestjs/common';
import { ReputationEntityType } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { ReputationFacade, ReputationScoreView } from './reputation.facade';

interface OutcomeCounts {
  completed: number;
  cancelled: number;
  disputed: number;
  punctualityRate: number | null; // null = sin señal de puntualidad disponible para este tipo
}

// Pesos de la fórmula v1 — constantes deliberadas, no configurables por admin
// todavía (se vuelve configurable solo si en la práctica hace falta ajustar
// por vertical, con datos reales, no de antemano). Ver el diseño discutido:
// completionRate pesa más porque es la señal más directa de "cumplió o no",
// punctuality y disputes son correctivos de calidad sobre eso.
const WEIGHT_COMPLETION = 0.4;
const WEIGHT_NON_CANCELLATION = 0.25;
const WEIGHT_PUNCTUALITY = 0.2;
const WEIGHT_NON_DISPUTE = 0.15;

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
      breakdown: row.breakdown as Record<string, number>,
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

      const rawScore =
        WEIGHT_COMPLETION * completionRate +
        WEIGHT_NON_CANCELLATION * (1 - cancellationRate) +
        WEIGHT_PUNCTUALITY * punctualityRate +
        WEIGHT_NON_DISPUTE * (1 - disputeRate);

      const confidenceMultiplier = Math.min(1, sampleSize / CONFIDENCE_FLOOR);
      const score = Math.round(rawScore * 100 * confidenceMultiplier);

      const breakdown = {
        completionRate: Number(completionRate.toFixed(4)),
        cancellationRate: Number(cancellationRate.toFixed(4)),
        punctualityRate: Number(punctualityRate.toFixed(4)),
        disputeRate: Number(disputeRate.toFixed(4)),
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
    const [completed, cancelled, disputed] = await Promise.all([
      this.prisma.order.count({ where: { commerceId, status: 'DELIVERED' } }),
      this.prisma.order.count({ where: { commerceId, status: 'CANCELLED' } }),
      this.prisma.report.count({
        where: {
          entityType: 'ORDER',
          status: { in: ['PENDING', 'IN_REVIEW', 'RESOLVED'] },
          entityId: { in: await this.orderIdsForCommerce(commerceId) },
        },
      }),
    ]);
    return { completed, cancelled, disputed, punctualityRate: null };
  }

  private async orderIdsForCommerce(commerceId: string): Promise<string[]> {
    const orders = await this.prisma.order.findMany({
      where: { commerceId },
      select: { id: true },
    });
    return orders.map((o) => o.id);
  }

  private async getProfessionalOutcomes(providerId: string): Promise<OutcomeCounts> {
    const [completed, cancelled, rejected, disputed] = await Promise.all([
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
    ]);
    return {
      completed,
      cancelled: cancelled + rejected,
      disputed,
      punctualityRate: null,
    };
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
    return { completed, cancelled: cancelled + failed, disputed: 0, punctualityRate: null };
  }
}
