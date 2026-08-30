import { IsBoolean, IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class UpdateSystemModuleDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  label?: string;

  @IsOptional()
  @IsBoolean()
  isBusinessModule?: boolean;
}
