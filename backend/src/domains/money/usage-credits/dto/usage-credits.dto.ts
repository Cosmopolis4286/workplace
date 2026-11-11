import {
  IsDateString,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Matches,
  MaxLength,
} from 'class-validator';
import { USAGE_CREDIT_PACKAGES } from '../usage-credits.constants';

export class ReportUsageCreditPurchaseDto {
  @IsIn(USAGE_CREDIT_PACKAGES.map((p) => p.code))
  packageCode: string;

  @IsUUID()
  platformAccountId: string;

  @IsString()
  @MaxLength(40)
  reference: string;

  @IsOptional()
  @Matches(/^\d{4}$/, { message: 'Código de banco inválido' })
  payerBankCode?: string;

  @IsDateString()
  paidAt: string;
}

export class RejectUsageCreditPurchaseDto {
  @IsString()
  @Length(5, 500)
  reason: string;
}
