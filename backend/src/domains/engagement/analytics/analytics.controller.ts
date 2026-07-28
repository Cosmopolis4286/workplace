import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../../common/guards/permissions.guard';
import { RequirePermission } from '../../../common/decorators/require-permission.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { QueryAnalyticsDto } from './dto/query-analytics.dto';

@Controller('analytics')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('overview')
  @RequirePermission('analytics:view')
  getOverview(
    @CurrentUser() user: { id: string; role: string },
    @Query() query: QueryAnalyticsDto
  ) {
    return this.analyticsService.getOverview(user.id, user.role, query);
  }

  // Sparklines de 7 días para los widgets KPI del dashboard: pedidos/
  // solicitudes activas, clientes nuevos y bajo stock (basado en
  // Order/Customer/ProductStockSnapshot para comercios, o ServiceRequest
  // para freelancers — no en el proxy de citas que usa /overview).
  @Get('dashboard-trends')
  @RequirePermission('analytics:view')
  getDashboardTrends(@CurrentUser() user: { id: string; role: string }) {
    return this.analyticsService.getDashboardTrends(user.id, user.role);
  }
}
