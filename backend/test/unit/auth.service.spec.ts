import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from '../../src/auth/auth.service';
import { UsersService } from '../../src/users/users.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../src/prisma/prisma.service';
import { RedisService } from '../../src/redis/redis.service';
import { MailService } from '../../src/mail/mail.service';
import { UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { Role } from '@prisma/client';

describe('AuthService', () => {
  let service: AuthService;
  let mockUsersService: Partial<UsersService>;
  let mockJwtService: Partial<JwtService>;
  let mockConfigService: Partial<ConfigService>;
  let mockPrismaService: Partial<PrismaService>;
  let mockRedisService: Partial<RedisService>;
  let mockMailService: Partial<MailService>;

  beforeEach(async () => {
    mockUsersService = {
      create: jest.fn(),
      findByEmail: jest.fn(),
      findById: jest.fn(),
      validatePassword: jest.fn(),
    };

    mockJwtService = {
      sign: jest.fn().mockReturnValue('mock-token'),
    };

    mockConfigService = {
      get: jest.fn().mockImplementation((key: string, defaultValue?: any) => {
        const configs: Record<string, any> = {
          JWT_SECRET: 'test-secret',
          JWT_EXPIRES_IN: '15m',
          JWT_REFRESH_SECRET: 'refresh-secret',
          JWT_REFRESH_EXPIRES_IN: '7d',
        };
        return configs[key] ?? defaultValue;
      }),
    };

    mockPrismaService = {
      refreshToken: {
        create: jest.fn().mockResolvedValue({}),
        findUnique: jest.fn(),
        delete: jest.fn().mockResolvedValue({}),
        deleteMany: jest.fn().mockResolvedValue({ count: 1 }),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      } as any,
      $transaction: jest.fn().mockImplementation((ops) => Promise.all(ops)),
    };

    mockRedisService = {
      getLoginAttempts: jest.fn().mockResolvedValue(0),
      incrementLoginAttempts: jest.fn().mockResolvedValue(1),
      resetLoginAttempts: jest.fn().mockResolvedValue(true),
    };

    mockMailService = {
      sendEmailVerification: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: mockUsersService },
        { provide: JwtService, useValue: mockJwtService },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: RedisService, useValue: mockRedisService },
        { provide: MailService, useValue: mockMailService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  describe('login', () => {
    it('should successfully login with valid credentials', async () => {
      const mockUser = {
        id: 'user-id',
        email: 'test@example.com',
        role: Role.COMMERCE,
        password: 'hashed-password',
      };

      mockUsersService.findByEmail = jest.fn().mockResolvedValue(mockUser);
      mockUsersService.validatePassword = jest.fn().mockResolvedValue(true);

      const result = await service.login({
        email: 'test@example.com',
        password: 'password123',
      });

      expect(result).toHaveProperty('user');
      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      if (!('user' in result)) throw new Error('expected user in result');
      expect(result.user).not.toHaveProperty('password');
      expect(mockRedisService.resetLoginAttempts).toHaveBeenCalledWith('test@example.com');
    });

    it('should throw UnauthorizedException when user not found', async () => {
      mockUsersService.findByEmail = jest.fn().mockResolvedValue(null);

      await expect(
        service.login({ email: 'nonexistent@example.com', password: 'password' })
      ).rejects.toThrow(UnauthorizedException);

      expect(mockRedisService.incrementLoginAttempts).toHaveBeenCalled();
    });

    it('should throw UnauthorizedException when password is invalid', async () => {
      const mockUser = {
        id: 'user-id',
        email: 'test@example.com',
        role: Role.COMMERCE,
        password: 'hashed-password',
      };

      mockUsersService.findByEmail = jest.fn().mockResolvedValue(mockUser);
      mockUsersService.validatePassword = jest.fn().mockResolvedValue(false);

      await expect(
        service.login({ email: 'test@example.com', password: 'wrongpassword' })
      ).rejects.toThrow(UnauthorizedException);

      expect(mockRedisService.incrementLoginAttempts).toHaveBeenCalled();
    });

    it('should throw ForbiddenException after max login attempts', async () => {
      mockRedisService.getLoginAttempts = jest.fn().mockResolvedValue(5);

      await expect(
        service.login({ email: 'test@example.com', password: 'password' })
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('register', () => {
    it('should successfully register a new user', async () => {
      const mockUser = {
        id: 'new-user-id',
        email: 'new@example.com',
        role: Role.COMMERCE,
      };

      mockUsersService.create = jest.fn().mockResolvedValue(mockUser);

      const result = await service.register({
        email: 'new@example.com',
        password: 'password123',
        firstName: 'John',
        lastName: 'Doe',
      } as any);

      expect(result).toHaveProperty('user');
      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(mockUsersService.create).toHaveBeenCalled();
      expect(mockPrismaService.refreshToken.create).toHaveBeenCalled();
    });
  });

  describe('refreshTokens', () => {
    it('should successfully refresh tokens with valid refresh token', async () => {
      const mockStoredToken = {
        id: 'token-id',
        token: 'valid-refresh-token',
        userId: 'user-id',
        expiresAt: new Date(Date.now() + 10000),
      };

      const mockUser = {
        id: 'user-id',
        email: 'test@example.com',
        role: Role.COMMERCE,
      };

      mockPrismaService.refreshToken.findUnique = jest.fn().mockResolvedValue(mockStoredToken);
      mockUsersService.findById = jest.fn().mockResolvedValue(mockUser);

      const result = await service.refreshTokens('user-id', 'valid-refresh-token');

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(mockPrismaService.refreshToken.delete).toHaveBeenCalledWith({
        where: { id: 'token-id' },
      });
    });

    it('should throw ForbiddenException when refresh token is invalid', async () => {
      mockPrismaService.refreshToken.findUnique = jest.fn().mockResolvedValue(null);

      await expect(
        service.refreshTokens('user-id', 'invalid-token')
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw ForbiddenException when refresh token is expired', async () => {
      const mockStoredToken = {
        id: 'token-id',
        token: 'expired-token',
        userId: 'user-id',
        expiresAt: new Date(Date.now() - 10000),
      };

      mockPrismaService.refreshToken.findUnique = jest.fn().mockResolvedValue(mockStoredToken);

      await expect(
        service.refreshTokens('user-id', 'expired-token')
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('logout', () => {
    it('should revoke specific refresh token when provided', async () => {
      await service.logout('user-id', 'specific-refresh-token');

      expect(mockPrismaService.refreshToken.updateMany).toHaveBeenCalledTimes(2);
    });

    it('should revoke all refresh tokens for user', async () => {
      await service.logout('user-id');

      expect(mockPrismaService.refreshToken.updateMany).toHaveBeenCalledWith({
        where: { userId: 'user-id', revokedAt: null },
        data: { revokedAt: expect.any(Date) },
      });
    });
  });

  describe('getProfile', () => {
    it('should return user profile', async () => {
      const mockUser = {
        id: 'user-id',
        email: 'test@example.com',
        role: Role.COMMERCE,
      };

      mockUsersService.findById = jest.fn().mockResolvedValue(mockUser);

      const result = await service.getProfile('user-id');

      expect(result).toEqual(mockUser);
      expect(mockUsersService.findById).toHaveBeenCalledWith('user-id');
    });
  });
});
