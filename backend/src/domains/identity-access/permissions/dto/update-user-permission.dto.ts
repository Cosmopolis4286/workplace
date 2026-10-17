import {
  IsString,
  IsBoolean,
  IsOptional,
  IsUUID,
  IsDateString,
} from 'class-validator';

export class UpdateUserPermissionDto {
  @IsUUID()
  permissionId: string;

  @IsBoolean()
  granted: boolean;

  @IsString()
  @IsOptional()
  reason?: string;

  @IsDateString()
  @IsOptional()
  expiresAt?: string;
}
