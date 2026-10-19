import { ConflictException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { ReceiptsService } from '../../domains/operations/receipts/receipts.service';

describe('ReceiptsService.create', () => {
  const prisma = {
    order: { findFirst: jest.fn() },
    commerce: { findUnique: jest.fn() },
    receipt: { count: jest.fn(), create: jest.fn() },
  };
  const i18n = { t: jest.fn((key: string) => key) };
  const service = new ReceiptsService(prisma as any, i18n as any);
  const p2002 = (target: string[]) =>
    new Prisma.PrismaClientKnownRequestError('dup', {
      code: 'P2002',
      clientVersion: 'test',
      meta: { target },
    });

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.order.findFirst.mockResolvedValue({ id: 'o1', receipt: null });
    prisma.commerce.findUnique.mockResolvedValue({ name: 'Comercio' });
    prisma.receipt.count.mockResolvedValue(0);
  });

  it('numera por comercio y reintenta si el número ya está tomado', async () => {
    prisma.receipt.create
      .mockRejectedValueOnce(p2002(['commerceId', 'receiptNumber']))
      .mockResolvedValueOnce({ id: 'r1' });

    await service.create('c1', 'o1');

    const numbers = prisma.receipt.create.mock.calls.map(
      (c: any[]) => c[0].data.receiptNumber
    );
    expect(numbers).toEqual([
      expect.stringMatching(/-00001$/),
      expect.stringMatching(/-00002$/),
    ]);
  });

  it('si el choque es por orderId, el comprobante ya fue emitido (409)', async () => {
    prisma.receipt.create.mockRejectedValueOnce(p2002(['orderId']));

    await expect(service.create('c1', 'o1')).rejects.toThrow(ConflictException);
    expect(prisma.receipt.create).toHaveBeenCalledTimes(1);
  });
});
