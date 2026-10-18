import {
  IsString,
  IsEnum,
  IsOptional,
  IsNumber,
  MinLength,
} from 'class-validator';
import { RideVehicleType, RideServiceType } from '@prisma/client';

export class CreateRideDto {
  @IsOptional()
  @IsEnum(RideServiceType)
  serviceType?: RideServiceType;

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
  @IsEnum(RideVehicleType)
  vehicleType?: RideVehicleType;

  @IsOptional()
  @IsString()
  notes?: string;

  // ─── Datos de flete (solo aplican cuando serviceType = FREIGHT) ──────────────
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
