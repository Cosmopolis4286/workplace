import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';

interface AuditLogger {
  log(params: Record<string, unknown>): Promise<void>;
}

export const KYC_LEVELS = [
  'PUBLIC',
  'AUTHENTICATED',
  'PHONE_VERIFIED',
  'KYC_APPROVED',
  'ENHANCED_REVIEW',
] as const;

export type KycLevel = (typeof KYC_LEVELS)[number];

export const KYC_POLICY_MINIMUMS = {
  'marketplace.explore': 'PUBLIC',
  'provider.contact': 'PHONE_VERIFIED',
  'service.request': 'KYC_APPROVED',
  'catalog.order': 'KYC_APPROVED',
  'service.publish': 'KYC_APPROVED',
  'work.accept': 'KYC_APPROVED',
  'ride.create': 'KYC_APPROVED',
  'ride.accept': 'KYC_APPROVED',
  'wallet.withdraw': 'KYC_APPROVED',
} as const;

export type KycPolicyOperation = keyof typeof KYC_POLICY_MINIMUMS;

export interface KycProgressivePolicy {
  version: 1;
  operations: Record<KycPolicyOperation, KycLevel>;
}

export const DEFAULT_KYC_PROGRESSIVE_POLICY: KycProgressivePolicy = {
  version: 1,
  operations: { ...KYC_POLICY_MINIMUMS },
};

export const PLATFORM_SETTINGS = {
  'store.publicContact': { type: 'boolean', default: true, public: true },
  'identity.kycPolicy': {
    type: 'object',
    default: DEFAULT_KYC_PROGRESSIVE_POLICY,
    public: false,
  },
} as const;

export type PlatformSettingKey = keyof typeof PLATFORM_SETTINGS;

const LEVEL_RANK: Record<KycLevel, number> = {
  PUBLIC: 0,
  AUTHENTICATED: 1,
  PHONE_VERIFIED: 2,
  KYC_APPROVED: 3,
  ENHANCED_REVIEW: 4,
};

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function validateKycProgressivePolicy(
  value: unknown
): value is KycProgressivePolicy {
  if (!isPlainObject(value) || value.version !== 1) return false;
  const operations = value.operations;
  if (!isPlainObject(operations)) return false;

  const expected = Object.keys(KYC_POLICY_MINIMUMS);
  if (
    Object.keys(operations).length !== expected.length ||
    expected.some((operation) => !(operation in operations))
  ) {
    return false;
  }

  return expected.every((operation) => {
    const level = operations[operation] as KycLevel;
    const minimum = KYC_POLICY_MINIMUMS[operation as KycPolicyOperation];
    return KYC_LEVELS.includes(level) && LEVEL_RANK[level] >= LEVEL_RANK[minimum];
  });
}

@Injectable()
export class PlatformSettingsService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject('AUDIT_SERVICE') private readonly audit: AuditLogger
  ) {}

  async getAll(onlyPublic = false) {
    const rows = await this.prisma.platformSetting.findMany();
    const stored = new Map(rows.map((r) => [r.key, r.value]));
    const entries = Object.entries(PLATFORM_SETTINGS)
      .filter(([, def]) => !onlyPublic || def.public)
      .map(([key, def]) => {
        const value = stored.has(key) ? stored.get(key) : def.default;
        if (key === 'identity.kycPolicy' && !validateKycProgressivePolicy(value)) {
          return [key, DEFAULT_KYC_PROGRESSIVE_POLICY];
        }
        return [key, value];
      });
    return Object.fromEntries(entries) as Record<PlatformSettingKey, unknown>;
  }

  async set(key: string, value: unknown, adminId: string, reason?: string) {
    const def = PLATFORM_SETTINGS[key as PlatformSettingKey];
    if (!def) throw new BadRequestException(`Ajuste desconocido: ${key}`);

    if (key === 'identity.kycPolicy') {
      if (!validateKycProgressivePolicy(value)) {
        throw new BadRequestException(
          'La política KYC no es válida o reduce un requisito mínimo de seguridad'
        );
      }
      if (!reason || reason.trim().length < 10 || reason.trim().length > 500) {
        throw new BadRequestException(
          'Indica un motivo de entre 10 y 500 caracteres para cambiar la política KYC'
        );
      }
    } else if (typeof value !== def.type) {
      throw new BadRequestException(`"${key}" debe ser ${def.type}`);
    }

    const previous = await this.prisma.platformSetting.findUnique({
      where: { key },
      select: { value: true },
    });
    await this.prisma.platformSetting.upsert({
      where: { key },
      create: {
        key,
        value: value as Prisma.InputJsonValue,
        updatedById: adminId,
      },
      update: { value: value as Prisma.InputJsonValue, updatedById: adminId },
    });

    await this.audit.log({
      userId: adminId,
      action: 'UPDATE',
      module: 'platform-settings',
      entityId: key,
      summary:
        key === 'identity.kycPolicy'
          ? 'Política progresiva KYC actualizada'
          : `Ajuste de plataforma actualizado: ${key}`,
      details: {
        key,
        previousValue: previous?.value ?? def.default,
        newValue: value,
        ...(reason ? { reason: reason.trim() } : {}),
      },
    });

    return this.getAll();
  }
}
