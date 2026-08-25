import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  IsInt,
  IsUrl,
  IsArray,
  ArrayMinSize,
  ArrayMaxSize,
  ValidateNested,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class BundleComponentDto {
  @IsString()
  @IsNotEmpty()
  productId: string;

  @IsInt()
  @Min(1)
  quantity: number;
}

export class CreateBundleDto {
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
  @IsUrl()
  image?: string;

  @IsString()
  @IsNotEmpty()
  categoryId: string;

  // Componentes reales del pack — todos deben pertenecer al mismo comercio
  // que crea el pack (ver MenuService.createBundle).
  @IsArray()
  @ArrayMinSize(2)
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => BundleComponentDto)
  items: BundleComponentDto[];
}
