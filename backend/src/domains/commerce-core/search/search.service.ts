import { Injectable, Logger } from '@nestjs/common';
import { CatalogService } from '../catalog/catalog.service';
import { ServicesService } from '../services/services.service';
import { JobsService } from '../../platform/jobs/jobs.service';
import { PrismaService } from '../../../prisma/prisma.service';

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
}

export interface SearchTabCount {
  tab: 'productos' | 'servicios' | 'empleos';
  total: number;
}

export interface SearchLocationHint {
  city?: string | null;
  state?: string | null;
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
  comida: ['comida', 'comer', 'hambre', 'almuerzo', 'cena', 'desayuno', 'restaurante'],
  hogar: ['casa', 'hogar', 'limpieza', 'limpiar', 'reparar', 'reparación', 'plomero', 'electricista'],
  ocio: ['fiesta', 'cumpleaños', 'entretenimiento', 'diversión', 'salida', 'cine'],
};

export function detectNeedCategory(query: string): NeedCategory | null {
  const lower = query.toLowerCase();
  for (const [category, keywords] of Object.entries(NEED_KEYWORDS) as [NeedCategory, string[]][]) {
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
  ) {}

  async suggest(
    q?: string,
    location?: SearchLocationHint,
  ): Promise<{
    query: string;
    suggestions: SearchSuggestion[];
    counts: SearchTabCount[];
    detectedBudget: number | null;
    needCategory: NeedCategory | null;
  }> {
    const query = (q ?? '').trim();
    if (query.length < 2) {
      return { query, suggestions: [], counts: [], detectedBudget: null, needCategory: null };
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
      this.jobsService.getCatalogJobs({ search: query, page: 1, limit: SUGGESTIONS_PER_TAB }),
    ]);

    const isNear = (entityLocation?: { city?: string | null; state?: string | null }) => {
      if (!location?.city && !location?.state) return false;
      if (!entityLocation) return false;
      if (location.city && entityLocation.city) {
        return entityLocation.city.toLowerCase() === location.city.toLowerCase();
      }
      if (location.state && entityLocation.state) {
        return entityLocation.state.toLowerCase() === location.state.toLowerCase();
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
            category: p.category ? { name: p.category.name, color: p.category.color } : null,
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
            providerName: s.user ? `${s.user.firstName} ${s.user.lastName}`.trim() : null,
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
            salaryMin: j.salaryMin,
            salaryMax: j.salaryMax,
            salaryCurrency: j.salaryCurrency,
            nearYou: isNear(j.employer),
          }))
        : []),
    ];

    const counts: SearchTabCount[] = [
      { tab: 'productos', total: products.status === 'fulfilled' ? products.value.total : 0 },
      { tab: 'servicios', total: services.status === 'fulfilled' ? services.value.total : 0 },
      { tab: 'empleos', total: jobs.status === 'fulfilled' ? jobs.value.total : 0 },
    ];

    if (counts.every((c) => c.total === 0)) {
      this.recordUnmetSearch(query, location?.city ?? null);
    }

    return { query, suggestions, counts, detectedBudget, needCategory };
  }

  // Fire-and-forget: una búsqueda sin resultado es señal de demanda para el
  // Opportunity Engine (ver ServicesService.getOpportunities), pero nunca
  // debe bloquear ni romper la respuesta de /search/suggest.
  private recordUnmetSearch(query: string, city: string | null) {
    this.prisma.unmetSearch
      .create({ data: { query, city } })
      .catch((err) => this.logger.warn(`Failed to record unmet search: ${err.message}`));
  }
}
