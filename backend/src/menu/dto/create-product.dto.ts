import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  IsInt,
  IsUrl,
  IsArray,
  IsEnum,
  Min,
} from 'class-validator';

export enum ProductStatusDto {
  DISPONIBLE = 'DISPONIBLE',
  AGOTADO = 'AGOTADO',
  BAJO_STOCK = 'BAJO_STOCK',
  NO_DISPONIBLE = 'NO_DISPONIBLE',
}

export class CreateProductDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsNumber()
  @Min(0)
  price: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  cost?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  stock?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  minStock?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  maxStock?: number;

  @IsOptional()
  @IsString()
  unit?: string;

  @IsOptional()
  @IsEnum(ProductStatusDto)
  status?: ProductStatusDto;

  @IsOptional()
  @IsUrl()
  image?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  preparationTime?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  calories?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  ingredients?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  allergens?: string[];

  @IsOptional()
  @IsString()
  brand?: string;

  @IsOptional()
  @IsBoolean()
  forSale?: boolean;

  @IsString()
  @IsNotEmpty()
  categoryId: string;
}
