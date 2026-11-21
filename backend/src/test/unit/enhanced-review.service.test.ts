import { BadRequestException, ConflictException } from '@nestjs/common';
import { EnhancedReviewStatus, KycStatus } from '@prisma/client';
import { KycService } from '../../domains/identity-access/kyc/kyc.service';

describe('KycService enhanced review workflow', () => {
  const audit = { log: jest.fn().mockResolvedValue(undefined) };
  const redis = { del: jest.fn() };
  const mail = { sendKycStatusUpdate: jest.fn() };

  beforeEach(() => jest.clearAllMocks());

  it('solo permite solicitar revisión reforzada con KYC base aprobado', async () => {
    const prisma = {
      user: { findUnique: jest.fn().mockResolvedValue({ kycStatus: KycStatus.PENDING }) },
      enhancedReviewRequest: { findUnique: jest.fn(), create: jest.fn() },
    };
    const service = new KycService(prisma as any, redis as any, mail as any, audit as any);

    await expect(
      service.requestEnhancedReview('user-1', 'Necesito acceso a operaciones especiales')
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.enhancedReviewRequest.create).not.toHaveBeenCalled();
  });

  it('crea una solicitud pendiente y registra auditoría', async () => {
    const request = {
      id: 'review-1',
      userId: 'user-1',
      status: EnhancedReviewStatus.PENDING,
      requestReason: 'Necesito acceso a operaciones especiales',
    };
    const prisma = {
      user: { findUnique: jest.fn().mockResolvedValue({ kycStatus: KycStatus.APPROVED }) },
      enhancedReviewRequest: {
        findUnique: jest.fn().mockResolvedValueOnce(null).mockResolvedValueOnce(request),
        create: jest.fn().mockResolvedValue(request),
      },
    };
    const service = new KycService(prisma as any, redis as any, mail as any, audit as any);

    await expect(
      service.requestEnhancedReview('user-1', '  Necesito acceso a operaciones especiales  ')
    ).resolves.toEqual(request);
    expect(prisma.enhancedReviewRequest.create).toHaveBeenCalledWith({
      data: {
        userId: 'user-1',
        requestReason: 'Necesito acceso a operaciones especiales',
      },
    });
    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user-1',
        module: 'kyc',
        entityId: 'review-1',
      })
    );
  });

  it('impide duplicar una solicitud que ya está pendiente', async () => {
    const prisma = {
      user: { findUnique: jest.fn().mockResolvedValue({ kycStatus: KycStatus.APPROVED }) },
      enhancedReviewRequest: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'review-1',
          status: EnhancedReviewStatus.PENDING,
        }),
        create: jest.fn(),
      },
    };
    const service = new KycService(prisma as any, redis as any, mail as any, audit as any);

    await expect(
      service.requestEnhancedReview('user-1', 'Necesito acceso a operaciones especiales')
    ).rejects.toBeInstanceOf(ConflictException);
    expect(prisma.enhancedReviewRequest.create).not.toHaveBeenCalled();
  });

  it('aprueba con vigencia por defecto de 90 días y auditoría de decisión', async () => {
    const pending = {
      id: 'review-1',
      userId: 'user-1',
      status: EnhancedReviewStatus.PENDING,
      user: { kycStatus: KycStatus.APPROVED },
    };
    const updated = {
      id: 'review-1',
      userId: 'user-1',
      status: EnhancedReviewStatus.APPROVED,
      expiresAt: new Date(Date.now() + 89 * 24 * 60 * 60 * 1000),
    };
    const prisma = {
      enhancedReviewRequest: {
        findUnique: jest.fn().mockResolvedValue(pending),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        findUniqueOrThrow: jest.fn().mockResolvedValue(updated),
      },
    };
    const service = new KycService(prisma as any, redis as any, mail as any, audit as any);

    await expect(
      service.reviewEnhancedRequest('review-1', 'superadmin-1', {
        status: EnhancedReviewStatus.APPROVED,
        reason: 'Documentación y controles revisados correctamente',
      })
    ).resolves.toEqual(updated);
    const update = prisma.enhancedReviewRequest.updateMany.mock.calls[0][0];
    expect(update.where).toEqual({
      id: 'review-1',
      status: EnhancedReviewStatus.PENDING,
    });
    expect(update.data.expiresAt.getTime()).toBeGreaterThan(Date.now());
    expect(update.data.expiresAt.getTime()).toBeLessThanOrEqual(
      Date.now() + 90 * 24 * 60 * 60 * 1000
    );
    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'superadmin-1',
        module: 'kyc',
        details: expect.objectContaining({
          targetUserId: 'user-1',
          status: EnhancedReviewStatus.APPROVED,
        }),
      })
    );
  });

  it('rechaza decisiones concurrentes sin sobrescribir la primera revisión', async () => {
    const prisma = {
      enhancedReviewRequest: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'review-1',
          userId: 'user-1',
          status: EnhancedReviewStatus.PENDING,
          user: { kycStatus: KycStatus.APPROVED },
        }),
        updateMany: jest.fn().mockResolvedValue({ count: 0 }),
      },
    };
    const service = new KycService(prisma as any, redis as any, mail as any, audit as any);

    await expect(
      service.reviewEnhancedRequest('review-1', 'superadmin-1', {
        status: EnhancedReviewStatus.REJECTED,
        reason: 'La evidencia adicional no es suficiente',
      })
    ).rejects.toBeInstanceOf(ConflictException);
    expect(audit.log).not.toHaveBeenCalled();
  });

  it('revoca una aprobación vigente con motivo y auditoría', async () => {
    const updated = {
      id: 'review-1',
      userId: 'user-1',
      status: EnhancedReviewStatus.REVOKED,
    };
    const prisma = {
      enhancedReviewRequest: {
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        findUniqueOrThrow: jest.fn().mockResolvedValue(updated),
      },
    };
    const service = new KycService(prisma as any, redis as any, mail as any, audit as any);

    await expect(
      service.revokeEnhancedReview('review-1', 'superadmin-1', 'Se detectó incumplimiento de las condiciones')
    ).resolves.toEqual(updated);
    expect(prisma.enhancedReviewRequest.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: 'review-1',
          status: EnhancedReviewStatus.APPROVED,
        }),
        data: expect.objectContaining({
          status: EnhancedReviewStatus.REVOKED,
          revokedBy: 'superadmin-1',
        }),
      })
    );
    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({
        summary: 'Revisión reforzada revocada por SUPERADMIN',
      })
    );
  });
});
