import { IsEnum, IsNumber, IsObject, IsOptional, IsString, Min } from 'class-validator';
import { WalletTransactionType } from '@prisma/client';

export class AdjustDto {
  @IsEnum([WalletTransactionType.CREDIT, WalletTransactionType.DEBIT])
  type: WalletTransactionType.CREDIT | WalletTransactionType.DEBIT;

  @IsNumber()
  @Min(0.01)
  amount: number;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}
