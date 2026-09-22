import {
  IsString,
  IsNumber,
  IsBoolean,
  IsOptional,
  IsArray,
  ValidateNested,
  MaxLength,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';

export class SocialLinksDto {
  @IsOptional()
  @IsString()
  instagram?: string;

  @IsOptional()
  @IsString()
  facebook?: string;

  @IsOptional()
  @IsString()
  whatsapp?: string;

  @IsOptional()
  @IsString()
  tiktok?: string;
}

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

  // Texto libre para la página pública de la tienda (/loja/:slug).
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  // Permite al dueño ocultar la tienda pública sin borrar el slug ni
  // desactivar el comercio en sí (sigue operando en el dashboard/catálogo
  // interno, solo /loja/:slug deja de mostrarla a no-dueños).
  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;

  // Estructura libre (no se valida cada red por separado) para no acoplar
  // el DTO a qué redes soporta la UI hoy — ver Commerce.socialLinks (Json).
  // @ValidateNested+@Type es obligatorio bajo whitelist:true (main.ts): sin
  // esto, class-validator no desciende al objeto anidado y todas sus
  // propiedades se descartan silenciosamente antes de llegar a Prisma.
  @IsOptional()
  @ValidateNested()
  @Type(() => SocialLinksDto)
  socialLinks?: SocialLinksDto;
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

// Price Guard (Business Shield, ver WORKPLACE_VISION.md sección 6) — margen
// objetivo/mínimo por defecto para todos los productos del comercio.
export class UpdatePriceGuardSettingsDto {
  @IsOptional()
  @IsNumber()
  @Min(0)
  targetMarginPct?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  minMarginPct?: number;
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

// Ubicación base fijada en el selector de mapa (COMMERCE o FREELANCER) —
// mismo endpoint para ambos, ver SettingsService.updateLocation. Usada por
// MatchingService para el componente de distancia.
export class UpdateLocationDto {
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude: number;

  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude: number;
}
