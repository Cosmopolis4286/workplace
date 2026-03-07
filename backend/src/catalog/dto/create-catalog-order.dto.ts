import { IsString, IsOptional, IsInt, Min, Max, IsEnum, IsEmail, MaxLength, IsNumber } from 'class-validator'
import { CatalogDeliveryType } from '@prisma/client'

export class CreateCatalogOrderDto {
  @IsString()
  productId: string

  @IsString()
  productName: string

  @IsString()
  restaurantId: string

  @IsString()
  restaurantName: string

  @IsInt()
  @Min(1)
  @Max(99)
  quantity: number

  @IsEnum(CatalogDeliveryType)
  deliveryType: CatalogDeliveryType

  @IsOptional()
  @IsString()
  @MaxLength(300)
  address?: string

  @IsOptional()
  @IsString()
  @MaxLength(80)
  city?: string

  @IsString()
  @MaxLength(100)
  buyerName: string

  @IsString()
  @MaxLength(30)
  buyerPhone: string

  @IsOptional()
  @IsEmail()
  buyerEmail?: string

  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string

  @IsOptional()
  @IsNumber()
  totalEstimate?: number
}
