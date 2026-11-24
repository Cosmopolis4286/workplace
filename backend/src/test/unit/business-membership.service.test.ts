import { ForbiddenException } from '@nestjs/common';
import {
  BusinessMembershipRole,
  BusinessMembershipScope,
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
      branchIds: null,
      isOwner: true,
    });
    expect(prisma.businessMembership.findUnique).not.toHaveBeenCalled();
  });

  it('resolves active membership with commerce-wide scope', async () => {
    prisma.businessMembership.findUnique.mockResolvedValue({
      id: 'membership-1',
      role: BusinessMembershipRole.MANAGER,
      status: BusinessMembershipStatus.ACTIVE,
      scope: BusinessMembershipScope.COMMERCE,
      branchAssignments: [],
    });

    const context = await service.resolve('member-a', 'commerce-a');
    expect(context.role).toBe(BusinessMembershipRole.MANAGER);
    expect(context.branchIds).toBeNull();
  });

  it('restricts selected-branch membership to assigned branches', async () => {
    prisma.businessMembership.findUnique.mockResolvedValue({
      id: 'membership-2',
      role: BusinessMembershipRole.STAFF,
      status: BusinessMembershipStatus.ACTIVE,
      scope: BusinessMembershipScope.SELECTED_BRANCHES,
      branchAssignments: [{ branchId: 'branch-a1' }],
    });

    const context = await service.resolve('member-a', 'commerce-a');
    expect(context.branchIds).toEqual(['branch-a1']);
    expect(() =>
      service.assertBranchAccess(context, 'branch-a1')
    ).not.toThrow();
    expect(() =>
      service.assertBranchAccess(context, 'branch-a2')
    ).toThrow(ForbiddenException);
  });

  it('denies missing, suspended and revoked memberships', async () => {
    for (const membership of [
      null,
      {
        id: 'membership-suspended',
        role: BusinessMembershipRole.STAFF,
        status: BusinessMembershipStatus.SUSPENDED,
        scope: BusinessMembershipScope.COMMERCE,
        branchAssignments: [],
      },
      {
        id: 'membership-revoked',
        role: BusinessMembershipRole.STAFF,
        status: BusinessMembershipStatus.REVOKED,
        scope: BusinessMembershipScope.COMMERCE,
        branchAssignments: [],
      },
    ]) {
      prisma.businessMembership.findUnique.mockResolvedValueOnce(membership);
      await expect(
        service.resolve('member-a', 'commerce-a')
      ).rejects.toThrow(ForbiddenException);
    }
  });

  it('fails closed when selected-branch scope has no assignments', async () => {
    prisma.businessMembership.findUnique.mockResolvedValue({
      id: 'membership-3',
      role: BusinessMembershipRole.STAFF,
      status: BusinessMembershipStatus.ACTIVE,
      scope: BusinessMembershipScope.SELECTED_BRANCHES,
      branchAssignments: [],
    });

    await expect(
      service.resolve('member-a', 'commerce-a')
    ).rejects.toThrow(ForbiddenException);
  });

  it('rejects inconsistent commerce-wide scope with branch assignments', async () => {
    prisma.businessMembership.findUnique.mockResolvedValue({
      id: 'membership-4',
      role: BusinessMembershipRole.STAFF,
      status: BusinessMembershipStatus.ACTIVE,
      scope: BusinessMembershipScope.COMMERCE,
      branchAssignments: [{ branchId: 'branch-a1' }],
    });

    await expect(
      service.resolve('member-a', 'commerce-a')
    ).rejects.toThrow(ForbiddenException);
  });

  it('binds membership lookup to the requested commerce and user', async () => {
    prisma.businessMembership.findUnique.mockResolvedValue({
      id: 'membership-5',
      role: BusinessMembershipRole.VIEWER,
      status: BusinessMembershipStatus.ACTIVE,
      scope: BusinessMembershipScope.COMMERCE,
      branchAssignments: [],
    });

    await service.resolve('user-a', 'commerce-b');

    expect(prisma.businessMembership.findUnique).toHaveBeenCalledWith({
      where: {
        commerceId_userId: {
          commerceId: 'commerce-b',
          userId: 'user-a',
        },
      },
      include: { branchAssignments: { select: { branchId: true } } },
    });
  });
});
