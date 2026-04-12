import { Injectable, UnauthorizedException, ForbiddenException, Logger } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../../users/users.service';
import { RedisService } from '../../redis/redis.service';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  private readonly logger = new Logger(JwtStrategy.name);
  
  constructor(
    config: ConfigService,
    private usersService: UsersService,
    private redis: RedisService,
    private prisma: PrismaService
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get('JWT_SECRET'),
      passReqToCallback: true,
    });
  }

  async validate(
    req: any,
    payload: { sub: string; email: string; jti: string }
  ) {
    const userId = payload.sub;
    const jti = payload.jti;
    
    // 1. Validar token en blacklist (logout forzado)
    if (await this.isTokenBlacklisted(jti)) {
      this.logger.warn(`Blacklisted token used for user ${userId}`, {
        jti,
        ip: req.securityContext?.ipAddress,
        userAgent: req.securityContext?.userAgent
      });
      throw new UnauthorizedException('Token revocado. Por favor, inicia sesión nuevamente.');
    }
    
    // 2. Validar usuario activo
    const user = await this.usersService.findById(userId);
    if (!user || !user.isActive) {
      throw new UnauthorizedException('Usuario inactivo');
    }

    // 3. Validar sesión activa si hay contexto de seguridad
    if (req.securityContext) {
      await this.validateActiveSession(userId, req.securityContext);
      
      // 4. Validar User-Agent contra fingerprint almacenado
      await this.validateUserAgent(userId, req.securityContext);
    }

    return { ...user, jti: payload.jti };
  }
  
  private async validateActiveSession(userId: string, securityContext: any): Promise<void> {
    const sessionKey = `session:${userId}:${securityContext.deviceFingerprint}`;
    const sessionData = await this.redis.get(sessionKey);
    
    if (!sessionData) {
      // Verificar si hay tokens válidos pero sin sesión (caso de timeout)
      const hasValidTokens = await this.checkValidRefreshTokens(userId, securityContext);
      if (hasValidTokens) {
        throw new ForbiddenException('Sesión expirada por inactividad. Por favor, inicia sesión nuevamente.');
      }
      throw new UnauthorizedException('No hay sesión activa');
    }
    
    const session = JSON.parse(sessionData);
    
    // Verificar que la sesión no haya expirado por inactividad
    const lastActivity = new Date(session.lastActivity);
    const now = new Date();
    const inactiveMinutes = (now.getTime() - lastActivity.getTime()) / (1000 * 60);
    
    if (inactiveMinutes > 30) {
      // Sesión expirada, limpiarla
      await this.redis.del(sessionKey);
      throw new ForbiddenException('Sesión expirada por inactividad. Por favor, inicia sesión nuevamente.');
    }
    
    // Actualizar última actividad
    session.lastActivity = new Date();
    await this.redis.setex(sessionKey, 1800, JSON.stringify(session));
  }
  
  private async checkValidRefreshTokens(userId: string, securityContext: any): Promise<boolean> {
    try {
      // Verificar si hay refresh tokens válidos para este usuario
      const validTokens = await this.prisma.refreshToken.findMany({
        where: {
          userId,
          revokedAt: null,
          expiresAt: {
            gt: new Date()
          }
        },
        orderBy: {
          createdAt: 'desc'
        },
        take: 5 // Limitar a los 5 más recientes
      });
      
      if (validTokens.length === 0) {
        return false;
      }
      
      // Verificar si algún token coincide con el contexto actual
      const matchingToken = validTokens.find(token => {
        // Validar IP (si está disponible)
        if (token.ipAddress && securityContext?.ipAddress) {
          if (token.ipAddress !== securityContext.ipAddress) {
            // IP diferente, verificar si es cambio significativo
            if (this.isSignificantIpChange(token.ipAddress, securityContext.ipAddress)) {
              return false; // Rechazar cambios de IP significativos
            }
          }
        }
        
        // Validar User-Agent (si está disponible)
        if (token.deviceInfo && securityContext?.userAgent) {
          // Permitir cambios menores de User-Agent pero registrar
          if (token.deviceInfo !== securityContext.userAgent) {
            this.logger.warn(`User-Agent change detected for user ${userId}`, {
              expected: token.deviceInfo,
              actual: securityContext.userAgent,
              ip: securityContext.ipAddress
            });
          }
        }
        
        return true;
      });
      
      return !!matchingToken;
    } catch (error) {
      this.logger.error(`Error checking valid refresh tokens for user ${userId}:`, error);
      return false; // En caso de error, requerir nueva sesión
    }
  }
  
  private async isTokenBlacklisted(jti: string): Promise<boolean> {
    try {
      return await this.redis.isTokenBlacklisted(jti);
    } catch (error) {
      this.logger.error(`Error checking token blacklist for JTI ${jti}:`, error);
      return false; // Fail open si hay error
    }
  }
  
  private async validateUserAgent(userId: string, securityContext: any): Promise<void> {
    try {
      // Buscar el User-Agent más reciente usado por este usuario
      const recentToken = await this.prisma.refreshToken.findFirst({
        where: {
          userId,
          revokedAt: null,
          deviceInfo: { not: null }
        },
        orderBy: {
          createdAt: 'desc'
        }
      });
      
      if (recentToken?.deviceInfo && securityContext?.userAgent) {
        const similarity = this.calculateUserAgentSimilarity(
          recentToken.deviceInfo,
          securityContext.userAgent
        );
        
        // Si la similitud es muy baja, podría ser un dispositivo diferente
        if (similarity < 0.3) {
          await this.logSecurityEvent(userId, 'SUSPICIOUS_USER_AGENT', {
            expected: recentToken.deviceInfo,
            actual: securityContext.userAgent,
            similarity,
            ip: securityContext.ipAddress
          });
          
          // Para producción, podrías requerir re-autenticación
          // Por ahora, solo registrar como advertencia
          this.logger.warn(`Low User-Agent similarity for user ${userId}`, {
            similarity,
            ip: securityContext.ipAddress
          });
        }
      }
    } catch (error) {
      this.logger.error(`Error validating User-Agent for user ${userId}:`, error);
      // No bloquear si hay error
    }
  }
  
  private calculateUserAgentSimilarity(ua1: string, ua2: string): number {
    // Algoritmo simple de similitud de User-Agent
    const tokens1 = new Set(ua1.toLowerCase().split(/\s+/));
    const tokens2 = new Set(ua2.toLowerCase().split(/\s+/));
    
    const intersection = new Set([...tokens1].filter(x => tokens2.has(x)));
    const union = new Set([...tokens1, ...tokens2]);
    
    return intersection.size / union.size;
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
    await this.redis.ltrim(eventKey, 0, 99);
    
    this.logger.warn(`Security event for user ${userId}: ${eventType}`, details);
  }
  
  private getEventSeverity(eventType: string): 'LOW' | 'MEDIUM' | 'HIGH' {
    const severityMap: Record<string, 'LOW' | 'MEDIUM' | 'HIGH'> = {
      'BLACKLISTED_TOKEN_USED': 'HIGH',
      'SUSPICIOUS_USER_AGENT': 'MEDIUM',
      'IP_CHANGE': 'MEDIUM',
      'DEVICE_CHANGE': 'MEDIUM',
      'SESSION_EXPIRED': 'MEDIUM'
    };
    
    return severityMap[eventType] || 'LOW';
  }
  
  private isSignificantIpChange(oldIp: string, newIp: string): boolean {
    try {
      const oldParts = oldIp.split('.').map(Number);
      const newParts = newIp.split('.').map(Number);
      
      if (oldParts.length !== 4 || newParts.length !== 4) return true;
      
      // Comparar primeros 3 octetos (subred /24)
      return oldParts[0] !== newParts[0] || 
             oldParts[1] !== newParts[1] || 
             oldParts[2] !== newParts[2];
    } catch {
      return true; // Si hay error, considerar cambio significativo
    }
  }
}
