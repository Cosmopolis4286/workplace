import {
  IsDateString,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
} from 'class-validator';

export class ReportEscrowFundingDto {
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

export class RejectEscrowFundingDto {
  @IsString()
  @MaxLength(300)
  reason: string;
}
