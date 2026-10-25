import {
  IsString,
  IsOptional,
  IsNumber,
  IsBoolean,
  IsArray,
  IsEnum,
  Min,
  IsIn,
} from 'class-validator';
import { PlanStatus } from '@prisma/client';

export class CreatePlanDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsNumber()
  @Min(0)
  price: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  priceAnnual?: number;

  @IsOptional()
  @IsIn(['VES', 'USD'])
  currency?: 'VES' | 'USD';

  @IsOptional()
  @IsEnum(PlanStatus)
  status?: PlanStatus;

  @IsOptional()
  @IsBoolean()
  isPopular?: boolean;

  @IsOptional()
  @IsString()
  color?: string;

  @IsOptional()
  @IsNumber()
  sortOrder?: number;

  @IsOptional()
  @IsBoolean()
  forCommerce?: boolean;

  @IsOptional()
  @IsBoolean()
  forFreelancer?: boolean;

  @IsOptional()
  @IsBoolean()
  forNormal?: boolean;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  categoryIds?: string[];

  @IsOptional()
  @IsNumber()
  maxProducts?: number;

  @IsOptional()
  @IsNumber()
  maxEmployees?: number;

  @IsOptional()
  @IsNumber()
  maxBranches?: number;

  @IsOptional()
  @IsNumber()
  maxOrders?: number;

  @IsOptional()
  @IsNumber()
  maxStorage?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  features?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  enabledModules?: string[];
}
