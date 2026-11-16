import {
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
  Validate,
} from 'class-validator';
import {
  IsFutureDateConstraint,
  ServiceRequestModality,
} from './create-service-request.dto';

export class CreateServiceInquiryDto {
  @IsString()
  @MaxLength(150)
  serviceId: string;

  @IsEnum(ServiceRequestModality)
  @IsOptional()
  modality?: ServiceRequestModality;

  @IsDateString()
  @IsOptional()
  @Validate(IsFutureDateConstraint)
  preferredDate?: string;

  @IsString()
  @IsOptional()
  @Matches(/^([01]\\d|2[0-3]):[0-5]\\d$/, {
    message: 'La hora preferida debe tener formato HH:mm',
  })
  preferredTime?: string;

  @IsString()
  @IsOptional()
  @MinLength(5)
  @MaxLength(200)
  address?: string;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  city?: string;

  // Dato privado del cliente. No se expone al proveedor hasta contar con un
  // mecanismo de verificación y una política explícita de compartición.
  @IsString()
  @IsOptional()
  @Matches(/^[+]?[\\d\\s()-]{7,20}$/, {
    message: 'Ingresa un teléfono válido',
  })
  clientPhone?: string;

  @IsString()
  @IsOptional()
  @MaxLength(600)
  message?: string;
}
