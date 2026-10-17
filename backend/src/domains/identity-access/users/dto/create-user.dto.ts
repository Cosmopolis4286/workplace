import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MinLength,
} from 'class-validator';
import { ProfessionalSubtype, ProfileType, Role } from '@prisma/client';

// Definir los valores válidos del enum
const VALID_ROLES = ['SUPERADMIN', 'ADMIN', 'PROFESIONAL', 'NORMAL'] as const;

export class CreateUserDto {
  @IsString()
  @IsNotEmpty()
  firstName: string;

  @IsString()
  @IsNotEmpty()
  lastName: string;

  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  @Matches(/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, {
    message: 'La contraseña debe tener mayúsculas, minúsculas y números',
  })
  password: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsEnum(VALID_ROLES, {
    message: 'El rol debe ser uno de: SUPERADMIN, ADMIN, PROFESIONAL, NORMAL',
  })
  role: Role;

  // Role ya no distingue "tiene Commerce" de "es freelancer/service
  // provider" (ambos son PROFESIONAL) — cuando role=PROFESIONAL, este
  // campo indica qué UserProfile crear. Requerido en la práctica para ese
  // caso (validado en el service, no acá, porque depende de otro campo).
  @IsEnum(ProfileType)
  @IsOptional()
  businessProfileType?: ProfileType;

  @IsEnum(ProfessionalSubtype)
  @IsOptional()
  professionalSubtype?: ProfessionalSubtype;

  @IsString()
  @IsOptional()
  commerceName?: string;

  @IsString()
  @IsOptional()
  categoryId?: string;

  @IsString()
  @IsOptional()
  subcategoryId?: string;
}
