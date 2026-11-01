import { RideVehicleType } from '@prisma/client';
import {
  IsEnum,
  IsIn,
  IsOptional,
  IsString,
  Length,
  MaxLength,
} from 'class-validator';

export class SubmitRideDriverProfileDto {
  @IsEnum(RideVehicleType)
  vehicleType: RideVehicleType;

  @IsString()
  @Length(5, 10)
  vehiclePlate: string;

  @IsString()
  @Length(2, 60)
  vehicleModel: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  vehicleColor?: string;

  @IsString()
  @Length(5, 20)
  licenseNumber: string;
}

export class ReviewRideDriverProfileDto {
  @IsIn(['APPROVED', 'REJECTED'])
  status: 'APPROVED' | 'REJECTED';

  @IsOptional()
  @IsString()
  @MaxLength(300)
  reason?: string;
}
