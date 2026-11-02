const sendEachForMulticast = jest.fn();
jest.mock('firebase-admin/app', () => ({
  initializeApp: jest.fn(() => ({ name: 'workplace-push' })),
  getApps: jest.fn(() => []),
  cert: jest.fn((c) => c),
}));
jest.mock('firebase-admin/messaging', () => ({
  getMessaging: jest.fn(() => ({ sendEachForMulticast })),
}));

import { PushService } from './push.service';

describe('PushService', () => {
  const ENV = { ...process.env };
  let prisma: any;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...ENV };
    delete process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
    delete process.env.FIREBASE_PROJECT_ID;
    delete process.env.FIREBASE_CLIENT_EMAIL;
    delete process.env.FIREBASE_PRIVATE_KEY;
    prisma = {
      deviceToken: {
        findMany: jest
          .fn()
          .mockResolvedValue([{ token: 'tok-ok' }, { token: 'tok-dead' }]),
        deleteMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
    };
  });

  afterAll(() => {
    process.env = ENV;
  });

  const withCredentials = () => {
    process.env.FIREBASE_PROJECT_ID = 'wp';
    process.env.FIREBASE_CLIENT_EMAIL = 'push@wp.iam.gserviceaccount.com';
    process.env.FIREBASE_PRIVATE_KEY = '-----BEGIN PRIVATE KEY-----\\nabc';
  };

  it('sin credenciales Firebase no hace nada (desarrollo y tests)', async () => {
    const push = new PushService(prisma);
    await push.sendToUser('u1', { title: 't', message: 'm' });
    expect(push.enabled).toBe(false);
    expect(prisma.deviceToken.findMany).not.toHaveBeenCalled();
    expect(sendEachForMulticast).not.toHaveBeenCalled();
  });

  it('envía a todos los dispositivos del usuario con el link para abrir la pantalla', async () => {
    withCredentials();
    sendEachForMulticast.mockResolvedValue({
      responses: [{ success: true }, { success: true }],
    });
    const push = new PushService(prisma);

    await push.sendToUser('u1', {
      title: 'Nueva solicitud',
      message: 'Ana solicitó Plomería',
      link: '/service-requests',
      type: 'ORDER',
    });

    expect(sendEachForMulticast).toHaveBeenCalledWith(
      expect.objectContaining({
        tokens: ['tok-ok', 'tok-dead'],
        notification: {
          title: 'Nueva solicitud',
          body: 'Ana solicitó Plomería',
        },
        data: { link: '/service-requests', type: 'ORDER' },
      })
    );
    expect(prisma.deviceToken.deleteMany).not.toHaveBeenCalled();
  });

  it('borra los tokens que FCM ya no acepta', async () => {
    withCredentials();
    sendEachForMulticast.mockResolvedValue({
      responses: [
        { success: true },
        {
          success: false,
          error: { code: 'messaging/registration-token-not-registered' },
        },
      ],
    });
    const push = new PushService(prisma);

    await push.sendToUser('u1', { title: 't', message: 'm' });

    expect(prisma.deviceToken.deleteMany).toHaveBeenCalledWith({
      where: { token: { in: ['tok-dead'] } },
    });
  });

  it('acepta el JSON completo de la cuenta de servicio', async () => {
    process.env.FIREBASE_SERVICE_ACCOUNT_JSON = JSON.stringify({
      project_id: 'wp',
      client_email: 'push@wp.iam.gserviceaccount.com',
      private_key: 'k',
    });
    expect(new PushService(prisma).enabled).toBe(true);
  });

  it('un fallo de FCM no rompe la operación que notifica', async () => {
    withCredentials();
    sendEachForMulticast.mockRejectedValue(new Error('network'));
    const push = new PushService(prisma);
    await expect(
      push.sendToUser('u1', { title: 't', message: 'm' })
    ).resolves.toBeUndefined();
  });
});
