import {
  IsString,
  IsOptional,
  MaxLength,
  IsArray,
  IsUUID,
} from 'class-validator';

export class CreateServiceCategoryDto {
  @IsString()
  @MaxLength(60)
  name: string;

  @IsOptional()
  @IsString()
  color?: string;

  @IsOptional()
  @IsString()
  icon?: string;

  // Rubros (UserCategory.id) a los que aplica — ver CategoryScopeService.
  // Vacío/omitido = visible para cualquier rubro.
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  userCategoryIds?: string[];
}
