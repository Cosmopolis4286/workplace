import { IsString, IsOptional, MaxLength } from 'class-validator'

export class CreateServiceCategoryDto {
  @IsString()
  @MaxLength(60)
  name: string

  @IsOptional()
  @IsString()
  color?: string

  @IsOptional()
  @IsString()
  icon?: string
}
