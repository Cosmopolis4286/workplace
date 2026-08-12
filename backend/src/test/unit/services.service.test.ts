import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, BadRequestException } from '@nestjs/common';
import { ServicesService } from '../../domains/commerce-core/services/services.service';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../../domains/engagement/notifications/notifications.service';
import { PlatformFeesFacade, PLATFORM_FEES_FACADE } from '../../domains/money/platform-fees/platform-fees.facade';
import { PlanLimitsFacade, PLAN_LIMITS_FACADE } from '../../domains/money/plans/plan-limits.facade';
import { WalletsService, InsufficientEscrowFundsError } from '../../domains/money/wallets/wallets.service';

describe('ServicesService — service request status transitions', () => {
  let service: ServicesService;
  let mockPrismaService: any;
  let mockNotificationsService: Partial<NotificationsService>;
  let mockPlatformFeesService: Partial<PlatformFeesFacade>;
  let mockPlanLimitsService: Partial<PlanLimitsFacade>;
  let mockWalletsService: Partial<WalletsService>;

  function baseRequest(overrides: Partial<any> = {}) {
    return {
      id: 'req-1',
      providerId: 'provider-1',
      providerName: 'Proveedor Uno',
      requesterId: 'client-1',
      clientName: 'Cliente Uno',
      serviceName: 'Servicio Uno',
      status: 'PENDING',
      price: null,
      platformFeePayer: null,
      ...overrides,
    };
  }

  beforeEach(async () => {
    mockPrismaService = {
      serviceRequest: {
        findUnique: jest.fn(),
        update: jest.fn().mockImplementation(({ data }) => Promise.resolve({ ...data })),
      },
      serviceRequestStatusHistory: {
        create: jest.fn().mockResolvedValue({}),
      },
      serviceRequestPriceChangeProposal: {
        create: jest.fn(),
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn().mockResolvedValue([]),
        update: jest.fn().mockImplementation(({ data }) => Promise.resolve({ ...data })),
        updateMany: jest.fn().mockResolvedValue({ count: 0 }),
      },
      serviceRequestItem: {
        create: jest.fn(),
        aggregate: jest.fn().mockResolvedValue({ _max: { sortOrder: null } }),
      },
      user: {
        findUnique: jest.fn().mockResolvedValue({ username: 'proveedor1' }),
        findMany: jest.fn().mockResolvedValue([]),
      },
      $transaction: jest.fn((ops: any[]) => Promise.all(ops)),
    };

    mockNotificationsService = {
      notifyServiceRequestStatusChanged: jest.fn().mockResolvedValue(undefined),
      notifyServiceRequestRejected: jest.fn().mockResolvedValue(undefined),
      notifyServiceRequestCancelled: jest.fn().mockResolvedValue(undefined),
      notifyReviewReminder: jest.fn().mockResolvedValue(undefined),
      notifyPriceChangeProposed: jest.fn().mockResolvedValue(undefined),
      notifyPriceChangeApproved: jest.fn().mockResolvedValue(undefined),
      notifyPriceChangeRejected: jest.fn().mockResolvedValue(undefined),
      notifyPriceChangeApprovedPendingFunds: jest.fn().mockResolvedValue(undefined),
      notifyPriceChangeProposalInvalidated: jest.fn().mockResolvedValue(undefined),
    } as any;

    mockPlatformFeesService = {
      resolveFeeConfig: jest.fn().mockResolvedValue(null),
      calculateFee: jest.fn(),
      chargeProviderFee: jest.fn().mockResolvedValue(null),
    };

    mockPlanLimitsService = {
      assertServiceLimit: jest.fn().mockResolvedValue(undefined),
      assertServiceRequestLimit: jest.fn().mockResolvedValue(undefined),
    };

    mockWalletsService = {
      holdEscrow: jest.fn().mockResolvedValue({ transaction: {} }),
      releaseEscrow: jest.fn().mockResolvedValue({ transaction: {} }),
      refundEscrow: jest.fn().mockResolvedValue({ transaction: {} }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ServicesService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: NotificationsService, useValue: mockNotificationsService },
        { provide: PLATFORM_FEES_FACADE, useValue: mockPlatformFeesService },
        { provide: PLAN_LIMITS_FACADE, useValue: mockPlanLimitsService },
        { provide: WalletsService, useValue: mockWalletsService },
      ],
    }).compile();

    service = module.get<ServicesService>(ServicesService);
  });

  describe('updateServiceRequest', () => {
    it('rejects the provider closing directly from PENDING (fee leak closed)', async () => {
      mockPrismaService.serviceRequest.findUnique.mockResolvedValue(baseRequest({ status: 'PENDING' }));

      await expect(
        service.updateServiceRequest('req-1', 'provider-1', { status: 'CLOSED' })
      ).rejects.toThrow(ForbiddenException);
      await expect(
        service.updateServiceRequest('req-1', 'provider-1', { status: 'CLOSED' })
      ).rejects.toThrow('Solo el cliente puede confirmar la finalización de una solicitud');
    });

    it('rejects the provider closing directly from SEEN', async () => {
      mockPrismaService.serviceRequest.findUnique.mockResolvedValue(baseRequest({ status: 'SEEN' }));

      await expect(
        service.updateServiceRequest('req-1', 'provider-1', { status: 'CLOSED' })
      ).rejects.toThrow(ForbiddenException);
    });

    it('rejects the provider closing directly from CONTACTED', async () => {
      mockPrismaService.serviceRequest.findUnique.mockResolvedValue(baseRequest({ status: 'CONTACTED' }));

      await expect(
        service.updateServiceRequest('req-1', 'provider-1', { status: 'CLOSED' })
      ).rejects.toThrow(ForbiddenException);
    });

    it('allows the provider to reject from PENDING and records history + notifies the client', async () => {
      mockPrismaService.serviceRequest.findUnique.mockResolvedValue(baseRequest({ status: 'PENDING' }));

      await service.updateServiceRequest('req-1', 'provider-1', { status: 'REJECTED' });

      expect(mockPrismaService.serviceRequestStatusHistory.create).toHaveBeenCalledWith({
        data: {
          serviceRequestId: 'req-1',
          previousStatus: 'PENDING',
          newStatus: 'REJECTED',
          changedBy: 'provider-1',
        },
      });
      expect(mockNotificationsService.notifyServiceRequestRejected).toHaveBeenCalledWith(
        'client-1', 'Proveedor Uno', 'Servicio Uno'
      );
    });

    it('allows the provider to reject from SEEN', async () => {
      mockPrismaService.serviceRequest.findUnique.mockResolvedValue(baseRequest({ status: 'SEEN' }));

      await expect(
        service.updateServiceRequest('req-1', 'provider-1', { status: 'REJECTED' })
      ).resolves.toBeDefined();
    });

    it('does not allow REJECTED from CONTACTED (not an early-stage exit anymore)', async () => {
      mockPrismaService.serviceRequest.findUnique.mockResolvedValue(baseRequest({ status: 'CONTACTED' }));

      await expect(
        service.updateServiceRequest('req-1', 'provider-1', { status: 'REJECTED' })
      ).rejects.toThrow(ForbiddenException);
    });

    it('still blocks the provider from cancelling on behalf of the client', async () => {
      mockPrismaService.serviceRequest.findUnique.mockResolvedValue(baseRequest({ status: 'PENDING' }));

      await expect(
        service.updateServiceRequest('req-1', 'provider-1', { status: 'CANCELLED' })
      ).rejects.toThrow('Solo el cliente puede cancelar una solicitud');
    });

    it('records status history on a valid transition (SEEN)', async () => {
      mockPrismaService.serviceRequest.findUnique.mockResolvedValue(baseRequest({ status: 'PENDING' }));

      await service.updateServiceRequest('req-1', 'provider-1', { status: 'SEEN' });

      expect(mockPrismaService.serviceRequestStatusHistory.create).toHaveBeenCalledWith({
        data: {
          serviceRequestId: 'req-1',
          previousStatus: 'PENDING',
          newStatus: 'SEEN',
          changedBy: 'provider-1',
        },
      });
      expect(mockNotificationsService.notifyServiceRequestStatusChanged).toHaveBeenCalledWith(
        'client-1', 'Proveedor Uno', 'Servicio Uno', 'SEEN'
      );
    });

    it('rejects any change once the request is terminal (REJECTED)', async () => {
      mockPrismaService.serviceRequest.findUnique.mockResolvedValue(baseRequest({ status: 'REJECTED' }));

      await expect(
        service.updateServiceRequest('req-1', 'provider-1', { status: 'CONTACTED' })
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('confirmServiceRequestCompletion', () => {
    it('still closes the request from CONTACTED and records history (unaffected by the transition table change)', async () => {
      mockPrismaService.serviceRequest.findUnique.mockResolvedValue(baseRequest({ status: 'CONTACTED' }));

      const result = await service.confirmServiceRequestCompletion('req-1', 'client-1');

      expect(result.status).toBe('CLOSED');
      expect(mockPrismaService.serviceRequestStatusHistory.create).toHaveBeenCalledWith({
        data: {
          serviceRequestId: 'req-1',
          previousStatus: 'CONTACTED',
          newStatus: 'CLOSED',
          changedBy: 'client-1',
        },
      });
    });

    it('rejects confirmation when the request is not CONTACTED', async () => {
      mockPrismaService.serviceRequest.findUnique.mockResolvedValue(baseRequest({ status: 'PENDING' }));

      await expect(
        service.confirmServiceRequestCompletion('req-1', 'client-1')
      ).rejects.toThrow(ForbiddenException);
    });

    it('rejects confirmation from someone other than the requester', async () => {
      mockPrismaService.serviceRequest.findUnique.mockResolvedValue(baseRequest({ status: 'CONTACTED' }));

      await expect(
        service.confirmServiceRequestCompletion('req-1', 'someone-else')
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('cancelServiceRequest', () => {
    it('records status history when the client cancels', async () => {
      mockPrismaService.serviceRequest.findUnique.mockResolvedValue(baseRequest({ status: 'PENDING' }));

      await service.cancelServiceRequest('req-1', 'client-1');

      expect(mockPrismaService.serviceRequestStatusHistory.create).toHaveBeenCalledWith({
        data: {
          serviceRequestId: 'req-1',
          previousStatus: 'PENDING',
          newStatus: 'CANCELLED',
          changedBy: 'client-1',
        },
      });
      expect(mockNotificationsService.notifyServiceRequestCancelled).toHaveBeenCalled();
    });
  });

  describe('proposePriceChange', () => {
    const dto = { proposedPrice: 150, note: 'Repuesto extra', items: [{ fields: { sku: 'X1' } }] };

    it('rejects if the request is not CONTACTED', async () => {
      mockPrismaService.serviceRequest.findUnique.mockResolvedValue(baseRequest({ status: 'PENDING', price: 100 }));

      await expect(
        service.proposePriceChange('req-1', 'provider-1', dto as any)
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects if a PENDING proposal already exists', async () => {
      mockPrismaService.serviceRequest.findUnique.mockResolvedValue(baseRequest({ status: 'CONTACTED', price: 100 }));
      mockPrismaService.serviceRequestPriceChangeProposal.findFirst.mockResolvedValue({ id: 'existing', status: 'PENDING' });

      await expect(
        service.proposePriceChange('req-1', 'provider-1', dto as any)
      ).rejects.toThrow('Ya existe una propuesta de aumento pendiente de respuesta del cliente');
    });

    it('rejects if proposedPrice is not greater than the current price', async () => {
      mockPrismaService.serviceRequest.findUnique.mockResolvedValue(baseRequest({ status: 'CONTACTED', price: 200 }));
      mockPrismaService.serviceRequestPriceChangeProposal.findFirst.mockResolvedValue(null);

      await expect(
        service.proposePriceChange('req-1', 'provider-1', { ...dto, proposedPrice: 150 } as any)
      ).rejects.toThrow('El precio propuesto debe ser mayor al precio actual');
    });

    it('rejects if the caller is not the provider', async () => {
      mockPrismaService.serviceRequest.findUnique.mockResolvedValue(baseRequest({ status: 'CONTACTED', price: 100 }));

      await expect(
        service.proposePriceChange('req-1', 'someone-else', dto as any)
      ).rejects.toThrow(ForbiddenException);
    });

    it('creates the proposal with the correct delta and notifies the client', async () => {
      mockPrismaService.serviceRequest.findUnique.mockResolvedValue(baseRequest({ status: 'CONTACTED', price: 100 }));
      mockPrismaService.serviceRequestPriceChangeProposal.findFirst.mockResolvedValue(null);
      mockPrismaService.serviceRequestPriceChangeProposal.create.mockResolvedValue({ id: 'proposal-1', deltaAmount: 50 });

      await service.proposePriceChange('req-1', 'provider-1', dto as any);

      expect(mockPrismaService.serviceRequestPriceChangeProposal.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            serviceRequestId: 'req-1',
            previousPrice: 100,
            proposedPrice: 150,
            deltaAmount: 50,
            proposedBy: 'provider-1',
          }),
        })
      );
      expect(mockNotificationsService.notifyPriceChangeProposed).toHaveBeenCalledWith(
        'client-1', 'Proveedor Uno', 'Servicio Uno', 50
      );
    });
  });

  describe('approvePriceChangeProposal', () => {
    function baseProposal(overrides: Partial<any> = {}) {
      return {
        id: 'proposal-1',
        status: 'PENDING',
        previousPrice: 100,
        proposedPrice: 150,
        deltaAmount: 50,
        items: [{ id: 'item-1', fields: { sku: 'X1' }, notes: null, photos: [], videos: [] }],
        serviceRequest: baseRequest({ status: 'CONTACTED', price: 100, escrowAmount: 100 }),
        ...overrides,
      };
    }

    it('rejects if the proposal is not PENDING', async () => {
      mockPrismaService.serviceRequestPriceChangeProposal.findUnique.mockResolvedValue(baseProposal({ status: 'APPROVED' }));

      await expect(
        service.approvePriceChangeProposal('proposal-1', 'client-1')
      ).rejects.toThrow('Esta propuesta ya fue resuelta');
    });

    it('rejects if the caller is not the requester', async () => {
      mockPrismaService.serviceRequestPriceChangeProposal.findUnique.mockResolvedValue(baseProposal());

      await expect(
        service.approvePriceChangeProposal('proposal-1', 'someone-else')
      ).rejects.toThrow(ForbiddenException);
    });

    it('holds escrow with the delta only (not the total price) and syncs price/escrowAmount together — closes the original desync bug', async () => {
      mockPrismaService.serviceRequestPriceChangeProposal.findUnique.mockResolvedValue(baseProposal());
      mockPlatformFeesService.resolveFeeConfig = jest.fn().mockResolvedValue(null);
      mockPrismaService.serviceRequestPriceChangeProposal.findUnique.mockResolvedValueOnce(baseProposal()).mockResolvedValueOnce({ id: 'proposal-1', status: 'APPROVED', items: [] });

      await service.approvePriceChangeProposal('proposal-1', 'client-1');

      expect(mockWalletsService.holdEscrow).toHaveBeenCalledWith('client-1', 50, 'req-1', 'ESCROW-HOLD-INCREASE-proposal-1');
      expect(mockPrismaService.$transaction).toHaveBeenCalled();
      expect(mockPrismaService.serviceRequest.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ price: 150, escrowAmount: 150 }),
        })
      );
      expect(mockPrismaService.serviceRequestItem.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ serviceRequestId: 'req-1', sortOrder: 0 }) })
      );
      expect(mockNotificationsService.notifyPriceChangeApproved).toHaveBeenCalledWith('provider-1', 'Cliente Uno', 'Servicio Uno', 50);
    });

    it('marks APPROVED_PENDING_FUNDS on insufficient funds, without touching price/escrowAmount yet', async () => {
      mockPrismaService.serviceRequestPriceChangeProposal.findUnique.mockResolvedValue(baseProposal());
      (mockWalletsService.holdEscrow as jest.Mock).mockRejectedValueOnce(new InsufficientEscrowFundsError('no funds'));

      await service.approvePriceChangeProposal('proposal-1', 'client-1');

      expect(mockPrismaService.serviceRequestPriceChangeProposal.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: 'APPROVED_PENDING_FUNDS' }),
        })
      );
      expect(mockPrismaService.serviceRequest.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { escrowStatus: 'PENDING_FUNDS' } })
      );
      expect(mockNotificationsService.notifyPriceChangeApprovedPendingFunds).toHaveBeenCalled();
    });
  });

  describe('rejectPriceChangeProposal', () => {
    it('marks REJECTED without touching price/items and notifies the provider', async () => {
      mockPrismaService.serviceRequestPriceChangeProposal.findUnique.mockResolvedValue({
        id: 'proposal-1',
        status: 'PENDING',
        deltaAmount: 50,
        serviceRequest: baseRequest({ status: 'CONTACTED', price: 100 }),
      });

      await service.rejectPriceChangeProposal('proposal-1', 'client-1', 'Muy caro');

      expect(mockPrismaService.serviceRequestPriceChangeProposal.update).toHaveBeenCalledWith({
        where: { id: 'proposal-1' },
        data: { status: 'REJECTED', resolvedBy: 'client-1', resolvedAt: expect.any(Date), rejectionReason: 'Muy caro' },
      });
      expect(mockPrismaService.serviceRequest.update).not.toHaveBeenCalled();
      expect(mockNotificationsService.notifyPriceChangeRejected).toHaveBeenCalledWith(
        'provider-1', 'Cliente Uno', 'Servicio Uno', 50, 'Muy caro'
      );
    });

    it('rejects if the caller is not the requester', async () => {
      mockPrismaService.serviceRequestPriceChangeProposal.findUnique.mockResolvedValue({
        id: 'proposal-1',
        status: 'PENDING',
        serviceRequest: baseRequest({ status: 'CONTACTED' }),
      });

      await expect(
        service.rejectPriceChangeProposal('proposal-1', 'someone-else')
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('updateServiceRequest — proposal invalidation', () => {
    it('invalidates a PENDING proposal when the request transitions to a terminal status', async () => {
      // PENDING -> REJECTED is a valid transition (unlike CONTACTED -> REJECTED, which
      // is not reachable via updateServiceRequest — CONTACTED only closes via
      // confirmServiceRequestCompletion). This test exercises the invalidation path
      // regardless of which terminal status is reached.
      mockPrismaService.serviceRequest.findUnique.mockResolvedValue(baseRequest({ status: 'PENDING' }));
      mockPrismaService.serviceRequestPriceChangeProposal.updateMany.mockResolvedValue({ count: 1 });

      await service.updateServiceRequest('req-1', 'provider-1', { status: 'REJECTED' });

      expect(mockPrismaService.serviceRequestPriceChangeProposal.updateMany).toHaveBeenCalledWith({
        where: { serviceRequestId: 'req-1', status: 'PENDING' },
        data: { status: 'INVALIDATED', resolvedAt: expect.any(Date) },
      });
      expect(mockNotificationsService.notifyPriceChangeProposalInvalidated).toHaveBeenCalledWith('provider-1', 'Servicio Uno');
    });
  });
});
