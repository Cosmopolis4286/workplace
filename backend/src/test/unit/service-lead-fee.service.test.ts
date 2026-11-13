import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { ServiceLeadFeeService } from '../../domains/commerce-core/services/service-lead-fee.service';
import { InsufficientUsageCreditsError } from '../../domains/money/usage-credits/usage-credits.facade';
import { LEAD_FEE_POLICY_VERSION } from '../../domains/money/usage-credits/usage-credits.constants';

describe('ServiceLeadFeeService', () => {
  let prisma: any;
  let tx: any;
  let platformFees: any;
  let credits: any;
  let service: ServiceLeadFeeService;

  const request = (over: Record<string, unknown> = {}) => ({
    id: 'req-1',
    providerId: 'provider-1',
    status: 'SEEN',
    price: new Prisma.Decimal(50),
    platformFeePayer: null,
    platformFeeAmount: null,
    service: { price: new Prisma.Decimal(40) },
    ...over,
  });

  beforeEach(() => {
    tx = {
      serviceRequest: { updateMany: jest.fn().mockResolvedValue({ count: 1 }) },
      serviceRequestStatusHistory: { create: jest.fn() },
      serviceLeadAcceptance: {
        create: jest.fn().mockImplementation(({ data }) => ({
          id: 'acc-1',
          ...data,
        })),
      },
    };
    prisma = {
      serviceRequest: { findUnique: jest.fn().mockResolvedValue(request()) },
      serviceLeadAcceptance: {
        findUnique: jest.fn().mockResolvedValue({ id: 'acc-1' }),
      },
      $transaction: jest.fn((fn: (t: any) => unknown) => fn(tx)),
    };
    platformFees = {
      resolveFeeConfig: jest
        .fn()
        .mockResolvedValue({ rate: 0.1, payer: 'PROVIDER' }),
      calculateFee: jest.fn((base: any, cfg: any) => ({
        feeAmount: Number(base) * cfg.rate,
      })),
      chargeProviderFeeInTransaction: jest
        .fn()
        .mockResolvedValue({ charge: {}, created: true }),
      notifyProviderFee: jest.fn().mockResolvedValue(undefined),
    };
    credits = {
      isEnabled: jest.fn().mockReturnValue(true),
      getAvailable: jest.fn().mockResolvedValue(new Prisma.Decimal(20)),
      consume: jest.fn().mockResolvedValue({ applied: true }),
    };
    service = new ServiceLeadFeeService(prisma, platformFees, credits);
  });

  describe('quote', () => {
    it('muestra cargo por oportunidad + comisión estimada y el saldo', async () => {
      const quote = await service.quote('req-1', 'provider-1');
      // 50 USD → tramo de 1.00; comisión 10 % de 50 = 5.
      expect(quote).toMatchObject({
        status: 'SEEN',
        policyVersion: LEAD_FEE_POLICY_VERSION,
        basePrice: 50,
        leadFee: 1,
        commissionRate: 0.1,
        estimatedCommission: 5,
        total: 6,
        available: 20,
        enough: true,
      });
    });

    it('sin precio en la solicitud usa el precio del servicio', async () => {
      prisma.serviceRequest.findUnique.mockResolvedValue(
        request({ price: null, service: { price: new Prisma.Decimal(8) } })
      );
      const quote = await service.quote('req-1', 'provider-1');
      expect(quote.basePrice).toBe(8);
      expect(quote.leadFee).toBe(0.25);
    });

    it('si la comisión la paga el cliente, estima con la ya sumada al precio', async () => {
      prisma.serviceRequest.findUnique.mockResolvedValue(
        request({
          platformFeePayer: 'CLIENT',
          platformFeeAmount: new Prisma.Decimal(3),
        })
      );
      const quote = await service.quote('req-1', 'provider-1');
      expect(quote.estimatedCommission).toBe(3);
      expect(platformFees.resolveFeeConfig).not.toHaveBeenCalled();
    });

    it('apagado (USAGE_CREDITS_ENABLED) responde 404', async () => {
      credits.isEnabled.mockReturnValue(false);
      await expect(service.quote('req-1', 'provider-1')).rejects.toBeInstanceOf(
        NotFoundException
      );
    });

    it('solo el proveedor de la solicitud, y solo en PENDING/SEEN', async () => {
      await expect(service.quote('req-1', 'otro')).rejects.toBeInstanceOf(
        ForbiddenException
      );
      prisma.serviceRequest.findUnique.mockResolvedValue(
        request({ status: 'CONTACTED' })
      );
      await expect(service.quote('req-1', 'provider-1')).rejects.toBeInstanceOf(
        ConflictException
      );
    });
  });

  describe('accept', () => {
    const presented = { policyVersion: LEAD_FEE_POLICY_VERSION, leadFee: 1 };

    it('acepta, guarda el consentimiento y descuenta el cargo en una sola transacción', async () => {
      await service.accept('req-1', 'provider-1', presented);

      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
      expect(tx.serviceRequest.updateMany).toHaveBeenCalledWith({
        where: {
          id: 'req-1',
          providerId: 'provider-1',
          status: { in: ['PENDING', 'SEEN'] },
        },
        data: { status: 'CONTACTED', statusUpdatedAt: expect.any(Date) },
      });
      expect(tx.serviceRequestStatusHistory.create).toHaveBeenCalledWith({
        data: {
          serviceRequestId: 'req-1',
          previousStatus: 'SEEN',
          newStatus: 'CONTACTED',
          changedBy: 'provider-1',
        },
      });
      expect(
        tx.serviceLeadAcceptance.create.mock.calls[0][0].data
      ).toMatchObject({
        serviceRequestId: 'req-1',
        providerId: 'provider-1',
        policyVersion: LEAD_FEE_POLICY_VERSION,
        leadFeeUnits: 1,
        estimatedCommissionUnits: 5,
        basePrice: 50,
        leadFeeReference: 'LEAD-SVC-req-1',
      });
      expect(credits.consume).toHaveBeenCalledWith(tx, {
        userId: 'provider-1',
        units: 1,
        concept: 'LEAD_FEE',
        reference: 'LEAD-SVC-req-1',
        metadata: {
          serviceRequestId: 'req-1',
          policyVersion: LEAD_FEE_POLICY_VERSION,
        },
      });
    });

    it('rechaza si el cargo cambió desde la cotización que vio el proveedor', async () => {
      await expect(
        service.accept('req-1', 'provider-1', { ...presented, leadFee: 0.5 })
      ).rejects.toBeInstanceOf(ConflictException);
      await expect(
        service.accept('req-1', 'provider-1', {
          ...presented,
          policyVersion: 'vieja',
        })
      ).rejects.toBeInstanceOf(ConflictException);
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('sin créditos para el cargo + la comisión estimada, no acepta', async () => {
      credits.getAvailable.mockResolvedValue(new Prisma.Decimal(5));
      await expect(
        service.accept('req-1', 'provider-1', presented)
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('si otra petición ya la aceptó o rechazó, no cobra', async () => {
      tx.serviceRequest.updateMany.mockResolvedValue({ count: 0 });
      await expect(
        service.accept('req-1', 'provider-1', presented)
      ).rejects.toBeInstanceOf(ConflictException);
      expect(credits.consume).not.toHaveBeenCalled();
    });

    it('si el saldo se gastó entre la cotización y el cobro, falla toda la transacción', async () => {
      credits.consume.mockRejectedValue(
        new InsufficientUsageCreditsError(
          new Prisma.Decimal(0),
          new Prisma.Decimal(1)
        )
      );
      await expect(
        service.accept('req-1', 'provider-1', presented)
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('chargeSuccessFeeInCredits', () => {
    const input = {
      serviceRequestId: 'req-1',
      providerId: 'provider-1',
      feeAmount: 5,
      metadata: { serviceRequestId: 'req-1' },
    };

    it('registra la comisión como cobrada y la descuenta en créditos', async () => {
      await expect(service.chargeSuccessFeeInCredits(input)).resolves.toBe(
        true
      );
      expect(platformFees.chargeProviderFeeInTransaction).toHaveBeenCalledWith(
        'SERVICE_REQUEST',
        'provider-1',
        5,
        'FEE-SVC-req-1',
        { serviceRequestId: 'req-1', paidWith: 'USAGE_CREDITS' },
        { tx, collected: true }
      );
      expect(credits.consume).toHaveBeenCalledWith(
        tx,
        expect.objectContaining({
          units: 5,
          concept: 'SUCCESS_FEE',
          reference: 'SUCCESS-SVC-req-1',
        })
      );
      expect(platformFees.notifyProviderFee).toHaveBeenCalled();
    });

    it('sin aceptación con cargo (consentimiento) no cobra en créditos', async () => {
      prisma.serviceLeadAcceptance.findUnique.mockResolvedValue(null);
      await expect(service.chargeSuccessFeeInCredits(input)).resolves.toBe(
        false
      );
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('si la comisión ya estaba registrada (reintento), no descuenta otra vez', async () => {
      platformFees.chargeProviderFeeInTransaction.mockResolvedValue({
        charge: {},
        created: false,
      });
      await service.chargeSuccessFeeInCredits(input);
      expect(credits.consume).not.toHaveBeenCalled();
    });

    it('sin créditos suficientes devuelve false para cobrarla en el estado de cuenta', async () => {
      credits.consume.mockRejectedValue(
        new InsufficientUsageCreditsError(
          new Prisma.Decimal(1),
          new Prisma.Decimal(5)
        )
      );
      await expect(service.chargeSuccessFeeInCredits(input)).resolves.toBe(
        false
      );
    });

    it('apagado no hace nada', async () => {
      credits.isEnabled.mockReturnValue(false);
      await expect(service.chargeSuccessFeeInCredits(input)).resolves.toBe(
        false
      );
      expect(prisma.serviceLeadAcceptance.findUnique).not.toHaveBeenCalled();
    });
  });
});
