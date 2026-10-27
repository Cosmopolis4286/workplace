import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Sex } from '@prisma/client';
import { I18nService } from 'nestjs-i18n';
import { AuthService } from '../../domains/identity-access/auth/auth.service';
import { PrismaService } from '../../prisma/prisma.service';
import { UsersService } from '../../domains/identity-access/users/users.service';
import { RedisService } from '../../redis/redis.service';
import { MailService } from '../../domains/engagement/mail/mail.service';
import { AuditService } from '../../domains/identity-access/audit/audit.service';
import { TwoFactorService } from '../../domains/identity-access/auth/two-factor.service';
import { RecaptchaService } from '../../common/recaptcha/recaptcha.service';
import { AccountTypeResolver } from '../../common/account-type/account-type.resolver';

describe('AuthService', () => {
  let service: AuthService;

  const mockPrismaService = {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    refreshToken: {
      create: jest.fn(),
      findUnique: jest.fn(),
      updateMany: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  const mockJwtService = {
    sign: jest.fn(),
    verify: jest.fn(),
  };

  const mockUsersService = {
    create: jest.fn(),
    findByEmail: jest.fn(),
    validatePassword: jest.fn(),
  };

  const mockRedisService = {
    getLoginAttempts: jest.fn(),
    setLoginAttempts: jest.fn(),
    resetLoginAttempts: jest.fn(),
    saveRefreshToken: jest.fn(),
  };

  const mockMailService = {
    sendPasswordResetEmail: jest.fn(),
    sendVerificationEmail: jest.fn(),
  };

  const mockAuditService = {
    log: jest.fn(),
  };

  const mockI18nService = {
    t: jest.fn((key: string) => key),
  };

  const mockTwoFactorService = {
    generateSecret: jest.fn(),
    verifyToken: jest.fn(),
  };

  const mockRecaptchaService = {
    isEnabled: false,
    verify: jest.fn().mockResolvedValue(true),
  };

  const mockAccountTypeResolver = {
    resolve: jest.fn().mockResolvedValue(null),
    isFreelancer: jest.fn().mockReturnValue(false),
    isCommerce: jest.fn().mockReturnValue(false),
  };

  const mockConfigService = {
    get: jest.fn((key: string) => {
      switch (key) {
        case 'JWT_REFRESH_EXPIRES_IN':
          return '7d';
        default:
          return undefined;
      }
    }),
    getOrThrow: jest.fn((key: string) => {
      switch (key) {
        case 'JWT_REFRESH_EXPIRES_IN':
          return '7d';
        case 'JWT_SECRET':
        case 'JWT_REFRESH_SECRET':
          return 'test-secret';
        default:
          return 'test-secret';
      }
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
        {
          provide: UsersService,
          useValue: mockUsersService,
        },
        {
          provide: RedisService,
          useValue: mockRedisService,
        },
        {
          provide: MailService,
          useValue: mockMailService,
        },
        {
          provide: AuditService,
          useValue: mockAuditService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: I18nService,
          useValue: mockI18nService,
        },
        {
          provide: TwoFactorService,
          useValue: mockTwoFactorService,
        },
        {
          provide: RecaptchaService,
          useValue: mockRecaptchaService,
        },
        {
          provide: AccountTypeResolver,
          useValue: mockAccountTypeResolver,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('login', () => {
    it('should return access and refresh tokens', async () => {
      const loginDto = {
        email: 'test@example.com',
        password: 'password123',
      };

      const user = {
        id: 1,
        email: 'test@example.com',
        role: 'USER',
        firstName: 'Test',
        lastName: 'User',
        password: 'hashedPassword',
      };

      mockRedisService.getLoginAttempts.mockResolvedValue(0);
      mockUsersService.findByEmail.mockResolvedValue(user);
      mockUsersService.validatePassword.mockResolvedValue(true);
      mockJwtService.sign
        .mockReturnValueOnce('access-token')
        .mockReturnValueOnce('refresh-token');

      const result = await service.login(loginDto);

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(result).toHaveProperty('user');
      expect(mockJwtService.sign).toHaveBeenCalledTimes(2);
    });

    it('should throw error if too many login attempts', async () => {
      const loginDto = {
        email: 'test@example.com',
        password: 'password123',
      };

      mockRedisService.getLoginAttempts.mockResolvedValue(5);

      await expect(service.login(loginDto)).rejects.toThrow();
    });
  });

  describe('refreshTokens rotation security', () => {
    const storedToken = {
      id: 'old-token-id',
      userId: 'user-1',
      token: 'hashed-old-token',
      createdAt: new Date(Date.now() - 60_000),
      expiresAt: new Date(Date.now() + 60_000),
      revokedAt: null,
      ipAddress: null,
      deviceInfo: null,
    };

    beforeEach(() => {
      jest.clearAllMocks();
      mockPrismaService.refreshToken.findUnique.mockResolvedValue(storedToken);
      mockPrismaService.refreshToken.updateMany.mockResolvedValue({ count: 1 });
      mockPrismaService.$transaction.mockImplementation((callback) =>
        callback({
          refreshToken: {
            updateMany: mockPrismaService.refreshToken.updateMany,
            create: mockPrismaService.refreshToken.create,
          },
        })
      );
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: 'user-1',
        email: 'user@example.com',
        role: 'USER',
        isActive: true,
      });
      mockJwtService.sign
        .mockReturnValueOnce('new-access-token')
        .mockReturnValueOnce('new-refresh-token');
      mockPrismaService.refreshToken.create.mockResolvedValue({});
    });

    it('consumes the previous token conditionally and creates its replacement in one transaction', async () => {
      const result = await service.refreshTokens('user-1', 'old-refresh-token');

      expect(result).toMatchObject({
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
      });
      expect(mockPrismaService.$transaction).toHaveBeenCalledTimes(1);
      expect(mockPrismaService.refreshToken.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            id: 'old-token-id',
            userId: 'user-1',
            revokedAt: null,
            expiresAt: expect.objectContaining({ gt: expect.any(Date) }),
          }),
          data: expect.objectContaining({
            revokedAt: expect.any(Date),
            replacedByTokenId: expect.any(String),
          }),
        })
      );
      expect(mockPrismaService.refreshToken.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: 'user-1',
            token: expect.any(String),
          }),
        })
      );
    });

    it('rejects a concurrent refresh when another request already consumed the token', async () => {
      mockPrismaService.refreshToken.updateMany.mockResolvedValue({
        count: 0,
      });

      await expect(
        service.refreshTokens('user-1', 'old-refresh-token')
      ).rejects.toThrow();

      expect(mockPrismaService.refreshToken.create).not.toHaveBeenCalled();
    });

    it('rejects refresh for an inactive account before rotating credentials', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: 'user-1',
        email: 'user@example.com',
        role: 'USER',
        isActive: false,
      });

      await expect(
        service.refreshTokens('user-1', 'old-refresh-token')
      ).rejects.toThrow();

      expect(mockPrismaService.$transaction).not.toHaveBeenCalled();
    });
  });

  describe('register', () => {
    it('should create new user', async () => {
      const registerDto = {
        email: 'newuser@example.com',
        password: 'password123',
        firstName: 'New',
        lastName: 'User',
        birthDate: '1990-01-01',
        sex: Sex.MALE,
        commerceName: 'Test Commerce',
        acceptTerms: true,
      };

      const createdUser = {
        id: 2,
        email: 'newuser@example.com',
        firstName: 'New',
        lastName: 'User',
        role: 'USER',
        isActive: true,
      };

      mockUsersService.create.mockResolvedValue(createdUser);
      mockJwtService.sign
        .mockReturnValueOnce('access-token')
        .mockReturnValueOnce('refresh-token');

      const result = await service.register(registerDto);

      expect(result).toHaveProperty('user');
      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(mockUsersService.create).toHaveBeenCalledWith(registerDto);
    });
  });
});
