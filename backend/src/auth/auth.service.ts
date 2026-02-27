import {
  Injectable,
  UnauthorizedException,
  ForbiddenException,
  NotFoundException,
  Logger,
} from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { ConfigService } from '@nestjs/config'
import { v4 as uuidv4 } from 'uuid'
import { UsersService } from '../users/users.service'
import { PrismaService } from '../prisma/prisma.service'
import { RedisService } from '../redis/redis.service'
import { Role } from '@prisma/client'
import { RegisterDto } from './dto/register.dto'
import { LoginDto } from './dto/login.dto'
import { UpdateProfileDto } from './dto/update-profile.dto'
import { ChangePasswordDto } from './dto/change-password.dto'

const MAX_LOGIN_ATTEMPTS = 5

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name)

  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private config: ConfigService,
    private prisma: PrismaService,
    private redis: RedisService,
  ) {}

  async register(dto: RegisterDto) {
    const user = await this.usersService.create(dto)
    const tokens = await this.generateTokens(user.id, user.email, user.role)
    await this.saveRefreshToken(user.id, tokens.refreshToken)
    return { user, ...tokens }
  }

  async login(dto: LoginDto) {
    const attempts = await this.redis.getLoginAttempts(dto.email)
    if (attempts >= MAX_LOGIN_ATTEMPTS) {
      throw new ForbiddenException(
        'Demasiados intentos fallidos. Espera 15 minutos.',
      )
    }

    const user = await this.usersService.findByEmail(dto.email)
    if (!user) {
      await this.redis.incrementLoginAttempts(dto.email)
      throw new UnauthorizedException('Credenciales incorrectas')
    }

    const valid = await this.usersService.validatePassword(dto.password, user.password)
    if (!valid) {
      await this.redis.incrementLoginAttempts(dto.email)
      throw new UnauthorizedException('Credenciales incorrectas')
    }

    await this.redis.resetLoginAttempts(dto.email)

    const { password, ...safeUser } = user
    const tokens = await this.generateTokens(user.id, user.email, user.role)
    await this.saveRefreshToken(user.id, tokens.refreshToken)

    return { user: safeUser, ...tokens }
  }

  async refreshTokens(userId: string, oldRefreshToken: string) {
    const stored = await this.prisma.refreshToken.findUnique({
      where: { token: oldRefreshToken },
    })

    if (!stored || stored.userId !== userId || stored.expiresAt < new Date()) {
      throw new ForbiddenException('Refresh token inválido o expirado')
    }

    // Rotate: delete old, issue new
    await this.prisma.refreshToken.delete({ where: { id: stored.id } })

    const user = await this.usersService.findById(userId)
    const tokens = await this.generateTokens(user.id, user.email, user.role)
    await this.saveRefreshToken(user.id, tokens.refreshToken)

    return tokens
  }

  async logout(userId: string, accessTokenJti: string, accessTokenTtl: number) {
    // Blacklist the access token in Redis
    await this.redis.blacklistToken(accessTokenJti, accessTokenTtl)
    // Delete all refresh tokens for user
    await this.prisma.refreshToken.deleteMany({ where: { userId } })
  }

  async getProfile(userId: string) {
    return this.usersService.findById(userId)
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    return this.usersService.updateProfile(userId, dto)
  }

  async changePassword(userId: string, dto: ChangePasswordDto) {
    return this.usersService.changePassword(userId, dto)
  }

  async updateAvatar(userId: string, avatarUrl: string) {
    return this.usersService.updateAvatar(userId, avatarUrl)
  }

  async getDemoCredentials() {
    const email = this.config.get<string>('DEMO_EMAIL', 'demo@ifoodmanager.com')
    const password = this.config.get<string>('DEMO_PASSWORD', 'demo123456')

    const user = await this.usersService.findByEmail(email)
    if (!user) {
      throw new ForbiddenException(
        'Demo user not found. Run: pnpm seed',
      )
    }

    return {
      success: true,
      data: {
        email,
        password,
        restaurantName: user.restaurant?.name || 'Restaurante Demo',
        description: 'Cuenta demo para explorar la plataforma',
      },
    }
  }

  // --- Helpers ---

  private async generateTokens(userId: string, email: string, role: Role) {
    const jti = uuidv4()

    const accessToken = this.jwtService.sign(
      { sub: userId, email, jti, role },
      {
        secret: this.config.get('JWT_SECRET'),
        expiresIn: this.config.get('JWT_EXPIRES_IN', '15m'),
      },
    )

    const refreshToken = this.jwtService.sign(
      { sub: userId },
      {
        secret: this.config.get('JWT_REFRESH_SECRET'),
        expiresIn: this.config.get('JWT_REFRESH_EXPIRES_IN', '7d'),
      },
    )

    return { accessToken, refreshToken }
  }

  private async saveRefreshToken(userId: string, token: string) {
    const expiresIn = this.config.get('JWT_REFRESH_EXPIRES_IN', '7d')
    const ms = this.parseDuration(expiresIn)
    const expiresAt = new Date(Date.now() + ms)

    await this.prisma.refreshToken.create({ data: { token, userId, expiresAt } })
  }

  private parseDuration(duration: string): number {
    const match = duration.match(/^(\d+)([smhd])$/)
    if (!match) return 7 * 24 * 60 * 60 * 1000
    const value = parseInt(match[1])
    const unit = match[2]
    const map: Record<string, number> = {
      s: 1000,
      m: 60 * 1000,
      h: 60 * 60 * 1000,
      d: 24 * 60 * 60 * 1000,
    }
    return value * map[unit]
  }
}
