import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException } from '@nestjs/common';
import { ServicesService } from '../../domains/commerce-core/services/services.service';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../../domains/engagement/notifications/notifications.service';
import { PlatformFeesService } from '../../domains/money/platform-fees/platform-fees.service';

describe('ServicesService — service request status transitions', () => {
  let service: ServicesService;
  let mockPrismaService: any;
  let mockNotificationsService: Partial<NotificationsService>;
  let mockPlatformFeesService: Partial<PlatformFeesService>;

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
      user: {
        findUnique: jest.fn().mockResolvedValue({ username: 'proveedor1' }),
        findMany: jest.fn().mockResolvedValue([]),
      },
    };

    mockNotificationsService = {
      notifyServiceRequestStatusChanged: jest.fn().mockResolvedValue(undefined),
      notifyServiceRequestRejected: jest.fn().mockResolvedValue(undefined),
      notifyServiceRequestCancelled: jest.fn().mockResolvedValue(undefined),
      notifyReviewReminder: jest.fn().mockResolvedValue(undefined),
    };

    mockPlatformFeesService = {
      resolveFeeConfig: jest.fn().mockResolvedValue(null),
      calculateFee: jest.fn(),
      chargeProviderFee: jest.fn().mockResolvedValue(null),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ServicesService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: NotificationsService, useValue: mockNotificationsService },
        { provide: PlatformFeesService, useValue: mockPlatformFeesService },
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
});
