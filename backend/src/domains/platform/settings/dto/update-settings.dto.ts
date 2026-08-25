import {
  IsString,
  IsNumber,
  IsBoolean,
  IsOptional,
  IsArray,
  Min,
  Max,
} from 'class-validator';

export class UpdateCommerceInfoDto {
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

  @IsOptional()
  @IsString()
  municipality?: string;

  @IsOptional()
  @IsString()
  parish?: string;
}

// Compartido por COMMERCE y FREELANCER en el mismo endpoint (PATCH /settings/payment).
// Un tipo unión de dos clases no es viable aquí: con emitDecoratorMetadata,
// TypeScript emite el metatype de un parámetro `A | B` como Object genérico,
// y el ValidationPipe de Nest (whitelist+forbidNonWhitelisted) omite la
// validación por completo cuando no reconoce una clase concreta. Por eso
// todos los campos son opcionales y conviven en un solo DTO: tax/suggestedTip/
// paymentMethods no aplican a FREELANCER, currency aplica a ambos.
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

// Compartido por COMMERCE y FREELANCER (ver nota en UpdatePaymentSettingsDto
// sobre por qué es un solo DTO con campos opcionales de ambos roles).
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

  @IsOptional()
  @IsBoolean()
  notifyNewRequests?: boolean;

  @IsOptional()
  @IsBoolean()
  notifyRequestUpdates?: boolean;
}

export class UpdateModuleSettingsDto {
  @IsArray()
  @IsString({ each: true })
  disabledModules: string[];
}

// Nombre público del negocio (COMMERCE) o del profesional (FREELANCER) —
// mismo endpoint para ambos, ver SettingsService.updateBusinessName.
export class UpdateBusinessNameDto {
  @IsString()
  name: string;
}
