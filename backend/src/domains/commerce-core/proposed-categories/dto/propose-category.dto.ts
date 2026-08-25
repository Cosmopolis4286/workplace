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
    message: 'target debe ser PRODUCT, SERVICE, JOB o USER_CATEGORY',
  })
  target: ProposedCategoryTarget;

  // Solo aplica cuando target=USER_CATEGORY: id de la UserCategory bajo la
  // que se propone esta subcategoría. Sin esto, es una propuesta de
  // categoría raíz nueva.
  @IsOptional()
  @IsString()
  parentCategoryId?: string;
}
