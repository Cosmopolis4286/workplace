import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  ParseBoolPipe,
} from '@nestjs/common';
import { PlansService } from './plans.service';
import { PlanLimitsService } from './plan-limits.service';
import { MODULE_CATALOG } from '../../../common/data/module-catalog.data';
import { CreatePlanDto } from './dto/create-plan.dto';
import { UpdatePlanDto } from './dto/update-plan.dto';
import { AssignSubscriptionDto } from './dto/assign-subscription.dto';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../../../common/guards/optional-jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { Role, SubscriptionStatus, BillingInterval } from '@prisma/client';

@Controller('plans')
export class PlansController {
  constructor(
    private readonly plansService: PlansService,
    private readonly planLimitsService: PlanLimitsService
  ) {}

  // ─── Public — no auth required ────────────────────────────────────────────

  /** Catálogo unificado de módulos (key + label), fuente única para frontend */
  @Get('modules/catalog')
  @UseGuards(JwtAuthGuard)
  getModuleCatalog() {
    return MODULE_CATALOG;
  }

  @Get('public')
  @UseGuards(OptionalJwtAuthGuard)
  getPublicPlans(@CurrentUser() user: any, @Query('categoryId') categoryId?: string) {
    return this.plansService.getPublicPlans(user?.role, categoryId ?? user?.categoryId);
  }

  // ─── Authenticated user endpoints ────────────────────────────────────────

  @Get('my-subscription')
  @UseGuards(JwtAuthGuard)
  getMySubscription(@CurrentUser() user: any) {
    return this.plansService.getMySubscription(user.id);
  }

  @Get('usage')
  @UseGuards(JwtAuthGuard)
  async getUsage(@CurrentUser() user: any) {
    const commerce = await this.planLimitsService[
      'prisma'
    ].restaurant.findUnique({
      where: { userId: user.id },
      select: { id: true },
    });
    // Sin Restaurant (p.ej. FREELANCER): igual calculamos `limits` —
    // effectiveModules no depende de tener un comercio — solo se omiten
    // los contadores de uso (products/employees/branches/orders).
    if (!commerce) {
      const limits = await this.planLimitsService.getPlanLimits(user.id);
      return { limits, usage: null };
    }
    return this.planLimitsService.getUsage(user.id, commerce.id);
  }

  @Post('self-subscribe')
  @UseGuards(JwtAuthGuard)
  selfSubscribe(
    @Body() dto: { planId: string; interval?: string },
    @CurrentUser() user: { id: string; role: string }
  ) {
    if (dto.planId && user.id) {
      const subscriptionDto = {
        userId: user.id,
        planId: dto.planId,
        interval: (dto.interval || 'MONTHLY') as BillingInterval,
        status: 'ACTIVE' as SubscriptionStatus
      };
      return this.plansService.assignSubscription(subscriptionDto, user.id);
    }
    throw new Error('Datos inválidos para suscripción');
  }

  @Post('upgrade')
  @UseGuards(JwtAuthGuard)
  upgradePlan(
    @Body() dto: { planId: string; categoryId: string; interval?: string },
    @CurrentUser() user: { id: string; role: string }
  ) {
    return this.plansService.upgradePlan(user.id, dto);
  }

  // ─── Admin endpoints ──────────────────────────────────────────────────────

  @Get('stats')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPERADMIN, Role.ADMIN)
  getStats() {
    return this.plansService.getStats();
  }

  @Get('subscriptions')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPERADMIN, Role.ADMIN)
  findAllSubscriptions(
    @Query('status') status?: SubscriptionStatus,
    @Query('planId') planId?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string
  ) {
    return this.plansService.findAllSubscriptions({
      status,
      planId,
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 20,
    });
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPERADMIN, Role.ADMIN)
  findAll(@Query('includeInactive') includeInactive?: string) {
    return this.plansService.findAllPlans(includeInactive === 'true');
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPERADMIN, Role.ADMIN)
  findOne(@Param('id') id: string) {
    return this.plansService.findPlanById(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPERADMIN)
  create(@Body() dto: CreatePlanDto) {
    return this.plansService.createPlan(dto);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPERADMIN)
  update(@Param('id') id: string, @Body() dto: UpdatePlanDto) {
    return this.plansService.updatePlan(id, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPERADMIN)
  remove(@Param('id') id: string) {
    return this.plansService.deletePlan(id);
  }

  @Post('subscriptions')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPERADMIN, Role.ADMIN)
  assignSubscription(
    @Body() dto: AssignSubscriptionDto,
    @CurrentUser() user: any
  ) {
    return this.plansService.assignSubscription(dto, user.id);
  }

  @Delete('subscriptions/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPERADMIN, Role.ADMIN)
  cancelSubscription(@Param('id') id: string) {
    return this.plansService.cancelSubscription(id);
  }

  @Patch('subscriptions/:id/approve')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPERADMIN, Role.ADMIN)
  approveSubscription(@Param('id') id: string, @CurrentUser() user: any) {
    return this.plansService.approveSubscription(id, user.id);
  }

  @Patch('subscriptions/:id/reject')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPERADMIN, Role.ADMIN)
  rejectSubscription(
    @Param('id') id: string,
    @Body() dto: { reason?: string },
    @CurrentUser() user: any
  ) {
    return this.plansService.rejectSubscription(id, user.id, dto?.reason);
  }
}
