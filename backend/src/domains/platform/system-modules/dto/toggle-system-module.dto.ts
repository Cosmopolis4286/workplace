import { IsBoolean, IsString, IsNotEmpty } from 'class-validator';

export class ToggleSystemModuleDto {
  @IsString()
  @IsNotEmpty()
  module: string;

  @IsBoolean()
  enabled: boolean;
}
