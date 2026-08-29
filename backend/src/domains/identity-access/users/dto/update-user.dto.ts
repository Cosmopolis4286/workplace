import {
  IsBoolean,
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
} from 'class-validator';
import { ProfessionalSubtype, ProfileType, Role } from '@prisma/client';

export class UpdateUserDto {
  @IsString()
  @IsOptional()
  firstName?: string;

  @IsString()
  @IsOptional()
  lastName?: string;

  @IsEmail()
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsEnum(Role)
  @IsOptional()
  role?: Role;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsString()
  @IsOptional()
  categoryId?: string | null;

  @IsString()
  @IsOptional()
  subcategoryId?: string | null;

  // Igual semántica que en CreateUserDto: cuando role=PROFESIONAL, indica
  // qué UserProfile debe tener el usuario. `null` explícito quita el
  // perfil de negocio (deja al usuario sin UserProfile de tipo
  // BUSINESS/PROFESSIONAL) — distinto de `undefined`, que deja el perfil
  // actual sin tocar (ver UsersService.updateUser).
  @IsEnum(ProfileType)
  @IsOptional()
  businessProfileType?: ProfileType | null;

  @IsEnum(ProfessionalSubtype)
  @IsOptional()
  professionalSubtype?: ProfessionalSubtype;
}
