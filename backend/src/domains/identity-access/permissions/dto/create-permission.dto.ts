import { IsString, IsOptional, IsBoolean, IsArray, IsEnum } from 'class-validator';
import { Role } from '@prisma/client';

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

  /** Roles que reciben granted:true al crear el permiso; el resto queda en false. */
  @IsOptional()
  @IsArray()
  @IsEnum(Role, { each: true })
  grantedRoles?: Role[];
}
