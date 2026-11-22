import { TelegramService } from '../../domains/engagement/telegram/telegram.service';

describe('TelegramService — vinculación por enlace', () => {
  let store: Map<string, string>;
  let redis: any;
  let prisma: any;
  let service: TelegramService;

  beforeEach(() => {
    store = new Map();
    redis = {
      setex: jest.fn(async (k: string, _ttl: number, v: string) => {
        store.set(k, v);
      }),
      get: jest.fn(async (k: string) => store.get(k) ?? null),
      del: jest.fn(async (k: string) => {
        store.delete(k);
      }),
    };
    prisma = {
      user: {
        findUnique: jest.fn().mockResolvedValue({ firstName: 'Ana' }),
        update: jest.fn().mockResolvedValue({}),
        updateMany: jest.fn().mockResolvedValue({ count: 0 }),
      },
      customer: { findFirst: jest.fn(), update: jest.fn() },
    };
    const config = { get: jest.fn().mockReturnValue('') } as any;
    service = new TelegramService(config, prisma, redis);
  });

  it('el token cabe en ?start= de Telegram (≤ 64, solo [A-Za-z0-9_-])', async () => {
    const token = await service.generateUserLinkToken('user-1');
    expect(token.length).toBeLessThanOrEqual(64);
    expect(token).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  it('vincula el chat a la cuenta y el enlace es de un solo uso', async () => {
    const token = await service.generateUserLinkToken('user-1');

    const reply = await service.processStart('555', token);
    expect(reply).toContain('Ana');
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      data: { telegramChatId: '555' },
    });

    expect(await service.processStart('555', token)).toContain(
      'venció o ya se usó'
    );
  });

  it('rechaza un payload con formato inválido sin tocar la base', async () => {
    expect(await service.processStart('555', 'eyJ.hola.mundo')).toContain(
      'inválido'
    );
    expect(redis.get).not.toHaveBeenCalled();
  });
});
