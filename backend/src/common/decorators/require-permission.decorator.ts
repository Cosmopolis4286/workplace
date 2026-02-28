import { SetMetadata } from '@nestjs/common'

export const PERMISSION_KEY = 'required_permission'

/**
 * Decorator that marks an endpoint as requiring a specific permission.
 * Usage: @RequirePermission('menu:create')
 */
export const RequirePermission = (permission: string) =>
  SetMetadata(PERMISSION_KEY, permission)
