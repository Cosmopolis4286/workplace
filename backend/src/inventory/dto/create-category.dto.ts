import { IsString, IsOptional, MaxLength, Matches } from 'class-validator'

export class CreateCategoryDto {
  @IsString()
  @MaxLength(80)
  name: string

  @IsOptional()
  @IsString()
  @Matches(/^#[0-9a-fA-F]{6}$/, { message: 'color must be a valid hex color (e.g. #3b82f6)' })
  color?: string
}
