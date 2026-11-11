import {
  IsString,
  IsOptional,
  IsInt,
  Min,
  Max,
  IsEnum,
  IsEmail,
  MaxLength,
  IsArray,
  ArrayMinSize,
  ArrayMaxSize,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { CatalogDeliveryType } from '@prisma/client';
import { NoContactInfo } from '../../../../common/validators/no-contact-info.validator';

export class CreateCatalogOrderItemDto {
  @IsString()
  productId: string;

  @IsInt()
  @Min(1)
  @Max(99)
  quantity: number;
}

export class CreateCatalogOrderDto {
  @IsString()
  commerceId: string;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(30)
  @ValidateNested({ each: true })
  @Type(() => CreateCatalogOrderItemDto)
  items: CreateCatalogOrderItemDto[];

  @IsEnum(CatalogDeliveryType)
  deliveryType: CatalogDeliveryType;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  address?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  city?: string;

  @IsString()
  @MaxLength(100)
  buyerName: string;

  @IsString()
  @MaxLength(30)
  buyerPhone: string;

  @IsOptional()
  @IsEmail()
  buyerEmail?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  @NoContactInfo()
  notes?: string;
}
