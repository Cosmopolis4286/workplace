import {
  IsString,
  IsOptional,
  IsNumber,
  IsDateString,
  IsEmail,
  IsEnum,
} from 'class-validator';

export enum ServiceRequestModality {
  PRESENCIAL = 'PRESENCIAL',
  REMOTO = 'REMOTO',
  CUALQUIERA = 'CUALQUIERA',
}

export class CreateServiceRequestDto {
  @IsString()
  serviceId: string;

  @IsString()
  serviceName: string;

  @IsString()
  providerId: string;

  @IsString()
  providerName: string;

  @IsEnum(ServiceRequestModality)
  @IsOptional()
  modality?: ServiceRequestModality;

  @IsDateString()
  preferredDate: string;

  @IsString()
  @IsOptional()
  address?: string;

  @IsString()
  @IsOptional()
  city?: string;

  @IsString()
  clientName: string;

  @IsString()
  clientPhone: string;

  @IsEmail()
  @IsOptional()
  clientEmail?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsNumber()
  @IsOptional()
  price?: number;

  @IsString()
  @IsOptional()
  priceUnit?: string;
}
