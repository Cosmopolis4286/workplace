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

  async loginWithGoogle(googleUser: {
    googleId: string
    email: string
    firstName: string
    lastName: string
    avatar?: string
  }) {
    // Find existing user by email or create a new COMMERCE account
    let user: any = await this.usersService.findByEmail(googleUser.email)

    if (!user) {
      // Auto-register: use email prefix as restaurant name placeholder
      const commerceName = `${googleUser.firstName}'s Commerce`
      user = await this.usersService.create({
        email: googleUser.email,
        password: uuidv4(), // random unusable password — user logs in via Google
        firstName: googleUser.firstName,
        lastName: googleUser.lastName,
        commerceName,
        role: Role.COMMERCE,
      })
    }

    // Update avatar if provided and user doesn't have one yet
    if (googleUser.avatar && !user.avatar) {
      await this.usersService.updateAvatar(user.id, googleUser.avatar)
    }

    const tokens = await this.generateTokens(user.id, user.email, user.role)
    await this.saveRefreshToken(user.id, tokens.refreshToken)

    const { password, ...safeUser } = user as typeof user & { password?: string }
    return { user: safeUser, ...tokens }
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

  async checkUsername(username: string, currentUserId: string) {
    return this.usersService.checkUsernameAvailability(username, currentUserId)
  }

  async getDemoCredentials() {
    const demoAccounts = [
      {
        role: 'SUPERADMIN' as const,
        email: 'superadmin@demo.com',
        password: 'SuperAdmin123',
        label: 'Super Admin',
        description: 'Acceso total: gestiona todos los usuarios y roles',
      },
      {
        role: 'ADMIN' as const,
        email: 'admin@demo.com',
        password: 'Admin1234',
        label: 'Administrador',
        description: 'Gestiona commerce, freelancer y normal',
      },
      {
        role: 'COMMERCE' as const,
        email: 'commerce@demo.com',
        password: 'Commerce123',
        label: 'Comercio',
        description: 'Acceso completo al negocio y operaciones',
      },
      {
        role: 'FREELANCER' as const,
        email: 'freelancer@demo.com',
        password: 'Freelancer1',
        label: 'Freelancer',
        description: 'Acceso a sus propios servicios',
      },
      {
        role: 'NORMAL' as const,
        email: 'normal@demo.com',
        password: 'Normal1234',
        label: 'Usuario Normal',
        description: 'Acceso básico de usuario final',
      },
    ]

    const results = await Promise.all(
      demoAccounts.map(async (acc) => {
        const user = await this.usersService.findByEmail(acc.email)
        return {
          ...acc,
          commerceName: user?.commerce?.name ?? null,
          exists: !!user,
        }
      }),
    )

    const missing = results.filter(r => !r.exists).map(r => r.role)
    if (missing.length > 0) {
      throw new ForbiddenException(
        `Demo users not found: ${missing.join(', ')}. Run: pnpm seed`,
      )
    }

    return {
      success: true,
      data: results.map(({ exists, ...rest }) => rest),
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
