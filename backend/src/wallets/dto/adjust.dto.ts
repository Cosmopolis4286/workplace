import { IsIn, IsNumber, IsObject, IsOptional, IsString, Min } from 'class-validator';
import { WalletTransactionType } from '@prisma/client';

export class AdjustDto {
  @IsIn([WalletTransactionType.CREDIT, WalletTransactionType.DEBIT])
  type: typeof WalletTransactionType.CREDIT | typeof WalletTransactionType.DEBIT;

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
