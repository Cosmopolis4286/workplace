import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
  Request,
  Res,
  ForbiddenException,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common'
import { Response } from 'express'
import { AuthGuard } from '@nestjs/passport'
import { FileInterceptor } from '@nestjs/platform-express'
import { diskStorage } from 'multer'
import { extname, join } from 'path'
import { existsSync, mkdirSync } from 'fs'
import { Throttle } from '@nestjs/throttler'
import { AuthService } from './auth.service'
import { RegisterDto } from './dto/register.dto'
import { LoginDto } from './dto/login.dto'
import { RefreshDto } from './dto/refresh.dto'
import { UpdateProfileDto } from './dto/update-profile.dto'
import { ChangePasswordDto } from './dto/change-password.dto'
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

  // ─── Google OAuth ────────────────────────────────────────────────────────────

  @Get('google')
  @UseGuards(AuthGuard('google'))
  googleAuth() {
    // Guard redirects to Google consent screen — no body needed
  }

  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  async googleCallback(@Request() req: any, @Res() res: Response) {
    const { user, accessToken, refreshToken } = await this.authService.loginWithGoogle(req.user)
    const frontendUrl = this.config.get<string>('FRONTEND_URL', 'http://localhost:3000')

    // Pass tokens via query params so the SPA can store them
    const params = new URLSearchParams({
      accessToken,
      refreshToken,
      user: JSON.stringify(user),
    })
    return res.redirect(`${frontendUrl}/auth/google/callback?${params}`)
  }

  // ─── Credentials auth ────────────────────────────────────────────────────────

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

  @Patch('me')
  @UseGuards(JwtAuthGuard)
  async updateProfile(@CurrentUser() user: any, @Body() dto: UpdateProfileDto) {
    return this.authService.updateProfile(user.id, dto)
  }

  @Patch('change-password')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  async changePassword(@CurrentUser() user: any, @Body() dto: ChangePasswordDto) {
    return this.authService.changePassword(user.id, dto)
  }

  @Post('me/avatar')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(
    FileInterceptor('avatar', {
      storage: diskStorage({
        destination: (_req, _file, cb) => {
          const uploadPath = join(process.cwd(), 'uploads', 'avatars')
          if (!existsSync(uploadPath)) mkdirSync(uploadPath, { recursive: true })
          cb(null, uploadPath)
        },
        filename: (_req, file, cb) => {
          const unique = Date.now() + '-' + Math.round(Math.random() * 1e9)
          cb(null, unique + extname(file.originalname))
        },
      }),
      fileFilter: (_req, file, cb) => {
        if (!file.mimetype.match(/^image\/(jpeg|png|webp|gif)$/)) {
          return cb(new BadRequestException('Solo se permiten imágenes (jpeg, png, webp, gif)'), false)
        }
        cb(null, true)
      },
      limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
    }),
  )
  async uploadAvatar(@CurrentUser() user: any, @UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('No se recibió ningún archivo')
    return this.authService.updateAvatar(user.id, `/uploads/avatars/${file.filename}`)
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
