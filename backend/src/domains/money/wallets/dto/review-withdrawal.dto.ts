import { IsString, Length } from 'class-validator';

export class MarkWithdrawalPaidDto {
  // Referencia de la transferencia que hizo el admin (pago móvil, banco, Zelle).
  @IsString()
  @Length(3, 100)
  payoutReference: string;
}

export class RejectWithdrawalDto {
  @IsString()
  @Length(3, 500)
  reason: string;
}
