import { IsEmail, IsEnum, IsNotEmpty, IsOptional, IsString, Matches, MinLength } from 'class-validator'
import { Role } from '@prisma/client'

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

  @IsEnum(Role)
  role: Role

  @IsString()
  @IsOptional()
  restaurantName?: string
}
