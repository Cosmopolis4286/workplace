import { Test, TestingModule } from '@nestjs/testing';
import { EscrowService } from '../../domains/money/escrow/escrow.service';
import { PrismaService } from '../../prisma/prisma.service';
import { WalletsService } from '../../domains/money/wallets/wallets.service';
import { NotificationsService } from '../../domains/engagement/notifications/notifications.service';
import { money } from '../money-matcher';

describe('EscrowService', () => {
  // Estas pruebas cubren el Pago Protegido encendido; el modo apagado (por
  // defecto) se prueba en protected-payments-disabled.test.ts.
  const previousProtectedPayments = process.env.PROTECTED_PAYMENTS_ENABLED;
  beforeAll(() => {
    process.env.PROTECTED_PAYMENTS_ENABLED = 'true';
  });
  afterAll(() => {
    if (previousProtectedPayments === undefined) {
      delete process.env.PROTECTED_PAYMENTS_ENABLED;
    } else {
      process.env.PROTECTED_PAYMENTS_ENABLED = previousProtectedPayments;
    }
  });

  let service: EscrowService;

  const mockPrismaService: any = {
    escrow: { findUnique: jest.fn(), upsert: jest.fn(), update: jest.fn() },
    escrowDispute: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    serviceRequest: { update: jest.fn(), findUnique: jest.fn() },
    user: { findMany: jest.fn().mockResolvedValue([]) },
    catalogOrder: { update: jest.fn(), findUnique: jest.fn() },
    $queryRaw: jest.fn().mockResolvedValue([{ id: 'e1' }]),
    $transaction: jest.fn((input: any) =>
      typeof input === 'function'
        ? input(mockPrismaService)
        : Promise.all(input)
    ),
  };

  const mockWalletsService = {
    holdEscrow: jest.fn(),
    releaseEscrow: jest.fn(),
    refundEscrow: jest.fn(),
  };

  const mockNotificationsService = {
    notifyEscrowDisputeOpened: jest.fn().mockResolvedValue(undefined),
    notifyEscrowDisputeResolved: jest.fn().mockResolvedValue(undefined),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    mockPrismaService.escrow.findUnique.mockResolvedValue(null);
    mockPrismaService.escrowDispute.findFirst.mockResolvedValue(null);
    mockPrismaService.escrowDispute.create.mockImplementation(({ data }: any) =>
      Promise.resolve({
        id: 'dispute-new',
        status: 'OPEN',
        resolution: null,
        releaseAmount: null,
        refundAmount: null,
        resolvedById: null,
        resolvedAt: null,
        ...data,
      })
    );
    mockPrismaService.escrowDispute.update.mockImplementation(({ data }: any) =>
      Promise.resolve({
        id: 'dispute-1',
        escrowId: 'e1',
        raisedById: 'client-1',
        raisedByRole: 'PAYER',
        reason: 'x',
        ...data,
      })
    );
    mockPrismaService.escrow.update.mockImplementation(({ data }: any) =>
      Promise.resolve({ id: 'e1', ...data })
    );
    mockPrismaService.serviceRequest.update.mockResolvedValue({});
    mockPrismaService.catalogOrder.update.mockResolvedValue({});
    mockPrismaService.serviceRequest.findUnique.mockResolvedValue({
      serviceName: 'Servicio X',
    });
    mockPrismaService.catalogOrder.findUnique.mockResolvedValue({
      commerceName: 'Comercio X',
    });
    mockPrismaService.$queryRaw.mockResolvedValue([{ id: 'e1' }]);
    mockPrismaService.$transaction.mockImplementation((input: any) =>
      typeof input === 'function'
        ? input(mockPrismaService)
        : Promise.all(input)
    );

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EscrowService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: WalletsService, useValue: mockWalletsService },
        { provide: NotificationsService, useValue: mockNotificationsService },
      ],
    }).compile();

    service = module.get<EscrowService>(EscrowService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('hold', () => {
    it('debits via WalletsService.holdEscrow before persisting the Escrow row', async () => {
      mockWalletsService.holdEscrow.mockResolvedValue({ transaction: {} });
      mockPrismaService.escrow.upsert.mockResolvedValue({
        id: 'e1',
        entityType: 'SERVICE_REQUEST',
        entityId: 'req-1',
        payerId: 'client-1',
        payeeId: 'provider-1',
        status: 'HELD',
        amount: 100,
        heldAt: new Date(),
        releasedAt: null,
        refundedAt: null,
      });

      await service.hold({
        entityType: 'SERVICE_REQUEST',
        entityId: 'req-1',
        payerId: 'client-1',
        payeeId: 'provider-1',
        deltaAmount: 100,
      });

      expect(mockWalletsService.holdEscrow).toHaveBeenCalledWith(
        'client-1',
        100,
        'req-1',
        undefined
      );
    });

    it('does not persist any Escrow row when WalletsService.holdEscrow throws', async () => {
      mockWalletsService.holdEscrow.mockRejectedValue(
        new Error('insufficient funds')
      );

      await expect(
        service.hold({
          entityType: 'SERVICE_REQUEST',
          entityId: 'req-1',
          payerId: 'c1',
          payeeId: 'p1',
          deltaAmount: 50,
        })
      ).rejects.toThrow('insufficient funds');

      expect(mockPrismaService.escrow.upsert).not.toHaveBeenCalled();
    });

    it('creates a new Escrow row with the delta as the total amount when none existed', async () => {
      mockWalletsService.holdEscrow.mockResolvedValue({ transaction: {} });
      mockPrismaService.escrow.findUnique.mockResolvedValue(null);
      mockPrismaService.escrow.upsert.mockImplementation(({ create }: any) =>
        Promise.resolve({ ...create, id: 'e1' })
      );

      await service.hold({
        entityType: 'CATALOG_ORDER',
        entityId: 'order-1',
        payerId: 'buyer-1',
        payeeId: 'commerce-user-1',
        deltaAmount: 200,
      });

      expect(mockPrismaService.escrow.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({
            amount: money(200),
            status: 'HELD',
          }),
        })
      );
    });

    it('accumulates the delta on top of the existing amount instead of overwriting it (price-increase case)', async () => {
      mockWalletsService.holdEscrow.mockResolvedValue({ transaction: {} });
      mockPrismaService.escrow.findUnique.mockResolvedValue({ amount: 100 });
      mockPrismaService.escrow.upsert.mockImplementation(({ update }: any) =>
        Promise.resolve({ ...update, id: 'e1' })
      );

      await service.hold({
        entityType: 'SERVICE_REQUEST',
        entityId: 'req-1',
        payerId: 'c1',
        payeeId: 'p1',
        deltaAmount: 50,
      });

      // 100 ya retenido + 50 de delta = 150 total, NUNCA 50 sobrescribiendo el total
      expect(mockPrismaService.escrow.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          update: expect.objectContaining({ amount: money(150) }),
        })
      );
      expect(mockWalletsService.holdEscrow).toHaveBeenCalledWith(
        'c1',
        50,
        'req-1',
        undefined
      ); // solo el delta se debita
    });

    it('forwards referenceOverride to WalletsService.holdEscrow', async () => {
      mockWalletsService.holdEscrow.mockResolvedValue({ transaction: {} });
      mockPrismaService.escrow.upsert.mockResolvedValue({
        id: 'e1',
        entityType: 'SERVICE_REQUEST',
        entityId: 'req-1',
        payerId: 'c1',
        payeeId: 'p1',
        status: 'HELD',
        amount: 50,
        heldAt: new Date(),
        releasedAt: null,
        refundedAt: null,
      });

      await service.hold({
        entityType: 'SERVICE_REQUEST',
        entityId: 'req-1',
        payerId: 'c1',
        payeeId: 'p1',
        deltaAmount: 50,
        referenceOverride: 'ESCROW-HOLD-INCREASE-proposal-1',
      });

      expect(mockWalletsService.holdEscrow).toHaveBeenCalledWith(
        'c1',
        50,
        'req-1',
        'ESCROW-HOLD-INCREASE-proposal-1'
      );
    });
  });

  describe('release', () => {
    it('credits the payee via WalletsService.releaseEscrow and marks the Escrow row RELEASED', async () => {
      mockPrismaService.escrow.findUnique.mockResolvedValue({
        id: 'e1',
        entityType: 'SERVICE_REQUEST',
        entityId: 'req-1',
        payerId: 'c1',
        payeeId: 'p1',
        status: 'HELD',
        amount: money(90),
      });
      mockWalletsService.releaseEscrow.mockResolvedValue({ transaction: {} });
      mockPrismaService.escrow.update.mockResolvedValue({
        id: 'e1',
        entityType: 'SERVICE_REQUEST',
        entityId: 'req-1',
        payerId: 'c1',
        payeeId: 'p1',
        status: 'RELEASED',
        amount: 90,
        heldAt: new Date(),
        releasedAt: new Date(),
        refundedAt: null,
      });

      const result = await service.release({
        entityType: 'SERVICE_REQUEST',
        entityId: 'req-1',
        payeeId: 'p1',
        amount: 90,
      });

      expect(mockWalletsService.releaseEscrow).toHaveBeenCalledWith(
        'req-1',
        'p1',
        90
      );
      expect(mockPrismaService.escrow.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: 'RELEASED' }),
        })
      );
      expect(result.status).toBe('RELEASED');
    });
  });

  describe('refund', () => {
    it('credits the payer via WalletsService.refundEscrow and marks the Escrow row REFUNDED', async () => {
      mockPrismaService.escrow.findUnique.mockResolvedValue({
        id: 'e1',
        entityType: 'CATALOG_ORDER',
        entityId: 'order-1',
        payerId: 'buyer-1',
        payeeId: 'commerce-user-1',
        status: 'HELD',
        amount: money(200),
      });
      mockWalletsService.refundEscrow.mockResolvedValue({ transaction: {} });
      mockPrismaService.escrow.update.mockResolvedValue({
        id: 'e1',
        entityType: 'CATALOG_ORDER',
        entityId: 'order-1',
        payerId: 'buyer-1',
        payeeId: 'commerce-user-1',
        status: 'REFUNDED',
        amount: 200,
        heldAt: new Date(),
        releasedAt: null,
        refundedAt: new Date(),
      });

      const result = await service.refund({
        entityType: 'CATALOG_ORDER',
        entityId: 'order-1',
        payerId: 'buyer-1',
        amount: 200,
      });

      expect(mockWalletsService.refundEscrow).toHaveBeenCalledWith(
        'order-1',
        'buyer-1',
        200
      );
      expect(result.status).toBe('REFUNDED');
    });
  });

  describe('getByEntity', () => {
    it('returns null when there is no Escrow row for the entity', async () => {
      mockPrismaService.escrow.findUnique.mockResolvedValue(null);
      expect(await service.getByEntity('SERVICE_REQUEST', 'req-1')).toBeNull();
    });

    it('maps the persisted row to an EscrowView', async () => {
      mockPrismaService.escrow.findUnique.mockResolvedValue({
        id: 'e1',
        entityType: 'SERVICE_REQUEST',
        entityId: 'req-1',
        payerId: 'c1',
        payeeId: 'p1',
        status: 'HELD',
        amount: 100,
        heldAt: new Date(),
        releasedAt: null,
        refundedAt: null,
      });

      const result = await service.getByEntity('SERVICE_REQUEST', 'req-1');

      expect(result).toMatchObject({ id: 'e1', status: 'HELD', amount: 100 });
    });
  });

  describe('openDispute', () => {
    const heldEscrow = {
      id: 'e1',
      entityType: 'SERVICE_REQUEST',
      entityId: 'req-1',
      payerId: 'client-1',
      payeeId: 'provider-1',
      status: 'HELD',
      amount: 100,
    };

    it('throws NotFoundException when there is no escrow for the entity', async () => {
      mockPrismaService.escrow.findUnique.mockResolvedValue(null);
      await expect(
        service.openDispute({
          entityType: 'SERVICE_REQUEST',
          entityId: 'req-1',
          raisedById: 'client-1',
          reason: 'x',
        })
      ).rejects.toThrow('No hay garantía retenida para esta transacción');
    });

    it('rejects disputing an escrow that is not HELD', async () => {
      mockPrismaService.escrow.findUnique.mockResolvedValue({
        ...heldEscrow,
        status: 'RELEASED',
      });
      await expect(
        service.openDispute({
          entityType: 'SERVICE_REQUEST',
          entityId: 'req-1',
          raisedById: 'client-1',
          reason: 'x',
        })
      ).rejects.toThrow('Solo se puede disputar una garantía retenida (HELD)');
    });

    it('rejects a raisedById that is neither the payer nor the payee', async () => {
      mockPrismaService.escrow.findUnique.mockResolvedValue(heldEscrow);
      await expect(
        service.openDispute({
          entityType: 'SERVICE_REQUEST',
          entityId: 'req-1',
          raisedById: 'stranger',
          reason: 'x',
        })
      ).rejects.toThrow('No tienes permiso para disputar esta transacción');
    });

    it('rejects opening a second dispute while one is already OPEN', async () => {
      mockPrismaService.escrow.findUnique.mockResolvedValue(heldEscrow);
      mockPrismaService.escrowDispute.findFirst.mockResolvedValue({
        id: 'existing-dispute',
      });
      await expect(
        service.openDispute({
          entityType: 'SERVICE_REQUEST',
          entityId: 'req-1',
          raisedById: 'client-1',
          reason: 'x',
        })
      ).rejects.toThrow('Ya existe una disputa abierta para esta transacción');
    });

    it('marks raisedByRole as PAYER when the payer opens the dispute, and moves Escrow to DISPUTED', async () => {
      mockPrismaService.escrow.findUnique.mockResolvedValue(heldEscrow);
      await service.openDispute({
        entityType: 'SERVICE_REQUEST',
        entityId: 'req-1',
        raisedById: 'client-1',
        reason: 'No llegó el pedido',
      });

      expect(mockPrismaService.escrowDispute.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            raisedByRole: 'PAYER',
            escrowId: 'e1',
          }),
        })
      );
      expect(mockPrismaService.escrow.update).toHaveBeenCalledWith({
        where: { id: 'e1' },
        data: { status: 'DISPUTED' },
      });
    });

    it('marks raisedByRole as PAYEE when the payee opens the dispute', async () => {
      mockPrismaService.escrow.findUnique.mockResolvedValue(heldEscrow);

      await service.openDispute({
        entityType: 'SERVICE_REQUEST',
        entityId: 'req-1',
        raisedById: 'provider-1',
        reason: 'Cliente no confirma',
      });

      expect(mockPrismaService.escrowDispute.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ raisedByRole: 'PAYEE' }),
        })
      );
    });
  });

  describe('resolveDispute', () => {
    const openDispute = {
      id: 'dispute-1',
      status: 'OPEN',
      escrow: {
        id: 'e1',
        entityType: 'SERVICE_REQUEST',
        entityId: 'req-1',
        payerId: 'client-1',
        payeeId: 'provider-1',
        amount: 100,
        status: 'DISPUTED',
      },
    };

    it('throws NotFoundException when the dispute does not exist', async () => {
      mockPrismaService.escrowDispute.findUnique.mockResolvedValue(null);
      await expect(
        service.resolveDispute({
          disputeId: 'x',
          resolvedById: 'admin-1',
          resolution: 'RELEASE_FULL',
        })
      ).rejects.toThrow('Disputa no encontrada');
    });

    it('rejects resolving a dispute that is already RESOLVED', async () => {
      mockPrismaService.escrowDispute.findUnique.mockResolvedValue({
        ...openDispute,
        status: 'RESOLVED',
      });
      await expect(
        service.resolveDispute({
          disputeId: 'dispute-1',
          resolvedById: 'admin-1',
          resolution: 'RELEASE_FULL',
        })
      ).rejects.toThrow('Esta disputa ya fue resuelta');
    });

    it('RELEASE_FULL releases the entire amount to the payee and never touches the payer wallet', async () => {
      mockPrismaService.escrowDispute.findUnique.mockResolvedValue(openDispute);

      await service.resolveDispute({
        disputeId: 'dispute-1',
        resolvedById: 'admin-1',
        resolution: 'RELEASE_FULL',
      });

      expect(mockWalletsService.releaseEscrow).toHaveBeenCalledWith(
        'req-1',
        'provider-1',
        money(100)
      );
      expect(mockWalletsService.refundEscrow).not.toHaveBeenCalled();
    });

    it('REFUND_FULL refunds the entire amount to the payer and never touches the payee wallet', async () => {
      mockPrismaService.escrowDispute.findUnique.mockResolvedValue(openDispute);

      await service.resolveDispute({
        disputeId: 'dispute-1',
        resolvedById: 'admin-1',
        resolution: 'REFUND_FULL',
      });

      expect(mockWalletsService.refundEscrow).toHaveBeenCalledWith(
        'req-1',
        'client-1',
        money(100)
      );
      expect(mockWalletsService.releaseEscrow).not.toHaveBeenCalled();
    });

    it('SPLIT requires both releaseAmount and refundAmount', async () => {
      mockPrismaService.escrowDispute.findUnique.mockResolvedValue(openDispute);
      await expect(
        service.resolveDispute({
          disputeId: 'dispute-1',
          resolvedById: 'admin-1',
          resolution: 'SPLIT',
          releaseAmount: 60,
        })
      ).rejects.toThrow('SPLIT requiere releaseAmount y refundAmount');
    });

    it('SPLIT rejects amounts that do not add up to the total escrowed amount', async () => {
      mockPrismaService.escrowDispute.findUnique.mockResolvedValue(openDispute);
      await expect(
        service.resolveDispute({
          disputeId: 'dispute-1',
          resolvedById: 'admin-1',
          resolution: 'SPLIT',
          releaseAmount: 60,
          refundAmount: 30,
        })
      ).rejects.toThrow(
        'releaseAmount + refundAmount debe ser igual al monto total retenido'
      );
    });

    it('SPLIT calls both releaseEscrow and refundEscrow with their respective amounts', async () => {
      mockPrismaService.escrowDispute.findUnique.mockResolvedValue(openDispute);

      await service.resolveDispute({
        disputeId: 'dispute-1',
        resolvedById: 'admin-1',
        resolution: 'SPLIT',
        releaseAmount: 60,
        refundAmount: 40,
      });

      expect(mockWalletsService.releaseEscrow).toHaveBeenCalledWith(
        'req-1',
        'provider-1',
        money(60)
      );
      expect(mockWalletsService.refundEscrow).toHaveBeenCalledWith(
        'req-1',
        'client-1',
        money(40)
      );
    });

    it('SPLIT cuadra al centavo exacto, sin la tolerancia de ±0.01 de Float', async () => {
      mockPrismaService.escrowDispute.findUnique.mockResolvedValue(openDispute);
      // 100 retenidos: 33.33 + 66.66 = 99.99 deja un centavo sin asignar.
      await expect(
        service.resolveDispute({
          disputeId: 'dispute-1',
          resolvedById: 'admin-1',
          resolution: 'SPLIT',
          releaseAmount: 33.33,
          refundAmount: 66.66,
        })
      ).rejects.toThrow(
        'releaseAmount + refundAmount debe ser igual al monto total retenido'
      );
      expect(mockWalletsService.releaseEscrow).not.toHaveBeenCalled();

      await service.resolveDispute({
        disputeId: 'dispute-1',
        resolvedById: 'admin-1',
        resolution: 'SPLIT',
        releaseAmount: 33.33,
        refundAmount: 66.67,
      });
      expect(mockWalletsService.releaseEscrow).toHaveBeenCalledWith(
        'req-1',
        'provider-1',
        money('33.33')
      );
    });

    it('always leaves Escrow.status as RELEASED regardless of the resolution (release, refund, or split)', async () => {
      mockPrismaService.escrowDispute.findUnique.mockResolvedValue(openDispute);

      await service.resolveDispute({
        disputeId: 'dispute-1',
        resolvedById: 'admin-1',
        resolution: 'REFUND_FULL',
      });

      expect(mockPrismaService.escrow.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'e1' },
          data: expect.objectContaining({ status: 'RELEASED' }),
        })
      );
    });

    it('syncs the underlying ServiceRequest.escrowStatus mirror to RELEASED', async () => {
      mockPrismaService.escrowDispute.findUnique.mockResolvedValue(openDispute);

      await service.resolveDispute({
        disputeId: 'dispute-1',
        resolvedById: 'admin-1',
        resolution: 'RELEASE_FULL',
      });

      expect(mockPrismaService.serviceRequest.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'req-1' },
          data: { escrowStatus: 'RELEASED' },
        })
      );
    });

    it('syncs CatalogOrder instead of ServiceRequest when the escrow entityType is CATALOG_ORDER', async () => {
      mockPrismaService.escrowDispute.findUnique.mockResolvedValue({
        ...openDispute,
        escrow: {
          ...openDispute.escrow,
          entityType: 'CATALOG_ORDER',
          entityId: 'order-1',
        },
      });

      await service.resolveDispute({
        disputeId: 'dispute-1',
        resolvedById: 'admin-1',
        resolution: 'RELEASE_FULL',
      });

      expect(mockPrismaService.catalogOrder.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'order-1' },
          data: { escrowStatus: 'RELEASED' },
        })
      );
      expect(mockPrismaService.serviceRequest.update).not.toHaveBeenCalled();
    });

    it('notifies the payee when funds are released and the payer when funds are refunded', async () => {
      mockPrismaService.escrowDispute.findUnique.mockResolvedValue(openDispute);

      await service.resolveDispute({
        disputeId: 'dispute-1',
        resolvedById: 'admin-1',
        resolution: 'SPLIT',
        releaseAmount: 60,
        refundAmount: 40,
      });

      expect(
        mockNotificationsService.notifyEscrowDisputeResolved
      ).toHaveBeenCalledWith('provider-1', 'Servicio X', 60);
      expect(
        mockNotificationsService.notifyEscrowDisputeResolved
      ).toHaveBeenCalledWith('client-1', 'Servicio X', 40);
    });
  });

  describe('listOpenDisputes', () => {
    it('returns only OPEN disputes with their escrow attached', async () => {
      mockPrismaService.escrowDispute.findMany.mockResolvedValue([
        {
          id: 'dispute-1',
          escrowId: 'e1',
          raisedById: 'client-1',
          raisedByRole: 'PAYER',
          reason: 'x',
          status: 'OPEN',
          resolution: null,
          releaseAmount: null,
          refundAmount: null,
          resolvedById: null,
          resolvedAt: null,
          escrow: {
            id: 'e1',
            entityType: 'SERVICE_REQUEST',
            entityId: 'req-1',
            payerId: 'client-1',
            payeeId: 'provider-1',
            status: 'DISPUTED',
            amount: 100,
            heldAt: new Date(),
            releasedAt: null,
            refundedAt: null,
          },
        },
      ]);

      const result = await service.listOpenDisputes();

      expect(mockPrismaService.escrowDispute.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { status: 'OPEN' } })
      );
      expect(result).toHaveLength(1);
      expect(result[0].escrow.status).toBe('DISPUTED');
    });

    it('incluye qué se disputa y los nombres de las partes', async () => {
      mockPrismaService.escrowDispute.findMany.mockResolvedValue([
        {
          id: 'd1',
          escrowId: 'e1',
          raisedById: 'client-1',
          raisedByRole: 'PAYER',
          reason: 'No vino',
          status: 'OPEN',
          resolution: null,
          releaseAmount: null,
          refundAmount: null,
          resolvedById: null,
          resolvedAt: null,
          createdAt: new Date(),
          escrow: {
            id: 'e1',
            entityType: 'SERVICE_REQUEST',
            entityId: 'req-1',
            payerId: 'client-1',
            payeeId: 'provider-1',
            status: 'DISPUTED',
            amount: 100,
            heldAt: new Date(),
            releasedAt: null,
            refundedAt: null,
          },
        },
      ]);
      mockPrismaService.serviceRequest.findUnique.mockResolvedValue({
        serviceName: 'Plomería',
      });
      mockPrismaService.user.findMany.mockResolvedValue([
        { id: 'client-1', firstName: 'Ana', lastName: 'Pérez', email: 'a@x' },
        { id: 'provider-1', firstName: 'Luis', lastName: '', email: 'l@x' },
      ]);

      const [d] = await service.listOpenDisputes();

      expect(d).toMatchObject({
        entityName: 'Plomería',
        payerName: 'Ana Pérez',
        payeeName: 'Luis',
      });
    });
  });
});
