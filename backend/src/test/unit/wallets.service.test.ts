import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Role } from '@prisma/client';
import {
  WalletsService,
  InsufficientEscrowFundsError,
} from '../../domains/money/wallets/wallets.service';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../redis/redis.service';
import { WalletPinService } from '../../domains/money/wallets/wallet-pin.service';
import { WalletLimitsService } from '../../domains/money/wallets/wallet-limits.service';
import { ModuleRef } from '@nestjs/core';

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

    it('propaga NotFoundException si el cliente no tiene wallet — NO la convierte en PENDING_FUNDS', async () => {
      mockPrismaService.wallet.findUnique.mockResolvedValue(null);

      await expect(
        service.holdEscrow(CLIENT_ID, 50, REQUEST_ID)
      ).rejects.toBeInstanceOf(NotFoundException);
      await expect(
        service.holdEscrow(CLIENT_ID, 50, REQUEST_ID)
      ).rejects.not.toBeInstanceOf(InsufficientEscrowFundsError);
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
      expect(moduleRef.get).toHaveBeenCalledWith('ServicesService', {
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

    it('rechaza si el motivo (description) viene vacío', async () => {
      mockPrismaService.wallet.findUnique.mockResolvedValue(
        wallet({ userId: TARGET_ID, balance: 100 })
      );

      await expect(
        service.adjust(TARGET_ID, ADMIN_ID, Role.ADMIN, {
          type: 'CREDIT',
          amount: 10,
        } as any)
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(mockPrismaService.wallet.update).not.toHaveBeenCalled();
    });

    it('rechaza si el motivo es solo espacios en blanco', async () => {
      mockPrismaService.wallet.findUnique.mockResolvedValue(
        wallet({ userId: TARGET_ID, balance: 100 })
      );

      await expect(
        service.adjust(TARGET_ID, ADMIN_ID, Role.ADMIN, {
          type: 'CREDIT',
          amount: 10,
          description: '   ',
        } as any)
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rechaza a un actor que no es admin', async () => {
      await expect(
        service.adjust(TARGET_ID, ADMIN_ID, Role.PROFESIONAL, {
          type: 'CREDIT',
          amount: 10,
          description: 'motivo',
        } as any)
      ).rejects.toThrow();
    });

    it('aplica el ajuste con motivo válido, recortando espacios', async () => {
      mockPrismaService.wallet.findUnique.mockResolvedValue(
        wallet({ userId: TARGET_ID, balance: 100 })
      );

      const result = await service.adjust(TARGET_ID, ADMIN_ID, Role.ADMIN, {
        type: 'CREDIT',
        amount: 10,
        description: '  ajuste de prueba  ',
      } as any);

      expect(result.transaction.description).toBe('ajuste de prueba');
      // El saldo se calcula con Decimal (common/money): se compara el valor,
      // no el tipo.
      const [updateArgs] = mockPrismaService.wallet.update.mock.calls[0];
      expect(updateArgs.where).toEqual({
        id: wallet({ userId: TARGET_ID }).id,
      });
      expect(updateArgs.data.balance.toString()).toBe('110');
    });

    it('ajusta sin error de coma flotante (Float daba 0.30000000000000004)', async () => {
      mockPrismaService.wallet.findUnique.mockResolvedValue(
        wallet({ userId: TARGET_ID, balance: 0.1 })
      );

      await service.adjust(TARGET_ID, ADMIN_ID, Role.ADMIN, {
        type: 'CREDIT',
        amount: 0.2,
        description: 'motivo',
      } as any);

      const [updateArgs] = mockPrismaService.wallet.update.mock.calls[0];
      expect(updateArgs.data.balance.toString()).toBe('0.3');
    });

    it('rechaza si el débito dejaría el saldo en negativo', async () => {
      mockPrismaService.wallet.findUnique.mockResolvedValue(
        wallet({ userId: TARGET_ID, balance: 5 })
      );

      await expect(
        service.adjust(TARGET_ID, ADMIN_ID, Role.ADMIN, {
          type: 'DEBIT',
          amount: 10,
          description: 'motivo',
        } as any)
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });
});
