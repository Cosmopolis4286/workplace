import {
  IsDateString,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Validate,
} from 'class-validator';
import { NoContactInfo } from '../../../../common/validators/no-contact-info.validator';
import { IsFutureDateConstraint } from './create-service-request.dto';

export class ConvertServiceInquiryDto {
  // Si la consulta no tenía fecha, el cliente debe indicarla al contratar.
  @IsDateString()
  @IsOptional()
  @Validate(IsFutureDateConstraint)
  preferredDate?: string;

  // La consulta puede haberse creado sin teléfono; se confirma al contratar.
  @IsString()
  @IsOptional()
  @Matches(/^[+]?[\d\s()-]{7,20}$/, {
    message: 'Ingresa un teléfono válido',
  })
  clientPhone?: string;

  @IsString()
  @IsOptional()
  @MaxLength(600)
  @NoContactInfo()
  description?: string;
}
