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
}

const SUGGESTIONS_PER_TAB = 5;

@Injectable()
export class SearchService {
  constructor(
    private readonly catalogService: CatalogService,
    private readonly servicesService: ServicesService,
    private readonly jobsService: JobsService,
  ) {}

  async suggest(q?: string): Promise<{ query: string; suggestions: SearchSuggestion[] }> {
    const query = (q ?? '').trim();
    if (query.length < 2) {
      return { query, suggestions: [] };
    }

    const [products, services, jobs] = await Promise.allSettled([
      this.catalogService.getProducts({ search: query, page: 1, limit: SUGGESTIONS_PER_TAB }),
      this.servicesService.getCatalogServices({ search: query, page: '1', limit: String(SUGGESTIONS_PER_TAB) }),
      this.jobsService.getCatalogJobs({ search: query, page: 1, limit: SUGGESTIONS_PER_TAB }),
    ]);

    const suggestions: SearchSuggestion[] = [
      ...(products.status === 'fulfilled'
        ? products.value.data.map((p: any): SearchSuggestion => ({
            id: p.id,
            tab: 'productos',
            title: p.name,
            subtitle: p.commerce?.name,
            image: p.image,
          }))
        : []),
      ...(services.status === 'fulfilled'
        ? services.value.data.map((s: any): SearchSuggestion => ({
            id: s.id,
            tab: 'servicios',
            title: s.name,
            subtitle: s.category?.name,
            image: s.image,
          }))
        : []),
      ...(jobs.status === 'fulfilled'
        ? jobs.value.data.map((j: any): SearchSuggestion => ({
            id: j.id,
            tab: 'empleos',
            title: j.title,
            subtitle: j.location ?? j.employer?.firstName,
            image: null,
          }))
        : []),
    ];

    return { query, suggestions };
  }
}
