import { ForbiddenException } from '@nestjs/common';
import {
  BusinessMembershipRole,
  BusinessMembershipStatus,
} from '@prisma/client';
import { BusinessMembershipService } from '../../common/commerce-resolver/business-membership.service';

describe('BusinessMembershipService', () => {
  const prisma = {
    commerce: { findUnique: jest.fn() },
    businessMembership: { findUnique: jest.fn() },
  };
  let service: BusinessMembershipService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new BusinessMembershipService(prisma as any);
  });

  it('uses Commerce.userId as the implicit owner', async () => {
    prisma.commerce.findUnique.mockResolvedValue({
      id: 'commerce-a',
      userId: 'owner-a',
    });

    await expect(service.resolve('owner-a', 'commerce-a')).resolves.toEqual({
      commerceId: 'commerce-a',
      ownerUserId: 'owner-a',
      userId: 'owner-a',
      role: 'OWNER',
      membershipId: null,
      isOwner: true,
    });
    expect(prisma.businessMembership.findUnique).not.toHaveBeenCalled();
  });

  it('resolves an active member within the requested commerce', async () => {
    prisma.commerce.findUnique.mockResolvedValue({
      id: 'commerce-a',
      userId: 'owner-a',
    });
    prisma.businessMembership.findUnique.mockResolvedValue({
      id: 'membership-1',
      role: BusinessMembershipRole.MANAGER,
      status: BusinessMembershipStatus.ACTIVE,
    });

    const context = await service.resolve('member-a', 'commerce-a');

    expect(context).toEqual({
      commerceId: 'commerce-a',
      ownerUserId: 'owner-a',
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

  it('denies access when the requested commerce does not exist', async () => {
    prisma.commerce.findUnique.mockResolvedValue(null);

    await expect(
      service.resolve('member-a', 'commerce-missing')
    ).rejects.toThrow(ForbiddenException);
    expect(prisma.businessMembership.findUnique).not.toHaveBeenCalled();
  });

  it('denies access when the user has no membership', async () => {
    prisma.commerce.findUnique.mockResolvedValue({
      id: 'commerce-a',
      userId: 'owner-a',
    });
    prisma.businessMembership.findUnique.mockResolvedValue(null);

    await expect(
      service.resolve('outsider', 'commerce-a')
    ).rejects.toThrow(ForbiddenException);
  });

  it.each([
    BusinessMembershipStatus.SUSPENDED,
    BusinessMembershipStatus.REVOKED,
  ])('denies a membership with status %s', async (status) => {
    prisma.commerce.findUnique.mockResolvedValue({
      id: 'commerce-a',
      userId: 'owner-a',
    });
    prisma.businessMembership.findUnique.mockResolvedValue({
      id: 'membership-2',
      role: BusinessMembershipRole.STAFF,
      status,
    });

    await expect(
      service.resolve('member-a', 'commerce-a')
    ).rejects.toThrow(ForbiddenException);
  });
});
