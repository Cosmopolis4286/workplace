import { Test, TestingModule } from '@nestjs/testing';
import { CashService } from '../../domains/operations/cash/cash.service';
import { PrismaService } from '../../prisma/prisma.service';
import { CommerceResolverService } from '../../common/commerce-resolver/commerce-resolver.service';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { I18nService } from 'nestjs-i18n';

describe('CashService', () => {
  let service: CashService;

  const mockPrismaService = {
    cashSession: {
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
    },
    cashMovement: {
      create: jest.fn(),
      groupBy: jest.fn(),
    },
    order: {
      aggregate: jest.fn(),
    },
    $transaction: jest.fn((callback: (tx: any) => unknown) =>
      callback(mockPrismaService)
    ),
  };

  const I18N_MESSAGES: Record<string, string> = {
    'cash.session.already_open': 'Ya hay una sesión de caja abierta',
    'cash.session.no_open_session': 'No hay una sesión de caja abierta',
    'cash.session.not_found': 'Sesión de caja no encontrada',
  };
  const mockI18nService = {
    t: jest.fn((key: string) => I18N_MESSAGES[key] ?? key),
  };

  const commerceId = 'commerce-123';

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CashService,
        { provide: PrismaService, useValue: mockPrismaService },
        {
          provide: CommerceResolverService,
          useValue: { resolve: jest.fn(), resolveOrCreate: jest.fn() },
        },
        { provide: I18nService, useValue: mockI18nService },
      ],
    }).compile();

    service = module.get<CashService>(CashService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('open', () => {
    it('creates a session when none is open', async () => {
      mockPrismaService.cashSession.findFirst.mockResolvedValue(null);
      mockPrismaService.cashSession.create.mockResolvedValue({
        id: 'session-1',
        status: 'OPEN',
        openingAmount: 100,
        commerceId,
      });

      const result = await service.open(commerceId, 'Cajero Demo', {
        openingAmount: 100,
      });

      expect(result).toMatchObject({ id: 'session-1', status: 'OPEN' });
      expect(mockPrismaService.cashSession.create).toHaveBeenCalledWith({
        data: {
          commerceId,
          openedBy: 'Cajero Demo',
          openingAmount: 100,
          notes: undefined,
        },
      });
    });

    it('rejects opening a second session while one is already open', async () => {
      mockPrismaService.cashSession.findFirst.mockResolvedValue({
        id: 'existing',
        status: 'OPEN',
      });

      await expect(
        service.open(commerceId, 'Cajero Demo', { openingAmount: 50 })
      ).rejects.toThrow(ConflictException);
      expect(mockPrismaService.cashSession.create).not.toHaveBeenCalled();
    });
  });

  describe('close', () => {
    const openSession = {
      id: 'session-1',
      commerceId,
      openingAmount: 100,
      openedAt: new Date('2026-07-03T10:00:00Z'),
    };

    it('throws when there is no open session', async () => {
      mockPrismaService.cashSession.findFirst.mockResolvedValue(null);

      await expect(
        service.close(commerceId, 'Cajero Demo', { countedAmount: 100 })
      ).rejects.toThrow(NotFoundException);
    });

    it('computes expected amount and a negative difference (faltante)', async () => {
      mockPrismaService.cashSession.findFirst.mockResolvedValue(openSession);
      mockPrismaService.order.aggregate.mockResolvedValue({
        _sum: { total: 50 },
        _count: 2,
      });
      mockPrismaService.cashMovement.groupBy.mockResolvedValue([
        { type: 'WITHDRAWAL', _sum: { amount: 20 } },
      ]);
      mockPrismaService.cashSession.update.mockImplementation(
        ({ data }: any) => ({
          id: openSession.id,
          ...data,
        })
      );

      // esperado = 100 (apertura) + 50 (ventas efectivo) - 20 (retiro) = 130
      const result = await service.close(commerceId, 'Cajero Demo', {
        countedAmount: 125,
      });

      expect(result.expectedAmount).toBe(130);
      expect(result.difference).toBe(-5); // faltante de 5
      expect(result.status).toBe('CLOSED');
    });

    it('computes a positive difference (sobrante) when counted exceeds expected', async () => {
      mockPrismaService.cashSession.findFirst.mockResolvedValue(openSession);
      mockPrismaService.order.aggregate.mockResolvedValue({
        _sum: { total: 0 },
        _count: 0,
      });
      mockPrismaService.cashMovement.groupBy.mockResolvedValue([]);
      mockPrismaService.cashSession.update.mockImplementation(
        ({ data }: any) => ({
          id: openSession.id,
          ...data,
        })
      );

      // esperado = 100 (apertura) + 0 ventas - 0 movimientos = 100
      const result = await service.close(commerceId, 'Cajero Demo', {
        countedAmount: 110,
      });

      expect(result.expectedAmount).toBe(100);
      expect(result.difference).toBe(10); // sobrante de 10
    });
  });

  describe('addMovement', () => {
    it('throws when there is no open session', async () => {
      mockPrismaService.cashSession.findFirst.mockResolvedValue(null);

      await expect(
        service.addMovement(commerceId, {
          type: 'WITHDRAWAL',
          amount: 10,
          reason: 'test',
        })
      ).rejects.toThrow(NotFoundException);
    });

    it('creates the movement scoped to the open session and commerce', async () => {
      mockPrismaService.cashSession.findFirst.mockResolvedValue({
        id: 'session-1',
        commerceId,
      });
      mockPrismaService.cashMovement.create.mockResolvedValue({ id: 'mov-1' });

      await service.addMovement(commerceId, {
        type: 'INCOME',
        amount: 30,
        reason: 'Ajuste',
      });

      expect(mockPrismaService.cashMovement.create).toHaveBeenCalledWith({
        data: {
          commerceId,
          sessionId: 'session-1',
          type: 'INCOME',
          amount: 30,
          reason: 'Ajuste',
        },
      });
    });
  });

  describe('getCurrent', () => {
    it('returns null when there is no open session', async () => {
      mockPrismaService.cashSession.findFirst.mockResolvedValue(null);

      const result = await service.getCurrent(commerceId);

      expect(result).toBeNull();
    });

    it('returns the session enriched with the live summary', async () => {
      mockPrismaService.cashSession.findFirst.mockResolvedValue({
        id: 'session-1',
        commerceId,
        openingAmount: 100,
        openedAt: new Date('2026-07-03T10:00:00Z'),
        movements: [],
      });
      mockPrismaService.order.aggregate.mockResolvedValue({
        _sum: { total: 25 },
        _count: 1,
      });
      mockPrismaService.cashMovement.groupBy.mockResolvedValue([]);

      const result = await service.getCurrent(commerceId);

      expect(result?.expectedAmount).toBe(125);
      expect(result?.cashSalesTotal).toBe(25);
    });
  });

  describe('findOne', () => {
    it('throws NotFoundException when the session does not belong to the commerce', async () => {
      mockPrismaService.cashSession.findFirst.mockResolvedValue(null);

      await expect(
        service.findOne('other-session', commerceId)
      ).rejects.toThrow(NotFoundException);
      expect(mockPrismaService.cashSession.findFirst).toHaveBeenCalledWith({
        where: { id: 'other-session', commerceId },
        include: { movements: { orderBy: { createdAt: 'desc' } } },
      });
    });
  });
});
