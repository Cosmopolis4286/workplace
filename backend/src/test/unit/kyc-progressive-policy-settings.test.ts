import { BadRequestException } from '@nestjs/common';
import {
  DEFAULT_KYC_PROGRESSIVE_POLICY,
  PlatformSettingsService,
  validateKycProgressivePolicy,
} from '../../domains/platform/platform-settings/platform-settings.service';

describe('PlatformSettingsService — política KYC progresiva', () => {
  let prisma: any;
  let audit: any;
  let service: PlatformSettingsService;

  beforeEach(() => {
    prisma = {
      platformSetting: {
        findMany: jest.fn().mockResolvedValue([]),
        findUnique: jest.fn().mockResolvedValue(null),
        upsert: jest.fn().mockResolvedValue({}),
      },
    };
    audit = { log: jest.fn().mockResolvedValue(undefined) };
    service = new PlatformSettingsService(prisma, audit);
  });

  it('usa una política segura por defecto', async () => {
    const settings = await service.getAll();
    expect(settings['identity.kycPolicy']).toEqual(DEFAULT_KYC_PROGRESSIVE_POLICY);
  });

  it('rechaza una política mal formada o que rebaja mínimos', async () => {
    const lowered = {
      ...DEFAULT_KYC_PROGRESSIVE_POLICY,
      operations: {
        ...DEFAULT_KYC_PROGRESSIVE_POLICY.operations,
        'catalog.order': 'PUBLIC',
      },
    };
    expect(validateKycProgressivePolicy(lowered)).toBe(false);
    await expect(
      service.set('identity.kycPolicy', lowered, 'root', 'Cambio de política de prueba')
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('exige motivo, persiste y registra before/after al cambiar la política', async () => {
    await expect(
      service.set('identity.kycPolicy', DEFAULT_KYC_PROGRESSIVE_POLICY, 'root')
    ).rejects.toBeInstanceOf(BadRequestException);

    await service.set(
      'identity.kycPolicy',
      DEFAULT_KYC_PROGRESSIVE_POLICY,
      'root',
      'Ajuste aprobado por cumplimiento'
    );

    expect(prisma.platformSetting.upsert).toHaveBeenCalled();
    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'root',
        module: 'platform-settings',
        entityId: 'identity.kycPolicy',
        details: expect.objectContaining({
          newValue: DEFAULT_KYC_PROGRESSIVE_POLICY,
          reason: 'Ajuste aprobado por cumplimiento',
        }),
      })
    );
  });

  it('restaura defaults si el valor persistido está corrupto', async () => {
    prisma.platformSetting.findMany.mockResolvedValue([
      { key: 'identity.kycPolicy', value: { version: 99 } },
    ]);
    const settings = await service.getAll();
    expect(settings['identity.kycPolicy']).toEqual(DEFAULT_KYC_PROGRESSIVE_POLICY);
  });
});
