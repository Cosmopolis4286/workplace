import { IsEnum, IsNumber, IsOptional, IsBoolean, Min } from 'class-validator';
import { AlertType } from '@prisma/client';

export class UpsertAlertRuleDto {
  @IsEnum(AlertType)
  alertType: AlertType;

  @IsNumber()
  @Min(0)
  thresholdValue: number;

  @IsOptional()
  @IsBoolean()
  enabled?: boolean;
}
