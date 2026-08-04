import { IsEmail, IsOptional, IsString, MaxLength } from 'class-validator';

export class InviteDriverDto {
  @IsEmail({}, { message: 'Correo electrónico inválido' })
  email: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  phone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;
}
