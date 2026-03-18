import { IsBoolean, IsEmail, IsEnum, IsOptional, IsString } from 'class-validator'
import { Role } from '@prisma/client'

export class UpdateUserDto {
  @IsString()
  @IsOptional()
  firstName?: string

  @IsString()
  @IsOptional()
  lastName?: string

  @IsEmail()
  @IsOptional()
  email?: string

  @IsString()
  @IsOptional()
  phone?: string

  @IsEnum(Role)
  @IsOptional()
  role?: Role

  @IsBoolean()
  @IsOptional()
  isActive?: boolean

  @IsString()
  @IsOptional()
  categoryId?: string | null

  @IsString()
  @IsOptional()
  subcategoryId?: string | null
}
