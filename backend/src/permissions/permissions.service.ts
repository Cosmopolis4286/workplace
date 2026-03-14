import { Injectable, ForbiddenException, ConflictException, NotFoundException } from '@nestjs/common'
import { Role } from '@prisma/client'
import { CreatePermissionDto } from './dto/create-permission.dto'
import { PrismaService } from '../prisma/prisma.service'
import { RedisService } from '../redis/redis.service'

const CACHE_TTL = 300
const cacheKey = (role: Role) => `permissions:role:${role}`

@Injectable()
export class PermissionsService {
  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
  ) {}

  // ── Used by PermissionsGuard on every request ──────────────────────────────

  async getRolePermissions(role: Role): Promise<string[]> {
    const cached = await this.redis.get(cacheKey(role))
    if (cached) return JSON.parse(cached) as string[]

    const records = await this.prisma.rolePermission.findMany({
      where: { role, granted: true },
      include: { permission: true },
    })
    const keys = records.map(r => r.permission.key)

    await this.redis.set(cacheKey(role), JSON.stringify(keys), CACHE_TTL)
    return keys
  }

  async hasPermission(role: Role, permissionKey: string): Promise<boolean> {
    const keys = await this.getRolePermissions(role)
    return keys.includes(permissionKey)
  }

  // ── Frontend endpoint: permissions for the logged-in user ─────────────────

  async getMyPermissions(role: Role): Promise<{ keys: string[] }> {
    const keys = await this.getRolePermissions(role)
    return { keys }
  }

  // ── Admin panel: full matrix ───────────────────────────────────────────────

  async getMatrixForAllRoles() {
    const permissions = await this.prisma.permission.findMany({
      include: { rolePermissions: true },
      orderBy: [{ module: 'asc' }, { action: 'asc' }],
    })

    return permissions.map(p => ({
      id: p.id,
      key: p.key,
      module: p.module,
      action: p.action,
      label: p.label,
      description: p.description,
      isSystem: p.isSystem,
      roles: Object.fromEntries(
        p.rolePermissions.map(rp => [rp.role, rp.granted])
      ),
    }))
  }

  // ── Admin panel: toggle single permission ──────────────────────────────────

  async togglePermission(
    role: Role,
    permissionId: string,
    granted: boolean,
    updatedBy: string,
  ) {
    const perm = await this.prisma.permission.findUniqueOrThrow({
      where: { id: permissionId },
    })
    if (perm.isSystem) {
      throw new ForbiddenException('No se puede modificar un permiso de sistema')
    }

    await this.prisma.rolePermission.upsert({
      where: { role_permissionId: { role, permissionId } },
      create: { role, permissionId, granted, updatedBy },
      update: { granted, updatedBy },
    })

    await this.redis.del(cacheKey(role))
    return { success: true }
  }

  // ── Admin panel: create permission ────────────────────────────────────────

  async createPermission(dto: CreatePermissionDto) {
    const exists = await this.prisma.permission.findUnique({ where: { key: dto.key } })
    if (exists) throw new ConflictException(`Ya existe un permiso con la clave "${dto.key}"`)

    const permission = await this.prisma.permission.create({
      data: {
        key: dto.key,
        module: dto.module,
        action: dto.action,
        label: dto.label,
        description: dto.description,
        isSystem: dto.isSystem ?? false,
      },
    })

    // Create role_permissions entries for all roles (default: not granted)
    const roles = Object.values(Role)
    await this.prisma.rolePermission.createMany({
      data: roles.map(role => ({
        role,
        permissionId: permission.id,
        granted: false,
      })),
      skipDuplicates: true,
    })

    return permission
  }

  // ── Admin panel: delete permission ─────────────────────────────────────────

  async deletePermission(id: string) {
    const perm = await this.prisma.permission.findUnique({ where: { id } })
    if (!perm) throw new NotFoundException('Permiso no encontrado')
    if (perm.isSystem) throw new ForbiddenException('No se puede eliminar un permiso de sistema')

    await this.prisma.rolePermission.deleteMany({ where: { permissionId: id } })
    await this.prisma.permission.delete({ where: { id } })

    // Invalidate all role caches
    await Promise.all(Object.values(Role).map(r => this.redis.del(cacheKey(r))))
    return { success: true }
  }

  // ── Admin panel: bulk update ───────────────────────────────────────────────

  async bulkUpdate(
    updates: Array<{ role: Role; permissionId: string; granted: boolean }>,
    updatedBy: string,
  ) {
    const ids = [...new Set(updates.map(u => u.permissionId))]
    const systemPerms = await this.prisma.permission.findMany({
      where: { id: { in: ids }, isSystem: true },
    })
    if (systemPerms.length > 0) {
      throw new ForbiddenException('No se pueden modificar permisos de sistema')
    }

    await this.prisma.$transaction(
      updates.map(u =>
        this.prisma.rolePermission.upsert({
          where: { role_permissionId: { role: u.role, permissionId: u.permissionId } },
          create: { role: u.role, permissionId: u.permissionId, granted: u.granted, updatedBy },
          update: { granted: u.granted, updatedBy },
        })
      )
    )

    const roles = [...new Set(updates.map(u => u.role))]
    await Promise.all(roles.map(r => this.redis.del(cacheKey(r))))

    return { success: true, updated: updates.length }
  }
}
