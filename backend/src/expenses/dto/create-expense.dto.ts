import {
  IsString, IsNumber, IsDateString, IsEnum, IsOptional, Min,
} from 'class-validator'
import { ExpenseType, ExpenseStatus, ExpensePaymentMethod } from '@prisma/client'

export class CreateExpenseDto {
  @IsString()
  description: string

  @IsNumber()
  @Min(0)
  amount: number

  @IsDateString()
  date: string

  @IsOptional()
  @IsEnum(ExpenseType)
  type?: ExpenseType

  @IsOptional()
  @IsEnum(ExpenseStatus)
  status?: ExpenseStatus

  @IsOptional()
  @IsEnum(ExpensePaymentMethod)
  paymentMethod?: ExpensePaymentMethod

  @IsOptional()
  @IsString()
  supplier?: string

  @IsOptional()
  @IsString()
  receipt?: string

  @IsOptional()
  @IsString()
  notes?: string

  @IsOptional()
  @IsString()
  categoryId?: string
}
