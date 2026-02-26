import {
  IsString,
  IsNumber,
  IsInt,
  IsOptional,
  IsArray,
  IsPositive,
  Min,
  MaxLength,
  IsUrl,
} from 'class-validator'
import { Transform } from 'class-transformer'

export class CreateProductDto {
  @IsString()
  @MaxLength(120)
  name: string

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string

  @IsNumber()
  @IsPositive()
  price: number

  @IsOptional()
  @IsNumber()
  @Min(0)
  cost?: number

  @IsInt()
  @Min(0)
  stock: number

  @IsOptional()
  @IsInt()
  @Min(0)
  minStock?: number

  @IsOptional()
  @IsInt()
  @Min(0)
  maxStock?: number

  @IsOptional()
  @IsString()
  unit?: string

  @IsOptional()
  @IsUrl()
  image?: string

  @IsOptional()
  @IsInt()
  @Min(0)
  preparationTime?: number

  @IsOptional()
  @IsInt()
  @Min(0)
  calories?: number

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @Transform(({ value }) => (Array.isArray(value) ? value : []))
  ingredients?: string[]

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @Transform(({ value }) => (Array.isArray(value) ? value : []))
  allergens?: string[]

  @IsString()
  categoryId: string
}
