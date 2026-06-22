import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { ProposedCategoryTarget } from '@prisma/client';

export class ProposeCategoryDto {
  @IsString()
  @MaxLength(60)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  description?: string;

  @IsOptional()
  @IsString()
  color?: string;

  @IsOptional()
  @IsString()
  icon?: string;

  @IsEnum(ProposedCategoryTarget, {
    message: 'target debe ser PRODUCTO, SERVICIO o EMPLEO',
  })
  target: ProposedCategoryTarget;
}
