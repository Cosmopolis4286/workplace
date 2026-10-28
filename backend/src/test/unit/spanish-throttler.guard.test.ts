import { JwtService } from '@nestjs/jwt';
import { Reflector } from '@nestjs/core';
import { SpanishThrottlerGuard } from '../../common/guards/spanish-throttler.guard';

const SECRET = 'test-secret-at-least-16-chars';

describe('SpanishThrottlerGuard.getTracker', () => {
  const jwt = new JwtService();
  const config = { get: jest.fn().mockReturnValue(SECRET) } as any;
  const guard = new SpanishThrottlerGuard(
    [{ ttl: 60000, limit: 300 }] as any,
    {} as any,
    new Reflector(),
    {} as any,
    config
  );
  const track = (req: Record<string, any>) => (guard as any).getTracker(req);

  it('cuenta por usuario con un access token válido en el header', async () => {
    const token = jwt.sign({ sub: 'user-1' }, { secret: SECRET });
    await expect(
      track({ ip: '10.0.0.1', headers: { authorization: `Bearer ${token}` } })
    ).resolves.toBe('user:user-1');
  });

  it('cuenta por usuario con el token en la cookie access_token', async () => {
    const token = jwt.sign({ sub: 'user-2' }, { secret: SECRET });
    await expect(
      track({ ip: '10.0.0.1', headers: {}, cookies: { access_token: token } })
    ).resolves.toBe('user:user-2');
  });

  it('cuenta por IP sin token', async () => {
    await expect(track({ ip: '10.0.0.1', headers: {} })).resolves.toBe(
      'ip:10.0.0.1'
    );
  });

  it('cuenta por IP si el token está firmado con otro secreto', async () => {
    const forged = jwt.sign(
      { sub: 'otro' },
      { secret: 'otro-secreto-cualquiera' }
    );
    await expect(
      track({ ip: '10.0.0.1', headers: { authorization: `Bearer ${forged}` } })
    ).resolves.toBe('ip:10.0.0.1');
  });

  it('cuenta por IP si el token expiró', async () => {
    const expired = jwt.sign(
      { sub: 'user-3', exp: Math.floor(Date.now() / 1000) - 60 },
      { secret: SECRET }
    );
    await expect(
      track({ ip: '10.0.0.1', headers: { authorization: `Bearer ${expired}` } })
    ).resolves.toBe('ip:10.0.0.1');
  });
});
