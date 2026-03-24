import { Test, TestingModule } from '@nestjs/testing'
import { AuthController } from '../auth/auth.controller'
import { AuthService } from '../auth/auth.service'
import { JwtService } from '@nestjs/jwt'

describe('AuthController', () => {
  let controller: AuthController
  let authService: AuthService

  const mockAuthService = {
    validateUser: jest.fn(),
    login: jest.fn(),
    register: jest.fn(),
    refreshToken: jest.fn(),
    logout: jest.fn(),
  }

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: mockAuthService,
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

      const user = {
        id: 1,
        email: 'test@example.com',
        role: 'USER',
      }

      const tokens = {
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
      }

      mockAuthService.validateUser.mockResolvedValue(user)
      mockAuthService.login.mockResolvedValue(tokens)

      const result = await controller.login(loginDto)

      expect(result).toEqual(tokens)
      expect(mockAuthService.validateUser).toHaveBeenCalledWith('test@example.com', 'password123')
      expect(mockAuthService.login).toHaveBeenCalledWith(user)
    })

    it('should throw error when credentials are invalid', async () => {
      const loginDto = {
        email: 'wrong@example.com',
        password: 'wrongpassword',
      }

      mockAuthService.validateUser.mockResolvedValue(null)

      await expect(controller.login(loginDto)).rejects.toThrow('Invalid credentials')
    })
  })

  describe('register', () => {
    it('should create new user and return tokens', async () => {
      const registerDto = {
        email: 'newuser@example.com',
        password: 'password123',
        name: 'New User',
      }

      const createdUser = {
        id: 2,
        email: 'newuser@example.com',
        name: 'New User',
        role: 'USER',
      }

      const tokens = {
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
      }

      mockAuthService.register.mockResolvedValue(createdUser)
      mockAuthService.login.mockResolvedValue(tokens)

      const result = await controller.register(registerDto)

      expect(result).toEqual(tokens)
      expect(mockAuthService.register).toHaveBeenCalledWith(registerDto)
      expect(mockAuthService.login).toHaveBeenCalledWith(createdUser)
    })
  })

  describe('refreshToken', () => {
    it('should return new access token', async () => {
      const refreshTokenDto = {
        refreshToken: 'valid-refresh-token',
      }

      const newTokens = {
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
      }

      mockAuthService.refreshToken.mockResolvedValue(newTokens)

      const result = await controller.refreshToken(refreshTokenDto)

      expect(result).toEqual(newTokens)
      expect(mockAuthService.refreshToken).toHaveBeenCalledWith('valid-refresh-token')
    })

    it('should throw error when refresh token is invalid', async () => {
      const refreshTokenDto = {
        refreshToken: 'invalid-token',
      }

      mockAuthService.refreshToken.mockRejectedValue(new Error('Invalid refresh token'))

      await expect(controller.refreshToken(refreshTokenDto)).rejects.toThrow('Invalid refresh token')
    })
  })

  describe('logout', () => {
    it('should logout user successfully', async () => {
      const logoutDto = {
        refreshToken: 'valid-refresh-token',
      }

      mockAuthService.logout.mockResolvedValue(undefined)

      const result = await controller.logout(logoutDto)

      expect(result).toEqual({ message: 'Logout successful' })
      expect(mockAuthService.logout).toHaveBeenCalledWith('valid-refresh-token')
    })
  })
})
