import { Test, TestingModule } from '@nestjs/testing';
import { Reflector } from '@nestjs/core';
import {
  ConflictException,
  ForbiddenException,
  ExecutionContext,
} from '@nestjs/common';
import { ProfileStatus, ProfileType } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { ProfileContextGuard } from '../../common/guards/profile-context.guard';

describe('ProfileContextGuard', () => {
  let guard: ProfileContextGuard;
  let reflector: Reflector;
  let prisma: {
    user: { findUnique: jest.Mock };
    userProfile: { findMany: jest.Mock };
  };

  function makeContext(user: any, body: any = {}): ExecutionContext {
    const request = {
      user,
      body,
      headers: { 'x-profile-id': 'attacker-controlled' },
    };
    return {
      switchToHttp: () => ({ getRequest: () => request }),
      getHandler: () => ({}),
      getClass: () => ({}),
    } as unknown as ExecutionContext;
  }

  beforeEach(async () => {
    prisma = {
      user: { findUnique: jest.fn() },
      userProfile: { findMany: jest.fn() },
    };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProfileContextGuard,
        Reflector,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();
    guard = module.get(ProfileContextGuard);
    reflector = module.get(Reflector);
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([
      ProfileType.PROFESSIONAL,
    ]);
  });

  it(
    'uses the persisted activeProfileId when it belongs to an allowed ACTIVE profile',
    async () => {
    prisma.user.findUnique.mockResolvedValue({ activeProfileId: 'profile-1' });
    prisma.userProfile.findMany.mockResolvedValue([
      { id: 'profile-1', type: ProfileType.PROFESSIONAL, subtype: 'FREELANCER' },
    ]);
    const context = makeContext({ id: 'user-1' });

    expect(await guard.canActivate(context)).toBe(true);
    expect(prisma.userProfile.findMany).toHaveBeenCalledWith({
      where: {
        userId: 'user-1',
        status: ProfileStatus.ACTIVE,
        type: { in: [ProfileType.PROFESSIONAL] },
      },
      select: { id: true, type: true, subtype: true },
    });
    expect(
      (context.switchToHttp().getRequest() as any).profileContext
    ).toEqual({
      id: 'profile-1',
      type: ProfileType.PROFESSIONAL,
      subtype: 'FREELANCER',
    });
  });

  it('uses the sole eligible profile when no active profile has been selected yet', async () => {
    prisma.user.findUnique.mockResolvedValue({ activeProfileId: null });
    prisma.userProfile.findMany.mockResolvedValue([
      {
        id: 'profile-1',
        type: ProfileType.PROFESSIONAL,
        subtype: 'SERVICE_PROVIDER',
      },
    ]);

    await expect(
      guard.canActivate(makeContext({ id: 'user-1' }))
    ).resolves.toBe(true);
  });

  it('requires explicit context when more than one eligible profile exists', async () => {
    prisma.user.findUnique.mockResolvedValue({ activeProfileId: null });
    prisma.userProfile.findMany.mockResolvedValue([
      {
        id: 'profile-1',
        type: ProfileType.PROFESSIONAL,
        subtype: 'FREELANCER',
      },
      {
        id: 'profile-2',
        type: ProfileType.PROFESSIONAL,
        subtype: 'SERVICE_PROVIDER',
      },
    ]);

    await expect(
      guard.canActivate(makeContext({ id: 'user-1' }))
    ).rejects.toThrow(ConflictException);
  });

  it('rejects when the persisted active profile is not in the required context', async () => {
    prisma.user.findUnique.mockResolvedValue({ activeProfileId: 'business-1' });
    prisma.userProfile.findMany.mockResolvedValue([
      { id: 'profile-1', type: ProfileType.PROFESSIONAL, subtype: 'FREELANCER' },
    ]);

    await expect(
      guard.canActivate(makeContext({ id: 'user-1' }))
    ).rejects.toThrow(ConflictException);
  });

  it('rejects users without an ACTIVE profile of the required type', async () => {
    prisma.user.findUnique.mockResolvedValue({ activeProfileId: null });
    prisma.userProfile.findMany.mockResolvedValue([]);

    await expect(
      guard.canActivate(makeContext({ id: 'user-1' }))
    ).rejects.toThrow(ForbiddenException);
  });

  it('does not trust profile IDs supplied in body or headers', async () => {
    prisma.user.findUnique.mockResolvedValue({ activeProfileId: null });
    prisma.userProfile.findMany.mockResolvedValue([]);

    await expect(
      guard.canActivate(
        makeContext({ id: 'user-1' }, { profileId: 'profile-1' })
      )
    ).rejects.toThrow(ForbiddenException);
  });
});
