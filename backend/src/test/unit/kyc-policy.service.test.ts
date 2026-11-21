
import { EnhancedReviewStatus, KycStatus } from '@prisma/client';
import { KycPolicyService } from '../../domains/platform/platform-settings/kyc-policy.service';
import { DEFAULT_KYC_PROGRESSIVE_POLICY } from '../../domains/platform/platform-settings/platform-settings.service';

describe('KycPolicyService', () => {
  const settings = { getAll: jest.fn() };
  const prisma = { enhancedReviewRequest: { findUnique: jest.fn() } };
  let service: KycPolicyService;

  beforeEach(() => {
    jest.clearAllMocks();
    settings.getAll.mockResolvedValue({
      'identity.kycPolicy': DEFAULT_KYC_PROGRESSIVE_POLICY,
    });
    service = new KycPolicyService(settings as any, prisma as any);
  });

  it('permite explorar sin autenticación', async () => {
    await expect(
      service.evaluate('marketplace.explore', { authenticated: false })
    ).resolves.toMatchObject({ allowed: true, requiredLevel: 'PUBLIC' });
  });

  it('por defecto basta la sesión para contactar proveedores', async () => {
    await expect(
      service.evaluate('provider.contact', { authenticated: true })
    ).resolves.toMatchObject({
      allowed: true,
      requiredLevel: 'AUTHENTICATED',
    });
    await expect(
      service.evaluate('provider.contact', { authenticated: false })
    ).resolves.toMatchObject({ allowed: false });
  });

  it('si el admin lo exige, contactar pide teléfono verificado', async () => {
    settings.getAll.mockResolvedValue({
      'identity.kycPolicy': {
        ...DEFAULT_KYC_PROGRESSIVE_POLICY,
        operations: {
          ...DEFAULT_KYC_PROGRESSIVE_POLICY.operations,
          'provider.contact': 'PHONE_VERIFIED',
        },
      },
    });
    await expect(
      service.evaluate('provider.contact', { authenticated: true })
    ).resolves.toMatchObject({
      allowed: false,
      requiredLevel: 'PHONE_VERIFIED',
    });
    await expect(
      service.evaluate('provider.contact', {
        authenticated: true,
        phoneVerified: true,
      })
    ).resolves.toMatchObject({
      allowed: true,
      currentLevel: 'PHONE_VERIFIED',
    });
  });

  it('por defecto basta la sesión para pedir: el KYC del comprador se pide al pagar', async () => {
    await expect(
      service.evaluate('catalog.order', {
        authenticated: true,
        kycStatus: KycStatus.PENDING,
      })
    ).resolves.toMatchObject({
      allowed: true,
      requiredLevel: 'AUTHENTICATED',
    });
    await expect(
      service.evaluate('service.request', { authenticated: false })
    ).resolves.toMatchObject({ allowed: false });
  });

  it('exige KYC aprobado para publicar servicios', async () => {
    await expect(
      service.evaluate('service.publish', {
        authenticated: true,
        kycStatus: KycStatus.PENDING,
      })
    ).resolves.toMatchObject({
      allowed: false,
      requiredLevel: 'KYC_APPROVED',
    });
    await expect(
      service.evaluate('service.publish', {
        authenticated: true,
        kycStatus: KycStatus.APPROVED,
      })
    ).resolves.toMatchObject({
      allowed: true,
      currentLevel: 'KYC_APPROVED',
    });
  });

  it('el admin puede subir el requisito de pedidos a KYC aprobado', async () => {
    settings.getAll.mockResolvedValue({
      'identity.kycPolicy': {
        ...DEFAULT_KYC_PROGRESSIVE_POLICY,
        operations: {
          ...DEFAULT_KYC_PROGRESSIVE_POLICY.operations,
          'catalog.order': 'KYC_APPROVED',
        },
      },
    });
    await expect(
      service.evaluate('catalog.order', {
        authenticated: true,
        kycStatus: KycStatus.PENDING,
      })
    ).resolves.toMatchObject({
      allowed: false,
      requiredLevel: 'KYC_APPROVED',
    });
  });

  it('solo concede ENHANCED_REVIEW desde una aprobación persistida y vigente', async () => {
    settings.getAll.mockResolvedValue({
      'identity.kycPolicy': {
        ...DEFAULT_KYC_PROGRESSIVE_POLICY,
        operations: {
          ...DEFAULT_KYC_PROGRESSIVE_POLICY.operations,
          'catalog.order': 'ENHANCED_REVIEW',
        },
      },
    });
    prisma.enhancedReviewRequest.findUnique.mockResolvedValue({
      status: EnhancedReviewStatus.APPROVED,
      expiresAt: new Date(Date.now() + 60_000),
    });

    await expect(
      service.evaluateForUser(
        'catalog.order',
        { authenticated: true, kycStatus: KycStatus.APPROVED },
        'user-1'
      )
    ).resolves.toMatchObject({
      allowed: true,
      currentLevel: 'ENHANCED_REVIEW',
    });

    expect(prisma.enhancedReviewRequest.findUnique).toHaveBeenCalledWith({
      where: { userId: 'user-1' },
      select: { status: true, expiresAt: true },
    });
  });

  it.each([
    [EnhancedReviewStatus.PENDING, new Date(Date.now() + 60_000)],
    [EnhancedReviewStatus.REJECTED, new Date(Date.now() + 60_000)],
    [EnhancedReviewStatus.REVOKED, new Date(Date.now() + 60_000)],
    [EnhancedReviewStatus.APPROVED, new Date(Date.now() - 60_000)],
  ])(
    'deniega ENHANCED_REVIEW cuando el estado persistido no está vigente (%s)',
    async (status, expiresAt) => {
      settings.getAll.mockResolvedValue({
        'identity.kycPolicy': {
          ...DEFAULT_KYC_PROGRESSIVE_POLICY,
          operations: {
            ...DEFAULT_KYC_PROGRESSIVE_POLICY.operations,
            'catalog.order': 'ENHANCED_REVIEW',
          },
        },
      });
      prisma.enhancedReviewRequest.findUnique.mockResolvedValue({
        status,
        expiresAt,
      });

      await expect(
        service.evaluateForUser(
          'catalog.order',
          { authenticated: true, kycStatus: KycStatus.APPROVED },
          'user-1'
        )
      ).resolves.toMatchObject({
        allowed: false,
        currentLevel: 'KYC_APPROVED',
        requiredLevel: 'ENHANCED_REVIEW',
      });
    }
  );

  it('no consulta ni concede revisión reforzada para peticiones sin usuario autenticado', async () => {
    await expect(
      service.evaluateForUser('catalog.order', { authenticated: false })
    ).resolves.toMatchObject({ allowed: false, currentLevel: 'PUBLIC' });
    expect(prisma.enhancedReviewRequest.findUnique).not.toHaveBeenCalled();
  });

  it('no concede revisión reforzada solo por tener KYC aprobado', async () => {
    const policy = {
      ...DEFAULT_KYC_PROGRESSIVE_POLICY,
      operations: {
        ...DEFAULT_KYC_PROGRESSIVE_POLICY.operations,
        'catalog.order': 'ENHANCED_REVIEW',
      },
    };
    settings.getAll.mockResolvedValue({ 'identity.kycPolicy': policy });
    await expect(
      service.evaluate('catalog.order', {
        authenticated: true,
        kycStatus: KycStatus.APPROVED,
      })
    ).resolves.toMatchObject({
      allowed: false,
      requiredLevel: 'ENHANCED_REVIEW',
    });
  });
});
