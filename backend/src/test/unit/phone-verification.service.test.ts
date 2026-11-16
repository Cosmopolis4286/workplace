import { BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  PhoneVerificationService,
} from '../../domains/identity-access/auth/phone-verification.service';
import {
  MessangiSmsProvider,
} from '../../domains/identity-access/auth/messangi-sms.provider';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../redis/redis.service';

describe('PhoneVerificationService', () => {
  let service: PhoneVerificationService;
  let challenge: string | null;

  const prisma = {
    user: {
      findFirst: jest.fn().mockResolvedValue(null),
      update: jest.fn().mockResolvedValue({}),
    },
  };

  const redis = {
    incrWithExpire: jest.fn().mockResolvedValue(1),
    setex: jest.fn().mockImplementation(async (_key, _ttl, value) => {
      challenge = value;
    }),
    get: jest.fn().mockImplementation(async () => challenge),
    del: jest.fn().mockImplementation(async (key: string) => {
      if (key.includes(':challenge:')) challenge = null;
    }),
  };

  const config = {
    get: jest.fn(() => 'test-secret-with-at-least-thirty-two-characters'),
  };

  const smsProvider = {
    send: jest.fn(
      async (_message: {
        to: string;
        text: string;
        externalId: string;
        clientId: string;
      }) => undefined
    ),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    challenge = null;
    service = new PhoneVerificationService(
      prisma as unknown as PrismaService,
      redis as unknown as RedisService,
      config as unknown as ConfigService,
      smsProvider as unknown as MessangiSmsProvider
    );
  });

  it('sends OTP and stores only its digest', async () => {
    const result = await service.sendCode('user-1', '0412 123 4567');

    expect(result).toEqual({
      message: 'Código enviado',
      expiresInSeconds: 300,
      destination: '+58412******67',
    });
    expect(smsProvider.send).toHaveBeenCalledWith(
      expect.objectContaining({
        to: '+584121234567',
        externalId: 'wp-phone-user-1',
        clientId: 'user-1',
        text: expect.stringMatching(/^Tu codigo WorkPlace: \\d{6}\\./),
      })
    );

    const sentCode =
      smsProvider.send.mock.calls[0][0].text.match(/\\d{6}/)?.[0];
    expect(challenge).not.toContain(sentCode);
  });

  it('marks the phone verified only after a valid code', async () => {
    await service.sendCode('user-1', '+584121234567');
    const text = smsProvider.send.mock.calls[0][0].text as string;
    const code = text.match(/\\d{6}/)?.[0];
    expect(code).toBeDefined();

    await expect(service.verifyCode('user-1', code!)).resolves.toEqual({
      verified: true,
      phone: '+58412******67',
    });
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      data: {
        phone: '+584121234567',
        phoneVerifiedAt: expect.any(Date),
      },
    });
  });

  it('rejects malformed codes without updating the user', async () => {
    await expect(service.verifyCode('user-1', '123')).rejects.toBeInstanceOf(
      BadRequestException
    );
    expect(prisma.user.update).not.toHaveBeenCalled();
  });
});
