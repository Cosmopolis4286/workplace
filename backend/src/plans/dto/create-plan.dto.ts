import {
  IsString,
  IsOptional,
  IsNumber,
  IsBoolean,
  IsArray,
  IsEnum,
  Min,
} from 'class-validator'
import { PlanStatus } from '@prisma/client'

export class CreatePlanDto {
  @IsString()
  name: string

  @IsOptional()
  @IsString()
  description?: string

  @IsNumber()
  @Min(0)
  price: number

  @IsOptional()
  @IsNumber()
  @Min(0)
  priceAnnual?: number

  @IsOptional()
  @IsEnum(PlanStatus)
  status?: PlanStatus

  @IsOptional()
  @IsBoolean()
  isPopular?: boolean

  @IsOptional()
  @IsString()
  color?: string

  @IsOptional()
  @IsNumber()
  sortOrder?: number

  @IsOptional()
  @IsBoolean()
  forCommerce?: boolean

  @IsOptional()
  @IsBoolean()
  forFreelancer?: boolean

  @IsOptional()
  @IsNumber()
  maxProducts?: number

  @IsOptional()
  @IsNumber()
  maxEmployees?: number

  @IsOptional()
  @IsNumber()
  maxBranches?: number

  @IsOptional()
  @IsNumber()
  maxOrders?: number

  @IsOptional()
  @IsNumber()
  maxStorage?: number

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  features?: string[]

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  enabledModules?: string[]
}
