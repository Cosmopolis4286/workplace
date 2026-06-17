import { IsString, IsNotEmpty, IsOptional, IsBoolean, IsInt, Min } from 'class-validator'

export class CreateFeatureDto {
  @IsString()
  @IsNotEmpty()
  title: string

  @IsString()
  @IsNotEmpty()
  description: string

  @IsString()
  @IsNotEmpty()
  icon: string

  @IsString()
  @IsOptional()
  bg?: string

  @IsBoolean()
  @IsOptional()
  isActive?: boolean

  @IsInt()
  @Min(0)
  @IsOptional()
  sortOrder?: number
}
