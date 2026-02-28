import { IsBoolean, IsEnum, IsUUID } from 'class-validator'
import { Role } from '@prisma/client'

export class UpdateRolePermissionDto {
  @IsEnum(Role)
  role: Role

  @IsUUID()
  permissionId: string

  @IsBoolean()
  granted: boolean
}
