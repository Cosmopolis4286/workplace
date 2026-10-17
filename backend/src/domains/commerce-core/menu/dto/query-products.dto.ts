import {
  IsOptional,
  IsEnum,
  IsNumberString,
  IsString,
  IsUUID,
} from 'class-validator';
import { ProductStatus } from '@prisma/client';

export class QueryProductsDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @IsOptional()
  @IsEnum(ProductStatus)
  status?: ProductStatus;

  @IsOptional()
  @IsNumberString()
  page?: string;

  @IsOptional()
  @IsNumberString()
  limit?: string;
}
