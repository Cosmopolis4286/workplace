import { IsOptional, IsString } from 'class-validator';

export class UpdateOwnProfileDto {
  @IsString()
  @IsOptional()
  categoryId?: string | null;

  @IsString()
  @IsOptional()
  subcategoryId?: string | null;
}
