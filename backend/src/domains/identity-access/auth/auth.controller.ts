import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Body,
  Query,
  Param,
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
import { RateLimit } from '../../../common/guards/rate-limit.guard';
import { Response } from 'express';
import { DeleteAccountDto } from './dto/delete-account.dto';
import { AccountDeletionService } from '../users/account-deletion.service';
import { AuthGuard } from '@nestjs/passport';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { extensionForMimetype } from '../../../common/utils/upload-extension.util';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshDto } from './dto/refresh.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { VerifyTwoFactorDto } from './dto/verify-two-factor.dto';
import { DisableTwoFactorDto } from './dto/disable-two-factor.dto';
import { VerifyLoginTwoFactorDto } from './dto/verify-login-two-factor.dto';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { JwtRefreshGuard } from '../../../common/guards/jwt-refresh.guard';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { ConfigService } from '@nestjs/config';
import {
  setAuthCookies,
  clearAuthCookies,
} from '../../../common/utils/auth-cookies.util';

@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private config: ConfigService,
    private accountDeletion: AccountDeletionService
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
    const frontendUrl = this.config.get<string>(
      'FRONTEND_URL',
      'http://localhost:3000'
    );

    try {
      const { accessToken, refreshToken } =
        await this.authService.loginWithGoogle(req.user);

      setAuthCookies(res, accessToken, refreshToken, this.config);
      return res.redirect(`${frontendUrl}/auth/google/callback?success=1`);
    } catch {
      return res.redirect(`${frontendUrl}/auth/google/callback?error=1`);
    }
  }

  // ─── Credentials auth ────────────────────────────────────────────────────────

  @Post('register')
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @RateLimit({
    windowMs: 60 * 60 * 1000, // 1 hora
    maxRequests: 3, // Máximo 3 registros por hora
    keyGenerator: (req) => `register:${req.ip}`, // Por IP
  })
  async register(
    @Body() dto: RegisterDto,
    @Request() req: any,
    @Res({ passthrough: true }) res: Response
  ) {
    const result = await this.authService.register(dto, req.securityContext);
    setAuthCookies(res, result.accessToken, result.refreshToken, this.config);
    return result;
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @RateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    maxRequests: 20, // Máximo 20 intentos de login
    keyGenerator: (req) => `login:${req.ip}`, // Por IP
  })
  async login(
    @Body() dto: LoginDto,
    @Request() req: any,
    @Res({ passthrough: true }) res: Response
  ) {
    const result = await this.authService.login(dto, req.securityContext);
    if ('requiresTwoFactor' in result) return result;
    setAuthCookies(
      res,
      result.accessToken,
      result.refreshToken,
      this.config,
      dto.rememberMe ?? true
    );
    return result;
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtRefreshGuard)
  @RateLimit({
    windowMs: 5 * 60 * 1000, // 5 minutos
    maxRequests: 50, // Máximo 50 refresh tokens
    keyGenerator: (req: any) =>
      `refresh:${(req.user as any)?.userId || req.ip}`, // Por usuario o IP
  })
  async refresh(
    @Request() req: any,
    @Body() dto: RefreshDto,
    @Res({ passthrough: true }) res: Response
  ) {
    const result = await this.authService.refreshTokens(
      req.user.userId,
      req.user.refreshToken,
      req.securityContext
    );
    setAuthCookies(res, result.accessToken, result.refreshToken, this.config);
    return result;
  }

  // ─── 2FA / TOTP ───────────────────────────────────────────────────────────────

  @Post('2fa/setup')
  @UseGuards(JwtAuthGuard)
  async setupTwoFactor(@CurrentUser() user: any) {
    return this.authService.setupTwoFactor(user.id);
  }

  @Post('2fa/enable')
  @UseGuards(JwtAuthGuard)
  async enableTwoFactor(
    @CurrentUser() user: any,
    @Body() dto: VerifyTwoFactorDto
  ) {
    return this.authService.enableTwoFactor(user.id, dto);
  }

  @Post('2fa/disable')
  @UseGuards(JwtAuthGuard)
  async disableTwoFactor(
    @CurrentUser() user: any,
    @Body() dto: DisableTwoFactorDto
  ) {
    return this.authService.disableTwoFactor(user.id, dto);
  }

  @Post('2fa/verify-login')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @RateLimit({
    windowMs: 5 * 60 * 1000, // 5 minutos
    maxRequests: 10, // Máximo 10 intentos de verificación 2FA
    keyGenerator: (req) => `2fa-verify:${req.body?.sessionId || req.ip}`,
  })
  async verifyLoginTwoFactor(
    @Body() dto: VerifyLoginTwoFactorDto,
    @Res({ passthrough: true }) res: Response
  ) {
    const result = await this.authService.verifyLoginTwoFactor(dto);
    setAuthCookies(res, result.accessToken, result.refreshToken, this.config);
    return result;
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  async logout(
    @CurrentUser() user: any,
    @Body('refreshToken') refreshToken?: string,
    @Request() req?: any,
    @Res({ passthrough: true }) res?: Response
  ) {
    // Revoca refresh tokens en DB (no necesita Redis blacklist)
    const token = refreshToken ?? req?.cookies?.['refresh_token'];
    await this.authService.logout(user.id, token, req?.securityContext);
    if (res) clearAuthCookies(res, this.config);
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

  // Qué impide hoy borrar la cuenta (saldo, pagos protegidos abiertos,
  // depósitos pendientes…). Vacío = se puede borrar.
  @Get('me/deletion-check')
  @UseGuards(JwtAuthGuard)
  async getDeletionBlockers(@CurrentUser() user: any) {
    return { blockers: await this.accountDeletion.getBlockers(user.id) };
  }

  // Borrado de cuenta a pedido del usuario (Google Play lo exige dentro de
  // la app). Anonimiza y desactiva; ver AccountDeletionService.
  @Delete('me')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @Throttle({ default: { limit: 3, ttl: 60000 } })
  async deleteAccount(
    @CurrentUser() user: any,
    @Body() _dto: DeleteAccountDto,
    @Request() req: any,
    @Res({ passthrough: true }) res: Response
  ) {
    await this.accountDeletion.deleteAccount(user.id, {
      ip: req.ip,
      userAgent: req.headers?.['user-agent'],
    });
    clearAuthCookies(res, this.config);
    return { message: 'Tu cuenta fue eliminada' };
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
          cb(null, unique + extensionForMimetype(file.mimetype));
        },
      }),
      fileFilter: (_req, file, cb) => {
        if (
          !file.mimetype.match(/^image\/(jpeg|png|webp|gif)$/) ||
          !extensionForMimetype(file.mimetype)
        ) {
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
    keyGenerator: (req) => `reset:${req.ip}`, // Por IP
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
  @Throttle({ default: { limit: 3, ttl: 60000 } })
  // Por IP, no por usuario: los guards globales (RateLimitGuard es
  // APP_GUARD) corren antes que JwtAuthGuard a nivel de método, así que
  // req.user todavía no está poblado en este punto del pipeline.
  @RateLimit({
    windowMs: 60 * 60 * 1000,
    maxRequests: 5,
    keyGenerator: (req: any) => `send-verify:${req.ip}`,
  })
  async sendVerification(@CurrentUser() user: any) {
    return this.authService.sendVerificationEmail(user.id);
  }

  @Post('send-verification-by-email')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 3, ttl: 60000 } })
  @RateLimit({
    windowMs: 60 * 60 * 1000,
    maxRequests: 5,
    keyGenerator: (req) => `send-verify:${req.body?.email || req.ip}`,
  })
  async sendVerificationByEmail(@Body('email') email: string) {
    return this.authService.sendVerificationEmailByEmail(email);
  }

  @Post('verify-email')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  async verifyEmail(@Body('token') token: string) {
    return this.authService.verifyEmail(token);
  }

  @Get('demo-credentials')
  async getDemoCredentials() {
    // APP_ENV=production bloquea este endpoint sin importar USE_DEMO: una
    // sola variable mal configurada (p.ej. USE_DEMO=true copiado de un .env
    // de staging) no debe poder exponer la contraseña del SUPERADMIN demo
    // en un entorno marcado como producción.
    if (this.config.get('APP_ENV') === 'production') {
      throw new ForbiddenException('Solo disponible en desarrollo');
    }
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

  // ─── Sessions / Devices ──────────────────────────────────────────────────────

  @Get('sessions')
  @UseGuards(JwtAuthGuard)
  async getSessions(@CurrentUser() user: any, @Request() req: any) {
    const currentRefreshToken = req?.cookies?.['refresh_token'];
    return this.authService.getActiveSessions(user.id, currentRefreshToken);
  }

  @Delete('sessions/:id')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  async revokeSession(@CurrentUser() user: any, @Param('id') id: string) {
    return this.authService.revokeSession(user.id, id);
  }

  @Delete('sessions')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  async revokeAllSessions(@CurrentUser() user: any) {
    return this.authService.revokeAllSessions(user.id);
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
