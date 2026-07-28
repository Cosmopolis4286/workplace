import { IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { UpdateRolePermissionDto } from './update-role-permission.dto';

export class BulkUpdateRolePermissionsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpdateRolePermissionDto)
  updates: UpdateRolePermissionDto[];
}
