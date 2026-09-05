import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common';
import { FeatureGrantsService } from './feature-grants.service';
import { CreatePlanFeatureRuleDto } from './dto/create-plan-feature-rule.dto';
import { UpdatePlanFeatureRuleDto } from './dto/update-plan-feature-rule.dto';
import { AdminGrantFeatureDto } from './dto/admin-grant-feature.dto';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { Role } from '@prisma/client';

@Controller('feature-grants')
export class FeatureGrantsController {
  constructor(private readonly featureGrantsService: FeatureGrantsService) {}

  // ── Usuario autenticado: sus propias features ───────────────────────────────

  @Get('mine')
  @UseGuards(JwtAuthGuard)
  listMine(@CurrentUser() user: { id: string }) {
    return this.featureGrantsService.listMyGrants(user.id);
  }

  @Get('available')
  @UseGuards(JwtAuthGuard)
  listAvailable(@CurrentUser() user: { id: string }) {
    return this.featureGrantsService.listAvailableFeatures(user.id);
  }

  @Post('activate/:featureKey')
  @UseGuards(JwtAuthGuard)
  activate(@Param('featureKey') featureKey: string, @CurrentUser() user: { id: string }) {
    return this.featureGrantsService.activateSelfService(user.id, featureKey);
  }

  @Get('has/:featureKey')
  @UseGuards(JwtAuthGuard)
  async hasFeature(@Param('featureKey') featureKey: string, @CurrentUser() user: { id: string }) {
    return { hasFeature: await this.featureGrantsService.hasFeature(user.id, featureKey) };
  }

  // ── Admin: reglas de features por plan ──────────────────────────────────────

  @Get('plans/:planId/rules')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPERADMIN, Role.ADMIN)
  listRules(@Param('planId') planId: string) {
    return this.featureGrantsService.listRulesForPlan(planId);
  }

  @Post('plans/:planId/rules')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPERADMIN, Role.ADMIN)
  createRule(@Param('planId') planId: string, @Body() dto: CreatePlanFeatureRuleDto) {
    return this.featureGrantsService.createRule(planId, dto);
  }

  @Put('rules/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPERADMIN, Role.ADMIN)
  updateRule(@Param('id') id: string, @Body() dto: UpdatePlanFeatureRuleDto) {
    return this.featureGrantsService.updateRule(id, dto);
  }

  @Delete('rules/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPERADMIN, Role.ADMIN)
  deleteRule(@Param('id') id: string) {
    return this.featureGrantsService.deleteRule(id);
  }

  // ── Admin: otorgar/revocar manualmente ──────────────────────────────────────

  @Post('admin/grant')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPERADMIN, Role.ADMIN)
  grantByAdmin(@Body() dto: AdminGrantFeatureDto, @CurrentUser() admin: { id: string }) {
    return this.featureGrantsService.grantByAdmin(admin.id, dto);
  }

  @Post('admin/:id/revoke')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPERADMIN, Role.ADMIN)
  revoke(@Param('id') id: string) {
    return this.featureGrantsService.revoke(id);
  }
}
