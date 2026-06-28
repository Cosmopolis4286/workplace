import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsUUID,
  MaxLength,
} from 'class-validator';
import { VeLocationType } from '@prisma/client';

export class CreateVeLocationDto {
  @IsEnum(VeLocationType)
  type: VeLocationType;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @IsOptional()
  @IsUUID()
  parentId?: string;

  // Solo aplica cuando type=MUNICIPIO (nodo raíz del árbol)
  @IsOptional()
  @IsString()
  @MaxLength(100)
  stateName?: string;

  // Solo aplica cuando type=PARROQUIA
  @IsOptional()
  @IsString()
  @MaxLength(20)
  postalCode?: string;
}
