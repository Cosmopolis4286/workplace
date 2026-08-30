import { Injectable, ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { RedisService } from '../../../redis/redis.service';
import { SystemModulesFacade } from './system-modules.facade';

const CACHE_KEY = 'system_modules:disabled';
const CATALOG_CACHE_KEY = 'system_modules:catalog';
const CACHE_TTL = 300; // 5 min, matches the permissions matrix cache pattern
const MODULE_KEY_PATTERN = /^[a-z][a-z0-9_]*$/;

@Injectable()
export class SystemModulesService implements SystemModulesFacade {
  constructor(
    private prisma: PrismaService,
    private redis: RedisService
  ) {}

  /**
   * Catálogo completo de módulos (SystemModule es la fuente de verdad —
   * antes vivía como array hardcodeado en module-catalog.data.ts). Usado
   * tanto por el panel de administración (kill-switch) como por
   * /plans/modules/catalog (labels para selects de módulos en todo el
   * frontend) y PlanLimitsService (subset isBusinessModule=true).
   */
  async listAll() {
    const cached = await this.redis.get(CATALOG_CACHE_KEY);
    if (cached) return JSON.parse(cached);

    const rows = await this.prisma.systemModule.findMany({ orderBy: { label: 'asc' } });
    await this.redis.setex(CATALOG_CACHE_KEY, CACHE_TTL, JSON.stringify(rows));
    return rows;
  }

  /** Subset de módulos de negocio (participan en plan∩categoría) — reemplaza ALL_MODULES hardcodeado. */
  async listBusinessModules(): Promise<string[]> {
    const rows = await this.prisma.systemModule.findMany({
      where: { isBusinessModule: true },
      select: { module: true },
      orderBy: { module: 'asc' },
    });
    return rows.map((r) => r.module);
  }

  /** Modules currently disabled globally — intersected into every user's effectiveModules. */
  async getDisabledModules(): Promise<string[]> {
    const cached = await this.redis.get(CACHE_KEY);
    if (cached) return JSON.parse(cached);

    const disabled = await this.prisma.systemModule.findMany({
      where: { enabled: false },
      select: { module: true },
    });
    const modules = disabled.map((d) => d.module);

    await this.redis.setex(CACHE_KEY, CACHE_TTL, JSON.stringify(modules));
    return modules;
  }

  private async invalidateCaches() {
    await Promise.all([this.redis.del(CACHE_KEY), this.redis.del(CATALOG_CACHE_KEY)]);
  }

  async toggle(module: string, enabled: boolean, updatedBy: string) {
    const existing = await this.prisma.systemModule.findUnique({ where: { module } });
    if (!existing) throw new NotFoundException(`Módulo "${module}" no existe en el catálogo`);

    const result = await this.prisma.systemModule.update({
      where: { module },
      data: { enabled, updatedBy },
    });
    await this.invalidateCaches();
    return result;
  }

  /** Alta de un módulo nuevo — dinámico, sin tocar código ni redeploy. */
  async create(dto: { module: string; label: string; isBusinessModule?: boolean }, createdBy: string) {
    const key = dto.module.trim().toLowerCase();
    if (!MODULE_KEY_PATTERN.test(key)) {
      throw new ConflictException('La clave del módulo debe ser snake_case (minúsculas, números, guion bajo)');
    }
    const existing = await this.prisma.systemModule.findUnique({ where: { module: key } });
    if (existing) throw new ConflictException(`Ya existe un módulo con la clave "${key}"`);

    const result = await this.prisma.systemModule.create({
      data: {
        module: key,
        label: dto.label.trim(),
        isBusinessModule: dto.isBusinessModule ?? false,
        isSystemDefault: false,
        updatedBy: createdBy,
      },
    });
    await this.invalidateCaches();
    return result;
  }

  /** Renombrar el label o cambiar si participa en plan∩categoría — la clave (`module`) es inmutable una vez creada. */
  async update(module: string, dto: { label?: string; isBusinessModule?: boolean }, updatedBy: string) {
    const existing = await this.prisma.systemModule.findUnique({ where: { module } });
    if (!existing) throw new NotFoundException(`Módulo "${module}" no existe`);

    const result = await this.prisma.systemModule.update({
      where: { module },
      data: {
        ...(dto.label !== undefined ? { label: dto.label.trim() } : {}),
        ...(dto.isBusinessModule !== undefined ? { isBusinessModule: dto.isBusinessModule } : {}),
        updatedBy,
      },
    });
    await this.invalidateCaches();
    return result;
  }

  /** Solo módulos creados por un admin (isSystemDefault=false) se pueden borrar — los del seed original se deshabilitan, no se eliminan. */
  async remove(module: string) {
    const existing = await this.prisma.systemModule.findUnique({ where: { module } });
    if (!existing) throw new NotFoundException(`Módulo "${module}" no existe`);
    if (existing.isSystemDefault) {
      throw new ForbiddenException('No se puede eliminar un módulo del sistema — puedes deshabilitarlo con el kill-switch');
    }

    await this.prisma.systemModule.delete({ where: { module } });
    await this.invalidateCaches();
    return { success: true };
  }
}
