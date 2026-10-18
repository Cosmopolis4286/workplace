import { ForbiddenException } from '@nestjs/common';
import { ProfileType } from '@prisma/client';
import {
  CommerceResolverService,
  shouldProvisionCommerce,
} from '../../common/commerce-resolver/commerce-resolver.service';

describe('shouldProvisionCommerce', () => {
  it('always provisions for BUSINESS, whatever the category', () => {
    expect(shouldProvisionCommerce(ProfileType.BUSINESS, [])).toBe(true);
    expect(shouldProvisionCommerce(ProfileType.BUSINESS, ['services'])).toBe(
      true
    );
  });

  it('provisions for PROFESSIONAL only when the category sells product (menu/inventory/orders)', () => {
    expect(
      shouldProvisionCommerce(ProfileType.PROFESSIONAL, [
        'dashboard',
        'menu',
        'orders',
      ])
    ).toBe(true);
    expect(
      shouldProvisionCommerce(ProfileType.PROFESSIONAL, ['inventory'])
    ).toBe(true);
  });

  it('does NOT provision for PROFESSIONAL in a service category, even if it lists customers/expenses/delivery', () => {
    // Todas las categorías de servicios traen customers/expenses (y
    // Transporte trae delivery): usarlos como disparador le crearía un
    // Commerce a cualquier diseñador o repartidor.
    expect(
      shouldProvisionCommerce(ProfileType.PROFESSIONAL, [
        'services',
        'customers',
        'expenses',
        'delivery',
        'sales',
      ])
    ).toBe(false);
    expect(shouldProvisionCommerce(ProfileType.PROFESSIONAL, [])).toBe(false);
  });

  it('never provisions for CUSTOMER or JOB_SEEKER', () => {
    expect(shouldProvisionCommerce(ProfileType.CUSTOMER, ['menu'])).toBe(false);
    expect(shouldProvisionCommerce(ProfileType.JOB_SEEKER, ['menu'])).toBe(
      false
    );
  });
});

describe('CommerceResolverService', () => {
  const prisma = { commerce: { findUnique: jest.fn() } };
  const redis = { del: jest.fn() };
  const tx = {
    user: { findUnique: jest.fn() },
    commerce: { findUnique: jest.fn(), create: jest.fn() },
  };
  let service: CommerceResolverService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new CommerceResolverService(prisma as any, redis as any);
  });

  describe('resolve', () => {
    it('returns the commerceId when the user has one', async () => {
      prisma.commerce.findUnique.mockResolvedValue({ id: 'c1' });
      await expect(service.resolve('u1')).resolves.toBe('c1');
    });

    it('throws 403 instead of falling back to userId when there is no Commerce', async () => {
      // Antes devolvía 'u1' como commerceId: listas vacías y escrituras que
      // fallaban por FK.
      prisma.commerce.findUnique.mockResolvedValue(null);
      await expect(service.resolve('u1')).rejects.toThrow(ForbiddenException);
    });
  });

  describe('ensureForUser', () => {
    const userWith = (
      over: Partial<{
        commerce: any;
        allowedModules: string[];
        profiles: any[];
      }>
    ) => ({
      commerce: over.commerce ?? null,
      category: over.allowedModules
        ? { allowedModules: over.allowedModules }
        : null,
      profiles: over.profiles ?? [],
    });

    it('creates a Commerce for a PROFESSIONAL in a product category, linked to the profile', async () => {
      tx.user.findUnique
        .mockResolvedValueOnce(
          userWith({
            allowedModules: ['menu', 'orders'],
            profiles: [
              {
                id: 'p1',
                type: ProfileType.PROFESSIONAL,
                pendingCommerceName: null,
              },
            ],
          })
        )
        .mockResolvedValueOnce({ firstName: 'María', lastName: 'González' });
      tx.commerce.findUnique.mockResolvedValue(null);
      tx.commerce.create.mockResolvedValue({ id: 'c-new' });

      await expect(service.ensureForUser(tx as any, 'u1')).resolves.toBe(
        'c-new'
      );
      expect(tx.commerce.create).toHaveBeenCalledWith({
        data: { userId: 'u1', profileId: 'p1', name: 'María González' },
        select: { id: true },
      });
    });

    it('does nothing for a PROFESSIONAL in a service category', async () => {
      tx.user.findUnique.mockResolvedValueOnce(
        userWith({
          allowedModules: ['services', 'customers', 'expenses'],
          profiles: [
            {
              id: 'p1',
              type: ProfileType.PROFESSIONAL,
              pendingCommerceName: null,
            },
          ],
        })
      );

      await expect(service.ensureForUser(tx as any, 'u1')).resolves.toBeNull();
      expect(tx.commerce.create).not.toHaveBeenCalled();
    });

    it('uses the BUSINESS profile (and its pendingCommerceName) when present', async () => {
      tx.user.findUnique.mockResolvedValueOnce(
        userWith({
          allowedModules: ['menu'],
          profiles: [
            {
              id: 'p-pro',
              type: ProfileType.PROFESSIONAL,
              pendingCommerceName: null,
            },
            {
              id: 'p-biz',
              type: ProfileType.BUSINESS,
              pendingCommerceName: 'Arepera La Esquina',
            },
          ],
        })
      );
      tx.commerce.findUnique.mockResolvedValue(null);
      tx.commerce.create.mockResolvedValue({ id: 'c-biz' });

      await service.ensureForUser(tx as any, 'u1');

      expect(tx.commerce.create).toHaveBeenCalledWith({
        data: { userId: 'u1', profileId: 'p-biz', name: 'Arepera La Esquina' },
        select: { id: true },
      });
    });

    it('is idempotent: returns the existing Commerce without creating another', async () => {
      tx.user.findUnique.mockResolvedValueOnce(
        userWith({
          commerce: { id: 'c-existing' },
          profiles: [
            { id: 'p1', type: ProfileType.BUSINESS, pendingCommerceName: null },
          ],
        })
      );

      await expect(service.ensureForUser(tx as any, 'u1')).resolves.toBe(
        'c-existing'
      );
      expect(tx.commerce.create).not.toHaveBeenCalled();
    });

    it('does nothing without an ACTIVE business/professional profile', async () => {
      tx.user.findUnique.mockResolvedValueOnce(
        userWith({ allowedModules: ['menu'], profiles: [] })
      );

      await expect(service.ensureForUser(tx as any, 'u1')).resolves.toBeNull();
      expect(tx.commerce.create).not.toHaveBeenCalled();
    });
  });
});
