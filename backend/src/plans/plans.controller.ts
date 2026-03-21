import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  ParseBoolPipe,
} from '@nestjs/common';
import { PlansService } from './plans.service';
import { PlanLimitsService } from './plan-limits.service';
import { CreatePlanDto } from './dto/create-plan.dto';
import { UpdatePlanDto } from './dto/update-plan.dto';
import { AssignSubscriptionDto } from './dto/assign-subscription.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Role, SubscriptionStatus } from '@prisma/client';

@Controller('plans')
@UseGuards(JwtAuthGuard)
export class PlansController {
  constructor(
    private readonly plansService: PlansService,
    private readonly planLimitsService: PlanLimitsService
  ) {}

  // ─── Public (authenticated) endpoints ────────────────────────────────────────

  @Get('public')
  getPublicPlans(@CurrentUser() user: any) {
    return this.plansService.getPublicPlans(user.role);
  }

  @Get('my-subscription')
  getMySubscription(@CurrentUser() user: any) {
    return this.plansService.getMySubscription(user.id);
  }

  @Get('usage')
  async getUsage(@CurrentUser() user: any) {
    const commerce = await this.planLimitsService[
      'prisma'
    ].restaurant.findUnique({
      where: { userId: user.id },
      select: { id: true },
    });
    if (!commerce) return { limits: null, usage: null };
    return this.planLimitsService.getUsage(user.id, commerce.id);
  }

  // ─── Admin endpoints ──────────────────────────────────────────────────────────

  @Get('stats')
  @UseGuards(RolesGuard)
  @Roles(Role.SUPERADMIN, Role.ADMIN)
  getStats() {
    return this.plansService.getStats();
  }

  @Get()
  @UseGuards(RolesGuard)
  @Roles(Role.SUPERADMIN, Role.ADMIN)
  findAll(@Query('includeInactive') includeInactive?: string) {
    return this.plansService.findAllPlans(includeInactive === 'true');
  }

  @Get('subscriptions')
  @UseGuards(RolesGuard)
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

  @Get(':id')
  @UseGuards(RolesGuard)
  @Roles(Role.SUPERADMIN, Role.ADMIN)
  findOne(@Param('id') id: string) {
    return this.plansService.findPlanById(id);
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles(Role.SUPERADMIN)
  create(@Body() dto: CreatePlanDto) {
    return this.plansService.createPlan(dto);
  }

  @Put(':id')
  @UseGuards(RolesGuard)
  @Roles(Role.SUPERADMIN)
  update(@Param('id') id: string, @Body() dto: UpdatePlanDto) {
    return this.plansService.updatePlan(id, dto);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(Role.SUPERADMIN)
  remove(@Param('id') id: string) {
    return this.plansService.deletePlan(id);
  }

  @Post('subscriptions')
  @UseGuards(RolesGuard)
  @Roles(Role.SUPERADMIN, Role.ADMIN)
  assignSubscription(
    @Body() dto: AssignSubscriptionDto,
    @CurrentUser() user: any
  ) {
    return this.plansService.assignSubscription(dto, user.id);
  }

  @Delete('subscriptions/:id')
  @UseGuards(RolesGuard)
  @Roles(Role.SUPERADMIN, Role.ADMIN)
  cancelSubscription(@Param('id') id: string) {
    return this.plansService.cancelSubscription(id);
  }
}
