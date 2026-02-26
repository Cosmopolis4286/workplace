import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
  Request,
  ForbiddenException,
} from '@nestjs/common'
import { Throttle } from '@nestjs/throttler'
import { AuthService } from './auth.service'
import { RegisterDto } from './dto/register.dto'
import { LoginDto } from './dto/login.dto'
import { RefreshDto } from './dto/refresh.dto'
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard'
import { JwtRefreshGuard } from '../common/guards/jwt-refresh.guard'
import { CurrentUser } from '../common/decorators/current-user.decorator'
import { ConfigService } from '@nestjs/config'

@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private config: ConfigService,
  ) {}

  @Post('register')
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  async register(@Body() dto: RegisterDto) {
    return this.authService.register(dto)
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  async login(@Body() dto: LoginDto) {
    return this.authService.login(dto)
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtRefreshGuard)
  async refresh(@Request() req: any, @Body() dto: RefreshDto) {
    return this.authService.refreshTokens(req.user.userId, dto.refreshToken)
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  async logout(@CurrentUser() user: any) {
    const expiresIn = this.config.get('JWT_EXPIRES_IN', '15m')
    const ttlSeconds = this.parseTtlToSeconds(expiresIn)
    await this.authService.logout(user.id, user.jti, ttlSeconds)
    return { message: 'Sesión cerrada exitosamente' }
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async getProfile(@CurrentUser() user: any) {
    return this.authService.getProfile(user.id)
  }

  @Get('demo-credentials')
  async getDemoCredentials() {
    if (this.config.get('NODE_ENV') !== 'development') {
      throw new ForbiddenException('Solo disponible en desarrollo')
    }
    return this.authService.getDemoCredentials()
  }

  private parseTtlToSeconds(duration: string): number {
    const match = duration.match(/^(\d+)([smhd])$/)
    if (!match) return 15 * 60
    const value = parseInt(match[1])
    const unit = match[2]
    const map: Record<string, number> = { s: 1, m: 60, h: 3600, d: 86400 }
    return value * map[unit]
  }
}
