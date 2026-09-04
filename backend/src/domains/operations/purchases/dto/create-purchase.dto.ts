import {
  IsString,
  IsNumber,
  IsOptional,
  IsDateString,
  Min,
} from 'class-validator';

export class CreatePurchaseDto {
  @IsString()
  productId: string;

  @IsOptional()
  @IsString()
  supplierId?: string;

  @IsNumber()
  @Min(1)
  quantity: number;

  @IsNumber()
  @Min(0)
  unitCost: number;

  // Código de ExchangeRate, ej. "USD", "VES". Si es la moneda base (USD) no
  // requiere que exista una fila en ExchangeRate.
  @IsString()
  currencyCode: string;

  @IsOptional()
  @IsDateString()
  purchasedAt?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
