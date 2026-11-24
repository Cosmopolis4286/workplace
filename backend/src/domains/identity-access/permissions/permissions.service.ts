import {
  Injectable,
  ForbiddenException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import {
  Role,
  AuditAction,
  ProfileType,
  ProfessionalSubtype,
  ProfileStatus,
} from '@prisma/client';
import { CreatePermissionDto } from './dto/create-permission.dto';
import { UpdateUserPermissionDto } from './dto/update-user-permission.dto';
import { PrismaService } from '../../../prisma/prisma.service';
import { RedisService } from '../../../redis/redis.service';
import { UsersService } from '../users/users.service';
import { PermissionsFacade } from './permissions.facade';
import { AuditService } from '../audit/audit.service';

const CACHE_TTL = 300;
const cacheKey = (role: Role) => `permissions:role:${role}`;
// Caché independiente de excepciones individuales; los cambios de rol
// no alteran este mapa y los cambios de usuario lo invalidan explícitamente.
const userOverridesCacheKey = (userId: string) =>
  `permissions:overrides:user:${userId}`;
const userVersionKey = (userId: string) => `permissions:version:user:${userId}`;
const roleVersionKey = (role: Role) => `permissions:version:${role}`;
const profileCacheKey = (
  type: ProfileType,
  subtype: ProfessionalSubtype | null
) => `permissions:profile:${type}:${subtype ?? 'none'}`;
// Clave legible usada en la respuesta de la matriz admin (frontend), distinta
// de profileCacheKey (interna, Redis) para no acoplar el shape HTTP al cache.
const profileMatrixKey = (
  type: ProfileType,
  subtype: ProfessionalSubtype | null
) => (subtype ? `${type}_${subtype}` : type);

@Injectable()
export class PermissionsService implements PermissionsFacade {
  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
    private usersService: UsersService,
    private auditService: AuditService
  ) {}

  private async recordPermissionChange(params: {
    actorId: string;
    scope: 'role' | 'profile' | 'user' | 'permission';
    action?: AuditAction;
    target: Record<string, unknown>;
    before: unknown;
    after: unknown;
    reason?: string | null;
  }): Promise<void> {
    await this.auditService.log({
      userId: params.actorId,
      action: params.action ?? AuditAction.UPDATE,
      module: 'permisos',
      entityId: String(
        params.target.id ??
          params.target.permissionId ??
          params.target.userId ??
          params.target.role ??
          params.target.profileType ??
          'rbac'
      ),
      summary: `Cambio de permisos (${params.scope})`,
      details: {
        eventType: 'RBAC_PERMISSION_CHANGED',
        operationId: randomUUID(),
        scope: params.scope,
        target: params.target,
        before: params.before,
        after: params.after,
        reason: params.reason ?? null,
      },
      statusCode: 200,
    });
  }

  // ── Used by PermissionsGuard on every request ──────────────────────────────

  async getRolePermissions(role: Role): Promise<string[]> {
    const cached = await this.redis.get(cacheKey(role));
    if (cached) return JSON.parse(cached) as string[];

    const records = await this.prisma.rolePermission.findMany({
      where: { role, granted: true },
      include: { permission: true },
    });
    const keys = records.map((r) => r.permission.key);

    await this.redis.setex(cacheKey(role), CACHE_TTL, JSON.stringify(keys));
    return keys;
  }

  async hasPermission(role: Role, permissionKey: string): Promise<boolean> {
    const keys = await this.getRolePermissions(role);
    return keys.includes(permissionKey);
  }

  // ── Permisos por UserProfile (perfiles múltiples) ──────────────────────────

  async getProfilePermissions(
    type: ProfileType,
    subtype: ProfessionalSubtype | null
  ): Promise<string[]> {
    const cached = await this.redis.get(profileCacheKey(type, subtype));
    if (cached) return JSON.parse(cached) as string[];

    const records = await this.prisma.profilePermission.findMany({
      where: { profileType: type, subtype, granted: true },
      include: { permission: true },
    });
    const keys = records.map((r) => r.permission.key);

    await this.redis.setex(
      profileCacheKey(type, subtype),
      CACHE_TTL,
      JSON.stringify(keys)
    );
    return keys;
  }

  /**
   * Permisos otorgados por el CONJUNTO de UserProfile ACTIVE de un usuario
   * (unión — si tiene 2 perfiles activos, obtiene los permisos de ambos).
   * No incluye SUPERADMIN/ADMIN/NORMAL: esos no son perfiles de negocio y
   * siguen resolviéndose por RolePermission (ver hasEffectivePermission).
   */
  /**
   * Cuántas cuentas tienen hoy activo un perfil (y si incluye a quien
   * consulta): el panel lo muestra antes de guardar cambios en la matriz
   * por perfil, que se aplican a todas esas cuentas a la vez.
   */
  async getProfileImpact(
    profileType: ProfileType,
    subtype: ProfessionalSubtype | null,
    requesterId: string
  ) {
    const where = {
      type: profileType,
      ...(subtype ? { subtype } : {}),
      status: ProfileStatus.ACTIVE,
    };
    const [activeUsers, mine] = await Promise.all([
      this.prisma.userProfile.count({ where }),
      this.prisma.userProfile.count({
        where: { ...where, userId: requesterId },
      }),
    ]);
    return { profileType, subtype, activeUsers, includesYou: mine > 0 };
  }

  async getActiveProfilePermissions(
    userId: string,
    profileId?: string
  ): Promise<string[]> {
    const profiles = await this.prisma.userProfile.findMany({
      where: {
        userId,
        status: ProfileStatus.ACTIVE,
        ...(profileId ? { id: profileId } : {}),
      },
      select: { type: true, subtype: true },
    });
    if (profiles.length === 0) return [];

    const keysPerProfile = await Promise.all(
      profiles.map((p) => this.getProfilePermissions(p.type, p.subtype))
    );
    return Array.from(new Set(keysPerProfile.flat()));
  }

  // ── Mapa de overrides individuales del usuario (para el guard) ────────────

  async getUserOverrides(userId: string): Promise<Record<string, boolean>> {
    const cached = await this.redis.get(userOverridesCacheKey(userId));
    if (cached) return JSON.parse(cached) as Record<string, boolean>;

    const userPerms = await this.prisma.userPermission.findMany({
      where: { userId },
      include: { permission: { select: { key: true } } },
    });

    const overrides: Record<string, boolean> = {};
    const now = new Date();
    let cacheTtl = CACHE_TTL;
    for (const up of userPerms) {
      // Override expirado: no concede ni deniega, cae de vuelta al permiso de rol.
      if (up.expiresAt) {
        const remainingSeconds = Math.ceil(
          (up.expiresAt.getTime() - now.getTime()) / 1000
        );
        if (remainingSeconds <= 0) continue;
        // La caché nunca debe sobrevivir al primer override que expire.
        cacheTtl = Math.min(cacheTtl, Math.max(1, remainingSeconds));
      }
      overrides[up.permission.key] = up.granted;
    }

    await this.redis.setex(
      userOverridesCacheKey(userId),
      cacheTtl,
      JSON.stringify(overrides)
    );
    return overrides;
  }

  /**
   * Fuente de verdad para CUALQUIER chequeo de autorización real (usado por
   * PermissionsGuard en cada request). Orden: override individual del
   * usuario (si existe, manda) → si no, permiso de ROL → permiso heredado
   * por perfiles ACTIVE. Sin contexto explícito se conserva la unión para
   * vistas generales; con @RequireProfileContext se filtra por el ID exacto
   * de perfil que ProfileContextGuard validó para esta petición.
   */
  async hasEffectivePermission(
    userId: string,
    role: Role,
    permissionKey: string,
    profileId?: string
  ): Promise<boolean> {
    const overrides = await this.getUserOverrides(userId);
    if (permissionKey in overrides) return overrides[permissionKey];

    if (await this.hasPermission(role, permissionKey)) return true;

    const profileKeys = await this.getActiveProfilePermissions(
      userId,
      profileId
    );
    return profileKeys.includes(permissionKey);
  }

  // ── Frontend endpoint: permissions for the logged-in user ─────────────────

  async getMyPermissions(
    role: Role,
    userId?: string
  ): Promise<{
    keys: string[];
    category: string | null;
    subcategory: string | null;
    version: string;
    userSpecific?: string[];
  }> {
    const roleKeys = await this.getRolePermissions(role);
    let keys = roleKeys;
    let userSpecific: string[] | undefined;

    // Resolver categoría del usuario si se proporciona userId
    let category: string | null = null;
    let subcategory: string | null = null;

    if (userId) {
      const [userKeys, profileKeys] = await Promise.all([
        this.getUserSpecificPermissions(userId),
        this.getActiveProfilePermissions(userId),
      ]);
      // Combinar: rol + permisos de perfiles activos + individuales
      // concedidos - individuales denegados (el override de usuario manda
      // sobre ambas fuentes, igual que en hasEffectivePermission).
      const combined = new Set([...roleKeys, ...profileKeys]);
      for (const up of userKeys) {
        if (up.granted) combined.add(up.permissionKey);
        else combined.delete(up.permissionKey);
      }
      keys = Array.from(combined);
      userSpecific = userKeys
        .filter((u) => u.granted)
        .map((u) => u.permissionKey);

      // Obtener categoría/subcategoría del usuario para el sidebar y middleware
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: {
          category: { select: { name: true } },
          subcategory: { select: { name: true } },
        },
      });
      category = user?.category?.name ?? null;
      subcategory = user?.subcategory?.name ?? null;
    }

    // version = compuesto de la versión de ROL + versión de USUARIO, para que
    // el frontend detecte cambios de cualquiera de las 2 fuentes comparando
    // un solo string (ver getOrSetRoleVersion/getUserVersion).
    const roleVersion = await this.getOrSetRoleVersion(role);
    const userVersion = userId ? await this.getUserVersion(userId) : '0';
    const version = `${roleVersion}:${userVersion}`;

    return { keys, category, subcategory, version, userSpecific };
  }

  // Invalida la caché de un perfil y fuerza a sus usuarios activos a recargar
  // permisos. La versión se consulta desde Nuxt para sincronizar la UI sin
  // esperar el TTL de Redis.
  private async invalidateProfilePermissionsCache(
    type: ProfileType,
    subtype: ProfessionalSubtype | null
  ): Promise<void> {
    await this.redis.del(profileCacheKey(type, subtype));
    const activeProfiles = await this.prisma.userProfile.findMany({
      where: { status: ProfileStatus.ACTIVE, type, subtype },
      select: { userId: true },
    });
    const userIds = [...new Set((activeProfiles ?? []).map((p) => p.userId))];
    await Promise.all(userIds.map((userId) => this.bumpUserVersion(userId)));
  }

  // Llamar cuando se modifiquen permisos del rol para invalidar cache de clientes
  async invalidateRoleVersion(role: Role): Promise<void> {
    const newVersion = Date.now().toString();
    await this.redis.setex(roleVersionKey(role), CACHE_TTL, newVersion);
    // También invalida el cache de keys del rol
    await this.redis.del(cacheKey(role));
  }

  async getOrSetRoleVersion(role: Role): Promise<string> {
    let version = await this.redis.get(roleVersionKey(role));
    if (!version) {
      version = Date.now().toString();
      await this.redis.setex(roleVersionKey(role), CACHE_TTL, version);
    }
    return version;
  }

  async bumpUserVersion(userId: string): Promise<string> {
    const newVersion = Date.now().toString();
    await this.redis.setex(userVersionKey(userId), CACHE_TTL, newVersion);
    return newVersion;
  }

  async getUserVersion(userId: string): Promise<string> {
    let version = await this.redis.get(userVersionKey(userId));
    if (!version) {
      version = Date.now().toString();
      await this.redis.setex(userVersionKey(userId), CACHE_TTL, version);
    }
    return version;
  }

  private async getUserSpecificPermissions(
    userId: string
  ): Promise<Array<{ permissionKey: string; granted: boolean }>> {
    const userPerms = await this.prisma.userPermission.findMany({
      where: { userId },
      include: { permission: true },
    });

    return userPerms.map((up) => ({
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
    const filteredPerms =
      adminRole === Role.ADMIN
        ? permissions.filter((p) => !p.isSystem)
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

  // ── Admin panel: full matrix por UserProfile ───────────────────────────────

  // Las 6 combinaciones válidas de perfil de negocio (CUSTOMER/JOB_SEEKER no
  // llevan permisos propios — equivalen a NORMAL, sin acceso de negocio).
  static readonly PROFILE_MATRIX_KEYS: Array<{
    profileType: ProfileType;
    subtype: ProfessionalSubtype | null;
  }> = [
    { profileType: ProfileType.BUSINESS, subtype: null },
    {
      profileType: ProfileType.PROFESSIONAL,
      subtype: ProfessionalSubtype.FREELANCER,
    },
    {
      profileType: ProfileType.PROFESSIONAL,
      subtype: ProfessionalSubtype.SERVICE_PROVIDER,
    },
  ];

  async getMatrixForAllProfiles(adminRole?: Role) {
    const permissions = await this.prisma.permission.findMany({
      include: { profilePermissions: true },
      orderBy: [{ module: 'asc' }, { action: 'asc' }],
    });

    // Mismo criterio que getMatrixForAllRoles: ADMIN no ve permisos de sistema.
    const filteredPerms =
      adminRole === Role.ADMIN
        ? permissions.filter((p) => !p.isSystem)
        : permissions;

    return filteredPerms.map((p) => ({
      id: p.id,
      key: p.key,
      module: p.module,
      action: p.action,
      label: p.label,
      description: p.description,
      isSystem: p.isSystem,
      profiles: Object.fromEntries(
        p.profilePermissions.map((pp) => [
          profileMatrixKey(pp.profileType, pp.subtype),
          pp.granted,
        ])
      ),
    }));
  }

  async toggleProfilePermission(
    profileType: ProfileType,
    subtype: ProfessionalSubtype | null,
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

    const existing = await this.prisma.profilePermission.findFirst({
      where: { profileType, subtype: subtype ?? null, permissionId },
      select: { id: true, granted: true },
    });
    if (existing) {
      await this.prisma.profilePermission.update({
        where: { id: existing.id },
        data: { granted, updatedBy },
      });
    } else {
      await this.prisma.profilePermission.create({
        data: {
          profileType,
          subtype: subtype ?? null,
          permissionId,
          granted,
          updatedBy,
        },
      });
    }

    await this.invalidateProfilePermissionsCache(profileType, subtype);
    await this.recordPermissionChange({
      actorId: updatedBy,
      scope: 'profile',
      target: {
        profileType,
        subtype: subtype ?? null,
        permissionId,
        permissionKey: perm.key,
      },
      before: existing ? { granted: existing.granted } : null,
      after: { granted },
    });
    return { success: true };
  }

  async bulkUpdateProfilePermissions(
    updates: Array<{
      profileType: ProfileType;
      subtype?: ProfessionalSubtype;
      permissionId: string;
      granted: boolean;
    }>,
    updatedBy: string
  ) {
    const ids = [...new Set(updates.map((u) => u.permissionId))];
    const beforeRows = await this.prisma.profilePermission.findMany({
      where: {
        permissionId: { in: ids },
        OR: updates.map((update) => ({
          profileType: update.profileType,
          subtype: update.subtype ?? null,
        })),
      },
      select: {
        profileType: true,
        subtype: true,
        permissionId: true,
        granted: true,
      },
    });
    const beforeMap = new Map(
      beforeRows.map((row) => [
        `${row.profileType}:${row.subtype ?? 'none'}:${row.permissionId}`,
        row.granted,
      ])
    );
    const systemPerms = await this.prisma.permission.findMany({
      where: { id: { in: ids }, isSystem: true },
    });
    if (systemPerms.length > 0) {
      throw new ForbiddenException(
        'No se pueden modificar permisos de sistema'
      );
    }

    for (const u of updates) {
      const subtype = u.subtype ?? null;
      const existing = await this.prisma.profilePermission.findFirst({
        where: {
          profileType: u.profileType,
          subtype,
          permissionId: u.permissionId,
        },
        select: { id: true },
      });
      if (existing) {
        await this.prisma.profilePermission.update({
          where: { id: existing.id },
          data: { granted: u.granted, updatedBy },
        });
      } else {
        await this.prisma.profilePermission.create({
          data: {
            profileType: u.profileType,
            subtype,
            permissionId: u.permissionId,
            granted: u.granted,
            updatedBy,
          },
        });
      }
    }

    const uniqueKeys = new Map(
      updates.map((u) => [
        `${u.profileType}:${u.subtype ?? 'none'}`,
        { profileType: u.profileType, subtype: u.subtype ?? null },
      ])
    );
    await Promise.all(
      Array.from(uniqueKeys.values()).map((k) =>
        this.invalidateProfilePermissionsCache(k.profileType, k.subtype)
      )
    );

    await this.recordPermissionChange({
      actorId: updatedBy,
      scope: 'profile',
      target: { batch: true, count: updates.length },
      before: updates.map((u) => ({
        profileType: u.profileType,
        subtype: u.subtype ?? null,
        permissionId: u.permissionId,
        granted:
          beforeMap.get(
            `${u.profileType}:${u.subtype ?? 'none'}:${u.permissionId}`
          ) ?? null,
      })),
      after: updates.map((u) => ({ ...u, subtype: u.subtype ?? null })),
    });
    return { success: true, updated: updates.length };
  }

  async getAllPermissions() {
    return this.prisma.permission.findMany({
      orderBy: [{ module: 'asc' }, { action: 'asc' }],
      select: {
        id: true,
        key: true,
        module: true,
        action: true,
        label: true,
        isSystem: true,
      },
    });
  }

  async isSystemPermission(permissionId: string): Promise<boolean> {
    const perm = await this.prisma.permission.findUnique({
      where: { id: permissionId },
      select: { isSystem: true },
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
    if (role === Role.SUPERADMIN) {
      throw new ForbiddenException('El rol SUPERADMIN está protegido');
    }
    const perm = await this.prisma.permission.findUniqueOrThrow({
      where: { id: permissionId },
    });
    if (perm.isSystem) {
      throw new ForbiddenException(
        'No se puede modificar un permiso de sistema'
      );
    }

    const existing = await this.prisma.rolePermission.findUnique({
      where: { role_permissionId: { role, permissionId } },
      select: { granted: true },
    });
    await this.prisma.rolePermission.upsert({
      where: { role_permissionId: { role, permissionId } },
      create: { role, permissionId, granted, updatedBy },
      update: { granted, updatedBy },
    });

    // Invalida cache de keys y bumps la version para que los clientes re-carguen.
    // No hace falta tocar userOverridesCacheKey: los UserPermission son
    // overrides independientes del rol, hasEffectivePermission siempre relee
    // getRolePermissions(role) en caliente (ya invalidado aquí abajo).
    await this.invalidateRoleVersion(role);
    await this.recordPermissionChange({
      actorId: updatedBy,
      scope: 'role',
      target: { role, permissionId, permissionKey: perm.key },
      before: existing ? { granted: existing.granted } : null,
      after: { granted },
    });
    return { success: true };
  }

  // ── Admin panel: create permission ────────────────────────────────────────

  async createPermission(dto: CreatePermissionDto, createdBy?: string) {
    if (dto.grantedRoles?.includes(Role.SUPERADMIN)) {
      throw new ForbiddenException(
        'SUPERADMIN no se configura desde la matriz de permisos'
      );
    }
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

    // Create role_permissions entries for all roles (granted solo para los
    // roles seleccionados al crear; el resto queda en false por defecto)
    const grantedSet = new Set(dto.grantedRoles ?? []);
    const roles = Object.values(Role);
    await this.prisma.rolePermission.createMany({
      data: roles.map((role) => ({
        role,
        permissionId: permission.id,
        granted: grantedSet.has(role),
        updatedBy: createdBy,
      })),
      skipDuplicates: true,
    });

    // Igual patrón para profile_permissions: filas base en false, ajustables
    // luego desde la matriz por perfil (no hay un dto.grantedProfiles todavía
    // — se activan manualmente, igual que un rol nuevo empieza sin permisos).
    await this.prisma.profilePermission.createMany({
      data: PermissionsService.PROFILE_MATRIX_KEYS.map(
        ({ profileType, subtype }) => ({
          profileType,
          subtype,
          permissionId: permission.id,
          granted: false,
          updatedBy: createdBy,
        })
      ),
      skipDuplicates: true,
    });

    // Un permiso nuevo puede nacer concedido a roles seleccionados.
    await Promise.all(
      [...grantedSet].map((role) => this.invalidateRoleVersion(role))
    );
    if (createdBy) {
      await this.recordPermissionChange({
        actorId: createdBy,
        scope: 'permission',
        action: AuditAction.CREATE,
        target: {
          id: permission.id,
          permissionId: permission.id,
          permissionKey: permission.key,
        },
        before: null,
        after: {
          key: permission.key,
          module: permission.module,
          action: permission.action,
          isSystem: permission.isSystem,
          grantedRoles: [...grantedSet],
        },
      });
    }
    return permission;
  }

  // ── Admin panel: delete permission ─────────────────────────────────────────

  async deletePermission(id: string, deletedBy?: string) {
    const perm = await this.prisma.permission.findUnique({ where: { id } });
    if (!perm) throw new NotFoundException('Permiso no encontrado');
    if (perm.isSystem)
      throw new ForbiddenException(
        'No se puede eliminar un permiso de sistema'
      );

    await this.prisma.rolePermission.deleteMany({
      where: { permissionId: id },
    });
    // profile_permissions se borra en cascada (onDelete: Cascade en el schema)
    // al eliminar el Permission más abajo — no hace falta deleteMany explícito.
    await this.prisma.permission.delete({ where: { id } });

    // Invalidate all role + profile caches
    await Promise.all([
      ...Object.values(Role).map((r) => this.invalidateRoleVersion(r)),
      ...PermissionsService.PROFILE_MATRIX_KEYS.map((k) =>
        this.invalidateProfilePermissionsCache(k.profileType, k.subtype)
      ),
    ]);
    if (deletedBy) {
      await this.recordPermissionChange({
        actorId: deletedBy,
        scope: 'permission',
        action: AuditAction.DELETE,
        target: {
          id: perm.id,
          permissionId: perm.id,
          permissionKey: perm.key,
        },
        before: {
          key: perm.key,
          module: perm.module,
          action: perm.action,
          isSystem: perm.isSystem,
        },
        after: null,
      });
    }
    return { success: true };
  }

  // ── Admin panel: bulk update ───────────────────────────────────────────────

  async bulkUpdate(
    updates: Array<{ role: Role; permissionId: string; granted: boolean }>,
    updatedBy: string
  ) {
    if (updates.some((u) => u.role === Role.SUPERADMIN)) {
      throw new ForbiddenException('El rol SUPERADMIN está protegido');
    }
    const ids = [...new Set(updates.map((u) => u.permissionId))];
    const roles = [...new Set(updates.map((u) => u.role))];
    const beforeRows = await this.prisma.rolePermission.findMany({
      where: { role: { in: roles }, permissionId: { in: ids } },
      select: { role: true, permissionId: true, granted: true },
    });
    const beforeMap = new Map(
      beforeRows.map((row) => [`${row.role}:${row.permissionId}`, row.granted])
    );
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

    await Promise.all(roles.map((r) => this.invalidateRoleVersion(r)));
    await this.recordPermissionChange({
      actorId: updatedBy,
      scope: 'role',
      target: { batch: true, count: updates.length, roles },
      before: updates.map((u) => ({
        ...u,
        granted: beforeMap.get(`${u.role}:${u.permissionId}`) ?? null,
      })),
      after: updates,
    });

    return { success: true, updated: updates.length };
  }

  // ─── User Permission Management ───────────────────────────────────────────

  async getUserPermissionsWithAccessCheck(
    userId: string,
    admin: { id: string; role: Role }
  ) {
    // Validar que el admin puede ver este usuario
    await this.validateUserAccess(admin, userId);

    return this.getUserPermissions(userId);
  }

  async getUserPermissions(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        profiles: {
          where: {
            status: 'ACTIVE',
            type: { in: ['BUSINESS', 'PROFESSIONAL'] },
          },
          select: { type: true, subtype: true },
          take: 1,
        },
      },
    });

    if (!user) throw new NotFoundException('Usuario no encontrado');

    // Obtener permisos del rol
    const rolePermissions = await this.prisma.rolePermission.findMany({
      where: { role: user.role, granted: true },
      include: { permission: true },
    });

    // Los permisos efectivos también incluyen la unión de todos los perfiles
    // activos. El detalle administrativo debe reflejar exactamente lo que
    // PermissionsGuard autoriza, no solo rol + excepciones individuales.
    const profileKeys = new Set(await this.getActiveProfilePermissions(userId));

    // Obtener permisos individuales del usuario
    const userPermissions = await this.prisma.userPermission.findMany({
      where: { userId },
      include: { permission: true },
    });

    // Combinar
    const rolePermMap = new Map(
      rolePermissions.map((rp) => [rp.permission.id, rp.permission])
    );
    const userPermMap = new Map(
      userPermissions.map((up) => [
        up.permission.id,
        {
          ...up,
          isGranted: up.granted && (!up.expiresAt || up.expiresAt > new Date()),
        },
      ])
    );

    // Todos los permisos disponibles
    const allPermissions = await this.prisma.permission.findMany({
      orderBy: [{ module: 'asc' }, { action: 'asc' }],
    });

    const permissions = allPermissions.map((p) => {
      const hasRolePermission = rolePermMap.has(p.id);
      const hasProfilePermission = profileKeys.has(p.key);
      const userPerm = userPermMap.get(p.id);
      const hasActiveUserOverride =
        !!userPerm && (!userPerm.expiresAt || userPerm.expiresAt > new Date());

      let effectiveGranted = hasRolePermission || hasProfilePermission;
      let source: 'role' | 'profile' | 'user' | 'none' = hasRolePermission
        ? 'role'
        : hasProfilePermission
          ? 'profile'
          : 'none';

      // Un override vencido deja de existir: vuelve a aplicar rol/perfil.
      if (hasActiveUserOverride) {
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
        profileGranted: hasProfilePermission,
        userGranted: hasActiveUserOverride ? userPerm.granted : null,
        userDenied: hasActiveUserOverride && !userPerm.granted,
        expiresAt: hasActiveUserOverride ? userPerm.expiresAt : null,
        reason: hasActiveUserOverride ? userPerm.reason : null,
        effectiveGranted,
        source,
      };
    });

    const result = {
      user,
      permissions: permissions.filter(
        (p) => p.effectiveGranted || p.userGranted !== null
      ),
      allPermissions: permissions,
    };

    return result;
  }

  // Invalida los overrides Redis y fuerza al cliente a recargar el estado
  // de autorización tras un cambio individual.
  private async invalidateUserPermissionsCache(userId: string): Promise<void> {
    await this.redis.del(userOverridesCacheKey(userId));
    await this.bumpUserVersion(userId);
  }

  async validateUserAccess(
    admin: { id: string; role: Role },
    userId: string,
    options: { write?: boolean } = {}
  ) {
    // Nadie se concede ni se quita permisos a sí mismo: los overrides
    // individuales los cambia otra persona y queda en la auditoría.
    if (options.write && admin.id === userId) {
      throw new ForbiddenException(
        'No puedes modificar tus propios permisos individuales'
      );
    }

    const targetUser = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true },
    });

    if (!targetUser) throw new NotFoundException('Usuario no encontrado');

    // SUPERADMIN puede ver todos excepto otros SUPERADMIN (a menos que sea él mismo)
    if (admin.role === Role.SUPERADMIN) {
      if (targetUser.role === Role.SUPERADMIN && targetUser.id !== admin.id) {
        throw new ForbiddenException(
          'No puedes gestionar permisos de otros SUPERADMIN'
        );
      }
      return;
    }

    // ADMIN no puede ver SUPERADMIN ni otros ADMIN
    if (admin.role === Role.ADMIN) {
      if (targetUser.role === Role.SUPERADMIN) {
        throw new ForbiddenException('No tienes acceso a usuarios SUPERADMIN');
      }
      if (targetUser.role === Role.ADMIN && targetUser.id !== admin.id) {
        throw new ForbiddenException(
          'No puedes gestionar permisos de otros ADMIN'
        );
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
    profileKind?: 'BUSINESS' | 'FREELANCER' | 'SERVICE_PROVIDER';
  }) {
    const {
      role,
      search,
      page,
      limit,
      visibleRoles,
      excludeUserId,
      profileKind,
    } = params;

    // Reusa el mismo where-builder que /users (findAllUsers) para no
    // mantener dos veces la lógica de scoping por rol/búsqueda.
    // allowedRoles ya implementa "si se pide un rol fuera del conjunto
    // visible, no devolver nada" (intersección, no override).
    const where = this.usersService.buildUsersWhere({
      roleFilter: role,
      allowedRoles: visibleRoles,
      search,
      excludeUserId,
      profileKind,
    });

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
          // Mismo propósito que en UsersService.findAllUsers: Role ya no
          // distingue Comercio/Freelancer/Prestador de servicio.
          profiles: {
            where: {
              status: 'ACTIVE',
              type: { in: ['BUSINESS', 'PROFESSIONAL'] },
            },
            select: { type: true, subtype: true },
            take: 1,
          },
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      users: users.map((u) => ({
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
    await this.validateUserAccess(admin, userId, { write: true });

    const perm = await this.prisma.permission.findUnique({
      where: { id: dto.permissionId },
    });
    if (!perm) throw new NotFoundException('Permiso no encontrado');

    // Solo SUPERADMIN puede asignar permisos de sistema
    if (perm.isSystem && admin.role !== Role.SUPERADMIN) {
      throw new ForbiddenException('No puedes asignar permisos de sistema');
    }

    const existing = await this.prisma.userPermission.findUnique({
      where: {
        userId_permissionId: { userId, permissionId: dto.permissionId },
      },
      select: { granted: true, reason: true, expiresAt: true },
    });
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

    // Invalidar caché de permisos del usuario y bump de versión (tiempo real)
    await this.invalidateUserPermissionsCache(userId);
    await this.recordPermissionChange({
      actorId: admin.id,
      scope: 'user',
      target: {
        userId,
        permissionId: dto.permissionId,
        permissionKey: perm.key,
      },
      before: existing,
      after: {
        granted: userPerm.granted,
        reason: userPerm.reason,
        expiresAt: userPerm.expiresAt,
      },
      reason: dto.reason,
    });

    return { success: true, userPerm };
  }

  async removeUserPermission(
    userId: string,
    permissionId: string,
    admin: { id: string; role: Role }
  ) {
    await this.validateUserAccess(admin, userId, { write: true });

    const existing = await this.prisma.userPermission.findUnique({
      where: { userId_permissionId: { userId, permissionId } },
      select: { granted: true, reason: true, expiresAt: true },
    });
    const deleted = await this.prisma.userPermission.deleteMany({
      where: { userId, permissionId },
    });

    await this.invalidateUserPermissionsCache(userId);
    if (deleted.count > 0) {
      await this.recordPermissionChange({
        actorId: admin.id,
        scope: 'user',
        target: { userId, permissionId },
        before: existing,
        after: null,
      });
    }

    return { success: true };
  }

  async resetUserPermissions(
    userId: string,
    admin: { id: string; role: Role }
  ) {
    await this.validateUserAccess(admin, userId, { write: true });

    const existing = await this.prisma.userPermission.findMany({
      where: { userId },
      select: {
        permissionId: true,
        granted: true,
        reason: true,
        expiresAt: true,
      },
    });
    await this.prisma.userPermission.deleteMany({
      where: { userId },
    });

    await this.invalidateUserPermissionsCache(userId);
    if (existing.length > 0) {
      await this.recordPermissionChange({
        actorId: admin.id,
        scope: 'user',
        target: { userId, reset: true, count: existing.length },
        before: existing,
        after: [],
      });
    }

    return {
      success: true,
      message: [
        'Permisos individuales eliminados.',
        'El usuario vuelve a heredar los permisos de su rol y de sus perfiles activos.',
      ].join(' '),
    };
  }
}
