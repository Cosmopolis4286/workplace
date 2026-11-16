import { KycStatus } from '@prisma/client';
import { KycPolicyService } from '../../domains/identity-access/kyc/kyc-policy.service';
import { DEFAULT_KYC_PROGRESSIVE_POLICY } from '../../domains/platform/platform-settings/platform-settings.service';

describe('KycPolicyService', () => {
  const settings = { getAll: jest.fn() };
  let service: KycPolicyService;

  beforeEach(() => {
    jest.clearAllMocks();
    settings.getAll.mockResolvedValue({
      'identity.kycPolicy': DEFAULT_KYC_PROGRESSIVE_POLICY,
    });
    service = new KycPolicyService(settings as any);
  });

  it('permite explorar sin autenticación', async () => {
    await expect(
      service.evaluate('marketplace.explore', { authenticated: false })
    ).resolves.toMatchObject({ allowed: true, requiredLevel: 'PUBLIC' });
  });

  it('exige teléfono verificado para contactar proveedores', async () => {
    await expect(
      service.evaluate('provider.contact', { authenticated: true })
    ).resolves.toMatchObject({ allowed: false, requiredLevel: 'PHONE_VERIFIED' });
    await expect(
      service.evaluate('provider.contact', { authenticated: true, phoneVerified: true })
    ).resolves.toMatchObject({ allowed: true, currentLevel: 'PHONE_VERIFIED' });
  });

  it('exige KYC aprobado para crear pedidos', async () => {
    await expect(
      service.evaluate('catalog.order', { authenticated: true, kycStatus: KycStatus.PENDING })
    ).resolves.toMatchObject({ allowed: false, requiredLevel: 'KYC_APPROVED' });
    await expect(
      service.evaluate('catalog.order', { authenticated: true, kycStatus: KycStatus.APPROVED })
    ).resolves.toMatchObject({ allowed: true, currentLevel: 'KYC_APPROVED' });
  });

  it('no trata ENHANCED_REVIEW como aprobado automáticamente', async () => {
    const policy = {
      ...DEFAULT_KYC_PROGRESSIVE_POLICY,
      operations: { ...DEFAULT_KYC_PROGRESSIVE_POLICY.operations, 'catalog.order': 'ENHANCED_REVIEW' },
    };
    settings.getAll.mockResolvedValue({ 'identity.kycPolicy': policy });
    await expect(
      service.evaluate('catalog.order', { authenticated: true, kycStatus: KycStatus.APPROVED })
    ).resolves.toMatchObject({ allowed: false, requiredLevel: 'ENHANCED_REVIEW' });
  });
});
