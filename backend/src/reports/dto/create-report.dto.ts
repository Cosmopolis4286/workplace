import {
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';
import { ReportEntityType } from '@prisma/client';

export class CreateReportDto {
  @IsEnum(ReportEntityType)
  entityType: ReportEntityType;

  @IsOptional()
  @IsUUID()
  entityId?: string;

  @IsString()
  @MinLength(3)
  @MaxLength(200)
  reason: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;
}
