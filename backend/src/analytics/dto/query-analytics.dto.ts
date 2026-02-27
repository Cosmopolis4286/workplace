import { IsOptional, IsIn } from 'class-validator'

export class QueryAnalyticsDto {
  @IsOptional()
  @IsIn(['7d', '30d', '90d', '1y'])
  period?: '7d' | '30d' | '90d' | '1y' = '30d'

  @IsOptional()
  @IsIn(['previous', 'year', 'none'])
  compareWith?: 'previous' | 'year' | 'none' = 'previous'
}
