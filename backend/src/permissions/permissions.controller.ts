import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { PermissionsService } from './permissions.service';
import { UpdateRolePermissionDto } from './dto/update-role-permission.dto';
import { BulkUpdateRolePermissionsDto } from './dto/bulk-update-role-permissions.dto';
import { CreatePermissionDto } from './dto/create-permission.dto';

@Controller('permissions')
@UseGuards(JwtAuthGuard)
export class PermissionsController {
  constructor(private readonly permissionsService: PermissionsService) {}

  /** Devuelve las permission keys del usuario autenticado (usado por el frontend) */
  @Get('me')
  getMyPermissions(@CurrentUser() user: { role: Role }) {
    return this.permissionsService.getMyPermissions(user.role);
  }

  /** Matriz completa para el panel de administración */
  @Get('matrix')
  @UseGuards(RolesGuard)
  @Roles(Role.SUPERADMIN)
  getMatrix() {
    return this.permissionsService.getMatrixForAllRoles();
  }

  /** Togglea un permiso para un rol */
  @Patch('toggle')
  @UseGuards(RolesGuard)
  @Roles(Role.SUPERADMIN)
  toggle(
    @Body() dto: UpdateRolePermissionDto,
    @CurrentUser() user: { id: string }
  ) {
    return this.permissionsService.togglePermission(
      dto.role,
      dto.permissionId,
      dto.granted,
      user.id
    );
  }

  /** Crea un nuevo permiso personalizado */
  @Post()
  @UseGuards(RolesGuard)
  @Roles(Role.SUPERADMIN)
  create(@Body() dto: CreatePermissionDto) {
    return this.permissionsService.createPermission(dto);
  }

  /** Elimina un permiso no-sistema */
  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(Role.SUPERADMIN)
  remove(@Param('id') id: string) {
    return this.permissionsService.deletePermission(id);
  }

  /** Guarda múltiples cambios a la vez (bulk-save del panel admin) */
  @Patch('bulk')
  @UseGuards(RolesGuard)
  @Roles(Role.SUPERADMIN)
  bulkUpdate(
    @Body() dto: BulkUpdateRolePermissionsDto,
    @CurrentUser() user: { id: string }
  ) {
    return this.permissionsService.bulkUpdate(dto.updates, user.id);
  }
}
