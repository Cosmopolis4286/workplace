import {
  IsEmail,
  IsString,
  IsUUID,
  MinLength,
  Matches,
  IsOptional,
  Equals,
} from 'class-validator';

export class RegisterDto {
  @IsString()
  firstName: string;

  @IsString()
  lastName: string;

  @IsEmail({}, { message: 'Correo electrónico inválido' })
  email: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsString()
  commerceName: string;

  @MinLength(8, { message: 'La contraseña debe tener al menos 8 caracteres' })
  @Matches(/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, {
    message: 'La contraseña debe incluir mayúsculas, minúsculas y números',
  })
  password: string;

  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @Equals(true, { message: 'Debes aceptar los Términos y Condiciones y la Política de Privacidad' })
  acceptTerms: boolean;
}
