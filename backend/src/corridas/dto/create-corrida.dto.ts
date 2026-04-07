import { IsString, IsEnum, IsOptional, IsNumber, MinLength } from 'class-validator';
import { CorridaVehicleType } from '@prisma/client';

export class CreateCorridaDto {
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
}
