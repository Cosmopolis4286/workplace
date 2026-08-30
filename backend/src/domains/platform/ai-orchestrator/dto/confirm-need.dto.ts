import { IsDateString, IsOptional, IsString, IsUUID, Matches, MaxLength, MinLength, Validate } from 'class-validator';
import { IsFutureDateConstraint } from '../../../commerce-core/services/dto/create-service-request.dto';

export class ConfirmNeedDto {
  @IsUUID(undefined, { message: 'searchId inválido — la búsqueda expiró o no existe, repite la búsqueda' })
  searchId: string;

  @IsUUID(undefined, { message: 'serviceId debe ser uno de los resultados devueltos por la búsqueda' })
  serviceId: string;

  @IsDateString()
  @Validate(IsFutureDateConstraint)
  preferredDate: string;

  @IsOptional()
  @IsString()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, { message: 'La hora preferida debe tener formato HH:mm' })
  preferredTime?: string;

  @IsOptional()
  @IsString()
  @MinLength(5, { message: 'La dirección debe tener al menos 5 caracteres' })
  @MaxLength(200)
  address?: string;

  // Solo requerido si el usuario no tiene un teléfono cargado en su perfil —
  // ver AiOrchestratorService.confirmNeed().
  @IsOptional()
  @IsString()
  @Matches(/^[+]?[\d\s()-]{7,20}$/, { message: 'Ingresa un teléfono válido' })
  phone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(600)
  description?: string;
}
