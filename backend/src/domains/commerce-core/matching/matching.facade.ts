export type MatchableEntityType = 'COMMERCE' | 'PROFESSIONAL';

export interface MatchCandidateInput {
  entityType: MatchableEntityType;
  entityId: string;
  /** userId del dueño — para resolver reputación (PROFESSIONAL) y ubicación */
  userId: string;
  /** Precio de referencia del producto/servicio ofrecido, si aplica */
  price?: number | null;
  /** Si el candidato está operando activamente ahora mismo (producto en stock, servicio ACTIVE) */
  isAvailable: boolean;
}

export interface MatchScoreBreakdown {
  priceScore: number | null;
  distanceScore: number | null;
  reputationScore: number | null;
  availabilityScore: number;
  /** Fracción [0,1] de señales realmente disponibles — igual criterio que BusinessHealthService.confidence */
  confidence: number;
}

export interface MatchResult {
  entityType: MatchableEntityType;
  entityId: string;
  /** 0-100, combinación ponderada de las señales disponibles */
  score: number;
  distanceMeters: number | null;
  breakdown: MatchScoreBreakdown;
}

export interface RankCandidatesOptions {
  /** Ubicación del usuario que busca — sin esto, distanceScore siempre es null */
  origin?: { lat: number; lng: number } | null;
}

/**
 * Contrato público de MatchingService para consumidores de otros dominios
 * (SearchService hoy; AI Orchestrator a futuro) — mismo patrón que
 * ReputationFacade/PlatformFeesFacade (Symbol token de DI).
 */
export interface MatchingFacade {
  rankCandidates(
    candidates: MatchCandidateInput[],
    options?: RankCandidatesOptions
  ): Promise<MatchResult[]>;
}

export const MATCHING_FACADE = Symbol('MATCHING_FACADE');
