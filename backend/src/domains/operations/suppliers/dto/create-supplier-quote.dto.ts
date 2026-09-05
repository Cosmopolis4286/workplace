import {
  IsString,
  IsNumber,
  IsOptional,
  IsBoolean,
  IsInt,
  IsDateString,
  Min,
} from 'class-validator';

export class CreateSupplierQuoteDto {
  @IsString()
  productId: string;

  @IsNumber()
  @Min(0)
  price: number;

  // Código de ExchangeRate, ej. "USD", "VES". Mismo criterio que Purchase.
  @IsString()
  currencyCode: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  leadTimeDays?: number;

  @IsOptional()
  @IsBoolean()
  available?: boolean;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsDateString()
  quotedAt?: string;
}
