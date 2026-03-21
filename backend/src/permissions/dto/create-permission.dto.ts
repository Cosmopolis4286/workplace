import { IsString, IsOptional, IsBoolean } from 'class-validator';

export class CreatePermissionDto {
  @IsString()
  key: string; // e.g. "reports:export"

  @IsString()
  module: string; // e.g. "reports"

  @IsString()
  action: string; // e.g. "export"

  @IsString()
  label: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsBoolean()
  isSystem?: boolean;
}
