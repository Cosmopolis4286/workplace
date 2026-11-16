import { ConflictException } from '@nestjs/common';
import { KycService } from '../../domains/identity-access/kyc/kyc.service';
import { KycStatus } from '@prisma/client';

describe('KycService review concurrency', () => {
  const pending = {
    id: 'verification-1',
    userId: 'user-1',
    status: KycStatus.PENDING,
  };

  it(
    'rejects a second review when another admin already changed the request',
    async () => {
    const tx = {
      identityVerification: {
        updateMany: jest.fn().mockResolvedValue({ count: 0 }),
      },
      user: { update: jest.fn() },
    };
    const prisma = {
      identityVerification: {
        findUnique: jest.fn().mockResolvedValue(pending),
      },
      $transaction: jest.fn(
        (callback: (client: typeof tx) => unknown) => callback(tx)
      ),
    };
    const audit = { log: jest.fn() };
    const service = new KycService(
      prisma as any,
      { del: jest.fn() } as any,
      { sendKycStatusUpdate: jest.fn() } as any,
      audit as any
    );

    await expect(
      service.review('verification-1', 'admin-1', {
        status: KycStatus.APPROVED,
      } as any)
    ).rejects.toBeInstanceOf(ConflictException);

    expect(tx.user.update).not.toHaveBeenCalled();
    expect(audit.log).not.toHaveBeenCalled();
  });

  it(
    'writes the account KYC status and audit event in a successful review',
    async () => {
    const updated = { ...pending, status: KycStatus.APPROVED };
    const tx = {
      identityVerification: {
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        findUniqueOrThrow: jest.fn().mockResolvedValue(updated),
      },
      user: { update: jest.fn().mockResolvedValue({}) },
    };
    const prisma = {
      identityVerification: { findUnique: jest.fn().mockResolvedValue(pending) },
      $transaction: jest.fn((callback: (client: typeof tx) => unknown) => callback(tx)),
      user: { findUnique: jest.fn().mockResolvedValue(null) },
    };
    const audit = { log: jest.fn().mockResolvedValue(undefined) };
    const service = new KycService(
      prisma as any,
      { del: jest.fn().mockResolvedValue(undefined) } as any,
      { sendKycStatusUpdate: jest.fn().mockResolvedValue(undefined) } as any,
      audit as any
    );

    await expect(
      service.review('verification-1', 'admin-1', {
        status: KycStatus.APPROVED,
      } as any)
    ).resolves.toEqual(updated);

    expect(tx.user.update).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      data: { kycStatus: KycStatus.APPROVED },
    });
    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'admin-1',
        module: 'kyc',
        entityId: 'verification-1',
      })
    );
  });
});
