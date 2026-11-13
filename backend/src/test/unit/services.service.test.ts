import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, BadRequestException } from '@nestjs/common';
import { ServicesService } from '../../domains/commerce-core/services/services.service';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../../domains/engagement/notifications/notifications.service';
import {
  PlatformFeesFacade,
  PLATFORM_FEES_FACADE,
} from '../../domains/money/platform-fees/platform-fees.facade';
import {
  PlanLimitsFacade,
  PLAN_LIMITS_FACADE,
} from '../../domains/money/plans/plan-limits.facade';
import {
  ReputationFacade,
  REPUTATION_FACADE,
} from '../../domains/reputation/reputation.facade';
import { InsufficientEscrowFundsError } from '../../domains/money/wallets/wallet.errors';
import {
  EscrowFacade,
  ESCROW_FACADE,
} from '../../domains/money/escrow/escrow.facade';
import { CategoryScopeService } from '../../common/category-scope/category-scope.service';
import { ServiceLeadFeeService } from '../../domains/commerce-core/services/service-lead-fee.service';
import { money } from '../money-matcher';

describe('ServicesService — service request status transitions', () => {
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

  let service: ServicesService;
  let mockPrismaService: any;
  let mockNotificationsService: Partial<NotificationsService>;
  let mockPlatformFeesService: Partial<PlatformFeesFacade>;
  let mockPlanLimitsService: Partial<PlanLimitsFacade>;
  let mockEscrowService: Partial<EscrowFacade>;
  let mockReputationService: Partial<ReputationFacade>;
  let mockLeadFees: {
    isEnabled: jest.Mock;
    chargeSuccessFeeInCredits: jest.Mock;
    quote: jest.Mock;
    accept: jest.Mock;
  };

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
        findMany: jest.fn().mockResolvedValue([]),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        update: jest
          .fn()
          .mockImplementation(({ data }) => Promise.resolve({ ...data })),
      },
      escrowFundingReport: { findMany: jest.fn().mockResolvedValue([]) },
      serviceRequestStatusHistory: {
        create: jest.fn().mockResolvedValue({}),
      },
      escrowDispute: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
      },
      serviceRequestPriceChangeProposal: {
        create: jest.fn(),
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn().mockResolvedValue([]),
        update: jest
          .fn()
          .mockImplementation(({ data }) => Promise.resolve({ ...data })),
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
      notifyPriceChangeApprovedPendingFunds: jest
        .fn()
        .mockResolvedValue(undefined),
      notifyPriceChangeProposalInvalidated: jest
        .fn()
        .mockResolvedValue(undefined),
      notifyEscrowDisputeOpened: jest.fn().mockResolvedValue(undefined),
      notifyServiceRequestProviderCompleted: jest
        .fn()
        .mockResolvedValue(undefined),
      notifyServiceRequestAutoClosed: jest.fn().mockResolvedValue(undefined),
      notifyGuaranteeExpired: jest.fn().mockResolvedValue(undefined),
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

    mockEscrowService = {
      hold: jest.fn().mockResolvedValue({}),
      release: jest.fn().mockResolvedValue({}),
      refund: jest.fn().mockResolvedValue({}),
      openDispute: jest.fn().mockResolvedValue({}),
      resolveDispute: jest.fn(),
    };

    mockReputationService = {
      recalculate: jest.fn().mockResolvedValue(undefined),
      getScore: jest.fn().mockResolvedValue(null),
    };

    // Créditos de uso apagados por defecto: el flujo de siempre.
    mockLeadFees = {
      isEnabled: jest.fn().mockReturnValue(false),
      chargeSuccessFeeInCredits: jest.fn().mockResolvedValue(false),
      quote: jest.fn(),
      accept: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ServicesService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: NotificationsService, useValue: mockNotificationsService },
        { provide: PLATFORM_FEES_FACADE, useValue: mockPlatformFeesService },
        { provide: PLAN_LIMITS_FACADE, useValue: mockPlanLimitsService },
        { provide: ESCROW_FACADE, useValue: mockEscrowService },
        { provide: REPUTATION_FACADE, useValue: mockReputationService },
        { provide: ServiceLeadFeeService, useValue: mockLeadFees },
        {
          provide: CategoryScopeService,
          useValue: {
            isVisibleForCategory: jest.fn(),
            filterByCategory: jest.fn(),
            getUserCategoryId: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<ServicesService>(ServicesService);
  });

  describe('updateServiceRequest', () => {
    it('rejects the provider closing directly from PENDING (fee leak closed)', async () => {
      mockPrismaService.serviceRequest.findUnique.mockResolvedValue(
        baseRequest({ status: 'PENDING' })
      );

      await expect(
        service.updateServiceRequest('req-1', 'provider-1', {
          status: 'CLOSED',
        })
      ).rejects.toThrow(ForbiddenException);
      await expect(
        service.updateServiceRequest('req-1', 'provider-1', {
          status: 'CLOSED',
        })
      ).rejects.toThrow(
        'Solo el cliente puede confirmar la finalización de una solicitud'
      );
    });

    it('rejects the provider closing directly from SEEN', async () => {
      mockPrismaService.serviceRequest.findUnique.mockResolvedValue(
        baseRequest({ status: 'SEEN' })
      );

      await expect(
        service.updateServiceRequest('req-1', 'provider-1', {
          status: 'CLOSED',
        })
      ).rejects.toThrow(ForbiddenException);
    });

    it('rejects the provider closing directly from CONTACTED', async () => {
      mockPrismaService.serviceRequest.findUnique.mockResolvedValue(
        baseRequest({ status: 'CONTACTED' })
      );

      await expect(
        service.updateServiceRequest('req-1', 'provider-1', {
          status: 'CLOSED',
        })
      ).rejects.toThrow(ForbiddenException);
    });

    it('allows the provider to reject from PENDING and records history + notifies the client', async () => {
      mockPrismaService.serviceRequest.findUnique.mockResolvedValue(
        baseRequest({ status: 'PENDING' })
      );

      await service.updateServiceRequest('req-1', 'provider-1', {
        status: 'REJECTED',
      });

      expect(
        mockPrismaService.serviceRequestStatusHistory.create
      ).toHaveBeenCalledWith({
        data: {
          serviceRequestId: 'req-1',
          previousStatus: 'PENDING',
          newStatus: 'REJECTED',
          changedBy: 'provider-1',
        },
      });
      expect(
        mockNotificationsService.notifyServiceRequestRejected
      ).toHaveBeenCalledWith('client-1', 'Proveedor Uno', 'Servicio Uno');
    });

    it('con créditos de uso, el PATCH no acepta (CONTACTED): hay que aceptar el cargo aparte', async () => {
      mockLeadFees.isEnabled.mockReturnValue(true);
      mockPrismaService.serviceRequest.findUnique.mockResolvedValue(
        baseRequest({ status: 'SEEN' })
      );

      await expect(
        service.updateServiceRequest('req-1', 'provider-1', {
          status: 'CONTACTED',
        })
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(mockPrismaService.serviceRequest.update).not.toHaveBeenCalled();
    });

    it('allows the provider to reject from SEEN', async () => {
      mockPrismaService.serviceRequest.findUnique.mockResolvedValue(
        baseRequest({ status: 'SEEN' })
      );

      await expect(
        service.updateServiceRequest('req-1', 'provider-1', {
          status: 'REJECTED',
        })
      ).resolves.toBeDefined();
    });

    it('does not allow REJECTED from CONTACTED (not an early-stage exit anymore)', async () => {
      mockPrismaService.serviceRequest.findUnique.mockResolvedValue(
        baseRequest({ status: 'CONTACTED' })
      );

      await expect(
        service.updateServiceRequest('req-1', 'provider-1', {
          status: 'REJECTED',
        })
      ).rejects.toThrow(ForbiddenException);
    });

    it('still blocks the provider from cancelling on behalf of the client', async () => {
      mockPrismaService.serviceRequest.findUnique.mockResolvedValue(
        baseRequest({ status: 'PENDING' })
      );

      await expect(
        service.updateServiceRequest('req-1', 'provider-1', {
          status: 'CANCELLED',
        })
      ).rejects.toThrow('Solo el cliente puede cancelar una solicitud');
    });

    it('records status history on a valid transition (SEEN)', async () => {
      mockPrismaService.serviceRequest.findUnique.mockResolvedValue(
        baseRequest({ status: 'PENDING' })
      );

      await service.updateServiceRequest('req-1', 'provider-1', {
        status: 'SEEN',
      });

      expect(
        mockPrismaService.serviceRequestStatusHistory.create
      ).toHaveBeenCalledWith({
        data: {
          serviceRequestId: 'req-1',
          previousStatus: 'PENDING',
          newStatus: 'SEEN',
          changedBy: 'provider-1',
        },
      });
      expect(
        mockNotificationsService.notifyServiceRequestStatusChanged
      ).toHaveBeenCalledWith(
        'client-1',
        'Proveedor Uno',
        'Servicio Uno',
        'SEEN'
      );
    });

    it('rejects any change once the request is terminal (REJECTED)', async () => {
      mockPrismaService.serviceRequest.findUnique.mockResolvedValue(
        baseRequest({ status: 'REJECTED' })
      );

      await expect(
        service.updateServiceRequest('req-1', 'provider-1', {
          status: 'CONTACTED',
        })
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('confirmServiceRequestCompletion', () => {
    it('still closes the request from CONTACTED and records history (unaffected by the transition table change)', async () => {
      mockPrismaService.serviceRequest.findUnique.mockResolvedValue(
        baseRequest({ status: 'CONTACTED' })
      );

      const result = await service.confirmServiceRequestCompletion(
        'req-1',
        'client-1'
      );

      expect(result.status).toBe('CLOSED');
      expect(
        mockPrismaService.serviceRequestStatusHistory.create
      ).toHaveBeenCalledWith({
        data: {
          serviceRequestId: 'req-1',
          previousStatus: 'CONTACTED',
          newStatus: 'CLOSED',
          changedBy: 'client-1',
        },
      });
    });

    it('registra al proveedor la comisión que pagó el cliente (sin garantía, va al estado de cuenta)', async () => {
      mockPrismaService.serviceRequest.findUnique.mockResolvedValue(
        baseRequest({
          status: 'CONTACTED',
          price: 55,
          platformFeePayer: 'CLIENT',
          platformFeeAmount: 5,
          escrowStatus: 'NONE',
        })
      );

      await service.confirmServiceRequestCompletion('req-1', 'client-1');

      expect(mockPlatformFeesService.chargeProviderFee).toHaveBeenCalledWith(
        'SERVICE_REQUEST',
        'provider-1',
        5,
        'FEE-SVC-req-1',
        { serviceRequestId: 'req-1', payer: 'CLIENT' },
        { collected: false }
      );
      expect(mockEscrowService.release).not.toHaveBeenCalled();
    });

    it('con créditos de uso y aceptación previa, la comisión se paga en créditos y no va al estado de cuenta', async () => {
      mockLeadFees.chargeSuccessFeeInCredits.mockResolvedValue(true);
      mockPrismaService.serviceRequest.findUnique.mockResolvedValue(
        baseRequest({
          status: 'CONTACTED',
          price: 55,
          platformFeePayer: 'CLIENT',
          platformFeeAmount: 5,
          escrowStatus: 'NONE',
        })
      );

      await service.confirmServiceRequestCompletion('req-1', 'client-1');

      expect(mockLeadFees.chargeSuccessFeeInCredits).toHaveBeenCalledWith({
        serviceRequestId: 'req-1',
        providerId: 'provider-1',
        feeAmount: 5,
        metadata: { serviceRequestId: 'req-1', payer: 'CLIENT' },
      });
      expect(mockPlatformFeesService.chargeProviderFee).not.toHaveBeenCalled();
    });

    it('sin créditos suficientes al cerrar, la comisión cae al estado de cuenta', async () => {
      mockLeadFees.chargeSuccessFeeInCredits.mockResolvedValue(false);
      mockPrismaService.serviceRequest.findUnique.mockResolvedValue(
        baseRequest({
          status: 'CONTACTED',
          price: 55,
          platformFeePayer: 'CLIENT',
          platformFeeAmount: 5,
          escrowStatus: 'NONE',
        })
      );

      await service.confirmServiceRequestCompletion('req-1', 'client-1');

      expect(mockPlatformFeesService.chargeProviderFee).toHaveBeenCalledWith(
        'SERVICE_REQUEST',
        'provider-1',
        5,
        'FEE-SVC-req-1',
        { serviceRequestId: 'req-1', payer: 'CLIENT' },
        { collected: false }
      );
    });

    it('con garantía retenida no intenta cobrar en créditos (se descuenta de lo liberado)', async () => {
      mockPrismaService.serviceRequest.findUnique.mockResolvedValue(
        baseRequest({
          status: 'CONTACTED',
          price: 55,
          platformFeePayer: 'CLIENT',
          platformFeeAmount: 5,
          escrowStatus: 'HELD',
          escrowAmount: 55,
        })
      );

      await service.confirmServiceRequestCompletion('req-1', 'client-1');

      expect(mockLeadFees.chargeSuccessFeeInCredits).not.toHaveBeenCalled();
    });

    it('con garantía, descuenta de lo liberado la comisión que pagó el cliente', async () => {
      mockPrismaService.serviceRequest.findUnique.mockResolvedValue(
        baseRequest({
          status: 'CONTACTED',
          price: 55,
          platformFeePayer: 'CLIENT',
          platformFeeAmount: 5,
          escrowStatus: 'HELD',
          escrowAmount: 55,
        })
      );

      await service.confirmServiceRequestCompletion('req-1', 'client-1');

      expect(mockPlatformFeesService.chargeProviderFee).toHaveBeenCalledWith(
        'SERVICE_REQUEST',
        'provider-1',
        5,
        'FEE-SVC-req-1',
        { serviceRequestId: 'req-1', payer: 'CLIENT' },
        { collected: true }
      );
      const released = (mockEscrowService.release as jest.Mock).mock
        .calls[0][0];
      expect(Number(released.amount)).toBe(50);
    });

    it('rejects confirmation when the request is not CONTACTED', async () => {
      mockPrismaService.serviceRequest.findUnique.mockResolvedValue(
        baseRequest({ status: 'PENDING' })
      );

      await expect(
        service.confirmServiceRequestCompletion('req-1', 'client-1')
      ).rejects.toThrow(ForbiddenException);
    });

    it('rejects confirmation from someone other than the requester', async () => {
      mockPrismaService.serviceRequest.findUnique.mockResolvedValue(
        baseRequest({ status: 'CONTACTED' })
      );

      await expect(
        service.confirmServiceRequestCompletion('req-1', 'someone-else')
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('cancelServiceRequest', () => {
    it('records status history when the client cancels', async () => {
      mockPrismaService.serviceRequest.findUnique.mockResolvedValue(
        baseRequest({ status: 'PENDING' })
      );

      await service.cancelServiceRequest('req-1', 'client-1');

      expect(
        mockPrismaService.serviceRequestStatusHistory.create
      ).toHaveBeenCalledWith({
        data: {
          serviceRequestId: 'req-1',
          previousStatus: 'PENDING',
          newStatus: 'CANCELLED',
          changedBy: 'client-1',
        },
      });
      expect(
        mockNotificationsService.notifyServiceRequestCancelled
      ).toHaveBeenCalled();
    });
  });

  describe('disputeServiceRequest', () => {
    it('rejects if the caller is neither the provider nor the requester', async () => {
      mockPrismaService.serviceRequest.findUnique.mockResolvedValue(
        baseRequest({ status: 'CONTACTED' })
      );
      await expect(
        service.disputeServiceRequest(
          'req-1',
          'stranger',
          'No llegó nunca el técnico'
        )
      ).rejects.toThrow(ForbiddenException);
      expect(mockEscrowService.openDispute).not.toHaveBeenCalled();
    });

    it('rejects disputing a request that is not CONTACTED', async () => {
      mockPrismaService.serviceRequest.findUnique.mockResolvedValue(
        baseRequest({ status: 'PENDING' })
      );
      await expect(
        service.disputeServiceRequest(
          'req-1',
          'client-1',
          'No llegó nunca el técnico'
        )
      ).rejects.toThrow(
        'Solo se puede disputar una solicitud en curso (contactada)'
      );
    });

    it('opens the dispute via EscrowFacade and notifies the counterparty (provider) when the client disputes', async () => {
      mockPrismaService.serviceRequest.findUnique.mockResolvedValue(
        baseRequest({ status: 'CONTACTED' })
      );

      await service.disputeServiceRequest(
        'req-1',
        'client-1',
        'No llegó el pedido'
      );

      expect(mockEscrowService.openDispute).toHaveBeenCalledWith({
        entityType: 'SERVICE_REQUEST',
        entityId: 'req-1',
        raisedById: 'client-1',
        reason: 'No llegó el pedido',
      });
      expect(
        mockNotificationsService.notifyEscrowDisputeOpened
      ).toHaveBeenCalledWith('provider-1', 'Servicio Uno');
    });

    it('notifies the counterparty (client) when the provider disputes', async () => {
      mockPrismaService.serviceRequest.findUnique.mockResolvedValue(
        baseRequest({ status: 'CONTACTED' })
      );

      await service.disputeServiceRequest(
        'req-1',
        'provider-1',
        'Cliente no confirma'
      );

      expect(
        mockNotificationsService.notifyEscrowDisputeOpened
      ).toHaveBeenCalledWith('client-1', 'Servicio Uno');
    });
  });

  describe('proposePriceChange', () => {
    const dto = {
      proposedPrice: 150,
      note: 'Repuesto extra',
      items: [{ fields: { sku: 'X1' } }],
    };

    it('rejects if the request is not CONTACTED', async () => {
      mockPrismaService.serviceRequest.findUnique.mockResolvedValue(
        baseRequest({ status: 'PENDING', price: 100 })
      );

      await expect(
        service.proposePriceChange('req-1', 'provider-1', dto as any)
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects if a PENDING proposal already exists', async () => {
      mockPrismaService.serviceRequest.findUnique.mockResolvedValue(
        baseRequest({ status: 'CONTACTED', price: 100 })
      );
      mockPrismaService.serviceRequestPriceChangeProposal.findFirst.mockResolvedValue(
        { id: 'existing', status: 'PENDING' }
      );

      await expect(
        service.proposePriceChange('req-1', 'provider-1', dto as any)
      ).rejects.toThrow(
        'Ya existe una propuesta de aumento pendiente de respuesta del cliente'
      );
    });

    it('rejects if proposedPrice is not greater than the current price', async () => {
      mockPrismaService.serviceRequest.findUnique.mockResolvedValue(
        baseRequest({ status: 'CONTACTED', price: 200 })
      );
      mockPrismaService.serviceRequestPriceChangeProposal.findFirst.mockResolvedValue(
        null
      );

      await expect(
        service.proposePriceChange('req-1', 'provider-1', {
          ...dto,
          proposedPrice: 150,
        } as any)
      ).rejects.toThrow('El precio propuesto debe ser mayor al precio actual');
    });

    it('rejects if the caller is not the provider', async () => {
      mockPrismaService.serviceRequest.findUnique.mockResolvedValue(
        baseRequest({ status: 'CONTACTED', price: 100 })
      );

      await expect(
        service.proposePriceChange('req-1', 'someone-else', dto as any)
      ).rejects.toThrow(ForbiddenException);
    });

    it('creates the proposal with the correct delta and notifies the client', async () => {
      mockPrismaService.serviceRequest.findUnique.mockResolvedValue(
        baseRequest({ status: 'CONTACTED', price: 100 })
      );
      mockPrismaService.serviceRequestPriceChangeProposal.findFirst.mockResolvedValue(
        null
      );
      mockPrismaService.serviceRequestPriceChangeProposal.create.mockResolvedValue(
        { id: 'proposal-1', deltaAmount: 50 }
      );

      await service.proposePriceChange('req-1', 'provider-1', dto as any);

      expect(
        mockPrismaService.serviceRequestPriceChangeProposal.create
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            serviceRequestId: 'req-1',
            previousPrice: 100,
            proposedPrice: 150,
            deltaAmount: money(50),
            proposedBy: 'provider-1',
          }),
        })
      );
      expect(
        mockNotificationsService.notifyPriceChangeProposed
      ).toHaveBeenCalledWith('client-1', 'Proveedor Uno', 'Servicio Uno', 50);
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
        items: [
          {
            id: 'item-1',
            fields: { sku: 'X1' },
            notes: null,
            photos: [],
            videos: [],
          },
        ],
        serviceRequest: baseRequest({
          status: 'CONTACTED',
          price: 100,
          escrowAmount: 100,
          escrowStatus: 'HELD',
        }),
        ...overrides,
      };
    }

    it('rejects if the proposal is not PENDING', async () => {
      mockPrismaService.serviceRequestPriceChangeProposal.findUnique.mockResolvedValue(
        baseProposal({ status: 'APPROVED' })
      );

      await expect(
        service.approvePriceChangeProposal('proposal-1', 'client-1')
      ).rejects.toThrow('Esta propuesta ya fue resuelta');
    });

    it('rejects if the caller is not the requester', async () => {
      mockPrismaService.serviceRequestPriceChangeProposal.findUnique.mockResolvedValue(
        baseProposal()
      );

      await expect(
        service.approvePriceChangeProposal('proposal-1', 'someone-else')
      ).rejects.toThrow(ForbiddenException);
    });

    it('holds escrow with the delta only (not the total price) and syncs price/escrowAmount together — closes the original desync bug', async () => {
      mockPrismaService.serviceRequestPriceChangeProposal.findUnique.mockResolvedValue(
        baseProposal()
      );
      mockPlatformFeesService.resolveFeeConfig = jest
        .fn()
        .mockResolvedValue(null);
      mockPrismaService.serviceRequestPriceChangeProposal.findUnique
        .mockResolvedValueOnce(baseProposal())
        .mockResolvedValueOnce({
          id: 'proposal-1',
          status: 'APPROVED',
          items: [],
        });

      await service.approvePriceChangeProposal('proposal-1', 'client-1');

      expect(mockEscrowService.hold).toHaveBeenCalledWith({
        entityType: 'SERVICE_REQUEST',
        entityId: 'req-1',
        payerId: 'client-1',
        payeeId: 'provider-1',
        deltaAmount: money(50),
        referenceOverride: 'ESCROW-HOLD-INCREASE-proposal-1',
      });
      expect(mockPrismaService.$transaction).toHaveBeenCalled();
      expect(mockPrismaService.serviceRequest.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            price: money(150),
            escrowAmount: money(150),
          }),
        })
      );
      expect(mockPrismaService.serviceRequestItem.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            serviceRequestId: 'req-1',
            sortOrder: 0,
          }),
        })
      );
      expect(
        mockNotificationsService.notifyPriceChangeApproved
      ).toHaveBeenCalledWith('provider-1', 'Cliente Uno', 'Servicio Uno', 50);
    });

    it('marks APPROVED_PENDING_FUNDS on insufficient funds, without touching price/escrowAmount yet', async () => {
      mockPrismaService.serviceRequestPriceChangeProposal.findUnique.mockResolvedValue(
        baseProposal()
      );
      (mockEscrowService.hold as jest.Mock).mockRejectedValueOnce(
        new InsufficientEscrowFundsError('no funds')
      );

      await service.approvePriceChangeProposal('proposal-1', 'client-1');

      expect(
        mockPrismaService.serviceRequestPriceChangeProposal.update
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: 'APPROVED_PENDING_FUNDS' }),
        })
      );
      expect(mockPrismaService.serviceRequest.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { escrowStatus: 'PENDING_FUNDS' } })
      );
      expect(
        mockNotificationsService.notifyPriceChangeApprovedPendingFunds
      ).toHaveBeenCalled();
    });

    it('con pago directo (sin garantía) el aumento solo cambia el precio, aun con Pago Protegido apagado', async () => {
      const prev = process.env.PROTECTED_PAYMENTS_ENABLED;
      delete process.env.PROTECTED_PAYMENTS_ENABLED;
      try {
        mockPrismaService.serviceRequestPriceChangeProposal.findUnique.mockResolvedValue(
          baseProposal({
            serviceRequest: baseRequest({
              status: 'CONTACTED',
              price: 100,
              escrowStatus: 'NONE',
            }),
          })
        );

        await service.approvePriceChangeProposal('proposal-1', 'client-1');

        expect(mockEscrowService.hold).not.toHaveBeenCalled();
        const [args] = mockPrismaService.serviceRequest.update.mock.calls[0];
        expect(args.data.price.toString()).toBe('150');
        expect(args.data).not.toHaveProperty('escrowAmount');
        expect(
          mockPrismaService.serviceRequestPriceChangeProposal.update
        ).toHaveBeenCalledWith(
          expect.objectContaining({
            data: expect.objectContaining({ status: 'APPROVED' }),
          })
        );
      } finally {
        if (prev === undefined) delete process.env.PROTECTED_PAYMENTS_ENABLED;
        else process.env.PROTECTED_PAYMENTS_ENABLED = prev;
      }
    });
  });

  describe('rejectPriceChangeProposal', () => {
    it('marks REJECTED without touching price/items and notifies the provider', async () => {
      mockPrismaService.serviceRequestPriceChangeProposal.findUnique.mockResolvedValue(
        {
          id: 'proposal-1',
          status: 'PENDING',
          deltaAmount: 50,
          serviceRequest: baseRequest({ status: 'CONTACTED', price: 100 }),
        }
      );

      await service.rejectPriceChangeProposal(
        'proposal-1',
        'client-1',
        'Muy caro'
      );

      expect(
        mockPrismaService.serviceRequestPriceChangeProposal.update
      ).toHaveBeenCalledWith({
        where: { id: 'proposal-1' },
        data: {
          status: 'REJECTED',
          resolvedBy: 'client-1',
          resolvedAt: expect.any(Date),
          rejectionReason: 'Muy caro',
        },
      });
      expect(mockPrismaService.serviceRequest.update).not.toHaveBeenCalled();
      expect(
        mockNotificationsService.notifyPriceChangeRejected
      ).toHaveBeenCalledWith(
        'provider-1',
        'Cliente Uno',
        'Servicio Uno',
        50,
        'Muy caro'
      );
    });

    it('rejects if the caller is not the requester', async () => {
      mockPrismaService.serviceRequestPriceChangeProposal.findUnique.mockResolvedValue(
        {
          id: 'proposal-1',
          status: 'PENDING',
          serviceRequest: baseRequest({ status: 'CONTACTED' }),
        }
      );

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
      mockPrismaService.serviceRequest.findUnique.mockResolvedValue(
        baseRequest({ status: 'PENDING' })
      );
      mockPrismaService.serviceRequestPriceChangeProposal.updateMany.mockResolvedValue(
        { count: 1 }
      );

      await service.updateServiceRequest('req-1', 'provider-1', {
        status: 'REJECTED',
      });

      expect(
        mockPrismaService.serviceRequestPriceChangeProposal.updateMany
      ).toHaveBeenCalledWith({
        where: { serviceRequestId: 'req-1', status: 'PENDING' },
        data: { status: 'INVALIDATED', resolvedAt: expect.any(Date) },
      });
      expect(
        mockNotificationsService.notifyPriceChangeProposalInvalidated
      ).toHaveBeenCalledWith('provider-1', 'Servicio Uno');
    });
  });
  describe('terminado por el proveedor y cierre automático', () => {
    it('el proveedor marca terminado y el cliente recibe el aviso con el plazo', async () => {
      mockPrismaService.serviceRequest.findUnique.mockResolvedValue(
        baseRequest({ status: 'CONTACTED', escrowStatus: 'HELD' })
      );

      const res = await service.markServiceRequestDone('req-1', 'provider-1');

      expect(res.providerCompletedAt).toBeInstanceOf(Date);
      expect(
        mockNotificationsService.notifyServiceRequestProviderCompleted
      ).toHaveBeenCalledWith(
        'client-1',
        'Proveedor Uno',
        'Servicio Uno',
        'req-1',
        72
      );
    });

    it('no se marca terminado con la garantía sin pagar ni con disputa abierta', async () => {
      for (const escrowStatus of ['PENDING_FUNDS', 'DISPUTED']) {
        mockPrismaService.serviceRequest.findUnique.mockResolvedValue(
          baseRequest({ status: 'CONTACTED', escrowStatus })
        );
        await expect(
          service.markServiceRequestDone('req-1', 'provider-1')
        ).rejects.toThrow();
      }
      expect(mockPrismaService.serviceRequest.update).not.toHaveBeenCalled();
    });

    it('solo el proveedor de la solicitud puede marcarla terminada', async () => {
      mockPrismaService.serviceRequest.findUnique.mockResolvedValue(
        baseRequest({ status: 'CONTACTED' })
      );
      await expect(
        service.markServiceRequestDone('req-1', 'client-1')
      ).rejects.toThrow('No tienes permiso');
    });

    it('cierra solo las vencidas y sin disputa, cobra la comisión y libera la garantía', async () => {
      const done = new Date(Date.now() - 73 * 3600 * 1000);
      mockPrismaService.serviceRequest.findMany.mockResolvedValue([
        {
          id: 'req-1',
          providerId: 'provider-1',
          requesterId: 'client-1',
          serviceName: 'Servicio Uno',
        },
      ]);
      mockPrismaService.serviceRequest.findUnique.mockResolvedValue(
        baseRequest({
          status: 'CONTACTED',
          price: 50,
          escrowStatus: 'HELD',
          escrowAmount: 50,
          providerCompletedAt: done,
        })
      );
      (mockPlatformFeesService.resolveFeeConfig as jest.Mock).mockResolvedValue(
        { payer: 'PROVIDER', rate: 0.1 }
      );
      (mockPlatformFeesService.calculateFee as jest.Mock).mockReturnValue({
        feeAmount: 5,
      });

      const res = await service.closeUnconfirmedCompletions();

      expect(res).toEqual({ checked: 1, closed: 1 });
      const [where] = mockPrismaService.serviceRequest.findMany.mock.calls[0];
      expect(where.where.escrowStatus).toEqual({
        notIn: ['DISPUTED', 'PENDING_FUNDS'],
      });
      expect(mockPlatformFeesService.chargeProviderFee).toHaveBeenCalled();
      expect(mockEscrowService.release).toHaveBeenCalledWith(
        expect.objectContaining({ payeeId: 'provider-1' })
      );
      expect(
        mockPrismaService.serviceRequestStatusHistory.create
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            changedBy: null,
            newStatus: 'CLOSED',
          }),
        })
      );
      expect(
        mockNotificationsService.notifyServiceRequestAutoClosed
      ).toHaveBeenCalledWith('provider-1', 'client-1', 'Servicio Uno');
    });

    it('el cierre automático se niega si la solicitud entró en disputa entre tanto', async () => {
      mockPrismaService.serviceRequest.findMany.mockResolvedValue([
        {
          id: 'req-1',
          providerId: 'provider-1',
          requesterId: 'client-1',
          serviceName: 'S',
        },
      ]);
      mockPrismaService.serviceRequest.findUnique.mockResolvedValue(
        baseRequest({
          status: 'CONTACTED',
          escrowStatus: 'DISPUTED',
          providerCompletedAt: new Date(0),
        })
      );

      const res = await service.closeUnconfirmedCompletions();

      expect(res).toEqual({ checked: 1, closed: 0 });
      expect(mockPrismaService.serviceRequest.update).not.toHaveBeenCalled();
    });

    it('sin cierre automático, nadie más que el cliente puede confirmar', async () => {
      mockPrismaService.serviceRequest.findUnique.mockResolvedValue(
        baseRequest({ status: 'CONTACTED' })
      );
      await expect(
        service.confirmServiceRequestCompletion('req-1', 'provider-1')
      ).rejects.toThrow('No tienes permiso');
    });
  });

  describe('disputas de solicitudes', () => {
    const disputeRow = {
      id: 'disp-1',
      escrow: { entityType: 'SERVICE_REQUEST', entityId: 'req-1', amount: 50 },
    };

    it('pide explicar el problema (mínimo 10 caracteres)', async () => {
      await expect(
        service.disputeServiceRequest('req-1', 'client-1', 'mal')
      ).rejects.toThrow('mínimo 10 caracteres');
      expect(mockEscrowService.openDispute).not.toHaveBeenCalled();
    });

    it('reembolso total: cancela la solicitud y no cobra comisión', async () => {
      mockPrismaService.escrowDispute.findUnique.mockResolvedValue(disputeRow);
      mockPrismaService.serviceRequest.findUnique.mockResolvedValue(
        baseRequest({ status: 'CONTACTED', escrowStatus: 'DISPUTED' })
      );
      (mockEscrowService.resolveDispute as jest.Mock).mockResolvedValue({
        id: 'disp-1',
        releaseAmount: 0,
        refundAmount: 50,
      });

      const res = await service.resolveServiceRequestDispute(
        'admin-1',
        'disp-1',
        { resolution: 'REFUND_FULL' }
      );

      expect(res.serviceRequestStatus).toBe('CANCELLED');
      expect(mockPlatformFeesService.chargeProviderFee).not.toHaveBeenCalled();
      expect(mockPrismaService.serviceRequest.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: 'CANCELLED' }),
        })
      );
    });

    it('reparto: cierra la solicitud y cobra la comisión solo sobre lo liberado', async () => {
      mockPrismaService.escrowDispute.findUnique.mockResolvedValue(disputeRow);
      mockPrismaService.serviceRequest.findUnique.mockResolvedValue(
        baseRequest({ status: 'CONTACTED', escrowStatus: 'DISPUTED' })
      );
      (mockEscrowService.resolveDispute as jest.Mock).mockResolvedValue({
        id: 'disp-1',
        releaseAmount: 30,
        refundAmount: 20,
      });
      (mockPlatformFeesService.resolveFeeConfig as jest.Mock).mockResolvedValue(
        { payer: 'PROVIDER', rate: 0.1 }
      );
      (mockPlatformFeesService.calculateFee as jest.Mock).mockReturnValue({
        feeAmount: 3,
      });

      const res = await service.resolveServiceRequestDispute(
        'admin-1',
        'disp-1',
        { resolution: 'SPLIT', releaseAmount: 30, refundAmount: 20 }
      );

      expect(res.serviceRequestStatus).toBe('CLOSED');
      expect(mockPlatformFeesService.calculateFee).toHaveBeenCalledWith(
        30,
        expect.anything()
      );
      expect(mockPlatformFeesService.chargeProviderFee).toHaveBeenCalledWith(
        'SERVICE_REQUEST',
        'provider-1',
        3,
        'FEE-SVC-req-1',
        expect.objectContaining({ disputeId: 'disp-1' })
      );
    });

    it('una disputa que no es de solicitud de servicio no se resuelve por acá', async () => {
      mockPrismaService.escrowDispute.findUnique.mockResolvedValue({
        id: 'disp-2',
        escrow: { entityType: 'CATALOG_ORDER', entityId: 'o1' },
      });
      await expect(
        service.resolveServiceRequestDispute('admin-1', 'disp-2', {
          resolution: 'REFUND_FULL',
        })
      ).rejects.toThrow('Disputa no encontrada');
      expect(mockEscrowService.resolveDispute).not.toHaveBeenCalled();
    });
  });

  describe('garantías sin pagar', () => {
    const stale = () =>
      baseRequest({
        status: 'CONTACTED',
        escrowStatus: 'PENDING_FUNDS',
        statusUpdatedAt: new Date(Date.now() - 80 * 3600 * 1000),
      });

    it('cancela la solicitud cuya garantía inicial no se pagó en 72 h', async () => {
      mockPrismaService.serviceRequest.findMany.mockResolvedValue([stale()]);

      const res = await service.expireUnpaidGuarantees();

      expect(res).toEqual({ cancelled: 1, increasesExpired: 0 });
      expect(mockPrismaService.serviceRequest.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            id: 'req-1',
            status: 'CONTACTED',
            escrowStatus: 'PENDING_FUNDS',
          },
          data: expect.objectContaining({
            status: 'CANCELLED',
            escrowStatus: 'NONE',
          }),
        })
      );
      expect(
        mockNotificationsService.notifyGuaranteeExpired
      ).toHaveBeenCalledWith(
        'provider-1',
        'client-1',
        'Servicio Uno',
        'request'
      );
    });

    it('no toca las que tienen un pago reportado en revisión', async () => {
      mockPrismaService.escrowFundingReport.findMany.mockResolvedValue([
        { sourceId: 'req-1' },
      ]);
      mockPrismaService.serviceRequest.findMany.mockResolvedValue([stale()]);

      const res = await service.expireUnpaidGuarantees();

      expect(res.cancelled).toBe(0);
      expect(
        mockPrismaService.serviceRequest.updateMany
      ).not.toHaveBeenCalled();
    });

    it('un aumento aprobado sin pagar caduca y la garantía original sigue retenida', async () => {
      mockPrismaService.serviceRequestPriceChangeProposal.findMany.mockResolvedValue(
        [
          {
            id: 'prop-1',
            serviceRequest: baseRequest({
              status: 'CONTACTED',
              escrowStatus: 'PENDING_FUNDS',
            }),
          },
        ]
      );

      const res = await service.expireUnpaidGuarantees();

      expect(res).toEqual({ cancelled: 0, increasesExpired: 1 });
      expect(
        mockPrismaService.serviceRequestPriceChangeProposal.update
      ).toHaveBeenCalledWith({
        where: { id: 'prop-1' },
        data: { status: 'INVALIDATED' },
      });
      expect(mockPrismaService.serviceRequest.update).toHaveBeenCalledWith({
        where: { id: 'req-1' },
        data: { escrowStatus: 'HELD' },
      });
    });

    it('la búsqueda de garantías iniciales excluye las que esperan un aumento', async () => {
      await service.expireUnpaidGuarantees();
      const [args] = mockPrismaService.serviceRequest.findMany.mock.calls[0];
      expect(args.where.priceChangeProposals).toEqual({
        none: { status: 'APPROVED_PENDING_FUNDS' },
      });
    });
  });
});

describe('ServicesService — alta y edición de servicios', () => {
  let service: ServicesService;
  let prisma: any;
  let planLimits: any;
  let categoryScope: any;

  const dto = { name: 'Delivery express', price: 5 };

  beforeEach(async () => {
    prisma = {
      service: {
        create: jest
          .fn()
          .mockImplementation(({ data }) => Promise.resolve(data)),
        update: jest
          .fn()
          .mockImplementation(({ data }) => Promise.resolve(data)),
        findUnique: jest
          .fn()
          .mockResolvedValue({ userId: 'u1', status: 'PAUSED' }),
      },
      serviceModality: {
        findMany: jest
          .fn()
          .mockResolvedValue([
            { value: 'IN_PERSON' },
            { value: 'REMOTE' },
            { value: 'ANY' },
          ]),
      },
      serviceCategory: { findMany: jest.fn().mockResolvedValue([]) },
    };
    planLimits = { assertServiceLimit: jest.fn().mockResolvedValue(undefined) };
    categoryScope = {
      getUserCategoryId: jest.fn().mockResolvedValue('cat-transporte'),
      filterByCategory: jest.fn((items: any[]) => items),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ServicesService,
        { provide: PrismaService, useValue: prisma },
        { provide: NotificationsService, useValue: {} },
        { provide: PLATFORM_FEES_FACADE, useValue: {} },
        { provide: PLAN_LIMITS_FACADE, useValue: planLimits },
        { provide: ESCROW_FACADE, useValue: {} },
        { provide: REPUTATION_FACADE, useValue: {} },
        {
          provide: ServiceLeadFeeService,
          useValue: { isEnabled: () => false },
        },
        { provide: CategoryScopeService, useValue: categoryScope },
      ],
    }).compile();
    service = module.get(ServicesService);
  });

  it('exige categoría si el rubro del usuario tiene categorías disponibles', async () => {
    prisma.serviceCategory.findMany.mockResolvedValue([
      { userCategoryIds: [] },
    ]);
    await expect(service.createService('u1', dto as any)).rejects.toThrow(
      'Elige una categoría'
    );
    expect(prisma.service.create).not.toHaveBeenCalled();
  });

  it('permite crear sin categoría si el rubro no tiene catálogo (cold-start)', async () => {
    await service.createService('u1', dto as any);
    expect(prisma.service.create).toHaveBeenCalled();
  });

  it('rechaza modalidades fuera del catálogo activo', async () => {
    await expect(
      service.createService('u1', {
        ...dto,
        categoryId: 'c1',
        modalities: ['TELEPORT'],
      } as any)
    ).rejects.toThrow('Modalidad no disponible: TELEPORT');
  });

  it("normaliza 'ANY' combinado con otras modalidades a solo 'ANY'", async () => {
    await service.createService('u1', {
      ...dto,
      categoryId: 'c1',
      modalities: ['IN_PERSON', 'ANY', 'IN_PERSON'],
    } as any);
    expect(prisma.service.create.mock.calls[0][0].data.modalities).toEqual([
      'ANY',
    ]);
  });

  it('reactivar un servicio desde el formulario de edición respeta el límite del plan', async () => {
    planLimits.assertServiceLimit.mockRejectedValue(
      new Error('Límite del plan')
    );
    await expect(
      service.updateService('s1', 'u1', { status: 'ACTIVE' } as any)
    ).rejects.toThrow('Límite del plan');
    expect(prisma.service.update).not.toHaveBeenCalled();
  });

  it('editar sin cambiar a ACTIVE no consulta el límite', async () => {
    await service.updateService('s1', 'u1', { name: 'Nuevo nombre' } as any);
    expect(planLimits.assertServiceLimit).not.toHaveBeenCalled();
    expect(prisma.service.update).toHaveBeenCalled();
  });
});
