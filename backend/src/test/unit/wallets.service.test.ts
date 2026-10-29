import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { Role } from '@prisma/client';
import { WalletsService } from '../../domains/money/wallets/wallets.service';
import { InsufficientEscrowFundsError } from '../../domains/money/wallets/wallet.errors';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../redis/redis.service';
import { WalletPinService } from '../../domains/money/wallets/wallet-pin.service';
import { WalletLimitsService } from '../../domains/money/wallets/wallet-limits.service';
import { ModuleRef } from '@nestjs/core';
import { SERVICES_FACADE } from '../../domains/commerce-core/services/services.facade';

describe('WalletsService — escrow', () => {
  let service: WalletsService;
  let mockPrismaService: any;

  const CLIENT_ID = 'client-1';
  const PROVIDER_ID = 'provider-1';
  const SYSTEM_USER_ID = 'system-escrow-1';
  const REQUEST_ID = 'req-1';

  function wallet(overrides: Partial<any> = {}) {
    return {
      id: `wallet-${overrides.userId ?? 'x'}`,
      userId: 'x',
      balance: 100,
      status: 'ACTIVE',
      frozenAt: null,
      ...overrides,
    };
  }

  // tx.$queryRaw se llama como template tag: fn(strings, ...values). El texto
  // SQL no importa para estos tests — solo controlamos qué fila devuelve cada
  // llamada, en el mismo orden en que WalletsService las dispara.
  function makeQueryRawSequence(rows: (Record<string, any> | null)[]) {
    let call = 0;
    return jest.fn(() => {
      const row = rows[call++];
      return Promise.resolve(row ? [row] : []);
    });
  }

  beforeEach(async () => {
    mockPrismaService = {
      user: {
        findUnique: jest.fn(),
        create: jest.fn(),
      },
      wallet: {
        findUnique: jest.fn(),
        upsert: jest.fn(),
        update: jest
          .fn()
          .mockImplementation(({ data }: any) =>
            Promise.resolve(wallet({ ...data }))
          ),
      },
      walletTransaction: {
        create: jest
          .fn()
          .mockImplementation(({ data }: any) =>
            Promise.resolve({ id: 'tx-1', ...data })
          ),
      },
      serviceRequest: {
        aggregate: jest.fn(),
        count: jest.fn(),
      },
      $transaction: jest.fn((callback: (tx: any) => unknown) =>
        callback(mockPrismaService)
      ),
      $queryRaw: jest.fn(),
    };

    const mockRedisService = { get: jest.fn(), setex: jest.fn() };
    const mockPinService = {};
    const mockLimitsService = {
      getLimitsForRole: jest.fn().mockResolvedValue({ maxBalance: 10000 }),
      assertBalanceLimit: jest.fn().mockResolvedValue(undefined),
      recordDebit: jest.fn().mockResolvedValue(undefined),
    };
    const mockModuleRef = { get: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WalletsService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: RedisService, useValue: mockRedisService },
        { provide: WalletPinService, useValue: mockPinService },
        { provide: WalletLimitsService, useValue: mockLimitsService },
        { provide: ModuleRef, useValue: mockModuleRef },
      ],
    }).compile();

    service = module.get<WalletsService>(WalletsService);

    // ensureEscrowSystemUserId(): primera llamada de cada test busca por email
    // y, si no existe, lo crea — se cachea en memoria dentro del service
    // (escrowSystemUserId), así que alcanza con mockear la primera resolución.
    mockPrismaService.user.findUnique.mockImplementation(({ where }: any) => {
      if (where?.email) return Promise.resolve({ id: SYSTEM_USER_ID });
      return Promise.resolve({ id: where.id });
    });
    mockPrismaService.wallet.upsert.mockImplementation(({ where }: any) =>
      Promise.resolve(
        wallet({ userId: where.userId, id: `wallet-${where.userId}` })
      )
    );
  });

  describe('holdEscrow', () => {
    it('retiene el monto del cliente y lo acredita a la wallet de sistema', async () => {
      mockPrismaService.wallet.findUnique.mockResolvedValue(
        wallet({ userId: CLIENT_ID, balance: 100 })
      );
      mockPrismaService.$queryRaw = makeQueryRawSequence([
        { new_balance: 50 }, // débito cliente: 100 - 50
        { new_balance: 50 }, // crédito sistema: 0 + 50
      ]);

      const result = await service.holdEscrow(CLIENT_ID, 50, REQUEST_ID);

      expect(result.transaction).toBeDefined();
      expect(mockPrismaService.walletTransaction.create).toHaveBeenCalledTimes(
        2
      );
      expect(
        mockPrismaService.walletTransaction.create
      ).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({
          data: expect.objectContaining({
            userId: CLIENT_ID,
            type: 'DEBIT',
            amount: 50,
          }),
        })
      );
      expect(
        mockPrismaService.walletTransaction.create
      ).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({
          data: expect.objectContaining({
            userId: SYSTEM_USER_ID,
            type: 'CREDIT',
            amount: 50,
          }),
        })
      );
    });

    it('lanza InsufficientEscrowFundsError (no BadRequestException genérico) si el saldo declarado es insuficiente', async () => {
      mockPrismaService.wallet.findUnique.mockResolvedValue(
        wallet({ userId: CLIENT_ID, balance: 10 })
      );

      await expect(
        service.holdEscrow(CLIENT_ID, 50, REQUEST_ID)
      ).rejects.toBeInstanceOf(InsufficientEscrowFundsError);
      // No debe haber intentado ninguna escritura si la validación pre-tx ya falló
      expect(mockPrismaService.walletTransaction.create).not.toHaveBeenCalled();
    });

    it('lanza InsufficientEscrowFundsError si el UPDATE atómico no afecta filas (carrera de saldo)', async () => {
      // El saldo "parece" suficiente en el pre-check, pero la fila no se actualiza
      // dentro de la transacción — simula que otra operación gastó el saldo primero.
      mockPrismaService.wallet.findUnique.mockResolvedValue(
        wallet({ userId: CLIENT_ID, balance: 100 })
      );
      mockPrismaService.$queryRaw = jest.fn().mockResolvedValue([]); // sin fila devuelta

      await expect(
        service.holdEscrow(CLIENT_ID, 50, REQUEST_ID)
      ).rejects.toBeInstanceOf(InsufficientEscrowFundsError);
    });

    it('crea la wallet del cliente que no tiene y la deja en PENDING_FUNDS (saldo 0), sin fallar la transición', async () => {
      // La billetera ya no se crea para recargar: sin billetera = saldo 0 y la
      // garantía se paga por operación (money/escrow-funding).
      mockPrismaService.wallet.findUnique.mockResolvedValue(
        wallet({ userId: CLIENT_ID, balance: 0 })
      );

      await expect(
        service.holdEscrow(CLIENT_ID, 50, REQUEST_ID)
      ).rejects.toBeInstanceOf(InsufficientEscrowFundsError);
      expect(mockPrismaService.wallet.upsert).toHaveBeenCalledWith(
        expect.objectContaining({ where: { userId: CLIENT_ID } })
      );
      expect(mockPrismaService.walletTransaction.create).not.toHaveBeenCalled();
    });

    it('propaga BadRequestException si la wallet del cliente está congelada — NO la convierte en PENDING_FUNDS', async () => {
      mockPrismaService.wallet.findUnique.mockResolvedValue(
        wallet({ userId: CLIENT_ID, balance: 100, frozenAt: new Date() })
      );

      const error = await service
        .holdEscrow(CLIENT_ID, 50, REQUEST_ID)
        .catch((e) => e);
      expect(error).toBeInstanceOf(BadRequestException);
      expect(error).not.toBeInstanceOf(InsufficientEscrowFundsError);
    });
  });

  describe('releaseEscrow', () => {
    it('debita la wallet de sistema y acredita al proveedor', async () => {
      mockPrismaService.$queryRaw = makeQueryRawSequence([
        { new_balance: 0 }, // débito sistema
        { new_balance: 45 }, // crédito proveedor
      ]);

      const result = await service.releaseEscrow(REQUEST_ID, PROVIDER_ID, 45);

      expect(result.transaction).toBeDefined();
      expect(
        mockPrismaService.walletTransaction.create
      ).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({
          data: expect.objectContaining({
            userId: PROVIDER_ID,
            type: 'CREDIT',
            amount: 45,
          }),
        })
      );
    });
  });

  describe('refundEscrow', () => {
    it('debita la wallet de sistema y acredita de vuelta al cliente', async () => {
      mockPrismaService.$queryRaw = makeQueryRawSequence([
        { new_balance: 0 }, // débito sistema
        { new_balance: 150 }, // crédito cliente
      ]);

      const result = await service.refundEscrow(REQUEST_ID, CLIENT_ID, 50);

      expect(result.transaction).toBeDefined();
      expect(
        mockPrismaService.walletTransaction.create
      ).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({
          data: expect.objectContaining({
            userId: CLIENT_ID,
            type: 'CREDIT',
            amount: 50,
          }),
        })
      );
    });
  });

  describe('deposit — hook de reintento de escrow', () => {
    it('dispara retryPendingEscrowsForClient tras un depósito exitoso sin bloquear la respuesta', async () => {
      mockPrismaService.wallet.findUnique.mockResolvedValue(
        wallet({ userId: CLIENT_ID, balance: 0 })
      );
      mockPrismaService.$queryRaw = jest
        .fn()
        .mockResolvedValue([{ new_balance: 100 }]);

      const retrySpy = jest.fn().mockResolvedValue(undefined);
      const moduleRef = (service as any).moduleRef;
      moduleRef.get.mockReturnValue({ retryPendingEscrowsForClient: retrySpy });

      await service.deposit(CLIENT_ID, Role.NORMAL, { amount: 100 } as any);

      // Fire-and-forget: puede no haberse resuelto aún, pero debe haberse invocado.
      expect(moduleRef.get).toHaveBeenCalledWith(SERVICES_FACADE, {
        strict: false,
      });
      expect(retrySpy).toHaveBeenCalledWith(CLIENT_ID);
    });
  });

  describe('getEscrowReconciliation', () => {
    it('reporta isBalanced=true cuando el saldo real coincide con lo retenido (HELD)', async () => {
      mockPrismaService.wallet.upsert.mockResolvedValue(
        wallet({ userId: SYSTEM_USER_ID, balance: 300 })
      );
      mockPrismaService.serviceRequest.aggregate.mockImplementation(
        ({ where }: any) => {
          if (where.escrowStatus === 'HELD')
            return Promise.resolve({ _sum: { escrowAmount: 300 }, _count: 2 });
          return Promise.resolve({ _sum: { escrowAmount: 0 } });
        }
      );
      mockPrismaService.serviceRequest.count.mockResolvedValue(0);

      const result = await service.getEscrowReconciliation(Role.SUPERADMIN);

      expect(result.systemWalletBalance).toBe(300);
      expect(result.heldTotal).toBe(300);
      expect(result.heldCount).toBe(2);
      expect(result.discrepancy).toBe(0);
      expect(result.isBalanced).toBe(true);
    });

    it('reporta la discrepancia cuando el saldo real no coincide con lo retenido', async () => {
      mockPrismaService.wallet.upsert.mockResolvedValue(
        wallet({ userId: SYSTEM_USER_ID, balance: 250 })
      );
      mockPrismaService.serviceRequest.aggregate.mockImplementation(
        ({ where }: any) => {
          if (where.escrowStatus === 'HELD')
            return Promise.resolve({ _sum: { escrowAmount: 300 }, _count: 2 });
          return Promise.resolve({ _sum: { escrowAmount: 40 } });
        }
      );
      mockPrismaService.serviceRequest.count.mockResolvedValue(1);

      const result = await service.getEscrowReconciliation(Role.ADMIN);

      expect(result.discrepancy).toBe(-50);
      expect(result.isBalanced).toBe(false);
      expect(result.pendingFundsTotal).toBe(40);
      expect(result.pendingFundsCount).toBe(1);
    });

    it('rechaza a un usuario que no es admin', async () => {
      await expect(
        service.getEscrowReconciliation(Role.PROFESIONAL)
      ).rejects.toThrow();
    });
  });

  describe('adjust', () => {
    const TARGET_ID = 'target-1';
    const ADMIN_ID = 'admin-1';
    const SUPER = Role.SUPERADMIN;

    beforeEach(() => {
      mockPrismaService.wallet.findUnique.mockResolvedValue(
        wallet({ userId: TARGET_ID, balance: 100 })
      );
    });

    it('rechaza si el motivo (description) viene vacío', async () => {
      mockPrismaService.$queryRaw = jest.fn();
      await expect(
        service.adjust(TARGET_ID, ADMIN_ID, SUPER, {
          type: 'CREDIT',
          amount: 10,
        } as any)
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(mockPrismaService.$queryRaw).not.toHaveBeenCalled();
    });

    it('rechaza si el motivo es solo espacios en blanco', async () => {
      await expect(
        service.adjust(TARGET_ID, ADMIN_ID, SUPER, {
          type: 'CREDIT',
          amount: 10,
          description: '   ',
        } as any)
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it.each([Role.ADMIN, Role.PROFESIONAL])(
      'solo SUPERADMIN puede ajustar (rechaza %s)',
      async (role) => {
        await expect(
          service.adjust(TARGET_ID, ADMIN_ID, role, {
            type: 'CREDIT',
            amount: 10,
            description: 'motivo',
          } as any)
        ).rejects.toBeInstanceOf(ForbiddenException);
      }
    );

    it('nadie puede ajustar su propia billetera', async () => {
      await expect(
        service.adjust(ADMIN_ID, ADMIN_ID, SUPER, {
          type: 'CREDIT',
          amount: 10,
          description: 'motivo',
        } as any)
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('aplica el ajuste con un UPDATE atómico relativo al saldo y recorta el motivo', async () => {
      mockPrismaService.$queryRaw = makeQueryRawSequence([
        { new_balance: 110 },
      ]);

      const result = await service.adjust(TARGET_ID, ADMIN_ID, SUPER, {
        type: 'CREDIT',
        amount: 10,
        description: '  ajuste de prueba  ',
      } as any);

      expect(result.transaction.description).toBe('ajuste de prueba');
      expect(result.wallet.balance).toBe(110);
      // balance + delta (no un saldo calculado afuera y sobrescrito)
      const [, delta] = mockPrismaService.$queryRaw.mock.calls[0];
      expect(delta).toBe('10');
      expect(mockPrismaService.wallet.update).not.toHaveBeenCalled();
    });

    it('un débito usa delta negativo (sin coma flotante)', async () => {
      mockPrismaService.$queryRaw = makeQueryRawSequence([
        { new_balance: 99.7 },
      ]);

      await service.adjust(TARGET_ID, ADMIN_ID, SUPER, {
        type: 'DEBIT',
        amount: 0.3,
        description: 'motivo',
      } as any);

      const [, delta] = mockPrismaService.$queryRaw.mock.calls[0];
      expect(delta).toBe('-0.3');
    });

    it('rechaza si el débito dejaría el saldo en negativo (el UPDATE no afecta filas)', async () => {
      mockPrismaService.$queryRaw = makeQueryRawSequence([null]);

      await expect(
        service.adjust(TARGET_ID, ADMIN_ID, SUPER, {
          type: 'DEBIT',
          amount: 1000,
          description: 'motivo',
        } as any)
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(mockPrismaService.walletTransaction.create).not.toHaveBeenCalled();
    });
  });
});
