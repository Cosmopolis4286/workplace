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
    expect(settings['identity.kycPolicy']).toEqual(
      DEFAULT_KYC_PROGRESSIVE_POLICY
    );
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
      service.set(
        'identity.kycPolicy',
        lowered,
        'root',
        'Cambio de política de prueba'
      )
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
    expect(settings['identity.kycPolicy']).toEqual(
      DEFAULT_KYC_PROGRESSIVE_POLICY
    );
  });

  describe('exigir teléfono verificado', () => {
    const SMS_VARS = [
      'MESSANGI_SMS_ENABLED',
      'MESSANGI_API_KEY',
      'MESSANGI_SMS_FROM',
      'PHONE_OTP_SECRET',
    ];
    const saved: Record<string, string | undefined> = {};
    const withPhone = {
      ...DEFAULT_KYC_PROGRESSIVE_POLICY,
      operations: {
        ...DEFAULT_KYC_PROGRESSIVE_POLICY.operations,
        'provider.contact': 'PHONE_VERIFIED' as const,
      },
    };

    beforeEach(() => {
      for (const name of SMS_VARS) saved[name] = process.env[name];
    });
    afterEach(() => {
      for (const name of SMS_VARS) {
        if (saved[name] === undefined) delete process.env[name];
        else process.env[name] = saved[name];
      }
    });

    it('lo rechaza si el envío de SMS no está activo', async () => {
      delete process.env.MESSANGI_SMS_ENABLED;
      expect(service.capabilities()).toEqual({
        phoneVerificationAvailable: false,
      });
      await expect(
        service.set(
          'identity.kycPolicy',
          withPhone,
          'root',
          'Exigir teléfono para contactar'
        )
      ).rejects.toThrow(/activar el envío de SMS/);
      expect(prisma.platformSetting.upsert).not.toHaveBeenCalled();
    });

    it('lo permite con SMS activo y credenciales cargadas', async () => {
      process.env.MESSANGI_SMS_ENABLED = 'true';
      process.env.MESSANGI_API_KEY = 'clave';
      process.env.MESSANGI_SMS_FROM = 'WorkPlace';
      process.env.PHONE_OTP_SECRET = 'x'.repeat(32);
      expect(service.capabilities()).toEqual({
        phoneVerificationAvailable: true,
      });
      await service.set(
        'identity.kycPolicy',
        withPhone,
        'root',
        'Exigir teléfono para contactar'
      );
      expect(prisma.platformSetting.upsert).toHaveBeenCalled();
    });
  });
});
