import { Controller, Get, Query, UseGuards } from '@nestjs/common'
import { AnalyticsService } from './analytics.service'
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard'
import { PermissionsGuard } from '../common/guards/permissions.guard'
import { RequirePermission } from '../common/decorators/require-permission.decorator'
import { CurrentUser } from '../common/decorators/current-user.decorator'
import { QueryAnalyticsDto } from './dto/query-analytics.dto'

@Controller('analytics')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('overview')
  @RequirePermission('analytics:view')
  getOverview(
    @CurrentUser() user: { id: string },
    @Query() query: QueryAnalyticsDto,
  ) {
    return this.analyticsService.getOverview(user.id, query)
  }
}
