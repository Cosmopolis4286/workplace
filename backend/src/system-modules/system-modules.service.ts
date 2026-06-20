import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { ALL_MODULES } from '../plans/plan-limits.service';

const CACHE_KEY = 'system_modules:disabled';
const CACHE_TTL = 300; // 5 min, matches the permissions matrix cache pattern

@Injectable()
export class SystemModulesService {
  constructor(
    private prisma: PrismaService,
    private redis: RedisService
  ) {}

  /** Full list of modules with their current global enabled state, for the admin panel. */
  async listAll() {
    const rows = await this.prisma.systemModule.findMany();
    const byModule = new Map(rows.map((r) => [r.module, r]));

    return ALL_MODULES.map((module) => {
      const row = byModule.get(module);
      return {
        module,
        enabled: row?.enabled ?? true,
        label: row?.label ?? null,
        updatedAt: row?.updatedAt ?? null,
        updatedBy: row?.updatedBy ?? null,
      };
    });
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

  async toggle(module: string, enabled: boolean, updatedBy: string) {
    const result = await this.prisma.systemModule.upsert({
      where: { module },
      update: { enabled, updatedBy },
      create: { module, enabled, updatedBy },
    });
    await this.redis.del(CACHE_KEY);
    return result;
  }
}
