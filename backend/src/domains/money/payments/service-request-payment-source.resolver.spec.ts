import {
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import {
  EscrowStatus,
  Prisma,
  ServiceRequestStatus,
} from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { ServiceRequestPaymentSourceResolver } from './service-request-payment-source.resolver';

describe('ServiceRequestPaymentSourceResolver', () => {
  const request = {
    id: 'request-1',
    requesterId: 'client-1',
    providerId: 'provider-1',
    serviceId: 'service-1',
    serviceName: 'Reparación',
    price: new Prisma.Decimal('80.50'),
    status: ServiceRequestStatus.CONTACTED,
    escrowStatus: EscrowStatus.NONE,
    updatedAt: new Date('2026-10-20T12:00:00.000Z'),
  };
  const prisma = {
    serviceRequest: { findUnique: jest.fn() },
    service: { findUnique: jest.fn() },
    commerce: { findFirst: jest.fn() },
    freelancerSettings: { findUnique: jest.fn() },
  } as unknown as PrismaService;
  let resolver: ServiceRequestPaymentSourceResolver;

  beforeEach(() => {
    jest.clearAllMocks();
    resolver = new ServiceRequestPaymentSourceResolver(prisma);
    (prisma.serviceRequest.findUnique as jest.Mock).mockResolvedValue(request);
    (prisma.service.findUnique as jest.Mock).mockResolvedValue({
      userId: 'provider-1',
    });
    (prisma.commerce.findFirst as jest.Mock).mockResolvedValue(null);
    (prisma.freelancerSettings.findUnique as jest.Mock).mockResolvedValue({
      currency: 'USD',
    });
  });

  it(
    'resolves confirmed price and provider currency from persisted records',
    async () => {
      await expect(
        resolver.resolve('request-1', 'client-1')
      ).resolves.toEqual({
        sourceType: 'SERVICE_REQUEST',
        sourceId: 'request-1',
        payerUserId: 'client-1',
        sellerUserId: 'provider-1',
        currency: 'USD',
        baseAmount: '80.50',
        description: 'Servicio - Reparación',
        quoteVersion: '2026-10-20T12:00:00.000Z',
      });
    }
  );

  it('rejects a missing request', async () => {
    (prisma.serviceRequest.findUnique as jest.Mock).mockResolvedValue(null);
    await expect(resolver.resolve('missing', 'client-1')).rejects.toThrow(
      NotFoundException
    );
  });

  it('rejects a payer who does not own the request', async () => {
    await expect(resolver.resolve('request-1', 'other-user')).rejects.toThrow(
      BadRequestException
    );
    expect(prisma.service.findUnique).not.toHaveBeenCalled();
  });

  it.each([
    ServiceRequestStatus.PENDING,
    ServiceRequestStatus.SEEN,
    ServiceRequestStatus.CLOSED,
    ServiceRequestStatus.CANCELLED,
    ServiceRequestStatus.REJECTED,
  ])('rejects request status %s', async (status) => {
    (prisma.serviceRequest.findUnique as jest.Mock).mockResolvedValue({
      ...request,
      status,
    });
    await expect(resolver.resolve('request-1', 'client-1')).rejects.toThrow(
      BadRequestException
    );
  });

  it.each([
    EscrowStatus.HELD,
    EscrowStatus.PENDING_FUNDS,
    EscrowStatus.RELEASED,
    EscrowStatus.REFUNDED,
    EscrowStatus.DISPUTED,
  ])('rejects request escrow status %s', async (escrowStatus) => {
    (prisma.serviceRequest.findUnique as jest.Mock).mockResolvedValue({
      ...request,
      escrowStatus,
    });
    await expect(resolver.resolve('request-1', 'client-1')).rejects.toThrow(
      BadRequestException
    );
  });

  it('rejects a missing or non-positive price', async () => {
    (prisma.serviceRequest.findUnique as jest.Mock).mockResolvedValue({
      ...request,
      price: new Prisma.Decimal('0'),
    });
    await expect(resolver.resolve('request-1', 'client-1')).rejects.toThrow(
      BadRequestException
    );
  });

  it('rejects when provider ownership does not match the service', async () => {
    (prisma.service.findUnique as jest.Mock).mockResolvedValue({
      userId: 'different-provider',
    });
    await expect(resolver.resolve('request-1', 'client-1')).rejects.toThrow(
      BadRequestException
    );
  });

  it.each(['MXN', 'EUR', null])(
    'fails closed for unsupported or missing currency %s',
    async (currency) => {
      (prisma.freelancerSettings.findUnique as jest.Mock).mockResolvedValue(
        currency ? { currency } : null
      );
      await expect(resolver.resolve('request-1', 'client-1')).rejects.toThrow(
        'La moneda del proveedor no está configurada'
      );
    }
  );

  it('rejects conflicting commerce and freelancer currencies', async () => {
    (prisma.commerce.findFirst as jest.Mock).mockResolvedValue({
      settings: { currency: 'VES' },
    });
    (prisma.freelancerSettings.findUnique as jest.Mock).mockResolvedValue({
      currency: 'USD',
    });
    await expect(resolver.resolve('request-1', 'client-1')).rejects.toThrow(
      BadRequestException
    );
  });

  it('accepts VES case-insensitively', async () => {
    (prisma.freelancerSettings.findUnique as jest.Mock).mockResolvedValue({
      currency: 'ves',
    });
    await expect(
      resolver.resolve('request-1', 'client-1')
    ).resolves.toMatchObject({ currency: 'VES' });
  });
});
