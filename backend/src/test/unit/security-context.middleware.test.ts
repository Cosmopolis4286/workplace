import { SecurityContextMiddleware } from '../../common/middleware/security-context.middleware';

describe('SecurityContextMiddleware', () => {
  const middleware = new SecurityContextMiddleware();

  it('uses Express req.ip instead of untrusted forwarding headers', () => {
    const req: any = {
      ip: '203.0.113.10',
      socket: { remoteAddress: '127.0.0.1' },
      headers: {
        'x-forwarded-for': '198.51.100.99',
        'x-real-ip': '198.51.100.88',
        'user-agent': 'WorkPlace Mobile',
      },
    };
    const next = jest.fn();

    middleware.use(req, {} as any, next);

    expect(req.securityContext.ipAddress).toBe('203.0.113.10');
    expect(next).toHaveBeenCalledTimes(1);
  });

  it('keeps the device fingerprint stable when a mobile IP changes', () => {
    const makeRequest = (ip: string) => ({
      ip,
      socket: { remoteAddress: ip },
      headers: { 'user-agent': 'WorkPlace Mobile' },
    });

    const first: any = makeRequest('203.0.113.10');
    const second: any = makeRequest('198.51.100.10');

    middleware.use(first, {} as any, jest.fn());
    middleware.use(second, {} as any, jest.fn());

    expect(first.securityContext.deviceFingerprint).toBe(
      second.securityContext.deviceFingerprint
    );
    expect(first.securityContext.ipAddress).not.toBe(
      second.securityContext.ipAddress
    );
  });

  it('does not decode or inspect an unverified bearer token', () => {
    const req: any = {
      ip: '203.0.113.10',
      socket: { remoteAddress: '127.0.0.1' },
      headers: {
        authorization: 'Bearer not.a.valid.jwt',
        'user-agent': 'WorkPlace Web',
      },
    };
    const next = jest.fn();

    expect(() => middleware.use(req, {} as any, next)).not.toThrow();
    expect(next).toHaveBeenCalledTimes(1);
  });
});
