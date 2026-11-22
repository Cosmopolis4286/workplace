import {
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export const RECEIVABLE_PAYMENT_METHODS = [
  'CASH',
  'PAGO_MOVIL',
  'TRANSFER',
  'OTHER',
] as const;

// Abono a un fiado: el cliente paga lo que puede, en la moneda que tenga.
export class CreateReceivablePaymentDto {
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  amount: number;

  @IsString()
  currencyCode: string;

  @IsOptional()
  @IsIn(RECEIVABLE_PAYMENT_METHODS)
  method?: (typeof RECEIVABLE_PAYMENT_METHODS)[number];

  @IsOptional()
  @IsString()
  @MaxLength(200)
  note?: string;
}

export class MarkReceivablePaidDto {
  @IsOptional()
  @IsIn(RECEIVABLE_PAYMENT_METHODS)
  method?: (typeof RECEIVABLE_PAYMENT_METHODS)[number];
}

export class UpdateCreditLimitDto {
  // null = sin tope.
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  creditLimitUsd?: number | null;
}
