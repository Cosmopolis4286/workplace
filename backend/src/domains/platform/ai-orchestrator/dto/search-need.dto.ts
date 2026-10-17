import { IsNumber, IsOptional, IsString, IsUUID, Min } from 'class-validator';

export class SearchNeedDto {
  @IsUUID(undefined, {
    message: 'categoryId debe ser un ID de categoría de servicio válido',
  })
  categoryId: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  budgetMax?: number;

  @IsOptional()
  @IsString()
  city?: string;
}
