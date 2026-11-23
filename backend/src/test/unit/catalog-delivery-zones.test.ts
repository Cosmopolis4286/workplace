import { BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { resolveCatalogDelivery } from '../../domains/commerce-core/catalog/catalog.service';

const settings = (over: Partial<any> = {}) => ({
  deliveryZones: [
    { name: 'El Triunfo', fee: 1 },
    { name: 'San Félix', fee: 4 },
  ],
  pickupEnabled: true,
  freeDeliveryMinimum: new Prisma.Decimal(0),
  ...over,
});

describe('resolveCatalogDelivery — envío por zona', () => {
  it('cobra el costo de la zona elegida (sin importar mayúsculas)', () => {
    const r = resolveCatalogDelivery(
      { deliveryType: 'HOME_DELIVERY', deliveryZone: 'san félix' },
      settings(),
      10
    );
    expect(r.deliveryZone).toBe('San Félix');
    expect(r.deliveryFee?.toFixed(2)).toBe('4.00');
  });

  it('el envío es gratis desde el mínimo del comercio', () => {
    const r = resolveCatalogDelivery(
      { deliveryType: 'HOME_DELIVERY', deliveryZone: 'El Triunfo' },
      settings({ freeDeliveryMinimum: new Prisma.Decimal(20) }),
      25
    );
    expect(r.deliveryFee?.toFixed(2)).toBe('0.00');
  });

  it('exige una zona válida si el comercio las definió', () => {
    expect(() =>
      resolveCatalogDelivery({ deliveryType: 'HOME_DELIVERY' }, settings(), 10)
    ).toThrow(BadRequestException);
    expect(() =>
      resolveCatalogDelivery(
        { deliveryType: 'HOME_DELIVERY', deliveryZone: 'Maturín' },
        settings(),
        10
      )
    ).toThrow('Elige una zona de entrega');
  });

  it('retiro: sin costo, y rechazado si el comercio no lo ofrece', () => {
    expect(
      resolveCatalogDelivery({ deliveryType: 'PICKUP' }, settings(), 10)
    ).toEqual({ deliveryZone: null, deliveryFee: null });
    expect(() =>
      resolveCatalogDelivery(
        { deliveryType: 'PICKUP' },
        settings({ pickupEnabled: false }),
        10
      )
    ).toThrow('no ofrece retiro');
  });

  it('sin zonas definidas se comporta como antes (costo por el chat)', () => {
    expect(
      resolveCatalogDelivery(
        { deliveryType: 'HOME_DELIVERY' },
        settings({ deliveryZones: [] }),
        10
      )
    ).toEqual({ deliveryZone: null, deliveryFee: null });
  });
});
