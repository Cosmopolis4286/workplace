import { Controller, Get, UseGuards } from '@nestjs/common';
import { BusinessReportsService } from './business-reports.service';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../../common/guards/permissions.guard';
import { RequirePermission } from '../../../common/decorators/require-permission.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { Role } from '@prisma/client';

// Ruta pública sigue siendo /reports/summary — solo el nombre de clase
// cambia a BusinessReports* para no colisionar con el ReportsModule/
// ReportsService/ReportsController ya existentes en
// domains/engagement/reports (denuncias/moderación de pedidos y servicios,
// un dominio completamente distinto pese al nombre compartido).
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('reports')
export class BusinessReportsController {
  constructor(private readonly reportsService: BusinessReportsService) {}

  // SUPERADMIN/ADMIN siguen teniendo reports:view (a diferencia de orders:/
  // customers:/etc., no se les quitó — ver ROLE_DEFAULTS en seed.js), pero no
  // tienen un Commerce propio que resolver: se les devuelve el agregado de
  // plataforma en el mismo endpoint en vez de duplicar la ruta para el
  // frontend (mismo criterio que AnalyticsService.resolveStrategy).
  @Get('summary')
  @RequirePermission('reports:view')
  getSummary(@CurrentUser() user: { id: string; role: Role }) {
    if (user.role === Role.SUPERADMIN || user.role === Role.ADMIN) {
      return this.reportsService.getPlatformSummary();
    }
    return this.reportsService.getSummary(user.id, user.role);
  }
}
