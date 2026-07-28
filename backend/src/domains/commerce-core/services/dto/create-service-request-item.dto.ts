import {
  IsString,
  IsOptional,
  IsObject,
  IsArray,
  ArrayMaxSize,
  MaxLength,
} from 'class-validator';

export class CreateServiceRequestItemDto {
  @IsOptional()
  @IsObject()
  fields?: Record<string, string>;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  notes?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(6)
  @IsString({ each: true })
  photos?: string[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(2)
  @IsString({ each: true })
  videos?: string[];
}
