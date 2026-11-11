import { ConflictException } from '@nestjs/common';
import { Prisma, Role } from '@prisma/client';
import { AccountDeletionService } from '../../domains/identity-access/users/account-deletion.service';

describe('AccountDeletionService', () => {
  const userId = 'user-1';
  let prisma: any;
  let redis: any;
  let audit: any;
  let service: AccountDeletionService;

  beforeEach(() => {
    prisma = {
      user: {
        findUnique: jest.fn().mockResolvedValue({ role: Role.NORMAL }),
        findUniqueOrThrow: jest.fn().mockResolvedValue({
          email: 'ana@example.com',
          role: Role.NORMAL,
          avatar: null,
          coverImage: null,
          posts: [],
          services: [],
          identityVerifications: [],
        }),
        count: jest.fn().mockResolvedValue(2),
        update: jest.fn().mockReturnValue('user.update'),
      },
      wallet: {
        findUnique: jest.fn().mockResolvedValue({
          balance: new Prisma.Decimal(0),
          currency: 'USD',
        }),
      },
      escrow: { count: jest.fn().mockResolvedValue(0) },
      walletDepositRequest: { count: jest.fn().mockResolvedValue(0) },
      sellerStatement: {
        aggregate: jest
          .fn()
          .mockResolvedValue({ _count: 0, _sum: { totalAmount: null } }),
      },
      sellerCommissionCharge: {
        aggregate: jest.fn().mockResolvedValue({ _sum: { amount: null } }),
      },
      walletWithdrawalRequest: { count: jest.fn().mockResolvedValue(0) },
      $transaction: jest.fn().mockResolvedValue([]),
    };
    for (const model of [
      'refreshToken',
      'passwordResetToken',
      'emailVerificationToken',
      'twoFactorBackupCode',
      'deviceToken',
      'notification',
      'follow',
      'postLike',
      'postComment',
      'post',
    ]) {
      prisma[model] = { deleteMany: jest.fn().mockReturnValue(`${model}.del`) };
    }
    for (const model of [
      'service',
      'job',
      'userProfile',
      'identityVerification',
      'freelancerSettings',
      'commerce',
      'driver',
    ]) {
      prisma[model] = { updateMany: jest.fn().mockReturnValue(`${model}.upd`) };
    }
    redis = {
      del: jest.fn().mockResolvedValue(undefined),
      deleteByPattern: jest.fn().mockResolvedValue(0),
    };
    audit = { log: jest.fn().mockResolvedValue(undefined) };
    service = new AccountDeletionService(prisma, redis, audit);
  });

  describe('getBlockers', () => {
    it('no bloquea una cuenta sin saldo ni operaciones abiertas', async () => {
      await expect(service.getBlockers(userId)).resolves.toEqual([]);
    });

    it('bloquea con saldo en la wallet', async () => {
      prisma.wallet.findUnique.mockResolvedValue({
        balance: new Prisma.Decimal('0.01'),
        currency: 'USD',
      });
      const blockers = await service.getBlockers(userId);
      expect(blockers).toHaveLength(1);
      expect(blockers[0]).toContain('0.01 USD');
    });

    it('bloquea con pagos protegidos abiertos como pagador o receptor', async () => {
      prisma.escrow.count.mockResolvedValue(2);
      expect(await service.getBlockers(userId)).toHaveLength(1);
      expect(prisma.escrow.count).toHaveBeenCalledWith({
        where: {
          OR: [{ payerId: userId }, { payeeId: userId }],
          status: { in: ['HELD', 'PENDING_FUNDS', 'DISPUTED'] },
        },
      });
    });

    it('bloquea con depósitos pendientes', async () => {
      prisma.walletDepositRequest.count.mockResolvedValue(1);
      expect(await service.getBlockers(userId)).toHaveLength(1);
    });

    it('bloquea a un vendedor con estados de cuenta sin pagar (la deuda no se borra)', async () => {
      prisma.sellerStatement.aggregate.mockResolvedValue({
        _count: 1,
        _sum: { totalAmount: 14.5 },
      });
      const blockers = await service.getBlockers(userId);
      expect(blockers.join(' ')).toContain('estado(s) de cuenta sin pagar');
    });

    it('bloquea con comisiones de la semana aún sin facturar', async () => {
      prisma.sellerCommissionCharge.aggregate.mockResolvedValue({
        _sum: { amount: 3 },
      });
      const blockers = await service.getBlockers(userId);
      expect(blockers.join(' ')).toContain('comisiones de esta semana');
    });

    it('bloquea con un retiro en proceso', async () => {
      prisma.walletWithdrawalRequest.count.mockResolvedValue(1);
      const blockers = await service.getBlockers(userId);
      expect(blockers.join(' ')).toContain('retiro en proceso');
    });

    it('bloquea al único SUPERADMIN activo, no si hay otro', async () => {
      prisma.user.findUnique.mockResolvedValue({ role: Role.SUPERADMIN });
      prisma.user.count.mockResolvedValue(1);
      expect(await service.getBlockers(userId)).toHaveLength(1);
      prisma.user.count.mockResolvedValue(2);
      expect(await service.getBlockers(userId)).toEqual([]);
    });
  });

  describe('deleteAccount', () => {
    it('no toca nada si hay bloqueos', async () => {
      prisma.escrow.count.mockResolvedValue(1);
      await expect(service.deleteAccount(userId)).rejects.toBeInstanceOf(
        ConflictException
      );
      expect(prisma.$transaction).not.toHaveBeenCalled();
      expect(audit.log).not.toHaveBeenCalled();
    });

    it('anonimiza y desactiva al usuario en una sola transacción', async () => {
      await service.deleteAccount(userId, { ip: '1.2.3.4' });

      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
      const ops = prisma.$transaction.mock.calls[0][0];
      expect(ops).toContain('user.update');
      expect(ops).toContain('refreshToken.del');
      expect(ops).toContain('identityVerification.upd');

      const { data } = prisma.user.update.mock.calls[0][0];
      expect(data).toMatchObject({
        email: `eliminado-${userId}@eliminado.invalid`,
        firstName: 'Usuario',
        lastName: 'eliminado',
        phone: null,
        birthDate: null,
        avatar: null,
        twoFactorSecret: null,
        isActive: false,
      });
      expect(data.password).not.toBe('');
      expect(
        prisma.identityVerification.updateMany.mock.calls[0][0].data
      ).toMatchObject({ fullName: '', documentNumber: '', birthDate: null });
      expect(prisma.follow.deleteMany).toHaveBeenCalledWith({
        where: { OR: [{ followerId: userId }, { followingId: userId }] },
      });
    });

    it('registra el borrado en auditoría y cierra las sesiones', async () => {
      await service.deleteAccount(userId, { ip: '1.2.3.4' });
      expect(audit.log).toHaveBeenCalledWith(
        expect.objectContaining({ userId, action: 'DELETE', ip: '1.2.3.4' })
      );
      expect(redis.deleteByPattern).toHaveBeenCalledWith(`session:${userId}:*`);
    });

    it('no falla si Redis no responde: la cuenta ya quedó eliminada', async () => {
      redis.deleteByPattern.mockRejectedValue(new Error('redis caído'));
      await expect(service.deleteAccount(userId)).resolves.toBeUndefined();
    });
  });
});
