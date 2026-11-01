import { DeliveryCollection, DeliveryStatus } from '@prisma/client';
import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
} from 'class-validator';

export class DriverUpdateStatusDto {
  @IsEnum(DeliveryStatus)
  status: DeliveryStatus;

  @IsOptional()
  @Matches(/^\d{4}$/, { message: 'El código de entrega tiene 4 dígitos' })
  deliveryCode?: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  failureReason?: string;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  amountCollected?: number;

  @IsOptional()
  @IsEnum(DeliveryCollection)
  collectedMethod?: DeliveryCollection;
}
