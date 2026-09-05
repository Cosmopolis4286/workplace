import { IsString, IsInt, IsOptional, IsEnum, Min } from 'class-validator';
import { FeatureUsageMode } from '@prisma/client';

// Otorgar una feature manualmente sin pasar por una PlanFeatureRule (cortesía,
// soporte puntual a un cliente específico) — ver diseño de FeatureGrant.
export class AdminGrantFeatureDto {
  @IsString()
  userId: string;

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
  notes?: string;
}
