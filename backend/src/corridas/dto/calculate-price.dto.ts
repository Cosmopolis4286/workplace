import { IsEnum, IsNumber } from 'class-validator';
import { CorridaVehicleType } from '@prisma/client';

export class CalculatePriceDto {
  @IsNumber()
  originLat: number;

  @IsNumber()
  originLng: number;

  @IsNumber()
  destinationLat: number;

  @IsNumber()
  destinationLng: number;

  @IsEnum(CorridaVehicleType)
  vehicleType: CorridaVehicleType;
}
