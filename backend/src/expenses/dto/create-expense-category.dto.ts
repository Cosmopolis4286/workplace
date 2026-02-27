import { IsString, IsOptional, IsNumber, Min } from 'class-validator'

export class CreateExpenseCategoryDto {
  @IsString()
  name: string

  @IsOptional()
  @IsString()
  color?: string

  @IsOptional()
  @IsNumber()
  @Min(0)
  budget?: number
}
