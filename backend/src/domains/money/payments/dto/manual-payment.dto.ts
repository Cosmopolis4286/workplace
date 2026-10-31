import {
  IsDateString,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
} from 'class-validator';
import type { PaymentSourceType } from '../payment-source-resolver.interface';

// Orígenes con resolver registrado (ver PaymentsModule).
export const MANUAL_PAYMENT_SOURCES: PaymentSourceType[] = [
  'SERVICE_REQUEST',
  'CATALOG_ORDER',
];

export class StartManualPaymentDto {
  @IsIn(MANUAL_PAYMENT_SOURCES)
  sourceType: PaymentSourceType;

  @IsUUID()
  sourceId: string;
}

export class ReportManualPaymentDto {
  @IsUUID()
  sellerPaymentAccountId: string;

  @IsString()
  @MaxLength(40)
  reference: string;

  @IsOptional()
  @Matches(/^\d{4}$/, { message: 'Código de banco inválido' })
  payerBankCode?: string;

  @IsDateString()
  paidAt: string;
}

export class RejectManualPaymentDto {
  @IsString()
  @MaxLength(300)
  reason: string;
}
