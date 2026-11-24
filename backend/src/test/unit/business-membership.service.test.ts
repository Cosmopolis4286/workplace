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

  it('resuelve al propietario canónico sin exigir una fila de membresía', async () => {
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

  it('resuelve una membresía activa con alcance a todo el comercio', async () => {
    prisma.businessMembership.findUnique.mockResolvedValue({
      id: 'membership-1',
      role: BusinessMembershipRole.MANAGER,
      status: BusinessMembershipStatus.ACTIVE,
      scope: BusinessMembershipScope.COMMERCE,
      branchAssignments: [],
    });

    await expect(service.resolve('member-a', 'commerce-a')).resolves.toMatchObject({
      role: BusinessMembershipRole.MANAGER,
      branchIds: null,
      isOwner: false,
    });
  });

  it('limita el contexto a las sucursales asignadas', async () => {
    prisma.businessMembership.findUnique.mockResolvedValue({
      id: 'membership-2',
      role: BusinessMembershipRole.STAFF,
      status: BusinessMembershipStatus.ACTIVE,
      scope: BusinessMembershipScope.SELECTED_BRANCHES,
      branchAssignments: [{ branchId: 'branch-a1' }],
    });

    const context = await service.resolve('member-a', 'commerce-a');
    expect(context.branchIds).toEqual(['branch-a1']);
    expect(() => service.assertBranchAccess(context, 'branch-a1')).not.toThrow();
    expect(() => service.assertBranchAccess(context, 'branch-a2')).toThrow(
      ForbiddenException
    );
  });

  it.each([
    ['no membership', null],
    [
      'suspended membership',
      {
        id: 'membership-3',
        role: BusinessMembershipRole.STAFF,
        status: BusinessMembershipStatus.SUSPENDED,
        scope: BusinessMembershipScope.COMMERCE,
        branchAssignments: [],
      },
    ],
    [
      'revoked membership',
      {
        id: 'membership-4',
        role: BusinessMembershipRole.STAFF,
        status: BusinessMembershipStatus.REVOKED,
        scope: BusinessMembershipScope.COMMERCE,
        branchAssignments: [],
      },
    ],
  ])('denies access for %s', async (_label, membership) => {
    prisma.businessMembership.findUnique.mockResolvedValue(membership);

    await expect(service.resolve('member-a', 'commerce-a')).rejects.toThrow(
      ForbiddenException
    );
  });

  it('fails closed when a selected-branches membership has no assignments', async () => {
    prisma.businessMembership.findUnique.mockResolvedValue({
      id: 'membership-5',
      role: BusinessMembershipRole.STAFF,
      status: BusinessMembershipStatus.ACTIVE,
      scope: BusinessMembershipScope.SELECTED_BRANCHES,
      branchAssignments: [],
    });

    await expect(service.resolve('member-a', 'commerce-a')).rejects.toThrow(
      ForbiddenException
    );
  });

  it('rejects inconsistent full-commerce scope with unexpected branch assignments', async () => {
    prisma.businessMembership.findUnique.mockResolvedValue({
      id: 'membership-6',
      role: BusinessMembershipRole.STAFF,
      status: BusinessMembershipStatus.ACTIVE,
      scope: BusinessMembershipScope.COMMERCE,
      branchAssignments: [{ branchId: 'branch-a1' }],
    });

    await expect(service.resolve('member-a', 'commerce-a')).rejects.toThrow(
      ForbiddenException
    );
  });

  it('uses the requested commerceId and authenticated userId in the membership lookup', async () => {
    prisma.businessMembership.findUnique.mockResolvedValue({
      id: 'membership-7',
      role: BusinessMembershipRole.VIEWER,
      status: BusinessMembershipStatus.ACTIVE,
      scope: BusinessMembershipScope.COMMERCE,
      branchAssignments: [],
    });

    await service.resolve('user-a', 'commerce-b');

    expect(prisma.businessMembership.findUnique).toHaveBeenCalledWith({
      where: { commerceId_userId: { commerceId: 'commerce-b', userId: 'user-a' } },
      include: { branchAssignments: { select: { branchId: true } } },
    });
  });
});
