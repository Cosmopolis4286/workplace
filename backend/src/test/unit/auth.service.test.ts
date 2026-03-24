import { Test, TestingModule } from '@nestjs/testing'
import { JwtService } from '@nestjs/jwt'
import { ConfigService } from '@nestjs/config'
import { BcryptService } from '../common/bcrypt.service'
import { AuthService } from '../auth/auth.service'
import { PrismaService } from '../prisma/prisma.service'

describe('AuthService', () => {
  let service: AuthService
  let jwtService: JwtService
  let prismaService: PrismaService
  let bcryptService: BcryptService

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

  const mockBcryptService = {
    hash: jest.fn(),
    compare: jest.fn(),
  }

  const mockConfigService = {
    get: jest.fn(),
    getOrThrow: jest.fn(),
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
          provide: BcryptService,
          useValue: mockBcryptService,
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
    bcryptService = module.get<BcryptService>(BcryptService)
  })

  it('should be defined', () => {
    expect(service).toBeDefined()
  })

  describe('validateUser', () => {
    it('should return user if credentials are valid', async () => {
      const user = {
        id: 1,
        email: 'test@example.com',
        password: 'hashedPassword',
        role: 'USER',
        isActive: true,
      }

      mockPrismaService.user.findUnique.mockResolvedValue(user)
      mockBcryptService.compare.mockResolvedValue(true)

      const result = await service.validateUser('test@example.com', 'password')

      expect(result).toEqual({
        id: 1,
        email: 'test@example.com',
        role: 'USER',
        isActive: true,
      })
      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'test@example.com' },
      })
      expect(mockBcryptService.compare).toHaveBeenCalledWith('password', 'hashedPassword')
    })

    it('should return null if user not found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null)

      const result = await service.validateUser('nonexistent@example.com', 'password')

      expect(result).toBeNull()
    })

    it('should return null if password is invalid', async () => {
      const user = {
        id: 1,
        email: 'test@example.com',
        password: 'hashedPassword',
        role: 'USER',
        isActive: true,
      }

      mockPrismaService.user.findUnique.mockResolvedValue(user)
      mockBcryptService.compare.mockResolvedValue(false)

      const result = await service.validateUser('test@example.com', 'wrongpassword')

      expect(result).toBeNull()
    })
  })

  describe('login', () => {
    it('should return access and refresh tokens', async () => {
      const user = {
        id: 1,
        email: 'test@example.com',
        role: 'USER',
      }

      mockConfigService.getOrThrow.mockReturnValue('test-secret')
      mockJwtService.sign.mockReturnValueOnce('access-token').mockReturnValueOnce('refresh-token')

      const result = await service.login(user)

      expect(result).toEqual({
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
      })
      expect(mockJwtService.sign).toHaveBeenCalledTimes(2)
    })
  })

  describe('register', () => {
    it('should create new user with hashed password', async () => {
      const createUserDto = {
        email: 'newuser@example.com',
        password: 'password123',
        name: 'New User',
      }

      const hashedPassword = 'hashedPassword123'
      const createdUser = {
        id: 2,
        email: 'newuser@example.com',
        name: 'New User',
        role: 'USER',
        isActive: true,
      }

      mockBcryptService.hash.mockResolvedValue(hashedPassword)
      mockPrismaService.user.create.mockResolvedValue(createdUser)

      const result = await service.register(createUserDto)

      expect(result).toEqual(createdUser)
      expect(mockBcryptService.hash).toHaveBeenCalledWith('password123')
      expect(mockPrismaService.user.create).toHaveBeenCalledWith({
        data: {
          email: 'newuser@example.com',
          password: hashedPassword,
          name: 'New User',
          role: 'USER',
        },
      })
    })
  })
})
