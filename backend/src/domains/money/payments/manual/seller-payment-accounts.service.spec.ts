import { BadRequestException } from '@nestjs/common';
import { SellerPaymentMethod } from '@prisma/client';
import {
  MAX_ACTIVE_SELLER_ACCOUNTS,
  SellerPaymentAccountsService,
} from './seller-payment-accounts.service';

describe('SellerPaymentAccountsService', () => {
  let prisma: any;
  let service: SellerPaymentAccountsService;

  beforeEach(() => {
    prisma = {
      sellerPaymentAccount: {
        count: jest.fn().mockResolvedValue(0),
        create: jest.fn(({ data }) =>
          Promise.resolve({ id: 'acc-1', ...data })
        ),
        findFirst: jest.fn(),
        update: jest.fn(({ data }) => Promise.resolve(data)),
        delete: jest.fn().mockResolvedValue({}),
      },
      manualPaymentReport: { count: jest.fn().mockResolvedValue(0) },
    };
    service = new SellerPaymentAccountsService(prisma);
  });

  const base = {
    holderName: '  Carlos   Delivery ',
    holderDocument: 'v 12.345.678',
  };

  it('normaliza un pago móvil: documento, teléfono con +58 y nombre del banco', () => {
    const acc = service.normalize({
      ...base,
      method: SellerPaymentMethod.PAGO_MOVIL,
      bankCode: '0191',
      phone: '+58 414-123.4567',
    });
    expect(acc).toMatchObject({
      currency: 'VES',
      holderName: 'Carlos Delivery',
      holderDocument: 'V-12345678',
      phone: '04141234567',
      bankName: 'BNC Banco Nacional de Crédito',
    });
  });

  it('rechaza un banco que no existe', () => {
    expect(() =>
      service.normalize({
        ...base,
        method: SellerPaymentMethod.PAGO_MOVIL,
        bankCode: '9999',
        phone: '04141234567',
      })
    ).toThrow('Selecciona un banco válido');
  });

  it('exige que la cuenta de 20 dígitos empiece por el código del banco', () => {
    expect(() =>
      service.normalize({
        ...base,
        method: SellerPaymentMethod.BANK_TRANSFER,
        bankCode: '0134',
        accountNumber: '0102 0000 0000 0000 0000',
      })
    ).toThrow('La cuenta no corresponde a Banesco');
  });

  it('Zelle es en USD y no pide banco', () => {
    const acc = service.normalize({
      ...base,
      method: SellerPaymentMethod.ZELLE,
      email: 'Carlos@Mail.com ',
    });
    expect(acc).toMatchObject({
      currency: 'USD',
      email: 'carlos@mail.com',
      bankCode: null,
    });
  });

  it('rechaza cédula o RIF con formato inválido', () => {
    expect(() =>
      service.normalize({
        ...base,
        holderDocument: '12345',
        method: SellerPaymentMethod.ZELLE,
        email: 'a@b.com',
      })
    ).toThrow(BadRequestException);
  });

  it(`limita a ${MAX_ACTIVE_SELLER_ACCOUNTS} cuentas activas`, async () => {
    prisma.sellerPaymentAccount.count.mockResolvedValue(
      MAX_ACTIVE_SELLER_ACCOUNTS
    );
    await expect(
      service.create('u1', {
        ...base,
        method: SellerPaymentMethod.ZELLE,
        email: 'a@b.com',
      })
    ).rejects.toThrow('hasta 5 cuentas');
  });

  it('una cuenta con pagos reportados se desactiva en vez de borrarse', async () => {
    prisma.sellerPaymentAccount.findFirst.mockResolvedValue({
      id: 'acc-1',
      userId: 'u1',
    });
    prisma.manualPaymentReport.count.mockResolvedValue(2);
    await expect(service.remove('u1', 'acc-1')).resolves.toEqual({
      deleted: false,
      deactivated: true,
    });
    expect(prisma.sellerPaymentAccount.delete).not.toHaveBeenCalled();
  });
});
