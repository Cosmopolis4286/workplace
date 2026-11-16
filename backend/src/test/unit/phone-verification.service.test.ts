import axios from 'axios';
import { BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PhoneVerificationService } from '../../domains/identity-access/auth/phone-verification.service';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../redis/redis.service';

jest.mock('axios');

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
    get: jest.fn((key: string) => {
      const values: Record<string, string> = {
        MESSANGI_SMS_ENABLED: 'true',
        MESSANGI_API_KEY: 'test-api-key',
        MESSANGI_SMS_FROM: 'WORKPLACE',
        PHONE_OTP_SECRET: 'test-secret-with-at-least-thirty-two-characters',
      };
      return values[key];
    }),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    challenge = null;
    (axios.post as jest.Mock).mockResolvedValue({ status: 202 });
    service = new PhoneVerificationService(
      prisma as unknown as PrismaService,
      redis as unknown as RedisService,
      config as unknown as ConfigService
    );
  });

  it('sends a code through Messangi and stores only its digest', async () => {
    const result = await service.sendCode('user-1', '0412 123 4567');

    expect(result).toEqual({
      message: 'Código enviado',
      expiresInSeconds: 300,
      destination: '+58412******67',
    });
    expect(axios.post).toHaveBeenCalledWith(
      'https://elastic.messangi.me/raven/v3/messages',
      expect.objectContaining({
        from: 'WORKPLACE',
        to: '+584121234567',
        type: 'MT',
      }),
      expect.objectContaining({
        headers: { Authorization: 'Bearer test-api-key', Accept: 'application/json', 'Content-Type': 'application/json' },
      })
    );
    expect(challenge).not.toContain(
      (axios.post as jest.Mock).mock.calls[0][1].text.match(/\d{6}/)?.[0]
    );
  });

  it('marks the phone verified only after a valid code', async () => {
    await service.sendCode('user-1', '+584121234567');
    const text = (axios.post as jest.Mock).mock.calls[0][1].text as string;
    const code = text.match(/\d{6}/)?.[0];
    expect(code).toBeDefined();

    await expect(service.verifyCode('user-1', code!)).resolves.toEqual({
      verified: true,
      phone: '+58412******67',
    });
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      data: { phone: '+584121234567', phoneVerifiedAt: expect.any(Date) },
    });
  });

  it('rejects malformed codes without updating the user', async () => {
    await expect(service.verifyCode('user-1', '123')).rejects.toBeInstanceOf(
      BadRequestException
    );
    expect(prisma.user.update).not.toHaveBeenCalled();
  });
});
