import { IsBoolean, IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class CreateSystemModuleDto {
  @IsString()
  @IsNotEmpty()
  module: string;

  @IsString()
  @IsNotEmpty()
  label: string;

  @IsOptional()
  @IsBoolean()
  isBusinessModule?: boolean;
}
