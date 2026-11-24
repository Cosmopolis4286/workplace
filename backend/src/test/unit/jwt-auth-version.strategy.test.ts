import { JwtStrategy } from '../../domains/identity-access/auth/strategies/jwt.strategy';
import { JwtRefreshStrategy } from '../../domains/identity-access/auth/strategies/jwt-refresh.strategy';

describe('JWT authentication version', () => {
  const config = { get: jest.fn(() => 'test-secret') };

  it('rejects an access token issued before the account authVersion changed', async () => {
    const usersService = { findById: jest.fn() };
    const redis = { isTokenBlacklisted: jest.fn().mockResolvedValue(false) };
    const prisma = {
      user: {
        findUnique: jest.fn().mockResolvedValue({
          isActive: true,
          authVersion: 2,
        }),
      },
    };
    const strategy = new JwtStrategy(
      config as any,
      usersService as any,
      redis as any,
      prisma as any
    );

    await expect(
      strategy.validate(
        {},
        {
          sub: 'user-1',
          email: 'user@example.com',
          jti: 'jti-1234567890123456',
          ver: 1,
        }
      )
    ).rejects.toThrow('Token revocado');
    expect(usersService.findById).not.toHaveBeenCalled();
  });

  it('rejects a refresh token issued before the account authVersion changed', async () => {
    const prisma = {
      user: {
        findUnique: jest.fn().mockResolvedValue({
          isActive: true,
          authVersion: 2,
        }),
      },
    };
    const strategy = new JwtRefreshStrategy(config as any, prisma as any);

    await expect(
      strategy.validate({ body: { refreshToken: 'refresh-token' } } as any, {
        sub: 'user-1',
        jti: 'jti-1234567890123456',
        ver: 1,
      })
    ).rejects.toThrow('Refresh token revocado');
  });

  it('rejects an access token when its refresh-token row was revoked', async () => {
    const usersService = { findById: jest.fn() };
    const redis = { isTokenBlacklisted: jest.fn().mockResolvedValue(false) };
    const prisma = {
      user: {
        findUnique: jest.fn().mockResolvedValue({
          isActive: true,
          authVersion: 0,
          refreshTokens: [],
        }),
      },
    };
    const strategy = new JwtStrategy(
      config as any,
      usersService as any,
      redis as any,
      prisma as any
    );

    await expect(
      strategy.validate(
        {},
        {
          sub: 'user-1',
          email: 'user@example.com',
          jti: 'jti-1234567890123456',
          ver: 0,
        }
      )
    ).rejects.toThrow('ya no está activa');
  });

  it('accepts legacy JWTs only while the account remains at version zero', async () => {
    const usersService = {
      findById: jest.fn().mockResolvedValue({ id: 'user-1', isActive: true }),
    };
    const redis = { isTokenBlacklisted: jest.fn().mockResolvedValue(false) };
    const prisma = {
      user: {
        findUnique: jest.fn().mockResolvedValue({
          isActive: true,
          authVersion: 0,
          refreshTokens: [{ id: 'refresh-1' }],
        }),
      },
    };
    const strategy = new JwtStrategy(
      config as any,
      usersService as any,
      redis as any,
      prisma as any
    );

    await expect(
      strategy.validate(
        {},
        {
          sub: 'user-1',
          email: 'user@example.com',
          jti: 'jti-1234567890123456',
        }
      )
    ).resolves.toMatchObject({ id: 'user-1' });
  });
});
