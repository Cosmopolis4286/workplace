import { IsString, IsUUID, Matches, MaxLength, MinLength } from 'class-validator';

export class ResetPasswordDto {
  @IsUUID('4', { message: 'Token de recuperación inválido' })
  token: string;

  @IsString()
  @MinLength(8, { message: 'La contraseña debe tener al menos 8 caracteres' })
  @MaxLength(72, {
    message: 'La contraseña no puede superar 72 caracteres',
  })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, {
    message:
      'La contraseña debe incluir mayúsculas, minúsculas y números',
  })
  password: string;
}
