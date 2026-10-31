import {
  IsBoolean,
  IsDateString,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
} from 'class-validator';

export class ReportStatementPaymentDto {
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

export class RejectStatementPaymentDto {
  @IsString()
  @MaxLength(300)
  reason: string;
}

export class SetActiveDto {
  @IsBoolean()
  isActive: boolean;
}
