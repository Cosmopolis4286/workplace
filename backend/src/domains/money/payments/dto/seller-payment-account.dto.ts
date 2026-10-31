import {
  IsBoolean,
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { SellerPaymentMethod } from '@prisma/client';

// Formato y coherencia (banco ↔ cuenta, método ↔ campos) se validan en
// SellerPaymentAccountsService.normalize, que también normaliza los valores.
export class CreateSellerPaymentAccountDto {
  @IsEnum(SellerPaymentMethod)
  method: SellerPaymentMethod;

  @IsOptional()
  @IsString()
  @MaxLength(4)
  bankCode?: string;

  @IsString()
  @MaxLength(100)
  holderName: string;

  @IsString()
  @MaxLength(20)
  holderDocument: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  accountNumber?: string;

  @IsOptional()
  @IsEmail()
  @MaxLength(120)
  email?: string;
}

export class UpdateSellerPaymentAccountDto {
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
