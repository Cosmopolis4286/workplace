import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';

/**
 * Ajustes globales que el SUPERADMIN cambia sin desplegar. Solo se aceptan
 * las claves declaradas aquí, con su tipo y valor por defecto.
 */
export const PLATFORM_SETTINGS = {
  // Mostrar teléfono, correo y WhatsApp de las tiendas en su página pública.
  // Cada comercio puede además ocultarlo (Commerce.showPublicContact).
  'store.publicContact': { type: 'boolean', default: true, public: true },
} as const;

export type PlatformSettingKey = keyof typeof PLATFORM_SETTINGS;

@Injectable()
export class PlatformSettingsService {
  constructor(private readonly prisma: PrismaService) {}

  async getAll(onlyPublic = false) {
    const rows = await this.prisma.platformSetting.findMany();
    const stored = new Map(rows.map((r) => [r.key, r.value]));
    const entries = Object.entries(PLATFORM_SETTINGS)
      .filter(([, def]) => !onlyPublic || def.public)
      .map(([key, def]) => [
        key,
        stored.has(key) ? stored.get(key) : def.default,
      ]);
    return Object.fromEntries(entries) as Record<PlatformSettingKey, unknown>;
  }

  async set(key: string, value: unknown, adminId: string) {
    const def = PLATFORM_SETTINGS[key as PlatformSettingKey];
    if (!def) throw new BadRequestException(`Ajuste desconocido: ${key}`);
    if (typeof value !== def.type) {
      throw new BadRequestException(`"${key}" debe ser ${def.type}`);
    }
    await this.prisma.platformSetting.upsert({
      where: { key },
      create: {
        key,
        value: value as Prisma.InputJsonValue,
        updatedById: adminId,
      },
      update: { value: value as Prisma.InputJsonValue, updatedById: adminId },
    });
    return this.getAll();
  }
}
