import { IsString, IsOptional, IsBoolean, IsInt, Min } from 'class-validator'

export class UpdateStatDto {
  @IsString()
  @IsOptional()
  label?: string

  @IsString()
  @IsOptional()
  value?: string

  @IsBoolean()
  @IsOptional()
  isDynamic?: boolean

  @IsInt()
  @Min(0)
  @IsOptional()
  sortOrder?: number
}
