import { Test, TestingModule } from '@nestjs/testing'
import { JwtService } from '@nestjs/jwt'
import { ConfigService } from '@nestjs/config'
import { AuthService } from '../../auth/auth.service'
import { PrismaService } from '../../prisma/prisma.service'
import { UsersService } from '../../users/users.service'
import { RedisService } from '../../redis/redis.service'
import { MailService } from '../../mail/mail.service'

describe('AuthService', () => {
  let service: AuthService
  let jwtService: JwtService
  let prismaService: PrismaService
  let usersService: UsersService
  let redisService: RedisService
  let mailService: MailService

  const mockPrismaService = {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  }

  const mockJwtService = {
    sign: jest.fn(),
    verify: jest.fn(),
  }

  const mockUsersService = {
    create: jest.fn(),
    findByEmail: jest.fn(),
    validatePassword: jest.fn(),
  }

  const mockRedisService = {
    getLoginAttempts: jest.fn(),
    setLoginAttempts: jest.fn(),
    resetLoginAttempts: jest.fn(),
    saveRefreshToken: jest.fn(),
  }

  const mockMailService = {
    sendPasswordResetEmail: jest.fn(),
    sendVerificationEmail: jest.fn(),
  }

  const mockConfigService = {
    get: jest.fn(),
    getOrThrow: jest.fn().mockReturnValue('7d'),
  }

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
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile()

    service = module.get<AuthService>(AuthService)
    jwtService = module.get<JwtService>(JwtService)
    prismaService = module.get<PrismaService>(PrismaService)
    usersService = module.get<UsersService>(UsersService)
    redisService = module.get<RedisService>(RedisService)
    mailService = module.get<MailService>(MailService)
  })

  it('should be defined', () => {
    expect(service).toBeDefined()
  })

  describe('login', () => {
    it('should return access and refresh tokens', async () => {
      const loginDto = {
        email: 'test@example.com',
        password: 'password123'
      }

      const user = {
        id: 1,
        email: 'test@example.com',
        role: 'USER',
        firstName: 'Test',
        lastName: 'User',
        password: 'hashedPassword'
      }

      mockRedisService.getLoginAttempts.mockResolvedValue(0)
      mockUsersService.findByEmail.mockResolvedValue(user)
      mockUsersService.validatePassword.mockResolvedValue(true)
      mockConfigService.getOrThrow.mockReturnValue('test-secret')
      mockJwtService.sign.mockReturnValueOnce('access-token').mockReturnValueOnce('refresh-token')

      const result = await service.login(loginDto)

      expect(result).toHaveProperty('accessToken')
      expect(result).toHaveProperty('refreshToken')
      expect(result).toHaveProperty('user')
      expect(mockJwtService.sign).toHaveBeenCalledTimes(2)
    })

    it('should throw error if too many login attempts', async () => {
      const loginDto = {
        email: 'test@example.com',
        password: 'password123'
      }

      mockRedisService.getLoginAttempts.mockResolvedValue(5)

      await expect(service.login(loginDto)).rejects.toThrow()
    })
  })

  describe('register', () => {
    it('should create new user', async () => {
      const registerDto = {
        email: 'newuser@example.com',
        password: 'password123',
        firstName: 'New',
        lastName: 'User',
        commerceName: 'Test Commerce'
      }

      const createdUser = {
        id: 2,
        email: 'newuser@example.com',
        firstName: 'New',
        lastName: 'User',
        role: 'USER',
        isActive: true,
      }

      mockUsersService.create.mockResolvedValue(createdUser)
      mockConfigService.getOrThrow.mockReturnValue('test-secret')
      mockJwtService.sign.mockReturnValueOnce('access-token').mockReturnValueOnce('refresh-token')

      const result = await service.register(registerDto)

      expect(result).toHaveProperty('user')
      expect(result).toHaveProperty('accessToken')
      expect(result).toHaveProperty('refreshToken')
      expect(mockUsersService.create).toHaveBeenCalledWith(registerDto)
    })
  })
})
