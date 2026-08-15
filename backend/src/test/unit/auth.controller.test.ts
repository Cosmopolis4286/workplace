import { Test, TestingModule } from '@nestjs/testing'
import { Sex } from '@prisma/client'
import { AuthController } from '../../domains/identity-access/auth/auth.controller'
import { AuthService } from '../../domains/identity-access/auth/auth.service'
import { JwtService } from '@nestjs/jwt'
import { ConfigService } from '@nestjs/config'

describe('AuthController', () => {
  let controller: AuthController
  let authService: AuthService

  const mockAuthService = {
    login: jest.fn(),
    register: jest.fn(),
    refreshToken: jest.fn(),
    refreshTokens: jest.fn(),
    logout: jest.fn(),
    getDemoCredentials: jest.fn(),
  }

  const mockConfigService = {
    get: jest.fn((key: string): string | undefined => {
      if (key === 'JWT_REFRESH_EXPIRES_IN') return '7d'
      if (key === 'JWT_EXPIRES_IN') return '15m'
      return undefined
    }),
  }

  const mockResponse = {
    cookie: jest.fn(),
    clearCookie: jest.fn(),
  } as any

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        JwtService,
      ],
    }).compile()

    controller = module.get<AuthController>(AuthController)
    authService = module.get<AuthService>(AuthService)
  })

  it('should be defined', () => {
    expect(controller).toBeDefined()
  })

  describe('login', () => {
    it('should return tokens when credentials are valid', async () => {
      const loginDto = {
        email: 'test@example.com',
        password: 'password123',
      }

      const tokens = {
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        user: {
          id: 1,
          email: 'test@example.com',
          role: 'USER'
        }
      }

      mockAuthService.login.mockResolvedValue(tokens)

      const mockRequest = { securityContext: null }
      const result = await controller.login(loginDto, mockRequest, mockResponse)

      expect(result).toEqual(tokens)
      expect(mockAuthService.login).toHaveBeenCalledWith(loginDto, null)
    })
  })

  describe('register', () => {
    it('should create new user and return tokens', async () => {
      const registerDto = {
        email: 'newuser@example.com',
        password: 'password123',
        firstName: 'New',
        lastName: 'User',
        birthDate: '1990-01-01',
        sex: Sex.MALE,
        commerceName: 'Test Commerce',
        acceptTerms: true
      }

      const tokens = {
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        user: {
          id: 2,
          email: 'newuser@example.com',
          role: 'USER'
        }
      }

      mockAuthService.register.mockResolvedValue(tokens)

      const mockRequest = { securityContext: null }
      const result = await controller.register(registerDto, mockRequest, mockResponse)

      expect(result).toEqual(tokens)
      expect(mockAuthService.register).toHaveBeenCalledWith(registerDto, null)
    })
  })

  describe('refreshToken', () => {
    it('should return new access token', async () => {
      const refreshDto = {
        refreshToken: 'valid-refresh-token',
      }

      const newTokens = {
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
      }

      mockAuthService.refreshTokens.mockResolvedValue(newTokens)

      const mockRequest = { user: { userId: 'test-user', refreshToken: refreshDto.refreshToken } }
      const result = await controller.refresh(mockRequest, refreshDto, mockResponse)

      expect(result).toEqual(newTokens)
      expect(mockAuthService.refreshTokens).toHaveBeenCalledWith('test-user', refreshDto.refreshToken, undefined)
    })

    it('should throw error when refresh token is invalid', async () => {
      const refreshDto = {
        refreshToken: 'invalid-token',
      }

      mockAuthService.refreshTokens.mockRejectedValue(new Error('Invalid refresh token'))

      const mockRequest = { user: { userId: 'test-user', refreshToken: refreshDto.refreshToken } }
      await expect(controller.refresh(mockRequest, refreshDto, mockResponse)).rejects.toThrow('Invalid refresh token')
    })
  })

  describe('logout', () => {
    it('should logout user successfully', async () => {
      const mockUser = { 
        id: 'test-user-id'
      }
      const refreshToken = 'test-refresh-token'

      mockAuthService.logout.mockResolvedValue(undefined)

      const result = await controller.logout(mockUser, refreshToken)

      expect(result).toEqual({ message: 'Sesión cerrada exitosamente' })
      expect(mockAuthService.logout).toHaveBeenCalledWith('test-user-id', 'test-refresh-token', undefined)
    })
  })

  describe('getDemoCredentials', () => {
    function mockEnv(vars: Record<string, string | undefined>) {
      mockConfigService.get.mockImplementation((key: string) => vars[key])
    }

    it('rechaza siempre que APP_ENV=production, sin importar USE_DEMO', async () => {
      mockEnv({ APP_ENV: 'production', USE_DEMO: 'true' })

      await expect(controller.getDemoCredentials()).rejects.toThrow('Solo disponible en desarrollo')
      expect(mockAuthService.getDemoCredentials).not.toHaveBeenCalled()
    })

    it('permite cuando APP_ENV=development', async () => {
      mockEnv({ APP_ENV: 'development' })
      mockAuthService.getDemoCredentials.mockResolvedValue([{ email: 'demo@example.com' }])

      const result = await controller.getDemoCredentials()
      expect(result).toEqual([{ email: 'demo@example.com' }])
    })

    it('permite cuando USE_DEMO=true y APP_ENV no es production', async () => {
      mockEnv({ APP_ENV: 'staging', USE_DEMO: 'true' })
      mockAuthService.getDemoCredentials.mockResolvedValue([])

      await expect(controller.getDemoCredentials()).resolves.toEqual([])
    })

    it('rechaza cuando ninguna variable habilita modo demo', async () => {
      mockEnv({ APP_ENV: 'staging' })

      await expect(controller.getDemoCredentials()).rejects.toThrow('Solo disponible en desarrollo')
    })
  })
})
