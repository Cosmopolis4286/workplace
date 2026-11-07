import { Role } from '@prisma/client';
import { WalletLimitsService } from '../../domains/money/wallets/wallet-limits.service';

describe('WalletLimitsService.resolveTier', () => {
  let prisma: any;
  let service: WalletLimitsService;

  beforeEach(() => {
    prisma = {
      commerce: { findUnique: jest.fn().mockResolvedValue(null) },
      userProfile: { findFirst: jest.fn().mockResolvedValue(null) },
    };
    service = new WalletLimitsService({} as any, prisma);
  });

  it('un dueño de comercio usa los límites de COMMERCE aunque su rol sea NORMAL', async () => {
    prisma.commerce.findUnique.mockResolvedValue({ id: 'c-1' });
    expect(await service.resolveTier('u-1', Role.NORMAL)).toBe('COMMERCE');
    expect((await service.getLimitsFor('u-1', Role.NORMAL)).maxBalance).toBe(
      50_000
    );
  });

  it('rol PROFESIONAL o perfil profesional activo → FREELANCER', async () => {
    expect(await service.resolveTier('u-1', Role.PROFESIONAL)).toBe(
      'FREELANCER'
    );
    prisma.userProfile.findFirst.mockResolvedValue({ id: 'p-1' });
    expect(await service.resolveTier('u-2', Role.NORMAL)).toBe('FREELANCER');
  });

  it('cliente sin perfiles → NORMAL; admins por rol sin consultar perfiles', async () => {
    expect(await service.resolveTier('u-1', Role.NORMAL)).toBe('NORMAL');
    prisma.commerce.findUnique.mockClear();
    expect(await service.resolveTier('a-1', Role.ADMIN)).toBe('ADMIN');
    expect(prisma.commerce.findUnique).not.toHaveBeenCalled();
  });
});
