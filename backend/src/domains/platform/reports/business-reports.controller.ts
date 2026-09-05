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

  @Get('summary')
  @RequirePermission('reports:view')
  getSummary(@CurrentUser() user: { id: string; role: Role }) {
    return this.reportsService.getSummary(user.id, user.role);
  }
}
