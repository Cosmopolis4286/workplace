import axios from 'axios';
import { ConfigService } from '@nestjs/config';
import { MessangiSmsProvider } from '../../domains/identity-access/auth/messangi-sms.provider';

jest.mock('axios');

describe('MessangiSmsProvider', () => {
  const config = {
    get: jest.fn((key: string) => {
      const values: Record<string, string> = {
        MESSANGI_SMS_ENABLED: 'true',
        MESSANGI_API_KEY: 'test-api-key',
        MESSANGI_SMS_FROM: 'WORKPLACE',
      };
      return values[key];
    }),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (axios.post as jest.Mock).mockResolvedValue({ status: 202 });
  });

  it('sends SMS using the documented Messangi REST contract', async () => {
    const provider = new MessangiSmsProvider(
      config as unknown as ConfigService
    );

    await provider.send({
      to: '+584121234567',
      text: 'Tu codigo WorkPlace: 123456.',
      externalId: 'wp-phone-user-1',
      clientId: 'user-1',
    });

    expect(axios.post).toHaveBeenCalledWith(
      'https://elastic.messangi.me/raven/v3/messages',
      {
        from: 'WORKPLACE',
        text: 'Tu codigo WorkPlace: 123456.',
        to: '+584121234567',
        type: 'MT',
        requestDR: true,
        externalId: 'wp-phone-user-1',
        clientId: 'user-1',
      },
      expect.objectContaining({
        timeout: 10_000,
        headers: {
          Authorization: 'Bearer test-api-key',
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
      })
    );
  });

  it('refuses to send when the integration is disabled', async () => {
    config.get.mockImplementation((key: string) =>
      key === 'MESSANGI_SMS_ENABLED' ? 'false' : 'test-value'
    );
    const provider = new MessangiSmsProvider(
      config as unknown as ConfigService
    );

    await expect(
      provider.send({
        to: '+584121234567',
        text: 'test',
        externalId: 'test',
        clientId: 'user-1',
      })
    ).rejects.toThrow('El proveedor de SMS no está habilitado');
    expect(axios.post).not.toHaveBeenCalled();
  });
});
