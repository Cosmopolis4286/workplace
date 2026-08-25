import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  ForbiddenException,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { PermissionsService } from './permissions.service';
import { UpdateRolePermissionDto } from './dto/update-role-permission.dto';
import { BulkUpdateRolePermissionsDto } from './dto/bulk-update-role-permissions.dto';
import { UpdateProfilePermissionDto } from './dto/update-profile-permission.dto';
import { BulkUpdateProfilePermissionsDto } from './dto/bulk-update-profile-permissions.dto';
import { CreatePermissionDto } from './dto/create-permission.dto';
import { UpdateUserPermissionDto } from './dto/update-user-permission.dto';
import { assignableRolesFor } from '../../../common/utils/role-hierarchy.util';

@Controller('permissions')
@UseGuards(JwtAuthGuard)
export class PermissionsController {
  constructor(private readonly permissionsService: PermissionsService) {}

  /** Devuelve las permission keys del usuario autenticado (usado por el frontend) */
  @Get('me')
  getMyPermissions(@CurrentUser() user: { role: Role; id: string }) {
    return this.permissionsService.getMyPermissions(user.role, user.id);
  }

  /** Endpoint ligero para polling: solo la versión compuesta (rol+usuario) */
  @Get('version')
  async getVersion(@CurrentUser() user: { role: Role; id: string }) {
    const roleVersion = await this.permissionsService.getOrSetRoleVersion(user.role);
    const userVersion = await this.permissionsService.getUserVersion(user.id);
    return { version: `${roleVersion}:${userVersion}` };
  }

  /** Matriz completa para el panel de administración */
  @Get('matrix')
  @UseGuards(RolesGuard)
  @Roles(Role.SUPERADMIN, Role.ADMIN)
  getMatrix(@CurrentUser() user: { role: Role }) {
    return this.permissionsService.getMatrixForAllRoles(user.role);
  }

  /** Togglea un permiso para un rol */
  @Patch('toggle')
  @UseGuards(RolesGuard)
  @Roles(Role.SUPERADMIN, Role.ADMIN)
  async toggle(
    @Body() dto: UpdateRolePermissionDto,
    @CurrentUser() user: { id: string; role: Role }
  ) {
    // ADMIN no puede modificar permisos de SUPERADMIN ni permisos de sistema
    if (user.role === Role.ADMIN) {
      if (dto.role === Role.SUPERADMIN) {
        throw new ForbiddenException('No puedes modificar permisos de SUPERADMIN');
      }
    }
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
  @Roles(Role.SUPERADMIN, Role.ADMIN)
  create(@Body() dto: CreatePermissionDto, @CurrentUser() user: { id: string; role: Role }) {
    // ADMIN solo puede crear permisos no-sistema
    if (user.role === Role.ADMIN && dto.isSystem) {
      throw new ForbiddenException('No puedes crear permisos de sistema');
    }
    return this.permissionsService.createPermission(dto, user.id);
  }

  /** Elimina un permiso no-sistema */
  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(Role.SUPERADMIN, Role.ADMIN)
  async remove(@Param('id') id: string, @CurrentUser() user: { id: string; role: Role }) {
    const isSystem = await this.permissionsService.isSystemPermission(id);
    if (isSystem) {
      throw new ForbiddenException('No puedes eliminar permisos de sistema');
    }
    return this.permissionsService.deletePermission(id);
  }

  /** Guarda múltiples cambios a la vez (bulk-save del panel admin) */
  @Patch('bulk')
  @UseGuards(RolesGuard)
  @Roles(Role.SUPERADMIN, Role.ADMIN)
  async bulkUpdate(
    @Body() dto: BulkUpdateRolePermissionsDto,
    @CurrentUser() user: { id: string; role: Role }
  ) {
    // ADMIN no puede modificar permisos de SUPERADMIN
    if (user.role === Role.ADMIN) {
      const hasSuperAdminChanges = dto.updates.some(u => u.role === Role.SUPERADMIN);
      if (hasSuperAdminChanges) {
        throw new ForbiddenException('No puedes modificar permisos de SUPERADMIN');
      }
    }
    return this.permissionsService.bulkUpdate(dto.updates, user.id);
  }

  // ─── PROFILE PERMISSIONS (perfiles múltiples — UserProfile) ────────────────

  /** Matriz completa por UserProfile para el panel de administración */
  @Get('profile-matrix')
  @UseGuards(RolesGuard)
  @Roles(Role.SUPERADMIN, Role.ADMIN)
  getProfileMatrix() {
    return this.permissionsService.getMatrixForAllProfiles();
  }

  /** Togglea un permiso para un tipo de perfil (+ subtipo si aplica) */
  @Patch('profile-toggle')
  @UseGuards(RolesGuard)
  @Roles(Role.SUPERADMIN, Role.ADMIN)
  toggleProfile(
    @Body() dto: UpdateProfilePermissionDto,
    @CurrentUser() user: { id: string }
  ) {
    return this.permissionsService.toggleProfilePermission(
      dto.profileType,
      dto.subtype ?? null,
      dto.permissionId,
      dto.granted,
      user.id
    );
  }

  /** Guarda múltiples cambios de la matriz por perfil a la vez */
  @Patch('profile-bulk')
  @UseGuards(RolesGuard)
  @Roles(Role.SUPERADMIN, Role.ADMIN)
  bulkUpdateProfile(
    @Body() dto: BulkUpdateProfilePermissionsDto,
    @CurrentUser() user: { id: string }
  ) {
    return this.permissionsService.bulkUpdateProfilePermissions(dto.updates, user.id);
  }

  // ─── USER PERMISSIONS (Permisos individuales por usuario) ─────────────────

  /** Obtiene permisos de un usuario específico */
  @Get('users/:userId')
  @UseGuards(RolesGuard)
  @Roles(Role.SUPERADMIN, Role.ADMIN)
  getUserPermissions(
    @Param('userId') userId: string,
    @CurrentUser() admin: { id: string; role: Role }
  ) {
    return this.permissionsService.getUserPermissionsWithAccessCheck(userId, admin);
  }

  /** Lista de usuarios con búsqueda */
  @Get('users')
  @UseGuards(RolesGuard)
  @Roles(Role.SUPERADMIN, Role.ADMIN)
  listUsers(
    @CurrentUser() admin: { id: string; role: Role },
    @Query('role') role?: Role,
    @Query('search') search?: string,
    @Query('page') page = '1',
    @Query('limit') limit = '20'
  ) {
    // ADMIN no debe ver SUPERADMIN ni otros ADMIN en el listado (ver
    // validateUserAccess, que igualmente bloquea el detalle si se intenta
    // acceder por otra vía).
    const visibleRoles = assignableRolesFor(admin.role);

    return this.permissionsService.listUsers({
      role,
      search,
      page: parseInt(page),
      limit: parseInt(limit),
      visibleRoles,
    });
  }

  /** Asigna/Revoca un permiso a un usuario específico */
  @Post('users/:userId')
  @UseGuards(RolesGuard)
  @Roles(Role.SUPERADMIN, Role.ADMIN)
  updateUserPermission(
    @Param('userId') userId: string,
    @Body() dto: UpdateUserPermissionDto,
    @CurrentUser() admin: { id: string; role: Role }
  ) {
    return this.permissionsService.updateUserPermission(userId, dto, admin);
  }

  /** Elimina un permiso individual de un usuario */
  @Delete('users/:userId/:permissionId')
  @UseGuards(RolesGuard)
  @Roles(Role.SUPERADMIN, Role.ADMIN)
  removeUserPermission(
    @Param('userId') userId: string,
    @Param('permissionId') permissionId: string,
    @CurrentUser() admin: { id: string; role: Role }
  ) {
    return this.permissionsService.removeUserPermission(userId, permissionId, admin);
  }

  /** Resetea todos los permisos individuales de un usuario */
  @Post('users/:userId/reset')
  @UseGuards(RolesGuard)
  @Roles(Role.SUPERADMIN, Role.ADMIN)
  resetUserPermissions(
    @Param('userId') userId: string,
    @CurrentUser() admin: { id: string; role: Role }
  ) {
    return this.permissionsService.resetUserPermissions(userId, admin);
  }
}
