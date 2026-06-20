import {
  IsString,
  IsNumber,
  IsBoolean,
  IsOptional,
  IsArray,
  Min,
  Max,
} from 'class-validator';

export class UpdateRestaurantInfoDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  type?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  email?: string;

  @IsOptional()
  @IsString()
  schedule?: string;

  @IsOptional()
  @IsString()
  country?: string;

  @IsOptional()
  @IsString()
  state?: string;

  @IsOptional()
  @IsString()
  city?: string;
}

export class UpdatePaymentSettingsDto {
  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  tax?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  suggestedTip?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  paymentMethods?: string[];
}

export class UpdateOperationSettingsDto {
  @IsOptional()
  @IsNumber()
  @Min(1)
  avgPrepTime?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  avgDeliveryTime?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  deliveryFee?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  freeDeliveryMinimum?: number;
}

export class UpdateNotificationSettingsDto {
  @IsOptional()
  @IsBoolean()
  notifyNewOrders?: boolean;

  @IsOptional()
  @IsBoolean()
  notifyLowStock?: boolean;

  @IsOptional()
  @IsBoolean()
  notifyDailyReports?: boolean;

  @IsOptional()
  @IsBoolean()
  notifyCustomerReviews?: boolean;
}

export class UpdateModuleSettingsDto {
  @IsArray()
  @IsString({ each: true })
  disabledModules: string[];
}
