import { Injectable } from '@nestjs/common';
import { CatalogService } from '../catalog/catalog.service';
import { ServicesService } from '../services/services.service';
import { JobsService } from '../jobs/jobs.service';

export interface SearchSuggestion {
  id: string;
  tab: 'productos' | 'servicios' | 'empleos';
  title: string;
  subtitle?: string;
  image?: string | null;
  price?: number | null;
  priceUnit?: string | null;
  category?: { name: string; color: string | null } | null;
  rating?: number | null;
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

const SUGGESTIONS_PER_TAB = 5;

@Injectable()
export class SearchService {
  constructor(
    private readonly catalogService: CatalogService,
    private readonly servicesService: ServicesService,
    private readonly jobsService: JobsService,
  ) {}

  async suggest(
    q?: string,
    location?: SearchLocationHint,
  ): Promise<{ query: string; suggestions: SearchSuggestion[]; counts: SearchTabCount[] }> {
    const query = (q ?? '').trim();
    if (query.length < 2) {
      return { query, suggestions: [], counts: [] };
    }

    const [products, services, jobs] = await Promise.allSettled([
      this.catalogService.getProducts({ search: query, page: 1, limit: SUGGESTIONS_PER_TAB }),
      this.servicesService.getCatalogServices({ search: query, page: '1', limit: String(SUGGESTIONS_PER_TAB) }),
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
            image: p.image,
            price: p.price,
            category: p.category ? { name: p.category.name, color: p.category.color } : null,
            lowStock: p.status === 'BAJO_STOCK',
            nearYou: isNear(p.commerce),
          }))
        : []),
      ...(services.status === 'fulfilled'
        ? services.value.data.map((s: any): SearchSuggestion => ({
            id: s.id,
            tab: 'servicios',
            title: s.name,
            subtitle: s.category?.name,
            image: s.image,
            price: s.price,
            priceUnit: s.priceUnit,
            rating: s.user?.rating ?? null,
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

    return { query, suggestions, counts };
  }
}
