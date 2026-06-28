import { IsString, IsEnum, IsOptional, IsNumber, MinLength } from 'class-validator';
import { CorridaVehicleType, CorridaServiceType } from '@prisma/client';

export class CreateCorridaDto {
  @IsOptional()
  @IsEnum(CorridaServiceType)
  serviceType?: CorridaServiceType;

  @IsString()
  @MinLength(3)
  origin: string;

  @IsString()
  @MinLength(3)
  destination: string;

  @IsOptional()
  @IsNumber()
  originLat?: number;

  @IsOptional()
  @IsNumber()
  originLng?: number;

  @IsOptional()
  @IsNumber()
  destinationLat?: number;

  @IsOptional()
  @IsNumber()
  destinationLng?: number;

  @IsOptional()
  @IsEnum(CorridaVehicleType)
  vehicleType?: CorridaVehicleType;

  @IsOptional()
  @IsString()
  notes?: string;

  // ─── Datos de flete (solo aplican cuando serviceType = FLETE) ──────────────
  @IsOptional()
  @IsString()
  recipientName?: string;

  @IsOptional()
  @IsString()
  recipientPhone?: string;

  @IsOptional()
  @IsString()
  cargoDescription?: string;

  @IsOptional()
  @IsNumber()
  cargoWeight?: number;

  @IsOptional()
  @IsNumber()
  declaredValue?: number;
}
