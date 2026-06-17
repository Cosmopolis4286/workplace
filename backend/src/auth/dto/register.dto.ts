import {
  IsEmail,
  IsString,
  IsUUID,
  IsEnum,
  IsDateString,
  MinLength,
  Matches,
  IsOptional,
  Equals,
  registerDecorator,
  ValidationOptions,
} from 'class-validator';
import { Sex } from '@prisma/client';

function IsAdult(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isAdult',
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: {
        validate(value: string) {
          const birthDate = new Date(value);
          if (Number.isNaN(birthDate.getTime())) return false;

          const today = new Date();
          let age = today.getFullYear() - birthDate.getFullYear();
          const monthDiff = today.getMonth() - birthDate.getMonth();
          if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
            age--;
          }
          return age >= 18;
        },
        defaultMessage() {
          return 'Debes ser mayor de 18 años para registrarte';
        },
      },
    });
  };
}

export class RegisterDto {
  @IsString()
  firstName: string;

  @IsString()
  lastName: string;

  @IsEmail({}, { message: 'Correo electrónico inválido' })
  email: string;

  @IsDateString({}, { message: 'Fecha de nacimiento inválida' })
  @IsAdult()
  birthDate: string;

  @IsEnum(Sex, { message: 'Sexo inválido' })
  sex: Sex;

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
