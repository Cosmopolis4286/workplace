import { Controller, Get, Query, UseGuards, DefaultValuePipe, ParseIntPipe } from '@nestjs/common'
import { Role } from '@prisma/client'
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard'
import { RolesGuard } from '../common/guards/roles.guard'
import { Roles } from '../common/decorators/roles.decorator'
import { AuditService } from './audit.service'

@Controller('audit')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.SUPERADMIN)
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  // ─── Audit logs ───────────────────────────────────────────────────────────

  @Get()
  getAuditLogs(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit: number,
    @Query('userId') userId?: string,
    @Query('module') module?: string,
    @Query('action') action?: string,
    @Query('search') search?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    return this.auditService.getAuditLogs({ page, limit, userId, module, action, search, dateFrom, dateTo })
  }

  @Get('stats')
  getAuditStats() {
    return this.auditService.getAuditStats()
  }

  // ─── System logs ──────────────────────────────────────────────────────────

  @Get('logs')
  getSystemLogs(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(100), ParseIntPipe) limit: number,
    @Query('level') level?: string,
    @Query('search') search?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    return this.auditService.getSystemLogs({ page, limit, level, search, dateFrom, dateTo })
  }

  @Get('logs/stats')
  getLogStats() {
    return this.auditService.getLogStats()
  }
}
