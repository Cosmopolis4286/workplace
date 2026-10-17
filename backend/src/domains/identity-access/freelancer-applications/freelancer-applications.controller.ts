import {
  Body,
  Controller,
  Get,
  GoneException,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import {
  RateLimitGuard,
  RateLimit,
} from '../../../common/guards/rate-limit.guard';
import { FreelancerApplicationsService } from './freelancer-applications.service';
import { CreateFreelancerApplicationDto } from './dto/create-freelancer-application.dto';
import { ReviewFreelancerApplicationDto } from './dto/review-freelancer-application.dto';

/**
 * @deprecated (2026-10-03) — FreelancerApplication es el camino legacy de
 * "quiero ser freelancer". El único camino de alta es ahora
 * POST /api/profile-activations (type=PROFESSIONAL), que ya usa todo el
 * frontend (onboarding, pricing, /profile). Se conservan la lectura y la
 * revisión admin para poder procesar solicitudes PENDING que existan en
 * producción (review() ya escribe UserProfile y provisiona el Commerce).
 * Antes de eliminar el módulo: verificar en prod
 *   SELECT count(*) FROM freelancer_applications WHERE status = 'PENDING';
 */
@UseGuards(JwtAuthGuard, RolesGuard, RateLimitGuard)
@Controller('freelancer-applications')
export class FreelancerApplicationsController {
  constructor(private readonly service: FreelancerApplicationsService) {}

  @Get('mine')
  getMine(@CurrentUser() user: any) {
    return this.service.getMine(user.id);
  }

  // 410 en vez de 404: un cliente viejo recibe un mensaje claro de a dónde ir.
  @Post()
  create(
    @CurrentUser() _user: any,
    @Body() _dto: CreateFreelancerApplicationDto
  ) {
    throw new GoneException(
      'Las solicitudes de freelancer se reemplazaron por la activación de perfiles: usa POST /api/profile-activations con type=PROFESSIONAL.'
    );
  }

  // ─── Admin ────────────────────────────────────────────────────────────────────

  @Get('admin/pending')
  @Roles(Role.SUPERADMIN, Role.ADMIN)
  findAllPending(@Query('page') page = '1', @Query('limit') limit = '20') {
    return this.service.findAllPending(parseInt(page, 10), parseInt(limit, 10));
  }

  @Patch('admin/:id/review')
  @Roles(Role.SUPERADMIN, Role.ADMIN)
  @RateLimit({
    windowMs: 60_000,
    maxRequests: 30,
    keyGenerator: (req) => `freelancer-app:review:${(req as any).user?.id}`,
  })
  review(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Body() dto: ReviewFreelancerApplicationDto
  ) {
    return this.service.review(id, user.id, dto);
  }
}
