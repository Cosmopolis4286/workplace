import { IsString, IsOptional, IsNumber } from 'class-validator'

export class CreateSubcategoryDto {
  @IsString()
  name: string

  @IsString()
  @IsOptional()
  description?: string

  @IsString()
  categoryId: string

  @IsNumber()
  @IsOptional()
  sortOrder?: number
}

export class UpdateSubcategoryDto {
  @IsString()
  @IsOptional()
  name?: string

  @IsString()
  @IsOptional()
  description?: string

  @IsString()
  @IsOptional()
  categoryId?: string

  @IsNumber()
  @IsOptional()
  sortOrder?: number
}
