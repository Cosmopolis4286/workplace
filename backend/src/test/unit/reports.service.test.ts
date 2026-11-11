import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { ReportsService } from '../../domains/engagement/reports/reports.service';

describe('ReportsService — productos y comercios', () => {
  let prisma: any;
  let notifications: any;
  let service: ReportsService;

  beforeEach(() => {
    prisma = {
      product: {
        findUnique: jest.fn().mockResolvedValue({ commerceId: 'commerce-1' }),
      },
      commerce: {
        findUnique: jest.fn().mockResolvedValue({ userId: 'owner-1' }),
      },
      report: {
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest
          .fn()
          .mockImplementation(({ data }) => ({ id: 'report-1', ...data })),
      },
    };
    notifications = { notifyReportFiled: jest.fn().mockResolvedValue(null) };
    service = new ReportsService(prisma, notifications, {} as any);
  });

  it('cualquier usuario puede reportar un producto publicado', async () => {
    const report = await service.create('buyer-1', {
      entityType: 'PRODUCT',
      entityId: 'product-1',
      reason: 'Producto falso',
    });
    expect(report.entityType).toBe('PRODUCT');
    expect(notifications.notifyReportFiled).toHaveBeenCalledWith(
      'PRODUCT',
      'Producto falso'
    );
  });

  it('cualquier usuario puede reportar un comercio', async () => {
    await service.create('buyer-1', {
      entityType: 'COMMERCE',
      entityId: 'commerce-1',
      reason: 'Estafa',
    });
    expect(prisma.commerce.findUnique).toHaveBeenCalledWith({
      where: { id: 'commerce-1' },
      select: { userId: true },
    });
    expect(prisma.report.create).toHaveBeenCalled();
  });

  it('el dueño no puede reportar su propio comercio ni sus productos', async () => {
    await expect(
      service.create('owner-1', {
        entityType: 'PRODUCT',
        entityId: 'product-1',
        reason: 'Prueba',
      })
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.report.create).not.toHaveBeenCalled();
  });

  it('404 si el producto no existe', async () => {
    prisma.product.findUnique.mockResolvedValue(null);
    await expect(
      service.create('buyer-1', {
        entityType: 'PRODUCT',
        entityId: 'missing',
        reason: 'Producto falso',
      })
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('no duplica el reporte si el mismo usuario ya tiene uno abierto', async () => {
    prisma.report.findFirst.mockResolvedValue({ id: 'open-1' });
    const report = await service.create('buyer-1', {
      entityType: 'COMMERCE',
      entityId: 'commerce-1',
      reason: 'Estafa',
    });
    expect(report).toEqual({ id: 'open-1' });
    expect(prisma.report.create).not.toHaveBeenCalled();
    expect(notifications.notifyReportFiled).not.toHaveBeenCalled();
  });
});
