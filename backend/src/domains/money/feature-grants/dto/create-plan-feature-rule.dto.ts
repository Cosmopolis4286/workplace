import { IsString, IsInt, IsOptional, IsEnum, Min } from 'class-validator';
import { FeatureUsageMode } from '@prisma/client';

export class CreatePlanFeatureRuleDto {
  @IsString()
  featureKey: string;

  @IsInt()
  @Min(1)
  durationDays: number;

  @IsEnum(FeatureUsageMode)
  usageMode: FeatureUsageMode;

  @IsOptional()
  @IsInt()
  @Min(1)
  maxUses?: number;

  @IsOptional()
  @IsString()
  label?: string;
}
