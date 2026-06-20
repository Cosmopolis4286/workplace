import {
  IsString,
  IsOptional,
  IsNumber,
  IsDateString,
  IsEmail,
  IsEnum,
  Matches,
  MinLength,
  MaxLength,
  Validate,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';

@ValidatorConstraint({ name: 'isFutureDate' })
class IsFutureDateConstraint implements ValidatorConstraintInterface {
  validate(value: string) {
    if (!value) return false;
    const date = new Date(value);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date >= today;
  }
  defaultMessage() {
    return 'La fecha preferida no puede ser en el pasado';
  }
}

export enum ServiceRequestModality {
  PRESENCIAL = 'PRESENCIAL',
  REMOTO = 'REMOTO',
  CUALQUIERA = 'CUALQUIERA',
}

export class CreateServiceRequestDto {
  @IsString()
  @MaxLength(150)
  serviceId: string;

  @IsString()
  @MaxLength(150)
  serviceName: string;

  @IsString()
  @MaxLength(150)
  providerId: string;

  @IsString()
  @MaxLength(150)
  providerName: string;

  @IsEnum(ServiceRequestModality)
  @IsOptional()
  modality?: ServiceRequestModality;

  @IsDateString()
  @Validate(IsFutureDateConstraint)
  preferredDate: string;

  @IsString()
  @IsOptional()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, { message: 'La hora preferida debe tener formato HH:mm' })
  preferredTime?: string;

  @IsString()
  @IsOptional()
  @MinLength(5, { message: 'La dirección debe tener al menos 5 caracteres' })
  @MaxLength(200, { message: 'La dirección no puede superar 200 caracteres' })
  address?: string;

  @IsString()
  @IsOptional()
  @MaxLength(100, { message: 'La ciudad no puede superar 100 caracteres' })
  city?: string;

  @IsString()
  @MinLength(3, { message: 'El nombre debe tener al menos 3 caracteres' })
  @MaxLength(100, { message: 'El nombre no puede superar 100 caracteres' })
  clientName: string;

  @IsString()
  @Matches(/^[+]?[\d\s()-]{7,20}$/, { message: 'Ingresa un teléfono válido' })
  clientPhone: string;

  @IsEmail({}, { message: 'Ingresa un correo válido' })
  @IsOptional()
  @MaxLength(150)
  clientEmail?: string;

  @IsString()
  @IsOptional()
  @MaxLength(600, { message: 'La descripción no puede superar 600 caracteres' })
  description?: string;

  @IsNumber()
  @IsOptional()
  price?: number;

  @IsString()
  @IsOptional()
  @MaxLength(50)
  priceUnit?: string;
}
