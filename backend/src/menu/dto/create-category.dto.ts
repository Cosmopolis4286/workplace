import { IsString, IsNotEmpty, IsOptional, Matches } from 'class-validator';

export class CreateCategoryDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsOptional()
  @IsString()
  @Matches(/^#[0-9a-fA-F]{6}$/, {
    message: 'color debe ser un hex válido (#rrggbb)',
  })
  color?: string;
}
