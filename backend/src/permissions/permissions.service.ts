import {
  Injectable,
  ForbiddenException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { CreatePermissionDto } from './dto/create-permission.dto';
import { UpdateUserPermissionDto } from './dto/update-user-permission.dto';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';

const CACHE_TTL = 300;
const cacheKey = (role: Role) => `permissions:role:${role}`;

@Injectable()
export class PermissionsService {
  constructor(
    private prisma: PrismaService,
    private redis: RedisService
  ) {}

  // ── Used by PermissionsGuard on every request ──────────────────────────────

  async getRolePermissions(role: Role): Promise<string[]> {
    const cached = await this.redis.get(cacheKey(role));
    if (cached) return JSON.parse(cached) as string[];

    const records = await this.prisma.rolePermission.findMany({
      where: { role, granted: true },
      include: { permission: true },
    });
    const keys = records.map((r) => r.permission.key);

    await this.redis.set(cacheKey(role), JSON.stringify(keys), CACHE_TTL);
    return keys;
  }

  async hasPermission(role: Role, permissionKey: string): Promise<boolean> {
    const keys = await this.getRolePermissions(role);
    return keys.includes(permissionKey);
  }

  // ── Frontend endpoint: permissions for the logged-in user ─────────────────

  async getMyPermissions(role: Role, userId?: string): Promise<{ keys: string[]; userSpecific?: string[] }> {
    const roleKeys = await this.getRolePermissions(role);
    
    // Si se proporciona userId, también obtener permisos individuales
    if (userId) {
      const userKeys = await this.getUserSpecificPermissions(userId);
      // Combinar: permisos del rol + permisos individuales concedidos - permisos individuales denegados
      const combined = new Set(roleKeys);
      
      for (const up of userKeys) {
        if (up.granted) combined.add(up.permissionKey);
        else combined.delete(up.permissionKey);
      }
      
      return { 
        keys: Array.from(combined),
        userSpecific: userKeys.filter(u => u.granted).map(u => u.permissionKey)
      };
    }
    
    return { keys: roleKeys };
  }

  private async getUserSpecificPermissions(userId: string): Promise<Array<{permissionKey: string; granted: boolean}>> {
    const userPerms = await this.prisma.userPermission.findMany({
      where: { userId },
      include: { permission: true },
    });
    
    return userPerms.map(up => ({
      permissionKey: up.permission.key,
      granted: up.granted && (!up.expiresAt || up.expiresAt > new Date()),
    }));
  }

  // ── Admin panel: full matrix ───────────────────────────────────────────────

  async getMatrixForAllRoles(adminRole?: Role) {
    const permissions = await this.prisma.permission.findMany({
      include: { rolePermissions: true },
      orderBy: [{ module: 'asc' }, { action: 'asc' }],
    });

    // Si es ADMIN, filtrar para no mostrar permisos de sistema marcados como isSystem
    const filteredPerms = adminRole === Role.ADMIN 
      ? permissions.filter(p => !p.isSystem)
      : permissions;

    return filteredPerms.map((p) => ({
      id: p.id,
      key: p.key,
      module: p.module,
      action: p.action,
      label: p.label,
      description: p.description,
      isSystem: p.isSystem,
      roles: Object.fromEntries(
        p.rolePermissions.map((rp) => [rp.role, rp.granted])
      ),
    }));
  }

  async getAllPermissions() {
    return this.prisma.permission.findMany({
      orderBy: [{ module: 'asc' }, { action: 'asc' }],
      select: { id: true, key: true, module: true, action: true, label: true, isSystem: true }
    });
  }

  async isSystemPermission(permissionId: string): Promise<boolean> {
    const perm = await this.prisma.permission.findUnique({
      where: { id: permissionId },
      select: { isSystem: true }
    });
    return perm?.isSystem ?? false;
  }

  // ── Admin panel: toggle single permission ──────────────────────────────────

  async togglePermission(
    role: Role,
    permissionId: string,
    granted: boolean,
    updatedBy: string
  ) {
    const perm = await this.prisma.permission.findUniqueOrThrow({
      where: { id: permissionId },
    });
    if (perm.isSystem) {
      throw new ForbiddenException(
        'No se puede modificar un permiso de sistema'
      );
    }

    await this.prisma.rolePermission.upsert({
      where: { role_permissionId: { role, permissionId } },
      create: { role, permissionId, granted, updatedBy },
      update: { granted, updatedBy },
    });

    await this.redis.del(cacheKey(role));
    return { success: true };
  }

  // ── Admin panel: create permission ────────────────────────────────────────

  async createPermission(dto: CreatePermissionDto, createdBy?: string) {
    const exists = await this.prisma.permission.findUnique({
      where: { key: dto.key },
    });
    if (exists)
      throw new ConflictException(
        `Ya existe un permiso con la clave "${dto.key}"`
      );

    const permission = await this.prisma.permission.create({
      data: {
        key: dto.key,
        module: dto.module,
        action: dto.action,
        label: dto.label,
        description: dto.description,
        isSystem: dto.isSystem ?? false,
      },
    });

    // Create role_permissions entries for all roles (default: not granted)
    const roles = Object.values(Role);
    await this.prisma.rolePermission.createMany({
      data: roles.map((role) => ({
        role,
        permissionId: permission.id,
        granted: false,
        updatedBy: createdBy,
      })),
      skipDuplicates: true,
    });

    return permission;
  }

  // ── Admin panel: delete permission ─────────────────────────────────────────

  async deletePermission(id: string) {
    const perm = await this.prisma.permission.findUnique({ where: { id } });
    if (!perm) throw new NotFoundException('Permiso no encontrado');
    if (perm.isSystem)
      throw new ForbiddenException(
        'No se puede eliminar un permiso de sistema'
      );

    await this.prisma.rolePermission.deleteMany({
      where: { permissionId: id },
    });
    await this.prisma.permission.delete({ where: { id } });

    // Invalidate all role caches
    await Promise.all(
      Object.values(Role).map((r) => this.redis.del(cacheKey(r)))
    );
    return { success: true };
  }

  // ── Admin panel: bulk update ───────────────────────────────────────────────

  async bulkUpdate(
    updates: Array<{ role: Role; permissionId: string; granted: boolean }>,
    updatedBy: string
  ) {
    const ids = [...new Set(updates.map((u) => u.permissionId))];
    const systemPerms = await this.prisma.permission.findMany({
      where: { id: { in: ids }, isSystem: true },
    });
    if (systemPerms.length > 0) {
      throw new ForbiddenException(
        'No se pueden modificar permisos de sistema'
      );
    }

    await this.prisma.$transaction(
      updates.map((u) =>
        this.prisma.rolePermission.upsert({
          where: {
            role_permissionId: { role: u.role, permissionId: u.permissionId },
          },
          create: {
            role: u.role,
            permissionId: u.permissionId,
            granted: u.granted,
            updatedBy,
          },
          update: { granted: u.granted, updatedBy },
        })
      )
    );

    const roles = [...new Set(updates.map((u) => u.role))];
    await Promise.all(roles.map((r) => this.redis.del(cacheKey(r))));

    return { success: true, updated: updates.length };
  }

  // ─── User Permission Management ───────────────────────────────────────────

  async getUserPermissionsWithAccessCheck(userId: string, admin: { id: string; role: Role }) {
    // Validar que el admin puede ver este usuario
    await this.validateUserAccess(admin, userId);
    
    return this.getUserPermissions(userId);
  }

  async getUserPermissions(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, firstName: true, lastName: true, role: true },
    });
    
    if (!user) throw new NotFoundException('Usuario no encontrado');

    // Obtener permisos del rol
    const rolePermissions = await this.prisma.rolePermission.findMany({
      where: { role: user.role, granted: true },
      include: { permission: true },
    });

    // Obtener permisos individuales del usuario
    const userPermissions = await this.prisma.userPermission.findMany({
      where: { userId },
      include: { permission: true },
    });

    // Combinar
    const rolePermMap = new Map(rolePermissions.map(rp => [rp.permission.id, rp.permission]));
    const userPermMap = new Map(userPermissions.map(up => [up.permission.id, { 
      ...up, 
      isGranted: up.granted && (!up.expiresAt || up.expiresAt > new Date()) 
    }]));

    // Todos los permisos disponibles
    const allPermissions = await this.prisma.permission.findMany({
      orderBy: [{ module: 'asc' }, { action: 'asc' }],
    });

    const permissions = allPermissions.map(p => {
      const hasRolePermission = rolePermMap.has(p.id);
      const userPerm = userPermMap.get(p.id);
      
      let effectiveGranted = hasRolePermission;
      let source: 'role' | 'user' | 'none' = hasRolePermission ? 'role' : 'none';
      
      if (userPerm) {
        effectiveGranted = userPerm.isGranted;
        source = 'user';
      }

      return {
        permissionId: p.id,
        key: p.key,
        module: p.module,
        action: p.action,
        label: p.label,
        isSystem: p.isSystem,
        roleGranted: hasRolePermission,
        userGranted: userPerm?.granted ?? null,
        userDenied: userPerm && !userPerm.granted ? true : false,
        expiresAt: userPerm?.expiresAt ?? null,
        reason: userPerm?.reason ?? null,
        effectiveGranted,
        source,
      };
    });

    return {
      user,
      permissions: permissions.filter(p => p.effectiveGranted || p.userGranted !== null),
      allPermissions: permissions,
    };
  }

  async validateUserAccess(admin: { id: string; role: Role }, userId: string) {
    const targetUser = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true },
    });

    if (!targetUser) throw new NotFoundException('Usuario no encontrado');

    // SUPERADMIN puede ver todos excepto otros SUPERADMIN (a menos que sea él mismo)
    if (admin.role === Role.SUPERADMIN) {
      if (targetUser.role === Role.SUPERADMIN && targetUser.id !== admin.id) {
        throw new ForbiddenException('No puedes gestionar permisos de otros SUPERADMIN');
      }
      return;
    }

    // ADMIN no puede ver SUPERADMIN ni otros ADMIN
    if (admin.role === Role.ADMIN) {
      if (targetUser.role === Role.SUPERADMIN) {
        throw new ForbiddenException('No tienes acceso a usuarios SUPERADMIN');
      }
      if (targetUser.role === Role.ADMIN && targetUser.id !== admin.id) {
        throw new ForbiddenException('No puedes gestionar permisos de otros ADMIN');
      }
    }
  }

  async listUsers(params: {
    role?: Role;
    search?: string;
    page: number;
    limit: number;
    visibleRoles?: Role[];
    excludeUserId?: string;
  }) {
    const { role, search, page, limit, visibleRoles, excludeUserId } = params;

    const where: any = {};
    
    if (role) where.role = role;
    if (visibleRoles?.length) where.role = { in: visibleRoles };
    if (excludeUserId) where.id = { not: excludeUserId };
    
    if (search) {
      where.OR = [
        { email: { contains: search, mode: 'insensitive' } },
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
          isActive: true,
          createdAt: true,
          _count: { select: { userPermissions: true } },
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      users: users.map(u => ({
        ...u,
        hasCustomPermissions: u._count.userPermissions > 0,
        _count: undefined,
      })),
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async updateUserPermission(
    userId: string, 
    dto: UpdateUserPermissionDto, 
    admin: { id: string; role: Role }
  ) {
    await this.validateUserAccess(admin, userId);

    const perm = await this.prisma.permission.findUnique({
      where: { id: dto.permissionId },
    });
    if (!perm) throw new NotFoundException('Permiso no encontrado');

    // Solo SUPERADMIN puede asignar permisos de sistema
    if (perm.isSystem && admin.role !== Role.SUPERADMIN) {
      throw new ForbiddenException('No puedes asignar permisos de sistema');
    }

    const userPerm = await this.prisma.userPermission.upsert({
      where: {
        userId_permissionId: { userId, permissionId: dto.permissionId },
      },
      create: {
        userId,
        permissionId: dto.permissionId,
        granted: dto.granted,
        reason: dto.reason,
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
        updatedBy: admin.id,
      },
      update: {
        granted: dto.granted,
        reason: dto.reason,
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
        updatedBy: admin.id,
      },
    });

    // Invalidar caché de permisos del usuario
    await this.redis.del(`permissions:user:${userId}`);

    return { success: true, userPerm };
  }

  async removeUserPermission(
    userId: string, 
    permissionId: string, 
    admin: { id: string; role: Role }
  ) {
    await this.validateUserAccess(admin, userId);

    await this.prisma.userPermission.deleteMany({
      where: { userId, permissionId },
    });

    await this.redis.del(`permissions:user:${userId}`);

    return { success: true };
  }

  async resetUserPermissions(userId: string, admin: { id: string; role: Role }) {
    await this.validateUserAccess(admin, userId);

    await this.prisma.userPermission.deleteMany({
      where: { userId },
    });

    await this.redis.del(`permissions:user:${userId}`);

    return { success: true, message: 'Permisos individuales eliminados. El usuario ahora usa solo los permisos de su rol.' };
  }
}
