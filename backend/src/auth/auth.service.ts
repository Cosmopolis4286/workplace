import {
  Injectable,
  UnauthorizedException,
  ForbiddenException,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { v4 as uuidv4 } from 'uuid';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { MailService } from '../mail/mail.service';
import { Role } from '@prisma/client';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ChangePasswordDto } from './dto/change-password.dto';

const MAX_LOGIN_ATTEMPTS = 5;

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private config: ConfigService,
    private prisma: PrismaService,
    private redis: RedisService,
    private mail: MailService
  ) {}

  async register(dto: RegisterDto) {
    const user = await this.usersService.create(dto);
    const tokens = await this.generateTokens(user.id, user.email, user.role);
    await this.saveRefreshToken(user.id, tokens.refreshToken);
    
    // Send verification email automatically
    await this.sendVerificationEmail(user.id).catch((err) => {
      this.logger.warn(`Failed to send verification email: ${err.message}`);
    });
    
    return { user, ...tokens };
  }

  async login(dto: LoginDto, securityContext?: any) {
    const attempts = await this.redis.getLoginAttempts(dto.email);
    if (attempts >= MAX_LOGIN_ATTEMPTS) {
      throw new ForbiddenException(
        'Demasiados intentos fallidos. Espera 15 minutos.'
      );
    }

    const user = await this.usersService.findByEmail(dto.email);
    if (!user) {
      await this.redis.incrementLoginAttempts(dto.email);
      throw new UnauthorizedException('Credenciales incorrectas');
    }

    const valid = await this.usersService.validatePassword(
      dto.password,
      user.password
    );
    if (!valid) {
      await this.redis.incrementLoginAttempts(dto.email);
      throw new UnauthorizedException('Credenciales incorrectas');
    }

    await this.redis.resetLoginAttempts(dto.email);

    const { password, ...safeUser } = user;
    const tokens = await this.generateTokens(user.id, user.email, user.role);
    await this.saveRefreshToken(user.id, tokens.refreshToken, securityContext);
    
    // Crear sesión activa
    if (securityContext) {
      await this.createUserSession(user.id, securityContext);
    }

    return { user: safeUser, ...tokens };
  }

  async refreshTokens(userId: string, oldRefreshToken: string, securityContext?: any) {
    const stored = await this.prisma.refreshToken.findUnique({
      where: { token: oldRefreshToken },
    });

    if (!stored || stored.userId !== userId || stored.expiresAt < new Date() || stored.revokedAt) {
      throw new ForbiddenException('Refresh token inválido o expirado');
    }

    // Validar contexto de seguridad
    if (securityContext && stored.ipAddress && stored.deviceInfo) {
      if (stored.ipAddress !== securityContext.ipAddress) {
        await this.logSecurityEvent(userId, 'REFRESH_IP_MISMATCH', {
          expectedIp: stored.ipAddress,
          actualIp: securityContext.ipAddress
        });
        throw new ForbiddenException('Sesión inválida: cambio de IP detectado');
      }
      
      if (stored.deviceInfo !== securityContext.userAgent) {
        await this.logSecurityEvent(userId, 'REFRESH_DEVICE_MISMATCH', {
          expectedDevice: stored.deviceInfo,
          actualDevice: securityContext.userAgent
        });
        // Permitir pero registrar como sospechoso
      }
    }

    // Rotate: delete old, issue new
    await this.prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revokedAt: new Date() }
    });

    const user = await this.usersService.findById(userId);
    const tokens = await this.generateTokens(user.id, user.email, user.role);
    await this.saveRefreshToken(user.id, tokens.refreshToken, securityContext, stored.id);
    
    // Actualizar sesión
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
    // Find existing user by email or create a new COMMERCE account
    let user: any = await this.usersService.findByEmail(googleUser.email);

    if (!user) {
      // Auto-register: use email prefix as restaurant name placeholder
      const commerceName = `${googleUser.firstName}'s Commerce`;
      user = await this.usersService.create({
        email: googleUser.email,
        password: uuidv4(), // random unusable password — user logs in via Google
        firstName: googleUser.firstName,
        lastName: googleUser.lastName,
        commerceName,
        role: Role.COMMERCE,
      });
    }

    // Update avatar if provided and user doesn't have one yet
    if (googleUser.avatar && !user.avatar) {
      await this.usersService.updateAvatar(user.id, googleUser.avatar);
    }

    const tokens = await this.generateTokens(user.id, user.email, user.role);
    await this.saveRefreshToken(user.id, tokens.refreshToken);

    const { password, ...safeUser } = user as typeof user & {
      password?: string;
    };
    return { user: safeUser, ...tokens };
  }

  async logout(userId: string, refreshToken?: string, securityContext?: any) {
    // 1. Obtener JTI de los tokens activos para blacklist
    const activeTokens = await this.prisma.refreshToken.findMany({
      where: { userId, revokedAt: null },
      select: { token: true }
    });
    
    // 2. Blacklist los JTI de los tokens JWT activos (si se pueden extraer)
    for (const token of activeTokens) {
      try {
        const decoded = this.decodeJWT(token.token);
        if (decoded?.jti) {
          // Blacklist por 15 minutos (tiempo de vida del access token)
          await this.redis.blacklistToken(decoded.jti, 900);
        }
      } catch (error) {
        // Ignorar errores al decodificar
      }
    }
    
    // 3. Revocar el refresh token específico si se proporciona
    if (refreshToken) {
      await this.prisma.refreshToken.updateMany({
        where: { token: refreshToken, userId },
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
        deviceFingerprint: securityContext.deviceFingerprint
      });
    }
  }

  async getProfile(userId: string) {
    return this.usersService.findById(userId);
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
      where: { role: 'DEMO' },
    });

    if (demoUsers.length === 0) {
      throw new ForbiddenException(
        'No demo users found. Run: npx prisma db seed'
      );
    }

    // Mapear a formato de credenciales demo con contraseñas predefinidas
    // Las contraseñas se asignan según el rol del usuario
    const rolePasswords: Record<string, string> = {
      SUPERADMIN: 'SuperAdmin123',
      ADMIN: 'Admin1234',
      COMMERCE: 'Commerce123',
      FREELANCER: 'Freelancer1',
      NORMAL: 'Normal1234',
    };

    const credentials = demoUsers.map((user) => ({
      role: user.role,
      email: user.email,
      password: rolePasswords[user.role] || 'Demo123',
      label: `${user.firstName} ${user.lastName}`,
      description: this.getRoleDescription(user.role),
      commerceName: null, // No hay relación directa commerce en el modelo actual
      categoryName: null, // No hay relación directa category en el modelo actual
      categoryIcon: '???',
      subcategoryName: null, // No hay relación directa subcategory en el modelo actual
    }));

    return {
      success: true,
      data: credentials,
    };
  }

  private getRoleDescription(role: string): string {
    const descriptions: Record<string, string> = {
      SUPERADMIN: 'Acceso total: gestiona todos los usuarios y roles',
      ADMIN: 'Gestiona commerce, freelancer y normal',
      COMMERCE: 'Acceso completo al negocio y operaciones',
      FREELANCER: 'Acceso a sus propios servicios',
      NORMAL: 'Acceso básico de usuario final',
    };
    return descriptions[role] || 'Usuario demo';
  }

  // --- Password Reset ---

  async requestPasswordReset(email: string) {
    const user = await this.usersService.findByEmail(email);
    // Always return success to prevent user enumeration
    if (!user) return { message: 'Si ese correo existe, recibirás un enlace.' };

    // Invalidate old tokens
    await this.prisma.passwordResetToken.updateMany({
      where: { userId: user.id, usedAt: null },
      data: { usedAt: new Date() },
    });

    const token = uuidv4();
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await this.prisma.passwordResetToken.create({
      data: { token, userId: user.id, expiresAt },
    });

    await this.mail.sendPasswordReset(user.email, token, user.firstName);
    return { message: 'Si ese correo existe, recibirás un enlace.' };
  }

  async resetPassword(token: string, newPassword: string) {
    const record = await this.prisma.passwordResetToken.findUnique({
      where: { token },
    });

    if (!record || record.usedAt || record.expiresAt < new Date()) {
      throw new BadRequestException('Token inválido o expirado');
    }

    const hashed = await bcrypt.hash(newPassword, 10);

    await this.prisma.$transaction([
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

    return { message: 'Contraseña actualizada correctamente' };
  }

  // --- Email Verification ---

  async sendVerificationEmail(userId: string) {
    const user = await this.usersService.findById(userId);
    if (!user) throw new NotFoundException('Usuario no encontrado');
    if ((user as any).emailVerified)
      return { message: 'El correo ya está verificado' };

    // Invalidate old tokens
    await this.prisma.emailVerificationToken.updateMany({
      where: { userId, usedAt: null },
      data: { usedAt: new Date() },
    });

    const token = uuidv4();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    await this.prisma.emailVerificationToken.create({
      data: { token, userId, expiresAt },
    });

    await this.mail.sendEmailVerification(user.email, token, user.firstName);
    return { message: 'Correo de verificación enviado' };
  }

  async verifyEmail(token: string) {
    const record = await this.prisma.emailVerificationToken.findUnique({
      where: { token },
    });

    if (!record || record.usedAt || record.expiresAt < new Date()) {
      throw new BadRequestException('Token inválido o expirado');
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

    return { message: 'Correo verificado correctamente' };
  }

  // --- Helpers ---

  private async generateTokens(userId: string, email: string, role: Role) {
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
        expiresIn: this.config.get('JWT_REFRESH_EXPIRES_IN', '7d'),
      }
    );

    return { accessToken, refreshToken };
  }
  
  private decodeJWT(token: string): any {
    try {
      const payload = token.split('.')[1];
      return JSON.parse(Buffer.from(payload, 'base64').toString());
    } catch {
      return null;
    }
  }

  private async saveRefreshToken(userId: string, token: string, securityContext?: any, replacedByTokenId?: string) {
    const expiresIn = this.config.get('JWT_REFRESH_EXPIRES_IN', '7d');
    const ms = this.parseDuration(expiresIn);
    const expiresAt = new Date(Date.now() + ms);

    await this.prisma.refreshToken.create({
      data: { 
        token, 
        userId, 
        expiresAt,
        ipAddress: securityContext?.ipAddress,
        deviceInfo: securityContext?.userAgent,
        replacedByTokenId
      },
    });
  }

  private async createUserSession(userId: string, securityContext: any): Promise<void> {
    const sessionKey = `session:${userId}:${securityContext.deviceFingerprint}`;
    const sessionData = {
      userId,
      deviceFingerprint: securityContext.deviceFingerprint,
      ipAddress: securityContext.ipAddress,
      userAgent: securityContext.userAgent,
      createdAt: new Date(),
      lastActivity: new Date()
    };
    
    // Sesión expira en 30 minutos de inactividad
    await this.redis.setex(sessionKey, 1800, JSON.stringify(sessionData));
    
    // Guardar contexto para detección de actividad sospechosa
    const suspiciousKey = `suspicious:${userId}`;
    await this.redis.setex(suspiciousKey, 86400, JSON.stringify({
      ipAddress: securityContext.ipAddress,
      deviceFingerprint: securityContext.deviceFingerprint,
      userAgent: securityContext.userAgent
    }));
  }
  
  private async updateUserSession(userId: string, securityContext: any): Promise<void> {
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
  
  private async logSecurityEvent(userId: string, eventType: string, details: any): Promise<void> {
    const eventKey = `security-events:${userId}`;
    const event = {
      type: eventType,
      details,
      timestamp: new Date(),
      severity: this.getEventSeverity(eventType)
    };
    
    await this.redis.lpush(eventKey, JSON.stringify(event));
    await this.redis.ltrim(eventKey, 0, 99); // Mantener últimos 100 eventos
    
    this.logger.warn(`Security event for user ${userId}: ${eventType}`, details);
  }
  
  async getSecurityEvents(userId: string) {
    const eventKey = `security-events:${userId}`;
    const events = await this.redis.lrange(eventKey, 0, -1);
    
    return {
      success: true,
      data: events.map(event => JSON.parse(event)).reverse(), // Más recientes primero
      count: events.length
    };
  }

  private getEventSeverity(eventType: string): 'LOW' | 'MEDIUM' | 'HIGH' {
    const severityMap: Record<string, 'LOW' | 'MEDIUM' | 'HIGH'> = {
      'LOGIN_SUCCESS': 'LOW',
      'LOGIN_FAILED': 'MEDIUM',
      'LOGOUT': 'LOW',
      'REFRESH_IP_MISMATCH': 'HIGH',
      'REFRESH_DEVICE_MISMATCH': 'MEDIUM',
      'SESSION_EXPIRED': 'MEDIUM',
      'MULTIPLE_FAILED_LOGIN': 'HIGH',
      'TOKEN_REUSE': 'HIGH',
      'BRUTE_FORCE_ATTEMPT': 'HIGH'
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
            lt: new Date()
          }
        }
      });
      
      if (expiredTokens.count > 0) {
        this.logger.log(`Cleaned up ${expiredTokens.count} expired refresh tokens`);
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
          const inactiveMinutes = (Date.now() - lastActivity.getTime()) / (1000 * 60);
          
          if (inactiveMinutes > 60) { // Más de 1 hora de inactividad
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
