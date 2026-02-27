import { Controller, Get, Query, UseGuards } from '@nestjs/common'
import { AnalyticsService } from './analytics.service'
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard'
import { CurrentUser } from '../common/decorators/current-user.decorator'
import { QueryAnalyticsDto } from './dto/query-analytics.dto'

@Controller('analytics')
@UseGuards(JwtAuthGuard)
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('overview')
  getOverview(
    @CurrentUser() user: { id: string },
    @Query() query: QueryAnalyticsDto,
  ) {
    return this.analyticsService.getOverview(user.id, query)
  }
}
