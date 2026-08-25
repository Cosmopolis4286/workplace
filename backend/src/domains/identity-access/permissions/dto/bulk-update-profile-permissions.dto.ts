import { IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { UpdateProfilePermissionDto } from './update-profile-permission.dto';

export class BulkUpdateProfilePermissionsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpdateProfilePermissionDto)
  updates: UpdateProfilePermissionDto[];
}
