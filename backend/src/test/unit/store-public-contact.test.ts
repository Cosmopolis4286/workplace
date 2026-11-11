import { BadRequestException } from '@nestjs/common';
import { CatalogService } from '../../domains/commerce-core/catalog/catalog.service';
import { PlatformSettingsService } from '../../domains/platform/platform-settings/platform-settings.service';

function store(overrides: Partial<any> = {}) {
  return {
    id: 'c1',
    userId: 'owner',
    name: 'Panadería',
    isPublic: true,
    phone: '02121234567',
    email: 'tienda@x.com',
    socialLinks: { whatsapp: '0414', instagram: 'pan' },
    showPublicContact: true,
    user: {
      avatar: null,
      coverImage: null,
      username: null,
      freelancerSettings: null,
    },
    _count: { products: 3 },
    ...overrides,
  };
}

describe('Contacto público de la tienda', () => {
  let prisma: any;
  let service: CatalogService;

  beforeEach(() => {
    prisma = {
      commerce: { findUnique: jest.fn().mockResolvedValue(store()) },
      platformSetting: { findUnique: jest.fn().mockResolvedValue(null) },
      catalogOrder: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'o1',
            buyerName: 'Ana',
            buyerPhone: '0414',
            buyerEmail: 'a@x.com',
            address: 'Calle 1',
          },
        ]),
        count: jest.fn().mockResolvedValue(1),
      },
    };
    service = new CatalogService(prisma, {} as any, {} as any, {} as any);
  });

  it('visible por defecto (admin y comercio lo permiten)', async () => {
    const { data }: any = await service.getStoreBySlug('pan');
    expect(data.phone).toBe('02121234567');
    expect(data.socialLinks.whatsapp).toBe('0414');
  });

  it('el comercio lo oculta: sin teléfono, correo ni WhatsApp (las demás redes quedan)', async () => {
    prisma.commerce.findUnique.mockResolvedValue(
      store({ showPublicContact: false })
    );
    const { data }: any = await service.getStoreBySlug('pan');
    expect(data).toMatchObject({ phone: null, email: null });
    expect(data.socialLinks).toEqual({ instagram: 'pan' });
  });

  it('el admin lo apaga para todas las tiendas aunque el comercio lo tenga activo', async () => {
    prisma.platformSetting.findUnique.mockResolvedValue({ value: false });
    const { data }: any = await service.getStoreBySlug('pan');
    expect(data.phone).toBeNull();
  });

  it('el comercio no recibe el teléfono ni el correo del comprador; sí la dirección', async () => {
    const { data }: any = await service.getOrdersForCommerce('c1');
    expect(data[0]).toMatchObject({
      buyerPhone: null,
      buyerEmail: null,
      address: 'Calle 1',
      contactHidden: true,
    });
  });
});

describe('PlatformSettingsService', () => {
  let prisma: any;
  let service: PlatformSettingsService;

  beforeEach(() => {
    prisma = {
      platformSetting: {
        findMany: jest.fn().mockResolvedValue([]),
        upsert: jest.fn().mockResolvedValue({}),
      },
    };
    service = new PlatformSettingsService(prisma);
  });

  it('devuelve los valores por defecto si no hay nada guardado', async () => {
    expect(await service.getAll()).toEqual({ 'store.publicContact': true });
  });

  it('solo acepta claves conocidas con su tipo', async () => {
    await expect(
      service.set('otra.cosa', true, 'admin')
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      service.set('store.publicContact', 'no', 'admin')
    ).rejects.toBeInstanceOf(BadRequestException);
    await service.set('store.publicContact', false, 'admin');
    expect(prisma.platformSetting.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ where: { key: 'store.publicContact' } })
    );
  });
});
