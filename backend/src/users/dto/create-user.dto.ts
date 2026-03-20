import { IsEmail, IsEnum, IsNotEmpty, IsOptional, IsString, Matches, MinLength } from 'class-validator'
import { Role } from '@prisma/client'

// Definir los valores válidos del enum
const VALID_ROLES = ['SUPERADMIN', 'ADMIN', 'COMMERCE', 'FREELANCER', 'NORMAL'] as const

export class CreateUserDto {
  @IsString()
  @IsNotEmpty()
  firstName: string

  @IsString()
  @IsNotEmpty()
  lastName: string

  @IsEmail()
  email: string

  @IsString()
  @MinLength(8)
  @Matches(/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, {
    message: 'La contraseña debe tener mayúsculas, minúsculas y números',
  })
  password: string

  @IsString()
  @IsOptional()
  phone?: string

  @IsEnum(VALID_ROLES, {
    message: 'El rol debe ser uno de: SUPERADMIN, ADMIN, COMMERCE, FREELANCER, NORMAL'
  })
  role: Role

  @IsString()
  @IsOptional()
  commerceName?: string

  @IsString()
  @IsOptional()
  categoryId?: string

  @IsString()
  @IsOptional()
  subcategoryId?: string
}
