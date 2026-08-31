import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsNumber,
  IsInt,
  Min,
  Max,
  MaxLength,
  IsPositive,
} from 'class-validator';
import { DeliveryStatus } from '@prisma/client';

export class CreateDeliveryDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  orderNumber: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  customerName: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  customerPhone?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  deliveryAddress: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;

  @IsNumber()
  @IsPositive()
  total: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  deliveryFee?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  estimatedTime?: number;

  @IsOptional()
  @IsString()
  driverId?: string;

  @IsOptional()
  @IsEnum(DeliveryStatus)
  status?: DeliveryStatus;

  @IsOptional()
  @IsString()
  customerUserId?: string;

  @IsOptional()
  @IsNumber()
  @Min(-90)
  @Max(90)
  pickupLat?: number;

  @IsOptional()
  @IsNumber()
  @Min(-180)
  @Max(180)
  pickupLng?: number;

  @IsOptional()
  @IsNumber()
  @Min(-90)
  @Max(90)
  destLat?: number;

  @IsOptional()
  @IsNumber()
  @Min(-180)
  @Max(180)
  destLng?: number;
}
