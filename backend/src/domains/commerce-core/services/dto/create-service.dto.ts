import {
  IsString,
  IsOptional,
  IsNumber,
  IsArray,
  IsEnum,
  IsBoolean,
  Min,
  Max,
  MaxLength,
  IsUUID,
  IsInt,
  ArrayMaxSize,
} from 'class-validator';
import { ServiceStatus } from '@prisma/client';

export class CreateServiceDto {
  @IsString()
  @MaxLength(120)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  // > 0: un servicio publicado a $0 no puede cobrarse ni retener garantía
  // (escrow); el precio final igual se ajusta por solicitud vía propuestas de
  // cambio de precio.
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01, { message: 'El precio debe ser mayor a 0' })
  @Max(1_000_000)
  price: number;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  priceUnit?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  duration?: number;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(3)
  @IsString({ each: true })
  images?: string[];

  @IsOptional()
  @IsEnum(ServiceStatus)
  status?: ServiceStatus;

  @IsOptional()
  @IsBoolean()
  hasEscrow?: boolean;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(15)
  @IsString({ each: true })
  @MaxLength(30, { each: true })
  tags?: string[];

  // Valores de ServiceModality activas — se validan contra el catálogo en
  // ServicesService (el DTO no conoce la DB).
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @IsString({ each: true })
  modalities?: string[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @IsString({ each: true })
  @MaxLength(40, { each: true })
  itemFields?: string[];

  @IsOptional()
  @IsUUID()
  categoryId?: string;
}
