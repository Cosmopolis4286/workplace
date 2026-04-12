import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  Request,
  Res,
  ForbiddenException,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { RateLimit, RateLimitOptions } from '../common/guards/rate-limit.guard';
import { Response } from 'express';
import { AuthGuard } from '@nestjs/passport';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshDto } from './dto/refresh.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { JwtRefreshGuard } from '../common/guards/jwt-refresh.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ConfigService } from '@nestjs/config';

@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private config: ConfigService
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
    const { user, accessToken, refreshToken } =
      await this.authService.loginWithGoogle(req.user);
    const frontendUrl = this.config.get<string>(
      'FRONTEND_URL',
      'http://localhost:3000'
    );

    // Pass tokens via query params so the SPA can store them
    const params = new URLSearchParams({
      accessToken,
      refreshToken,
      user: JSON.stringify(user),
    });
    return res.redirect(`${frontendUrl}/auth/google/callback?${params}`);
  }

  // ─── Credentials auth ────────────────────────────────────────────────────────

  @Post('register')
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @RateLimit({
    windowMs: 60 * 60 * 1000, // 1 hora
    maxRequests: 3, // Máximo 3 registros por hora
    keyGenerator: (req) => `register:${req.ip}` // Por IP
  })
  async register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @RateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    maxRequests: 20, // Máximo 20 intentos de login
    keyGenerator: (req) => `login:${req.ip}` // Por IP
  })
  async login(@Body() dto: LoginDto, @Request() req: any) {
    return this.authService.login(dto, req.securityContext);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtRefreshGuard)
  @RateLimit({
    windowMs: 5 * 60 * 1000, // 5 minutos
    maxRequests: 50, // Máximo 50 refresh tokens
    keyGenerator: (req: any) => `refresh:${(req.user as any)?.userId || req.ip}` // Por usuario o IP
  })
  async refresh(@Request() req: any, @Body() dto: RefreshDto) {
    return this.authService.refreshTokens(req.user.userId, dto.refreshToken, req.securityContext);
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  async logout(
    @CurrentUser() user: any,
    @Body('refreshToken') refreshToken?: string,
    @Request() req?: any
  ) {
    // Revoca refresh tokens en DB (no necesita Redis blacklist)
    await this.authService.logout(user.id, refreshToken, req?.securityContext);
    return { message: 'Sesión cerrada exitosamente' };
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async getProfile(@CurrentUser() user: any) {
    return this.authService.getProfile(user.id);
  }

  @Patch('me')
  @UseGuards(JwtAuthGuard)
  async updateProfile(@CurrentUser() user: any, @Body() dto: UpdateProfileDto) {
    return this.authService.updateProfile(user.id, dto);
  }

  @Get('check-username')
  @UseGuards(JwtAuthGuard)
  async checkUsername(
    @CurrentUser() user: any,
    @Query('username') username: string
  ) {
    if (!username || username.length < 3) {
      return { available: false };
    }
    return this.authService.checkUsername(username.toLowerCase(), user.id);
  }

  @Patch('change-password')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  async changePassword(
    @CurrentUser() user: any,
    @Body() dto: ChangePasswordDto
  ) {
    return this.authService.changePassword(user.id, dto);
  }

  @Post('me/avatar')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(
    FileInterceptor('avatar', {
      storage: diskStorage({
        destination: (_req, _file, cb) => {
          const uploadPath = join(process.cwd(), 'uploads', 'avatars');
          if (!existsSync(uploadPath))
            mkdirSync(uploadPath, { recursive: true });
          cb(null, uploadPath);
        },
        filename: (_req, file, cb) => {
          const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
          cb(null, unique + extname(file.originalname));
        },
      }),
      fileFilter: (_req, file, cb) => {
        if (!file.mimetype.match(/^image\/(jpeg|png|webp|gif)$/)) {
          return cb(
            new BadRequestException(
              'Solo se permiten imágenes (jpeg, png, webp, gif)'
            ),
            false
          );
        }
        cb(null, true);
      },
      limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
    })
  )
  async uploadAvatar(
    @CurrentUser() user: any,
    @UploadedFile() file: Express.Multer.File
  ) {
    if (!file) throw new BadRequestException('No se recibió ningún archivo');
    return this.authService.updateAvatar(
      user.id,
      `/uploads/avatars/${file.filename}`
    );
  }

  // ─── Password Recovery ───────────────────────────────────────────────────────

  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @RateLimit({
    windowMs: 60 * 60 * 1000, // 1 hora
    maxRequests: 5, // Máximo 5 solicitudes de reset por hora
    keyGenerator: (req) => `reset:${req.ip}` // Por IP
  })
  async forgotPassword(@Body('email') email: string) {
    return this.authService.requestPasswordReset(email);
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  async resetPassword(
    @Body('token') token: string,
    @Body('password') password: string
  ) {
    return this.authService.resetPassword(token, password);
  }

  // ─── Email Verification ──────────────────────────────────────────────────────

  @Post('send-verification')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  async sendVerification(@CurrentUser() user: any) {
    return this.authService.sendVerificationEmail(user.id);
  }

  @Post('verify-email')
  @HttpCode(HttpStatus.OK)
  async verifyEmail(@Body('token') token: string) {
    return this.authService.verifyEmail(token);
  }

  @Get('demo-credentials')
  async getDemoCredentials() {
    const isDev =
      this.config.get('APP_ENV') === 'development' ||
      this.config.get('USE_DEMO') === 'true';
    if (!isDev) {
      throw new ForbiddenException('Solo disponible en desarrollo');
    }
    return this.authService.getDemoCredentials();
  }

  @Get('security-events')
  @UseGuards(JwtAuthGuard)
  async getSecurityEvents(@CurrentUser() user: any) {
    return this.authService.getSecurityEvents(user.id);
  }

  private parseTtlToSeconds(duration: string): number {
    const match = duration.match(/^(\d+)([smhd])$/);
    if (!match) return 15 * 60;
    const value = parseInt(match[1]);
    const unit = match[2];
    const map: Record<string, number> = { s: 1, m: 60, h: 3600, d: 86400 };
    return value * map[unit];
  }
}
