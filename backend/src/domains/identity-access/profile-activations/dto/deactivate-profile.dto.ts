import {
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  ValidateIf,
} from 'class-validator';
import { ProfileDeactivationReason } from '@prisma/client';

export class DeactivateProfileDto {
  @IsEnum(ProfileDeactivationReason, {
    message: 'Elige el motivo por el que desactivas el perfil',
  })
  reason: ProfileDeactivationReason;

  // Obligatoria si el motivo es "Otro"; opcional en el resto.
  @ValidateIf((o) => o.reason === ProfileDeactivationReason.OTHER || !!o.note)
  @IsString()
  @MinLength(5, { message: 'Cuéntanos el motivo (mínimo 5 caracteres)' })
  @MaxLength(500)
  @IsOptional()
  note?: string;
}
