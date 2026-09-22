import { Inject, Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { REPUTATION_FACADE, ReputationFacade } from '../../reputation/reputation.facade';
import { haversineDistanceMeters } from '../../../common/utils/geo.util';
import {
  MatchCandidateInput,
  MatchingFacade,
  MatchResult,
  MatchScoreBreakdown,
  RankCandidatesOptions,
} from './matching.facade';

// Pesos de la fórmula v1 — mismo criterio que ReputationService (constantes
// deliberadas, no configurables todavía): reputación pesa más porque es la
// señal más directa de "cumple lo que promete"; disponibilidad nunca se
// excluye del promedio (a diferencia de las otras 3) porque siempre se puede
// determinar sin datos externos — no tiene sentido tratarla como "dato
// faltante".
const WEIGHT_REPUTATION = 0.35;
const WEIGHT_PRICE = 0.3;
const WEIGHT_DISTANCE = 0.25;
const WEIGHT_AVAILABILITY = 0.1;

// Más allá de esta distancia, distanceScore satura en 0 en vez de seguir
// cayendo — evita que dos candidatos igual de lejanos (50km vs 500km) se
// diferencien de forma que no le importa a nadie que busca "algo cerca".
const MAX_RELEVANT_DISTANCE_METERS = 30_000;

@Injectable()
export class MatchingService implements MatchingFacade {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(REPUTATION_FACADE) private readonly reputation: ReputationFacade,
  ) {}

  async rankCandidates(
    candidates: MatchCandidateInput[],
    options?: RankCandidatesOptions,
  ): Promise<MatchResult[]> {
    if (candidates.length === 0) return [];

    const origin = options?.origin ?? null;
    const locations = await this.resolveLocations(candidates);
    const reputations = await this.resolveReputations(candidates);

    const prices = candidates.map((c) => c.price).filter((p): p is number => p != null && p > 0);
    const minPrice = prices.length ? Math.min(...prices) : null;

    const results = candidates.map((candidate) => {
      const location = locations.get(candidate.userId) ?? null;
      const distanceMeters =
        origin && location ? haversineDistanceMeters(origin, location) : null;

      const priceScore = this.computePriceScore(candidate.price, minPrice);
      const distanceScore = this.computeDistanceScore(distanceMeters);
      const reputationScore = reputations.get(candidate.entityId) ?? null;
      const availabilityScore = candidate.isAvailable ? 100 : 0;

      const signals: Array<{ weight: number; value: number | null }> = [
        { weight: WEIGHT_REPUTATION, value: reputationScore },
        { weight: WEIGHT_PRICE, value: priceScore },
        { weight: WEIGHT_DISTANCE, value: distanceScore },
        { weight: WEIGHT_AVAILABILITY, value: availabilityScore },
      ];
      const available = signals.filter((s) => s.value != null);
      const totalWeight = available.reduce((sum, s) => sum + s.weight, 0);
      const confidence = available.length / signals.length;
      // Promedio ponderado de las señales disponibles, PENALIZADO por
      // confidence: sin este factor, un candidato con una sola señal
      // perfecta (ej. solo "disponible") podría superar a otro con más
      // señales pero ninguna perfecta, porque el promedio normaliza por peso
      // disponible sin penalizar cuántas faltan. Multiplicar por confidence
      // asegura que menos datos nunca puede ganarle a más datos con score
      // comparable — la falta de información pesa en el ranking, no solo se
      // reporta aparte (a diferencia de BusinessHealthService, donde el
      // score es informativo y no compite contra otros).
      const score =
        totalWeight > 0
          ? Math.round(
              (available.reduce((sum, s) => sum + s.weight * (s.value as number), 0) / totalWeight) *
                confidence,
            )
          : 0;

      const breakdown: MatchScoreBreakdown = {
        priceScore,
        distanceScore,
        reputationScore,
        availabilityScore,
        confidence,
      };

      const result: MatchResult = {
        entityType: candidate.entityType,
        entityId: candidate.entityId,
        score,
        distanceMeters,
        breakdown,
      };
      return result;
    });

    return results.sort((a, b) => b.score - a.score);
  }

  // Precio más barato entre los candidatos = 100; sube proporcionalmente más
  // caro = baja. Un candidato al doble del precio mínimo puntúa 0 (satura,
  // nunca negativo) — evita que un outlier carísimo distorsione la escala
  // para el resto.
  private computePriceScore(price: number | null | undefined, minPrice: number | null): number | null {
    if (price == null || price <= 0 || minPrice == null) return null;
    const ratio = minPrice / price; // 1 = es el más barato, <1 = más caro
    return Math.round(Math.max(0, Math.min(1, ratio * 2 - 1)) * 100);
  }

  private computeDistanceScore(distanceMeters: number | null): number | null {
    if (distanceMeters == null) return null;
    const clamped = Math.min(distanceMeters, MAX_RELEVANT_DISTANCE_METERS);
    return Math.round((1 - clamped / MAX_RELEVANT_DISTANCE_METERS) * 100);
  }

  private async resolveLocations(
    candidates: MatchCandidateInput[],
  ): Promise<Map<string, { lat: number; lng: number }>> {
    const commerceUserIds = candidates.filter((c) => c.entityType === 'COMMERCE').map((c) => c.userId);
    const professionalUserIds = candidates
      .filter((c) => c.entityType === 'PROFESSIONAL')
      .map((c) => c.userId);

    const [commerces, freelancerSettings] = await Promise.all([
      commerceUserIds.length
        ? this.prisma.commerce.findMany({
            where: { userId: { in: commerceUserIds }, latitude: { not: null }, longitude: { not: null } },
            select: { userId: true, latitude: true, longitude: true },
          })
        : Promise.resolve([]),
      professionalUserIds.length
        ? this.prisma.freelancerSettings.findMany({
            where: { userId: { in: professionalUserIds }, latitude: { not: null }, longitude: { not: null } },
            select: { userId: true, latitude: true, longitude: true },
          })
        : Promise.resolve([]),
    ]);

    const map = new Map<string, { lat: number; lng: number }>();
    for (const c of commerces) {
      if (c.latitude != null && c.longitude != null) map.set(c.userId, { lat: c.latitude, lng: c.longitude });
    }
    for (const f of freelancerSettings) {
      if (f.latitude != null && f.longitude != null) map.set(f.userId, { lat: f.latitude, lng: f.longitude });
    }
    return map;
  }

  private async resolveReputations(candidates: MatchCandidateInput[]): Promise<Map<string, number>> {
    const map = new Map<string, number>();
    await Promise.all(
      candidates.map(async (c) => {
        const view = await this.reputation.getScore(c.entityType, c.entityId);
        if (view) map.set(c.entityId, view.score);
      }),
    );
    return map;
  }
}
