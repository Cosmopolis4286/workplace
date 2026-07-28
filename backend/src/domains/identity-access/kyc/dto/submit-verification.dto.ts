import { IsEnum, IsString, IsOptional, IsDateString, MinLength, MaxLength } from 'class-validator';
import { KycDocumentType } from '@prisma/client';

export class SubmitVerificationDto {
  @IsEnum(KycDocumentType, { message: 'Tipo de documento inválido' })
  documentType: KycDocumentType;

  @IsString()
  @MinLength(4, { message: 'El número de documento es muy corto' })
  @MaxLength(30)
  documentNumber: string;

  @IsString()
  @MinLength(3, { message: 'Ingresa el nombre completo tal como aparece en el documento' })
  @MaxLength(150)
  fullName: string;

  @IsOptional()
  @IsDateString()
  birthDate?: string;
}
