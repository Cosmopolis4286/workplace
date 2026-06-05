import { IsEnum, IsOptional, IsString } from 'class-validator';
import { WalletTransactionType } from '@prisma/client';

export class QueryWalletTransactionsDto {
  @IsOptional()
  @IsString()
  page?: string;

  @IsOptional()
  @IsString()
  limit?: string;

  @IsOptional()
  @IsEnum(WalletTransactionType)
  type?: WalletTransactionType;
}
