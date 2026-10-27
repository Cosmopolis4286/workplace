import {
  Injectable,
  UnauthorizedException,
  ForbiddenException,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import * as path from 'path';
import { JwtService, JwtSignOptions } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { I18nService } from 'nestjs-i18n';
import { v4 as uuidv4 } from 'uuid';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { userFindByIdCacheKey } from '../../../common/utils/cache-keys.util';
import { PrismaService } from '../../../prisma/prisma.service';
import { RedisService } from '../../../redis/redis.service';
import { MailService } from '../../engagement/mail/mail.service';
import { AuditService } from '../audit/audit.service';
import { AuditAction, ProfileType, ProfileStatus, Role } from '@prisma/client';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { VerifyLoginTwoFactorDto } from './dto/verify-login-two-factor.dto';
import { VerifyTwoFactorDto } from './dto/verify-two-factor.dto';
import { DisableTwoFactorDto } from './dto/disable-two-factor.dto';
import { TwoFactorService } from './two-factor.service';
import { RecaptchaService } from '../../../common/recaptcha/recaptcha.service';
import {
  encryptSecret,
  decryptSecret,
  hashToken,
} from '../../../common/utils/crypto.util';
import { AccountTypeResolver } from '../../../common/account-type/account-type.resolver';
import { capabilitiesFrom } from '../../../common/capabilities/capabilities.service';

const MAX_LOGIN_ATTEMPTS = 5;
// Duración del refresh token cuando el usuario NO marca "mantener sesión
// iniciada" — más corta que JWT_REFRESH_EXPIRES_IN (7d por defecto) pero
// suficiente para no perder la sesión en medio de una jornada de trabajo.
const SHORT_REFRESH_EXPIRES_IN = '1d';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private config: ConfigService,
    private prisma: PrismaService,
    private redis: RedisService,
    private mail: MailService,
    private audit: AuditService,
    private i18n: I18nService,
    private twoFactor: TwoFactorService,
    private recaptcha: RecaptchaService,
    private accountTypeResolver: AccountTypeResolver
  ) {}

  async register(dto: RegisterDto, securityContext?: any) {
    const recaptchaOk = await this.recaptcha.verify(
      dto.recaptchaToken,
      'register',
      securityContext?.ipAddress
    );
    if (!recaptchaOk) {
      throw new ForbiddenException(this.i18n.t('auth.recaptcha.failed'));
    }

    const user = await this.usersService.create({
      ...dto,
      acceptTerms: dto.acceptTerms,
    });
    const tokens = await this.generateTokens(user.id, user.email, user.role);
    await this.saveRefreshToken(
      user.id,
      tokens.refreshToken,
      undefined,
      undefined,
      undefined,
      tokens.jti
    );

    // Send verification email automatically
    await this.sendVerificationEmail(user.id).catch((err) => {
      this.logger.warn(`Failed to send verification email: ${err.message}`);
    });

    return { user, ...tokens };
  }

  async login(dto: LoginDto, securityContext?: any) {
    const ip = securityContext?.ipAddress;
    const userAgent = securityContext?.userAgent;

    const recaptchaOk = await this.recaptcha.verify(
      dto.recaptchaToken,
      'login',
      ip
    );
    if (!recaptchaOk) {
      throw new ForbiddenException(this.i18n.t('auth.recaptcha.failed'));
    }

    const attempts = await this.redis.getLoginAttempts(dto.email);
    if (attempts >= MAX_LOGIN_ATTEMPTS) {
      this.audit.log({
        userEmail: dto.email,
        action: AuditAction.LOGIN,
        module: 'auth',
        summary: `[LOGIN_BLOCKED] ${dto.email} — demasiados intentos fallidos`,
        details: { reason: 'too_many_attempts' },
        ip,
        userAgent,
        statusCode: 403,
      });
      throw new ForbiddenException(this.i18n.t('auth.login.blocked'));
    }

    const user = await this.usersService.findByEmail(dto.email);
    if (!user) {
      await this.redis.incrementLoginAttempts(dto.email);
      this.audit.log({
        userEmail: dto.email,
        action: AuditAction.LOGIN,
        module: 'auth',
        summary: `[LOGIN_FAILED] ${dto.email} — usuario no encontrado`,
        details: { reason: 'user_not_found' },
        ip,
        userAgent,
        statusCode: 401,
      });
      throw new UnauthorizedException(
        this.i18n.t('auth.login.invalid_credentials')
      );
    }

    const valid = await this.usersService.validatePassword(
      dto.password,
      user.password
    );
    if (!valid) {
      await this.redis.incrementLoginAttempts(dto.email);
      this.audit.log({
        userId: user.id,
        userEmail: user.email,
        userRole: user.role,
        action: AuditAction.LOGIN,
        module: 'auth',
        summary: `[LOGIN_FAILED] ${user.email} — contraseña incorrecta`,
        details: { reason: 'invalid_password' },
        ip,
        userAgent,
        statusCode: 401,
      });
      throw new UnauthorizedException(
        this.i18n.t('auth.login.invalid_credentials')
      );
    }

    await this.redis.resetLoginAttempts(dto.email);

    if (user.twoFactorEnabled) {
      const sessionId = uuidv4();
      await this.redis.setex(
        `2fa-pending:${sessionId}`,
        300,
        JSON.stringify({ userId: user.id, securityContext })
      );

      this.audit.log({
        userId: user.id,
        userEmail: user.email,
        userRole: user.role,
        action: AuditAction.LOGIN,
        module: 'auth',
        summary: `[LOGIN_2FA_PENDING] ${user.email} — esperando verificación 2FA`,
        ip,
        userAgent,
        statusCode: 200,
      });

      return { requiresTwoFactor: true as const, sessionId };
    }

    const { password, ...safeUser } = user;
    const refreshExpiresIn = dto.rememberMe
      ? this.config.get('JWT_REFRESH_EXPIRES_IN', '7d')
      : SHORT_REFRESH_EXPIRES_IN;
    const tokens = await this.generateTokens(
      user.id,
      user.email,
      user.role,
      refreshExpiresIn
    );
    await this.saveRefreshToken(
      user.id,
      tokens.refreshToken,
      securityContext,
      undefined,
      refreshExpiresIn,
      tokens.jti
    );

    // Crear sesión activa
    if (securityContext) {
      await this.createUserSession(user.id, securityContext);
    }

    this.audit.log({
      userId: user.id,
      userEmail: user.email,
      userRole: user.role,
      action: AuditAction.LOGIN,
      module: 'auth',
      summary: `[LOGIN] ${user.email} — inicio de sesión exitoso`,
      ip,
      userAgent,
      statusCode: 200,
    });

    return { user: safeUser, ...tokens };
  }

  // --- 2FA / TOTP ---

  async verifyLoginTwoFactor(dto: VerifyLoginTwoFactorDto) {
    const pendingRaw = await this.redis.get(`2fa-pending:${dto.sessionId}`);
    if (!pendingRaw) {
      // errorCode machine-readable además de `message` (que sí se traduce
      // y puede cambiar de copy/idioma) — el frontend debe decidir la
      // pantalla de "sesión expirada" por código, no parseando el string.
      throw new UnauthorizedException({
        message: this.i18n.t('auth.2fa.session_expired'),
        errorCode: 'TWO_FA_SESSION_EXPIRED',
      });
    }

    const { userId, securityContext } = JSON.parse(pendingRaw);

    const user = await this.usersService.findByIdWithTwoFactor(userId);
    if (!user?.twoFactorEnabled || !user.twoFactorSecret) {
      throw new UnauthorizedException(this.i18n.t('auth.2fa.not_enabled'));
    }

    const decryptedSecret = decryptSecret(
      user.twoFactorSecret,
      this.config.get('ENCRYPTION_KEY')
    );
    const validTotp = this.twoFactor.verifyToken(dto.code, decryptedSecret);
    const validBackup =
      !validTotp && (await this.consumeBackupCodeIfValid(userId, dto.code));

    if (!validTotp && !validBackup) {
      this.audit.log({
        userId: user.id,
        userEmail: user.email,
        userRole: user.role,
        action: AuditAction.LOGIN,
        module: 'auth',
        summary: `[LOGIN_2FA_FAILED] ${user.email} — código 2FA inválido`,
        ip: securityContext?.ipAddress,
        userAgent: securityContext?.userAgent,
        statusCode: 401,
      });
      throw new UnauthorizedException(this.i18n.t('auth.2fa.invalid_code'));
    }

    await this.redis.del(`2fa-pending:${dto.sessionId}`);

    const fullUser = await this.usersService.findByEmail(user.email);
    const { password, ...safeUser } = fullUser as typeof fullUser & {
      password: string;
    };
    const tokens = await this.generateTokens(user.id, user.email, user.role);
    await this.saveRefreshToken(
      user.id,
      tokens.refreshToken,
      securityContext,
      undefined,
      undefined,
      tokens.jti
    );

    if (securityContext) {
      await this.createUserSession(user.id, securityContext);
    }

    this.audit.log({
      userId: user.id,
      userEmail: user.email,
      userRole: user.role,
      action: AuditAction.LOGIN,
      module: 'auth',
      summary: `[LOGIN_2FA] ${user.email} — 2FA verificado`,
      ip: securityContext?.ipAddress,
      userAgent: securityContext?.userAgent,
      statusCode: 200,
    });

    return { user: safeUser, ...tokens };
  }

  async setupTwoFactor(userId: string) {
    const user = await this.usersService.findByIdWithTwoFactor(userId);
    if (!user) throw new NotFoundException(this.i18n.t('auth.user.not_found'));
    if (user.twoFactorEnabled) {
      throw new BadRequestException(this.i18n.t('auth.2fa.already_enabled'));
    }

    const { secret, otpAuthUrl } = this.twoFactor.generateSecret(user.email);
    await this.redis.setex(`2fa-setup:${userId}`, 600, secret);

    const qrCodeDataUrl =
      await this.twoFactor.generateQrCodeDataUrl(otpAuthUrl);
    return { secret, qrCodeDataUrl, otpAuthUrl };
  }

  async enableTwoFactor(userId: string, dto: VerifyTwoFactorDto) {
    const user = await this.usersService.findByIdWithTwoFactor(userId);
    if (!user) throw new NotFoundException(this.i18n.t('auth.user.not_found'));
    if (user.twoFactorEnabled) {
      throw new BadRequestException(this.i18n.t('auth.2fa.already_enabled'));
    }

    const pendingSecret = await this.redis.get(`2fa-setup:${userId}`);
    if (!pendingSecret) {
      throw new BadRequestException(this.i18n.t('auth.2fa.setup_required'));
    }

    if (!this.twoFactor.verifyToken(dto.code, pendingSecret)) {
      throw new UnauthorizedException(this.i18n.t('auth.2fa.invalid_code'));
    }

    const encryptedSecret = encryptSecret(
      pendingSecret,
      this.config.get('ENCRYPTION_KEY')
    );
    const backupCodes = this.twoFactor.generateBackupCodes();
    const hashedCodes = await this.twoFactor.hashBackupCodes(backupCodes);

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: userId },
        data: {
          twoFactorEnabled: true,
          twoFactorSecret: encryptedSecret,
          twoFactorEnabledAt: new Date(),
        },
      }),
      this.prisma.twoFactorBackupCode.createMany({
        data: hashedCodes.map((codeHash) => ({ userId, codeHash })),
      }),
    ]);

    await this.redis.del(`2fa-setup:${userId}`);
    await this.redis.del(userFindByIdCacheKey(userId));

    this.audit.log({
      userId: user.id,
      userEmail: user.email,
      userRole: user.role,
      action: AuditAction.OTHER,
      module: 'auth',
      summary: `[2FA_ENABLED] ${user.email} — verificación en dos pasos activada`,
      statusCode: 200,
    });

    return { enabled: true, backupCodes };
  }

  async disableTwoFactor(userId: string, dto: DisableTwoFactorDto) {
    const user = await this.usersService.findByIdWithTwoFactor(userId);
    if (!user) throw new NotFoundException(this.i18n.t('auth.user.not_found'));
    if (!user.twoFactorEnabled || !user.twoFactorSecret) {
      throw new BadRequestException(this.i18n.t('auth.2fa.not_enabled'));
    }

    const fullUser = await this.prisma.user.findUnique({
      where: { id: userId },
    });
    const validPassword = await this.usersService.validatePassword(
      dto.password,
      fullUser.password
    );
    if (!validPassword) {
      throw new UnauthorizedException(this.i18n.t('auth.2fa.invalid_password'));
    }

    const decryptedSecret = decryptSecret(
      user.twoFactorSecret,
      this.config.get('ENCRYPTION_KEY')
    );
    const validTotp = this.twoFactor.verifyToken(dto.code, decryptedSecret);
    const validBackup =
      !validTotp && (await this.consumeBackupCodeIfValid(userId, dto.code));

    if (!validTotp && !validBackup) {
      throw new UnauthorizedException(this.i18n.t('auth.2fa.invalid_code'));
    }

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: userId },
        data: {
          twoFactorEnabled: false,
          twoFactorSecret: null,
          twoFactorEnabledAt: null,
        },
      }),
      this.prisma.twoFactorBackupCode.deleteMany({ where: { userId } }),
    ]);
    await this.redis.del(userFindByIdCacheKey(userId));

    this.audit.log({
      userId: user.id,
      userEmail: user.email,
      userRole: user.role,
      action: AuditAction.OTHER,
      module: 'auth',
      summary: `[2FA_DISABLED] ${user.email} — verificación en dos pasos desactivada`,
      statusCode: 200,
    });

    return { enabled: false };
  }

  private async consumeBackupCodeIfValid(
    userId: string,
    code: string
  ): Promise<boolean> {
    const backupCodes = await this.prisma.twoFactorBackupCode.findMany({
      where: { userId, usedAt: null },
    });

    for (const backupCode of backupCodes) {
      if (await bcrypt.compare(code, backupCode.codeHash)) {
        await this.prisma.twoFactorBackupCode.update({
          where: { id: backupCode.id },
          data: { usedAt: new Date() },
        });
        return true;
      }
    }

    return false;
  }

  async refreshTokens(
    userId: string,
    oldRefreshToken: string,
    securityContext?: any
  ) {
    const stored = await this.prisma.refreshToken.findUnique({
      where: { token: hashToken(oldRefreshToken) },
    });

    if (stored?.revokedAt && stored.userId === userId) {
      // A revoked token being presented again can indicate replay. Record it,
      // but do not log the raw token or treat every concurrent request as proof
      // of account compromise.
      await this.logSecurityEvent(userId, 'REVOKED_REFRESH_TOKEN_REUSE', {
        refreshTokenId: stored.id,
      }).catch(() =>
        this.logger.warn('Could not record revoked refresh-token reuse')
      );
    }

    if (
      !stored ||
      stored.userId !== userId ||
      stored.expiresAt < new Date() ||
      stored.revokedAt
    ) {
      throw new ForbiddenException(this.i18n.t('auth.refresh.invalid_token'));
    }

    // Validar contexto de seguridad
    if (securityContext && stored.ipAddress && stored.deviceInfo) {
      if (stored.ipAddress !== securityContext.ipAddress) {
        await this.logSecurityEvent(userId, 'REFRESH_IP_MISMATCH', {
          expectedIp: stored.ipAddress,
          actualIp: securityContext.ipAddress,
        });
        throw new ForbiddenException(this.i18n.t('auth.refresh.ip_mismatch'));
      }

      if (stored.deviceInfo !== securityContext.userAgent) {
        await this.logSecurityEvent(userId, 'REFRESH_DEVICE_MISMATCH', {
          expectedDevice: stored.deviceInfo,
          actualDevice: securityContext.userAgent,
        });
        // Permitir pero registrar como sospechoso
      }
    }

    // Do not rotate credentials for a deleted, disabled, or suspended account.
    // Read account state directly from the database, not the user cache:
    // disabling an account must take effect immediately for refresh requests.
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, role: true, isActive: true },
    });
    if (!user || !user.isActive) {
      throw new ForbiddenException(this.i18n.t('auth.refresh.invalid_token'));
    }

    // Prepare the replacement, then consume the old token with a conditional
    // update inside the same DB transaction. Concurrent refresh requests race
    // on revokedAt=null; exactly one can win. If inserting the new token fails,
    // the transaction rolls the revocation back as well.
    const now = new Date();
    // Preserve the session's original lifetime policy (e.g. remember-me 7d
    // versus browser-session 1d) when sliding the refresh window.
    const refreshLifetimeSeconds = Math.max(
      1,
      Math.floor(
        (stored.expiresAt.getTime() - stored.createdAt.getTime()) / 1000
      )
    );
    const tokens = await this.generateTokens(
      user.id,
      user.email,
      user.role,
      refreshLifetimeSeconds
    );
    const replacementId = uuidv4();
    const expiresAt = new Date(Date.now() + refreshLifetimeSeconds * 1000);

    const consumed = await this.prisma.$transaction(async (tx) => {
      const result = await tx.refreshToken.updateMany({
        where: {
          id: stored.id,
          userId,
          revokedAt: null,
          expiresAt: { gt: now },
        },
        data: { revokedAt: now, replacedByTokenId: replacementId },
      });

      if (result.count !== 1) return false;

      await tx.refreshToken.create({
        data: {
          id: replacementId,
          token: hashToken(tokens.refreshToken),
          userId,
          expiresAt,
          ipAddress: securityContext?.ipAddress ?? stored.ipAddress,
          deviceInfo: securityContext?.userAgent ?? stored.deviceInfo,
          replacedByTokenId: null,
          jti: tokens.jti,
        },
      });
      return true;
    });

    if (!consumed) {
      await this.logSecurityEvent(userId, 'REFRESH_TOKEN_REUSE_OR_RACE', {
        refreshTokenId: stored.id,
      }).catch((error) =>
        this.logger.warn('Could not record refresh-token reuse event', error)
      );
      throw new ForbiddenException(this.i18n.t('auth.refresh.invalid_token'));
    }

    // Actualizar sesión solo después de que la rotación se haya confirmado.
    if (securityContext) {
      await this.updateUserSession(userId, securityContext);
    }

    return tokens;
  }

  async loginWithGoogle(googleUser: {
    googleId: string;
    email: string;
    firstName: string;
    lastName: string;
    avatar?: string;
  }) {
    let user: any = await this.usersService.findByEmail(googleUser.email);
    let isNewUser = false;

    if (!user) {
      isNewUser = true;
      // Placeholder name — user will complete it in onboarding
      const commerceName = `__pending__${googleUser.firstName}`;
      user = await this.usersService.create({
        email: googleUser.email,
        password: uuidv4(),
        firstName: googleUser.firstName,
        lastName: googleUser.lastName,
        commerceName,
        role: Role.PROFESIONAL,
        businessProfileType: ProfileType.BUSINESS,
      });
    }

    if (googleUser.avatar && !user.avatar) {
      await this.usersService.updateAvatar(user.id, googleUser.avatar);
    }

    const tokens = await this.generateTokens(user.id, user.email, user.role);
    await this.saveRefreshToken(
      user.id,
      tokens.refreshToken,
      undefined,
      undefined,
      undefined,
      tokens.jti
    );

    const { password, ...safeUser } = user as typeof user & {
      password?: string;
    };

    // Signal the frontend to redirect to onboarding for new Google registrations
    const needsOnboarding =
      isNewUser ||
      (safeUser.commerce?.name as string | undefined)?.startsWith(
        '__pending__'
      );

    return { user: safeUser, ...tokens, needsOnboarding };
  }

  async logout(userId: string, refreshToken?: string, securityContext?: any) {
    // 1. Obtener JTI de los tokens activos para blacklist (columna jti
    // dedicada — el campo `token` es un hash desde el que ya no se puede
    // decodificar el JWT, ver RefreshToken en schema.prisma).
    const activeTokens = await this.prisma.refreshToken.findMany({
      where: { userId, revokedAt: null },
      select: { jti: true },
    });

    // 2. Blacklist los JTI de los tokens JWT activos
    for (const token of activeTokens) {
      if (token.jti) {
        // Blacklist por 15 minutos (tiempo de vida del access token)
        await this.redis.blacklistToken(token.jti, 900);
      }
    }

    // 3. Revocar el refresh token específico si se proporciona
    if (refreshToken) {
      await this.prisma.refreshToken.updateMany({
        where: { token: hashToken(refreshToken), userId },
        data: { revokedAt: new Date() },
      });
    }

    // 4. También revocar todos los refresh tokens del usuario (logout global)
    await this.prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });

    // 5. Eliminar todas las sesiones activas
    await this.clearAllUserSessions(userId);

    // 6. Registrar evento de logout
    if (securityContext) {
      await this.logSecurityEvent(userId, 'LOGOUT', {
        ipAddress: securityContext.ipAddress,
        userAgent: securityContext.userAgent,
        deviceFingerprint: securityContext.deviceFingerprint,
      });
    }
  }

  async getActiveSessions(userId: string, currentRefreshToken?: string) {
    const sessions = await this.prisma.refreshToken.findMany({
      where: {
        userId,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        token: true,
        ipAddress: true,
        deviceInfo: true,
        createdAt: true,
        expiresAt: true,
      },
    });

    const currentHash = currentRefreshToken
      ? hashToken(currentRefreshToken)
      : undefined;
    return sessions.map(({ token, ...session }) => ({
      ...session,
      isCurrent: !!currentHash && token === currentHash,
    }));
  }

  async revokeSession(userId: string, sessionId: string) {
    const session = await this.prisma.refreshToken.findUnique({
      where: { id: sessionId },
    });

    if (!session || session.userId !== userId) {
      throw new NotFoundException(this.i18n.t('auth.session.not_found'));
    }

    if (session.jti) {
      await this.redis.blacklistToken(session.jti, 900);
    }

    await this.prisma.refreshToken.update({
      where: { id: sessionId },
      data: { revokedAt: new Date() },
    });

    return { message: this.i18n.t('auth.session.revoked') };
  }

  async revokeAllSessions(userId: string) {
    const tokens = await this.prisma.refreshToken.findMany({
      where: { userId, revokedAt: null },
      select: { id: true, jti: true },
    });

    for (const t of tokens) {
      if (t.jti) await this.redis.blacklistToken(t.jti, 900);
    }

    await this.prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });

    await this.clearAllUserSessions(userId);
    return { message: 'Todas las sesiones han sido cerradas' };
  }

  async getProfile(userId: string) {
    const user = await this.usersService.findById(userId);
    // Role.PROFESIONAL ya no distingue "tiene Commerce" de "es freelancer/
    // service provider" — el frontend necesita accountType para las pantallas
    // que sí requieren esa distinción (dashboard, settings, reports...).
    // `profiles` (aditivo, IDENTITY_ARCHITECTURE_PLAN.md paso 5) expone la
    // lista completa de UserProfile ACTIVE — incluye CUSTOMER/JOB_SEEKER, no
    // solo el accountType colapsado — para que el frontend pueda construir
    // un selector de contexto sin una llamada aparte a /profiles.
    const { accountType, activeProfiles } =
      await this.accountTypeResolver.resolveDetailed(userId);
    // `capabilities`: mismos hechos que usan CapabilityGuard/ModuleAccessGuard
    // (misma función, capabilitiesFrom) — el frontend decide "¿muestro la
    // sección de comercio?" con HAS_COMMERCE en vez de inferirlo de
    // accountType, que colapsa perfiles y no sabe si existe el Commerce.
    const capabilities = capabilitiesFrom({
      hasCommerce: !!user.commerce,
      activeProfileTypes: activeProfiles.map((p) => p.type),
    });
    return { ...user, accountType, profiles: activeProfiles, capabilities };
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    return this.usersService.updateProfile(userId, dto);
  }

  async changePassword(userId: string, dto: ChangePasswordDto) {
    return this.usersService.changePassword(userId, dto);
  }

  async updateAvatar(userId: string, avatarUrl: string) {
    return this.usersService.updateAvatar(userId, avatarUrl);
  }

  async checkUsername(username: string, currentUserId: string) {
    return this.usersService.checkUsernameAvailability(username, currentUserId);
  }

  async getDemoCredentials() {
    // Buscar usuarios marcados como DEMO en la BD (dinámico, no array fijo)
    const demoUsers = await this.prisma.user.findMany({
      where: { userType: 'DEMO' },
      include: {
        commerce: true,
        category: true,
        subcategory: true,
        // Desde el refactor a Role.PROFESIONAL (2026-08-25), user.role ya no
        // distingue el tipo de perfil de negocio — esa distinción vive solo
        // en UserProfile. Se exponen los 4 ProfileType reales (BUSINESS,
        // PROFESSIONAL, JOB_SEEKER, CUSTOMER) en vez de reducirlos al
        // COMMERCE|FREELANCER de AccountTypeResolver.resolve() — ese
        // resolver simplifica a propósito para sus otros consumidores
        // (colapsa BUSINESS+PROFESSIONAL a un solo "tipo de cuenta de
        // negocio"), pero acá queremos la distinción completa.
        profiles: {
          where: { status: ProfileStatus.ACTIVE },
          select: { type: true, subtype: true },
        },
      },
    });

    if (demoUsers.length === 0) {
      throw new ForbiddenException(this.i18n.t('auth.demo.no_users'));
    }

    // Misma fuente que el seed (prisma/data/demo-passwords.js, con override
    // DEMO_PWD_*): la lista propia de antes caía en 'Demo123', que no es la
    // contraseña sembrada, y el login con las credenciales mostradas fallaba.
    const emailPasswords = loadDemoPasswords();

    const credentials = demoUsers.map((user) => {
      const profiles = (user as any).profiles as {
        type: ProfileType;
        subtype: string | null;
      }[];
      // Si tiene varios perfiles activos a la vez, prioriza el más
      // específico para representar en la tarjeta (mismo orden de
      // prioridad que AccountTypeResolver: BUSINESS > PROFESSIONAL).
      const profile =
        profiles.find((p) => p.type === ProfileType.BUSINESS) ??
        profiles.find((p) => p.type === ProfileType.PROFESSIONAL) ??
        profiles.find((p) => p.type === ProfileType.JOB_SEEKER) ??
        profiles.find((p) => p.type === ProfileType.CUSTOMER) ??
        null;
      const profileType = profile?.type ?? null;
      const subtype = profile?.subtype ?? null;

      return {
        role: user.role,
        profileType,
        subtype,
        email: user.email,
        password: emailPasswords[user.email] ?? null,
        label: `${user.firstName} ${user.lastName}`,
        description: this.getRoleDescription(user.role, profileType, subtype),
        commerceName: (user as any).commerce?.name ?? null,
        categoryName: (user as any).category?.name ?? null,
        categoryIcon: (user as any).category?.icon ?? null,
        subcategoryName: (user as any).subcategory?.name ?? null,
      };
    });

    return {
      success: true,
      data: credentials,
    };
  }

  private getRoleDescription(
    role: string,
    profileType: ProfileType | null,
    subtype: string | null
  ): string {
    if (role === 'SUPERADMIN')
      return 'Acceso total: gestiona todos los usuarios y roles';
    if (role === 'ADMIN')
      return 'Gestiona comercios, profesionales y usuarios normales';
    if (profileType === ProfileType.BUSINESS)
      return 'Comercio: tiene un negocio físico con catálogo propio';
    if (
      profileType === ProfileType.PROFESSIONAL &&
      subtype === 'SERVICE_PROVIDER'
    ) {
      return 'Trabajador autónomo: presta un servicio (ej. delivery, mantenimiento)';
    }
    if (profileType === ProfileType.PROFESSIONAL)
      return 'Freelancer: profesional independiente sin negocio físico';
    if (profileType === ProfileType.JOB_SEEKER)
      return 'Busca empleo en la plataforma';
    return 'Acceso básico de usuario final';
  }

  // --- Password Reset ---

  async requestPasswordReset(email: string) {
    const user = await this.usersService.findByEmail(email);
    // Always return success to prevent user enumeration
    if (!user) return { message: this.i18n.t('auth.password_reset.sent') };

    // Invalidate old tokens
    await this.prisma.passwordResetToken.updateMany({
      where: { userId: user.id, usedAt: null },
      data: { usedAt: new Date() },
    });

    const token = uuidv4();
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await this.prisma.passwordResetToken.create({
      data: { token: hashToken(token), userId: user.id, expiresAt },
    });

    // El email lleva el token crudo — solo el hash se persiste en DB.
    await this.mail.sendPasswordReset(user.email, token, user.firstName);
    return { message: this.i18n.t('auth.password_reset.sent') };
  }

  async resetPassword(token: string, newPassword: string) {
    const record = await this.prisma.passwordResetToken.findUnique({
      where: { token: hashToken(token) },
    });

    if (!record || record.usedAt || record.expiresAt < new Date()) {
      throw new BadRequestException(
        this.i18n.t('auth.password_reset.invalid_token')
      );
    }

    const hashed = await bcrypt.hash(newPassword, 10);

    const [updatedUser] = await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: record.userId },
        data: { password: hashed },
      }),
      this.prisma.passwordResetToken.update({
        where: { id: record.id },
        data: { usedAt: new Date() },
      }),
      // Invalidate all refresh tokens so they must log in again
      this.prisma.refreshToken.deleteMany({ where: { userId: record.userId } }),
    ]);

    this.mail
      .sendSecurityAlert(
        updatedUser.email,
        updatedUser.firstName,
        'password_reset'
      )
      .catch((err) => {
        this.logger.warn(
          `Failed to send password-reset security alert: ${err.message}`
        );
      });

    return { message: this.i18n.t('auth.password_reset.success') };
  }

  // --- Email Verification ---

  async sendVerificationEmail(userId: string) {
    const user = await this.usersService.findById(userId);
    if (!user) throw new NotFoundException(this.i18n.t('auth.user.not_found'));
    if ((user as any).emailVerified)
      return {
        message: this.i18n.t('auth.email_verification.already_verified'),
      };

    // Invalidate old tokens
    await this.prisma.emailVerificationToken.updateMany({
      where: { userId, usedAt: null },
      data: { usedAt: new Date() },
    });

    const token = uuidv4();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    await this.prisma.emailVerificationToken.create({
      data: { token: hashToken(token), userId, expiresAt },
    });

    // El email lleva el token crudo — solo el hash se persiste en DB.
    await this.mail.sendEmailVerification(user.email, token, user.firstName);
    return { message: this.i18n.t('auth.email_verification.sent') };
  }

  async sendVerificationEmailByEmail(email: string) {
    if (!email) return { message: this.i18n.t('auth.email_verification.sent') };
    const user = await this.usersService.findByEmail(email);
    // Always return success to prevent enumeration
    if (!user) return { message: this.i18n.t('auth.email_verification.sent') };
    if ((user as any).emailVerified)
      return {
        message: this.i18n.t('auth.email_verification.already_verified'),
      };
    return this.sendVerificationEmail(user.id);
  }

  async verifyEmail(token: string) {
    const record = await this.prisma.emailVerificationToken.findUnique({
      where: { token: hashToken(token) },
    });

    if (!record || record.usedAt || record.expiresAt < new Date()) {
      throw new BadRequestException(
        this.i18n.t('auth.email_verification.invalid_token')
      );
    }

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: record.userId },
        data: { emailVerified: true },
      }),
      this.prisma.emailVerificationToken.update({
        where: { id: record.id },
        data: { usedAt: new Date() },
      }),
    ]);
    await this.redis.del(userFindByIdCacheKey(record.userId));

    return { message: this.i18n.t('auth.email_verification.success') };
  }

  // --- Helpers ---

  private async generateTokens(
    userId: string,
    email: string,
    role: Role,
    refreshExpiresIn?: JwtSignOptions['expiresIn']
  ) {
    const jti = uuidv4();

    const accessToken = this.jwtService.sign(
      { sub: userId, email, jti, role },
      {
        secret: this.config.get('JWT_SECRET'),
        expiresIn: this.config.get('JWT_EXPIRES_IN', '15m'),
      }
    );

    const refreshToken = this.jwtService.sign(
      { sub: userId, jti }, // Incluir JTI también en refresh token
      {
        secret: this.config.get('JWT_REFRESH_SECRET'),
        expiresIn:
          refreshExpiresIn ?? this.config.get('JWT_REFRESH_EXPIRES_IN', '7d'),
      }
    );

    return { accessToken, refreshToken, jti };
  }

  private decodeJWT(token: string): any {
    try {
      const payload = token.split('.')[1];
      return JSON.parse(Buffer.from(payload, 'base64').toString());
    } catch {
      return null;
    }
  }

  private async saveRefreshToken(
    userId: string,
    token: string,
    securityContext?: any,
    replacedByTokenId?: string,
    refreshExpiresIn?: string,
    jti?: string
  ) {
    const expiresIn =
      refreshExpiresIn ?? this.config.get('JWT_REFRESH_EXPIRES_IN', '7d');
    const ms = this.parseDuration(expiresIn);
    const expiresAt = new Date(Date.now() + ms);

    await this.prisma.refreshToken.create({
      data: {
        token: hashToken(token),
        userId,
        expiresAt,
        ipAddress: securityContext?.ipAddress,
        deviceInfo: securityContext?.userAgent,
        replacedByTokenId,
        jti: jti ?? this.decodeJWT(token)?.jti,
      },
    });
  }

  private async createUserSession(
    userId: string,
    securityContext: any
  ): Promise<void> {
    const sessionKey = `session:${userId}:${securityContext.deviceFingerprint}`;
    const sessionData = {
      userId,
      deviceFingerprint: securityContext.deviceFingerprint,
      ipAddress: securityContext.ipAddress,
      userAgent: securityContext.userAgent,
      createdAt: new Date(),
      lastActivity: new Date(),
    };

    // Sesión expira en 30 minutos de inactividad
    await this.redis.setex(sessionKey, 1800, JSON.stringify(sessionData));

    // Guardar contexto para detección de actividad sospechosa
    const suspiciousKey = `suspicious:${userId}`;
    await this.redis.setex(
      suspiciousKey,
      86400,
      JSON.stringify({
        ipAddress: securityContext.ipAddress,
        deviceFingerprint: securityContext.deviceFingerprint,
        userAgent: securityContext.userAgent,
      })
    );
  }

  private async updateUserSession(
    userId: string,
    securityContext: any
  ): Promise<void> {
    const sessionKey = `session:${userId}:${securityContext.deviceFingerprint}`;
    const sessionData = await this.redis.get(sessionKey);

    if (sessionData) {
      const session = JSON.parse(sessionData);
      session.lastActivity = new Date();

      // Extender TTL 30 minutos más
      await this.redis.setex(sessionKey, 1800, JSON.stringify(session));
    } else {
      // Recrear sesión si no existe
      await this.createUserSession(userId, securityContext);
    }
  }

  private async clearAllUserSessions(userId: string): Promise<void> {
    // Buscar todas las claves de sesión del usuario
    const pattern = `session:${userId}:*`;
    const keys = await this.redis.keys(pattern);

    if (keys.length > 0) {
      await this.redis.delMultiple(keys);
    }

    // Limpiar también el contexto sospechoso
    await this.redis.del(`suspicious:${userId}`);
  }

  private async logSecurityEvent(
    userId: string,
    eventType: string,
    details: any
  ): Promise<void> {
    const eventKey = `security-events:${userId}`;
    const event = {
      type: eventType,
      details,
      timestamp: new Date(),
      severity: this.getEventSeverity(eventType),
    };

    await this.redis.lpush(eventKey, JSON.stringify(event));
    await this.redis.ltrim(eventKey, 0, 99); // Mantener últimos 100 eventos

    this.logger.warn(
      `Security event for user ${userId}: ${eventType}`,
      details
    );
  }

  async getSecurityEvents(userId: string) {
    const eventKey = `security-events:${userId}`;
    const events = await this.redis.lrange(eventKey, 0, -1);

    return {
      success: true,
      data: events.map((event) => JSON.parse(event)).reverse(), // Más recientes primero
      count: events.length,
    };
  }

  private getEventSeverity(eventType: string): 'LOW' | 'MEDIUM' | 'HIGH' {
    const severityMap: Record<string, 'LOW' | 'MEDIUM' | 'HIGH'> = {
      LOGIN_SUCCESS: 'LOW',
      LOGIN_FAILED: 'MEDIUM',
      LOGOUT: 'LOW',
      REFRESH_IP_MISMATCH: 'HIGH',
      REFRESH_DEVICE_MISMATCH: 'MEDIUM',
      SESSION_EXPIRED: 'MEDIUM',
      MULTIPLE_FAILED_LOGIN: 'HIGH',
      TOKEN_REUSE: 'HIGH',
      BRUTE_FORCE_ATTEMPT: 'HIGH',
    };

    return severityMap[eventType] || 'LOW';
  }

  // --- Cleanup automático de sesiones expiradas ---
  async cleanupExpiredSessions(): Promise<void> {
    try {
      // Limpiar refresh tokens expirados
      const expiredTokens = await this.prisma.refreshToken.deleteMany({
        where: {
          expiresAt: {
            lt: new Date(),
          },
        },
      });

      if (expiredTokens.count > 0) {
        this.logger.log(
          `Cleaned up ${expiredTokens.count} expired refresh tokens`
        );
      }

      // Limpiar sesiones de Redis expiradas (Redis lo hace automáticamente con TTL)
      // Pero podemos limpiar claves huérfanas si es necesario
      const sessionPattern = 'session:*';
      const sessionKeys = await this.redis.keys(sessionPattern);

      let cleanedSessions = 0;
      for (const key of sessionKeys) {
        const sessionData = await this.redis.get(key);
        if (sessionData) {
          const session = JSON.parse(sessionData);
          const lastActivity = new Date(session.lastActivity);
          const inactiveMinutes =
            (Date.now() - lastActivity.getTime()) / (1000 * 60);

          if (inactiveMinutes > 60) {
            // Más de 1 hora de inactividad
            await this.redis.del(key);
            cleanedSessions++;
          }
        }
      }

      if (cleanedSessions > 0) {
        this.logger.log(`Cleaned up ${cleanedSessions} inactive sessions`);
      }
    } catch (error) {
      this.logger.error('Error during session cleanup:', error);
    }
  }

  private parseDuration(duration: string): number {
    const match = duration.match(/^(\d+)([smhd])$/);
    if (!match) return 7 * 24 * 60 * 60 * 1000;
    const value = parseInt(match[1]);
    const unit = match[2];
    const map: Record<string, number> = {
      s: 1000,
      m: 60 * 1000,
      h: 60 * 60 * 1000,
      d: 24 * 60 * 60 * 1000,
    };
    return value * map[unit];
  }
}

/**
 * prisma/data/demo-passwords.js se resuelve desde el directorio del backend
 * (cwd de la app en dev, Docker y producción: ahí vive prisma/), no relativo a
 * este archivo, que en dist/ queda a otra profundidad.
 */
function loadDemoPasswords(): Record<string, string> {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { DEMO_PASSWORDS } = require(
    path.join(process.cwd(), 'prisma', 'data', 'demo-passwords.js')
  );
  return DEMO_PASSWORDS;
}
