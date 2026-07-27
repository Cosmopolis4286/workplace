import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException } from '@nestjs/common';
import { ServicesService } from '../../src/services/services.service';
import { PrismaService } from '../../src/prisma/prisma.service';
import { NotificationsService } from '../../src/notifications/notifications.service';
import { PlatformFeesService } from '../../src/platform-fees/platform-fees.service';

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
      status: 'PENDIENTE',
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
    it('rejects the provider closing directly from PENDIENTE (fee leak closed)', async () => {
      mockPrismaService.serviceRequest.findUnique.mockResolvedValue(baseRequest({ status: 'PENDIENTE' }));

      await expect(
        service.updateServiceRequest('req-1', 'provider-1', { status: 'CERRADO' })
      ).rejects.toThrow(ForbiddenException);
      await expect(
        service.updateServiceRequest('req-1', 'provider-1', { status: 'CERRADO' })
      ).rejects.toThrow('Solo el cliente puede confirmar la finalización de una solicitud');
    });

    it('rejects the provider closing directly from VISTO', async () => {
      mockPrismaService.serviceRequest.findUnique.mockResolvedValue(baseRequest({ status: 'VISTO' }));

      await expect(
        service.updateServiceRequest('req-1', 'provider-1', { status: 'CERRADO' })
      ).rejects.toThrow(ForbiddenException);
    });

    it('rejects the provider closing directly from CONTACTADO', async () => {
      mockPrismaService.serviceRequest.findUnique.mockResolvedValue(baseRequest({ status: 'CONTACTADO' }));

      await expect(
        service.updateServiceRequest('req-1', 'provider-1', { status: 'CERRADO' })
      ).rejects.toThrow(ForbiddenException);
    });

    it('allows the provider to reject from PENDIENTE and records history + notifies the client', async () => {
      mockPrismaService.serviceRequest.findUnique.mockResolvedValue(baseRequest({ status: 'PENDIENTE' }));

      await service.updateServiceRequest('req-1', 'provider-1', { status: 'RECHAZADO' });

      expect(mockPrismaService.serviceRequestStatusHistory.create).toHaveBeenCalledWith({
        data: {
          serviceRequestId: 'req-1',
          previousStatus: 'PENDIENTE',
          newStatus: 'RECHAZADO',
          changedBy: 'provider-1',
        },
      });
      expect(mockNotificationsService.notifyServiceRequestRejected).toHaveBeenCalledWith(
        'client-1', 'Proveedor Uno', 'Servicio Uno'
      );
    });

    it('allows the provider to reject from VISTO', async () => {
      mockPrismaService.serviceRequest.findUnique.mockResolvedValue(baseRequest({ status: 'VISTO' }));

      await expect(
        service.updateServiceRequest('req-1', 'provider-1', { status: 'RECHAZADO' })
      ).resolves.toBeDefined();
    });

    it('does not allow RECHAZADO from CONTACTADO (not an early-stage exit anymore)', async () => {
      mockPrismaService.serviceRequest.findUnique.mockResolvedValue(baseRequest({ status: 'CONTACTADO' }));

      await expect(
        service.updateServiceRequest('req-1', 'provider-1', { status: 'RECHAZADO' })
      ).rejects.toThrow(ForbiddenException);
    });

    it('still blocks the provider from cancelling on behalf of the client', async () => {
      mockPrismaService.serviceRequest.findUnique.mockResolvedValue(baseRequest({ status: 'PENDIENTE' }));

      await expect(
        service.updateServiceRequest('req-1', 'provider-1', { status: 'CANCELADO' })
      ).rejects.toThrow('Solo el cliente puede cancelar una solicitud');
    });

    it('records status history on a valid transition (VISTO)', async () => {
      mockPrismaService.serviceRequest.findUnique.mockResolvedValue(baseRequest({ status: 'PENDIENTE' }));

      await service.updateServiceRequest('req-1', 'provider-1', { status: 'VISTO' });

      expect(mockPrismaService.serviceRequestStatusHistory.create).toHaveBeenCalledWith({
        data: {
          serviceRequestId: 'req-1',
          previousStatus: 'PENDIENTE',
          newStatus: 'VISTO',
          changedBy: 'provider-1',
        },
      });
      expect(mockNotificationsService.notifyServiceRequestStatusChanged).toHaveBeenCalledWith(
        'client-1', 'Proveedor Uno', 'Servicio Uno', 'VISTO'
      );
    });

    it('rejects any change once the request is terminal (RECHAZADO)', async () => {
      mockPrismaService.serviceRequest.findUnique.mockResolvedValue(baseRequest({ status: 'RECHAZADO' }));

      await expect(
        service.updateServiceRequest('req-1', 'provider-1', { status: 'CONTACTADO' })
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('confirmServiceRequestCompletion', () => {
    it('still closes the request from CONTACTADO and records history (unaffected by the transition table change)', async () => {
      mockPrismaService.serviceRequest.findUnique.mockResolvedValue(baseRequest({ status: 'CONTACTADO' }));

      const result = await service.confirmServiceRequestCompletion('req-1', 'client-1');

      expect(result.status).toBe('CERRADO');
      expect(mockPrismaService.serviceRequestStatusHistory.create).toHaveBeenCalledWith({
        data: {
          serviceRequestId: 'req-1',
          previousStatus: 'CONTACTADO',
          newStatus: 'CERRADO',
          changedBy: 'client-1',
        },
      });
    });

    it('rejects confirmation when the request is not CONTACTADO', async () => {
      mockPrismaService.serviceRequest.findUnique.mockResolvedValue(baseRequest({ status: 'PENDIENTE' }));

      await expect(
        service.confirmServiceRequestCompletion('req-1', 'client-1')
      ).rejects.toThrow(ForbiddenException);
    });

    it('rejects confirmation from someone other than the requester', async () => {
      mockPrismaService.serviceRequest.findUnique.mockResolvedValue(baseRequest({ status: 'CONTACTADO' }));

      await expect(
        service.confirmServiceRequestCompletion('req-1', 'someone-else')
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('cancelServiceRequest', () => {
    it('records status history when the client cancels', async () => {
      mockPrismaService.serviceRequest.findUnique.mockResolvedValue(baseRequest({ status: 'PENDIENTE' }));

      await service.cancelServiceRequest('req-1', 'client-1');

      expect(mockPrismaService.serviceRequestStatusHistory.create).toHaveBeenCalledWith({
        data: {
          serviceRequestId: 'req-1',
          previousStatus: 'PENDIENTE',
          newStatus: 'CANCELADO',
          changedBy: 'client-1',
        },
      });
      expect(mockNotificationsService.notifyServiceRequestCancelled).toHaveBeenCalled();
    });
  });
});
