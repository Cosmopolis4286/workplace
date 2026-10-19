import { Inject, Injectable, Logger } from '@nestjs/common';
import { CatalogService } from '../catalog/catalog.service';
import { ServicesService } from '../services/services.service';
import { JobsService } from '../../platform/jobs/jobs.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { MATCHING_FACADE, MatchingFacade } from '../matching/matching.facade';
import { toNumber } from '../../../common/money/money';

export interface SearchSuggestion {
  id: string;
  tab: 'productos' | 'servicios' | 'empleos';
  title: string;
  subtitle?: string;
  providerName?: string | null;
  image?: string | null;
  price?: number | null;
  priceUnit?: string | null;
  category?: { name: string; color: string | null } | null;
  rating?: number | null;
  reviewsCount?: number | null;
  salaryMin?: number | null;
  salaryMax?: number | null;
  salaryCurrency?: string | null;
  lowStock?: boolean;
  nearYou?: boolean;
  /** Distancia real en metros al comprador — solo si ambos tienen ubicación fijada. Interno, no confundir con nearYou (proxy de texto ciudad/estado) */
  distanceMeters?: number | null;
  /** Score combinado de MatchingService (precio+distancia+reputación+disponibilidad) — usado para reordenar, no se expone si no hubo origin */
  matchScore?: number | null;
}

export interface SearchTabCount {
  tab: 'productos' | 'servicios' | 'empleos';
  total: number;
}

export interface SearchLocationHint {
  city?: string | null;
  state?: string | null;
  /** Coordenadas del comprador (User.latitude/longitude) — sin esto, el reordenamiento por distancia no se aplica */
  origin?: { lat: number; lng: number } | null;
}

export type NeedCategory = 'comida' | 'hogar' | 'ocio';

const SUGGESTIONS_PER_TAB = 5;

// Extrae un presupuesto en texto libre: "$50", "50 dolares", "tengo 50",
// "con 50", "hasta 50 bs". No pretende ser NLP — cubre las formas más
// comunes en las que alguien escribe cuánto tiene para gastar.
const BUDGET_PATTERN =
  /(?:\$\s*(\d+(?:[.,]\d+)?))|(?:(?:tengo|con|hasta)\s+(\d+(?:[.,]\d+)?))|(?:(\d+(?:[.,]\d+)?)\s*(?:usd|dolares|dólares|bs|bolivares|bolívares))/i;

export function detectBudget(query: string): number | null {
  const match = query.match(BUDGET_PATTERN);
  if (!match) return null;
  const raw = match[1] ?? match[2] ?? match[3];
  const value = parseFloat(raw.replace(',', '.'));
  return Number.isFinite(value) && value > 0 ? value : null;
}

// Mapeo simple keyword→categoría de necesidad. Basta con una coincidencia
// para clasificar la query — no es exhaustivo, es una primera capa sobre el
// agregador de búsqueda existente, sin IA.
const NEED_KEYWORDS: Record<NeedCategory, string[]> = {
  comida: [
    'comida',
    'comer',
    'hambre',
    'almuerzo',
    'cena',
    'desayuno',
    'restaurante',
  ],
  hogar: [
    'casa',
    'hogar',
    'limpieza',
    'limpiar',
    'reparar',
    'reparación',
    'plomero',
    'electricista',
  ],
  ocio: [
    'fiesta',
    'cumpleaños',
    'entretenimiento',
    'diversión',
    'salida',
    'cine',
  ],
};

export function detectNeedCategory(query: string): NeedCategory | null {
  const lower = query.toLowerCase();
  for (const [category, keywords] of Object.entries(NEED_KEYWORDS) as [
    NeedCategory,
    string[],
  ][]) {
    if (keywords.some((kw) => lower.includes(kw))) return category;
  }
  return null;
}

@Injectable()
export class SearchService {
  private readonly logger = new Logger(SearchService.name);

  constructor(
    private readonly catalogService: CatalogService,
    private readonly servicesService: ServicesService,
    private readonly jobsService: JobsService,
    private readonly prisma: PrismaService,
    @Inject(MATCHING_FACADE) private readonly matching: MatchingFacade
  ) {}

  async suggest(
    q?: string,
    location?: SearchLocationHint
  ): Promise<{
    query: string;
    suggestions: SearchSuggestion[];
    counts: SearchTabCount[];
    detectedBudget: number | null;
    needCategory: NeedCategory | null;
  }> {
    const query = (q ?? '').trim();
    if (query.length < 2) {
      return {
        query,
        suggestions: [],
        counts: [],
        detectedBudget: null,
        needCategory: null,
      };
    }

    const detectedBudget = detectBudget(query);
    const needCategory = detectNeedCategory(query);

    const [products, services, jobs] = await Promise.allSettled([
      this.catalogService.getProducts({
        search: query,
        page: 1,
        limit: SUGGESTIONS_PER_TAB,
        ...(detectedBudget ? { priceMax: detectedBudget } : {}),
      }),
      this.servicesService.getCatalogServices({
        search: query,
        page: '1',
        limit: String(SUGGESTIONS_PER_TAB),
        ...(detectedBudget ? { priceMax: String(detectedBudget) } : {}),
      }),
      this.jobsService.getCatalogJobs({
        search: query,
        page: 1,
        limit: SUGGESTIONS_PER_TAB,
      }),
    ]);

    const isNear = (entityLocation?: {
      city?: string | null;
      state?: string | null;
    }) => {
      if (!location?.city && !location?.state) return false;
      if (!entityLocation) return false;
      if (location.city && entityLocation.city) {
        return (
          entityLocation.city.toLowerCase() === location.city.toLowerCase()
        );
      }
      if (location.state && entityLocation.state) {
        return (
          entityLocation.state.toLowerCase() === location.state.toLowerCase()
        );
      }
      return false;
    };

    const suggestions: SearchSuggestion[] = [
      ...(products.status === 'fulfilled'
        ? products.value.data.map((p: any): SearchSuggestion => ({
            id: p.id,
            tab: 'productos',
            title: p.name,
            subtitle: p.commerce?.name,
            providerName: p.commerce?.name ?? null,
            image: p.image,
            price: p.price,
            category: p.category
              ? { name: p.category.name, color: p.category.color }
              : null,
            rating: p.commerce?.user?.rating ?? null,
            reviewsCount: p.commerce?.user?.reviewsCount ?? null,
            lowStock: p.status === 'LOW_STOCK',
            nearYou: isNear(p.commerce),
          }))
        : []),
      ...(services.status === 'fulfilled'
        ? services.value.data.map((s: any): SearchSuggestion => ({
            id: s.id,
            tab: 'servicios',
            title: s.name,
            subtitle: s.category?.name,
            providerName: s.user
              ? `${s.user.firstName} ${s.user.lastName}`.trim()
              : null,
            image: s.images?.[0] ?? null,
            price: s.price,
            priceUnit: s.priceUnit,
            rating: s.user?.rating ?? null,
            reviewsCount: s.user?.reviewsCount ?? null,
            nearYou: isNear(s.user),
          }))
        : []),
      ...(jobs.status === 'fulfilled'
        ? jobs.value.data.map((j: any): SearchSuggestion => ({
            id: j.id,
            tab: 'empleos',
            title: j.title,
            subtitle: j.location ?? j.employer?.firstName,
            image: null,
            salaryMin: j.salaryMin == null ? null : toNumber(j.salaryMin),
            salaryMax: j.salaryMax == null ? null : toNumber(j.salaryMax),
            salaryCurrency: j.salaryCurrency,
            nearYou: isNear(j.employer),
          }))
        : []),
    ];

    const counts: SearchTabCount[] = [
      {
        tab: 'productos',
        total: products.status === 'fulfilled' ? products.value.total : 0,
      },
      {
        tab: 'servicios',
        total: services.status === 'fulfilled' ? services.value.total : 0,
      },
      {
        tab: 'empleos',
        total: jobs.status === 'fulfilled' ? jobs.value.total : 0,
      },
    ];

    if (counts.every((c) => c.total === 0)) {
      this.recordUnmetSearch(query, location?.city ?? null);
    }

    const ranked = location?.origin
      ? await this.rankByMatching(
          suggestions,
          products,
          services,
          location.origin
        )
      : suggestions;

    return { query, suggestions: ranked, counts, detectedBudget, needCategory };
  }

  // Reordena productos/servicios (no empleos: MatchingService solo conoce
  // COMMERCE/PROFESSIONAL) combinando precio+distancia+reputación+
  // disponibilidad. Best-effort: si algo falla, devuelve el orden original
  // sin romper la búsqueda — el ranking es una mejora, no un requisito.
  private async rankByMatching(
    suggestions: SearchSuggestion[],
    products: PromiseSettledResult<{ data: any[] }>,
    services: PromiseSettledResult<{ data: any[] }>,
    origin: { lat: number; lng: number }
  ): Promise<SearchSuggestion[]> {
    try {
      const productList =
        products.status === 'fulfilled' ? products.value.data : [];
      const serviceList =
        services.status === 'fulfilled' ? services.value.data : [];

      const commerceIds = [
        ...new Set(productList.map((p: any) => p.commerce?.id).filter(Boolean)),
      ];
      const commerces = commerceIds.length
        ? await this.prisma.commerce.findMany({
            where: { id: { in: commerceIds } },
            select: { id: true, userId: true },
          })
        : [];
      const commerceUserIdById = new Map(
        commerces.map((c) => [c.id, c.userId])
      );

      const candidates: import('../matching/matching.facade').MatchCandidateInput[] =
        [];
      const candidateKeyByIndex = new Map<number, string>(); // 'productos:<id>' | 'servicios:<id>'

      productList.forEach((p: any) => {
        const userId = commerceUserIdById.get(p.commerce?.id);
        if (!userId) return;
        candidates.push({
          entityType: 'COMMERCE',
          entityId: p.commerce.id,
          userId,
          price: p.price ?? null,
          isAvailable:
            p.status !== 'OUT_OF_STOCK' && p.status !== 'UNAVAILABLE',
        });
        candidateKeyByIndex.set(candidates.length - 1, `productos:${p.id}`);
      });

      serviceList.forEach((s: any) => {
        if (!s.user?.id) return;
        candidates.push({
          entityType: 'PROFESSIONAL',
          entityId: s.userId ?? s.user.id,
          userId: s.user.id,
          price: s.price ?? null,
          isAvailable: s.status === 'ACTIVE',
        });
        candidateKeyByIndex.set(candidates.length - 1, `servicios:${s.id}`);
      });

      if (candidates.length === 0) return suggestions;

      const results = await this.matching.rankCandidates(candidates, {
        origin,
      });

      // rankCandidates devuelve ordenado pero sin el índice original — se
      // reconstruye el mapeo por (entityType, entityId) ya que puede repetirse
      // un mismo comercio/profesional en varios productos/servicios.
      const scoreByCandidateKey = new Map<
        string,
        { score: number; distanceMeters: number | null }
      >();
      candidates.forEach((c, idx) => {
        const suggestionKey = candidateKeyByIndex.get(idx);
        if (!suggestionKey) return;
        const result = results.find(
          (r) => r.entityType === c.entityType && r.entityId === c.entityId
        );
        if (result)
          scoreByCandidateKey.set(suggestionKey, {
            score: result.score,
            distanceMeters: result.distanceMeters,
          });
      });

      const annotated = suggestions.map((s) => {
        const key = `${s.tab}:${s.id}`;
        const match = scoreByCandidateKey.get(key);
        return match
          ? {
              ...s,
              matchScore: match.score,
              distanceMeters: match.distanceMeters,
            }
          : s;
      });

      // Solo reordena productos/servicios entre sí (mismo tab) — empleos
      // mantienen su orden original al no tener matchScore.
      return annotated.sort((a, b) => {
        if (a.tab !== b.tab) return 0;
        return (b.matchScore ?? -1) - (a.matchScore ?? -1);
      });
    } catch (err: any) {
      this.logger.warn(
        `Matching ranking failed, falling back to default order: ${err.message}`
      );
      return suggestions;
    }
  }

  // Fire-and-forget: una búsqueda sin resultado es señal de demanda para el
  // Opportunity Engine (ver ServicesService.getOpportunities), pero nunca
  // debe bloquear ni romper la respuesta de /search/suggest.
  private recordUnmetSearch(query: string, city: string | null) {
    this.prisma.unmetSearch
      .create({ data: { query, city } })
      .catch((err) =>
        this.logger.warn(`Failed to record unmet search: ${err.message}`)
      );
  }
}
