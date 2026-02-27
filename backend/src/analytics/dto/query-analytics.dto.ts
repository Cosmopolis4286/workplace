import { IsOptional, IsIn, IsDateString } from 'class-validator'

export type AnalyticsPeriod = 'today' | '7d' | 'week' | '30d' | 'quarter' | '90d' | '1y' | 'custom'

export class QueryAnalyticsDto {
  @IsOptional()
  @IsIn(['today', '7d', 'week', '30d', 'quarter', '90d', '1y', 'custom'])
  period?: AnalyticsPeriod = '30d'

  @IsOptional()
  @IsIn(['previous', 'year', 'none'])
  compareWith?: 'previous' | 'year' | 'none' = 'previous'

  /** ISO date string — required when period = 'custom' */
  @IsOptional()
  @IsDateString()
  dateFrom?: string

  /** ISO date string — required when period = 'custom' */
  @IsOptional()
  @IsDateString()
  dateTo?: string
}
