import {
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  ValidateIf,
} from 'class-validator';
import { AccountSuspensionReason } from '@prisma/client';

/** Motivos de suspensión con su texto para el panel y el correo al usuario. */
export const ACCOUNT_SUSPENSION_REASONS: Array<{
  value: AccountSuspensionReason;
  label: string;
}> = [
  { value: AccountSuspensionReason.FRAUD, label: 'Sospecha de fraude' },
  {
    value: AccountSuspensionReason.ABUSE,
    label: 'Abuso o trato inadecuado a otros usuarios',
  },
  {
    value: AccountSuspensionReason.POLICY_VIOLATION,
    label: 'Incumplimiento de las normas de la plataforma',
  },
  {
    value: AccountSuspensionReason.IDENTITY_ISSUE,
    label: 'Problema con la verificación de identidad',
  },
  {
    value: AccountSuspensionReason.PAYMENT_ISSUE,
    label: 'Problema con pagos o cobros',
  },
  {
    value: AccountSuspensionReason.SECURITY,
    label: 'Seguridad de la cuenta (posible acceso no autorizado)',
  },
  {
    value: AccountSuspensionReason.USER_REQUEST,
    label: 'A pedido del propio usuario',
  },
  { value: AccountSuspensionReason.OTHER, label: 'Otro motivo' },
];

export function suspensionReasonLabel(
  reason: AccountSuspensionReason | null | undefined
): string | null {
  if (!reason) return null;
  return (
    ACCOUNT_SUSPENSION_REASONS.find((r) => r.value === reason)?.label ?? reason
  );
}

export class SuspendAccountDto {
  @IsEnum(AccountSuspensionReason, {
    message: 'Elige el motivo de la suspensión',
  })
  reason: AccountSuspensionReason;

  // Obligatoria si el motivo es "Otro"; opcional en el resto. Es interna:
  // no se envía al usuario.
  @ValidateIf((o) => o.reason === AccountSuspensionReason.OTHER || !!o.note)
  @IsString()
  @MinLength(5, { message: 'Explica el motivo (mínimo 5 caracteres)' })
  @MaxLength(500)
  @IsOptional()
  note?: string;
}

export class ReactivateAccountDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}
