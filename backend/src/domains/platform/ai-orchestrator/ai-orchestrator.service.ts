import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { PrismaService } from '../../../prisma/prisma.service';
import { RedisService } from '../../../redis/redis.service';
import {
  SERVICES_FACADE,
  ServicesFacade,
} from '../../commerce-core/services/services.facade';
import {
  QueryServicesDto,
  ServiceSortBy,
} from '../../commerce-core/services/dto/query-services.dto';
import { SearchNeedDto } from './dto/search-need.dto';
import { ConfirmNeedDto } from './dto/confirm-need.dto';
import { toNumber } from '../../../common/money/money';

const SEARCH_TTL_SECONDS = 15 * 60; // suficiente para elegir sin apurarse, corto porque es intención efímera
const searchCacheKey = (searchId: string) => `ai-need-search:${searchId}`;

interface CachedSearch {
  userId: string;
  categoryId: string;
  serviceIds: string[];
}

/**
 * Base sin LLM para el futuro "AI Agent orquestador" (WORKPLACE_VISION.md
 * §4/§16). Estos dos métodos son exactamente las "tools" que un LLM
 * necesitaría (searchServices/createServiceRequest) — hoy se llaman con
 * parámetros estructurados (categoryId, budgetMax) en vez de texto libre.
 * El día que se conecte un LLM real, el LLM solo tiene que resolver
 * "necesito un plomero, no más de $50" → { categoryId, budgetMax } y llamar
 * searchNeed(); esta capa no cambia.
 *
 * Nunca escribe directo a la DB fuera de ServicesService — reusa las mismas
 * validaciones (KYC, límites de plan, rate limit, escrow) que ya corren para
 * una solicitud creada a mano desde /my-services.
 */
@Injectable()
export class AiOrchestratorService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    @Inject(SERVICES_FACADE) private readonly servicesService: ServicesFacade
  ) {}

  async searchNeed(userId: string, dto: SearchNeedDto) {
    const category = await this.prisma.serviceCategory.findUnique({
      where: { id: dto.categoryId },
      select: { id: true, name: true },
    });
    if (!category)
      throw new NotFoundException('Categoría de servicio no encontrada');

    const query: QueryServicesDto = {
      categoryId: dto.categoryId,
      priceMax: dto.budgetMax !== undefined ? String(dto.budgetMax) : undefined,
      city: dto.city,
      sort: ServiceSortBy.RELEVANCE,
      limit: '5',
    };
    const results = await this.servicesService.getCatalogServices(query);

    const searchId = randomUUID();
    const cached: CachedSearch = {
      userId,
      categoryId: dto.categoryId,
      serviceIds: results.data.map((s: any) => s.id),
    };
    await this.redis.setex(
      searchCacheKey(searchId),
      SEARCH_TTL_SECONDS,
      JSON.stringify(cached)
    );

    return {
      searchId,
      category: category.name,
      budgetMax: dto.budgetMax ?? null,
      results: results.data,
      total: results.total,
    };
  }

  async confirmNeed(userId: string, dto: ConfirmNeedDto) {
    const raw = await this.redis.get(searchCacheKey(dto.searchId));
    if (!raw) {
      throw new BadRequestException(
        'Esta búsqueda expiró o no existe. Vuelve a buscar antes de confirmar.'
      );
    }
    const cached = JSON.parse(raw) as CachedSearch;
    if (cached.userId !== userId) {
      throw new NotFoundException('Búsqueda no encontrada');
    }
    if (!cached.serviceIds.includes(dto.serviceId)) {
      throw new BadRequestException(
        'Ese servicio no formaba parte de los resultados de esta búsqueda.'
      );
    }

    const service = await this.prisma.service.findUnique({
      where: { id: dto.serviceId },
      select: {
        id: true,
        name: true,
        price: true,
        priceUnit: true,
        userId: true,
        user: { select: { firstName: true, lastName: true } },
      },
    });
    if (!service)
      throw new NotFoundException('El servicio ya no está disponible');

    const requester = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { firstName: true, lastName: true, phone: true, email: true },
    });
    if (!requester) throw new NotFoundException('Usuario no encontrado');

    const phone = requester.phone ?? dto.phone;
    if (!phone) {
      throw new BadRequestException(
        'No tienes un teléfono cargado en tu perfil — indica uno para que el proveedor pueda contactarte.'
      );
    }

    const request = await this.servicesService.createServiceRequest(
      {
        serviceId: service.id,
        serviceName: service.name,
        providerId: service.userId,
        providerName:
          `${service.user.firstName} ${service.user.lastName}`.trim(),
        preferredDate: dto.preferredDate,
        preferredTime: dto.preferredTime,
        address: dto.address,
        clientName: `${requester.firstName} ${requester.lastName}`.trim(),
        clientPhone: phone,
        clientEmail: requester.email,
        description: dto.description,
        price: toNumber(service.price),
        priceUnit: service.priceUnit ?? undefined,
      },
      userId
    );

    await this.redis.del(searchCacheKey(dto.searchId));
    return request;
  }
}
