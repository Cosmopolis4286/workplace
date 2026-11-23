import { ConflictException, ForbiddenException } from '@nestjs/common';
import { KycService } from '../../domains/identity-access/kyc/kyc.service';
import { KycStatus, Role } from '@prisma/client';

describe('KycService submission concurrency', () => {
  it('rejects a duplicate submission when another request claims the account first', async () => {
    const tx = {
      user: { updateMany: jest.fn().mockResolvedValue({ count: 0 }) },
      identityVerification: { create: jest.fn() },
    };
    const prisma = {
      user: {
        findUnique: jest
          .fn()
          .mockResolvedValue({ kycStatus: KycStatus.REJECTED }),
      },
      $transaction: jest.fn((callback: (client: typeof tx) => unknown) =>
        callback(tx)
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
      service.submit(
        'user-1',
        {
          documentType: 'CEDULA',
          documentNumber: 'V12345678',
          fullName: 'Usuario',
        } as any,
        { frontImageUrl: 'front-file', selfieImageUrl: 'selfie-file' }
      )
    ).rejects.toBeInstanceOf(ConflictException);

    expect(tx.identityVerification.create).not.toHaveBeenCalled();
    expect(audit.log).not.toHaveBeenCalled();
  });
});

describe('KycService review concurrency', () => {
  const pending = {
    id: 'verification-1',
    userId: 'user-1',
    status: KycStatus.PENDING,
  };

  it('rejects a second review when another admin already changed the request', async () => {
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
      $transaction: jest.fn((callback: (client: typeof tx) => unknown) =>
        callback(tx)
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

  it('writes the account KYC status and audit event in a successful review', async () => {
    const updated = { ...pending, status: KycStatus.APPROVED };
    const tx = {
      identityVerification: {
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        findUniqueOrThrow: jest.fn().mockResolvedValue(updated),
      },
      user: { update: jest.fn().mockResolvedValue({}) },
    };
    const prisma = {
      identityVerification: {
        findUnique: jest.fn().mockResolvedValue(pending),
      },
      $transaction: jest.fn((callback: (client: typeof tx) => unknown) =>
        callback(tx)
      ),
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

describe('KycService — separación de funciones y auditoría de lectura', () => {
  function build(prismaOverrides: Record<string, unknown> = {}) {
    const audit = { log: jest.fn().mockResolvedValue(undefined) };
    const prisma = {
      identityVerification: {
        findUnique: jest.fn(),
        updateMany: jest.fn(),
      },
      $transaction: jest.fn(),
      ...prismaOverrides,
    };
    const service = new KycService(
      prisma as any,
      { del: jest.fn() } as any,
      { sendKycStatusUpdate: jest.fn() } as any,
      audit as any
    );
    return { service, prisma, audit };
  }

  it('un admin no puede revisar su propia verificación', async () => {
    const { service, prisma } = build();
    prisma.identityVerification.findUnique.mockResolvedValue({
      id: 'v-1',
      userId: 'admin-1',
      status: KycStatus.PENDING,
    });

    await expect(
      service.review('v-1', 'admin-1', { status: KycStatus.APPROVED } as any)
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('registra quién abre una imagen ajena y no registra al dueño', async () => {
    const { service, prisma, audit } = build();
    prisma.identityVerification.findUnique.mockResolvedValue({
      userId: 'user-1',
      frontImageUrl: 'private-kyc/abc.jpg',
      backImageUrl: null,
      selfieImageUrl: 'private-kyc/selfie.jpg',
    });

    await expect(
      service.resolveImageFilename(
        'v-1',
        'frontImageUrl',
        'user-1',
        Role.NORMAL
      )
    ).resolves.toBe('abc.jpg');
    expect(audit.log).not.toHaveBeenCalled();

    await expect(
      service.resolveImageFilename(
        'v-1',
        'selfieImageUrl',
        'admin-1',
        Role.ADMIN
      )
    ).resolves.toBe('selfie.jpg');
    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'admin-1',
        action: 'VIEW',
        module: 'kyc',
        entityId: 'v-1',
        details: { field: 'selfieImageUrl', targetUserId: 'user-1' },
      })
    );
  });

  it('un tercero sin rol admin no ve la imagen ni deja registro', async () => {
    const { service, prisma, audit } = build();
    prisma.identityVerification.findUnique.mockResolvedValue({
      userId: 'user-1',
      frontImageUrl: 'private-kyc/abc.jpg',
      backImageUrl: null,
      selfieImageUrl: 'private-kyc/selfie.jpg',
    });

    await expect(
      service.resolveImageFilename('v-1', 'frontImageUrl', 'otro', Role.NORMAL)
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(audit.log).not.toHaveBeenCalled();
  });
});
