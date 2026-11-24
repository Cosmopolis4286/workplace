import { ForbiddenException } from '@nestjs/common';
import {
  BusinessMembershipRole,
  BusinessMembershipStatus,
} from '@prisma/client';
import { BusinessMembershipService } from '../../common/commerce-resolver/business-membership.service';

describe('BusinessMembershipService', () => {
  const prisma = {
    commerce: { findFirst: jest.fn() },
    businessMembership: { findUnique: jest.fn() },
  };
  let service: BusinessMembershipService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new BusinessMembershipService(prisma as any);
    prisma.commerce.findFirst.mockResolvedValue(null);
  });

  it('uses Commerce.userId as the implicit owner', async () => {
    prisma.commerce.findFirst.mockResolvedValue({ id: 'commerce-a' });

    await expect(service.resolve('owner-a', 'commerce-a')).resolves.toEqual({
      commerceId: 'commerce-a',
      userId: 'owner-a',
      role: 'OWNER',
      membershipId: null,
      isOwner: true,
    });
    expect(prisma.businessMembership.findUnique).not.toHaveBeenCalled();
  });

  it('resolves an ACTIVE membership scoped to the exact commerce and user', async () => {
    prisma.businessMembership.findUnique.mockResolvedValue({
      id: 'membership-1',
      role: BusinessMembershipRole.MANAGER,
      status: BusinessMembershipStatus.ACTIVE,
    });

    await expect(service.resolve('member-a', 'commerce-a')).resolves.toEqual({
      commerceId: 'commerce-a',
      userId: 'member-a',
      role: BusinessMembershipRole.MANAGER,
      membershipId: 'membership-1',
      isOwner: false,
    });
    expect(prisma.businessMembership.findUnique).toHaveBeenCalledWith({
      where: {
        commerceId_userId: {
          commerceId: 'commerce-a',
          userId: 'member-a',
        },
      },
      select: { id: true, role: true, status: true },
    });
  });

  it.each([
    ['missing', null],
    [
      'suspended',
      {
        id: 'membership-suspended',
        role: BusinessMembershipRole.STAFF,
        status: BusinessMembershipStatus.SUSPENDED,
      },
    ],
    [
      'revoked',
      {
        id: 'membership-revoked',
        role: BusinessMembershipRole.STAFF,
        status: BusinessMembershipStatus.REVOKED,
      },
    ],
  ])('denies %s membership', async (_label, membership) => {
    prisma.businessMembership.findUnique.mockResolvedValue(membership);

    await expect(
      service.resolve('member-a', 'commerce-a')
    ).rejects.toThrow(ForbiddenException);
  });

  it('does not treat a membership in another commerce as authorization', async () => {
    prisma.businessMembership.findUnique.mockResolvedValue(null);

    await expect(
      service.resolve('member-a', 'commerce-b')
    ).rejects.toThrow(ForbiddenException);

    expect(prisma.businessMembership.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          commerceId_userId: {
            commerceId: 'commerce-b',
            userId: 'member-a',
          },
        },
      })
    );
  });
});
