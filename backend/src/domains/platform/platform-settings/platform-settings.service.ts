import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { appConfig } from '../../../config/app-config';

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
  // Contactar con sesión basta. El admin puede exigir teléfono verificado
  // (OTP por SMS) solo cuando el envío de SMS está activo en el servidor.
  'provider.contact': 'AUTHENTICATED',
  // Pedir o solicitar no mueve dinero: basta con la sesión. El KYC del
  // comprador se pide al pagar, por encima de `kyc.buyerThresholdUsd`.
  'service.request': 'AUTHENTICATED',
  'catalog.order': 'AUTHENTICATED',
  'service.publish': 'KYC_APPROVED',
  'work.accept': 'KYC_APPROVED',
  'ride.create': 'KYC_APPROVED',
  'ride.accept': 'KYC_APPROVED',
  'wallet.withdraw': 'KYC_APPROVED',
  'delivery.create': 'KYC_APPROVED',
  'job.publish': 'KYC_APPROVED',
  'job.apply': 'KYC_APPROVED',
  'usage-credits.purchase': 'KYC_APPROVED',
  'payment-account.manage': 'KYC_APPROVED',
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
  // Monto (USD) por encima del cual un comprador debe tener su identidad
  // verificada (KYC) para pagar. 0 = siempre. Vender y retirar siempre la exigen.
  'kyc.buyerThresholdUsd': { type: 'number', default: 50, public: true },
  // Exigir verificación en dos pasos (2FA) a ADMIN y SUPERADMIN para usar el
  // panel. Solo lo activa quien ya tiene 2FA, así nadie se queda fuera.
  'security.staffTwoFactorRequired': {
    type: 'boolean',
    default: false,
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
    return (
      KYC_LEVELS.includes(level) && LEVEL_RANK[level] >= LEVEL_RANK[minimum]
    );
  });
}

@Injectable()
export class PlatformSettingsService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject('AUDIT_SERVICE') private readonly audit: AuditLogger
  ) {}

  // RolesGuard lo consulta en cada request de administración: se guarda unos
  // segundos para no ir a la base cada vez. set() lo limpia al cambiarlo.
  private staffTwoFactorCache: { value: boolean; expiresAt: number } | null =
    null;

  async isStaffTwoFactorRequired(): Promise<boolean> {
    const now = Date.now();
    if (this.staffTwoFactorCache && this.staffTwoFactorCache.expiresAt > now) {
      return this.staffTwoFactorCache.value;
    }
    const row = await this.prisma.platformSetting.findUnique({
      where: { key: 'security.staffTwoFactorRequired' },
      select: { value: true },
    });
    const value = row?.value === true;
    this.staffTwoFactorCache = { value, expiresAt: now + 30_000 };
    return value;
  }

  /** Qué niveles de la política se pueden exigir hoy en este servidor. */
  capabilities() {
    return {
      phoneVerificationAvailable: appConfig.features.phoneVerification(),
    };
  }

  async getAll(onlyPublic = false) {
    const rows = await this.prisma.platformSetting.findMany();
    const stored = new Map(rows.map((r) => [r.key, r.value]));
    const entries = Object.entries(PLATFORM_SETTINGS)
      .filter(([, def]) => !onlyPublic || def.public)
      .map(([key, def]) => {
        const value = stored.has(key) ? stored.get(key) : def.default;
        if (
          key === 'identity.kycPolicy' &&
          !validateKycProgressivePolicy(value)
        ) {
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
      const needsPhone = Object.values(value.operations).includes(
        'PHONE_VERIFIED'
      );
      if (needsPhone && !appConfig.features.phoneVerification()) {
        throw new BadRequestException(
          'Para exigir teléfono verificado primero hay que activar el envío de SMS (Messangi) en el servidor'
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

    if (key === 'security.staffTwoFactorRequired' && value === true) {
      const actor = await this.prisma.user.findUnique({
        where: { id: adminId },
        select: { twoFactorEnabled: true },
      });
      if (!actor?.twoFactorEnabled) {
        throw new BadRequestException(
          'Activa primero tu propia verificación en dos pasos: si no, al guardar perderías el acceso al panel'
        );
      }
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
    if (key === 'security.staffTwoFactorRequired') {
      this.staffTwoFactorCache = null;
    }

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
