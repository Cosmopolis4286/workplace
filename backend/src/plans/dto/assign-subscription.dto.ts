import {
  IsString,
  IsEnum,
  IsOptional,
  IsDateString,
  IsNumber,
  Min,
} from 'class-validator'
import { BillingInterval, SubscriptionStatus } from '@prisma/client'

export class AssignSubscriptionDto {
  @IsString()
  userId: string

  @IsString()
  planId: string

  @IsOptional()
  @IsEnum(BillingInterval)
  interval?: BillingInterval

  @IsOptional()
  @IsEnum(SubscriptionStatus)
  status?: SubscriptionStatus

  @IsOptional()
  @IsDateString()
  startAt?: string

  @IsOptional()
  @IsDateString()
  endAt?: string

  @IsOptional()
  @IsDateString()
  trialEnds?: string

  @IsOptional()
  @IsNumber()
  @Min(0)
  pricePaid?: number

  @IsOptional()
  @IsString()
  notes?: string
}
