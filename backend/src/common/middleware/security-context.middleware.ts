import { Injectable, NestMiddleware, UnauthorizedException, ForbiddenException, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { RedisService } from '../../redis/redis.service';
import { PrismaService } from '../../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

export interface SecurityContext {
  ipAddress: string;
  userAgent: string;
  deviceFingerprint: string;
  sessionId: string;
  lastActivity: Date;
}

declare module 'express' {
  interface Request {
    securityContext?: SecurityContext;
  }
}

@Injectable()
export class SecurityContextMiddleware implements NestMiddleware {
  private readonly logger = new Logger(SecurityContextMiddleware.name);
  
  constructor(
    private readonly redis: RedisService,
    private readonly prisma: PrismaService,
    private readonly config: ConfigService
  ) {}

  async use(req: Request, res: Response, next: NextFunction) {
    try {
      const securityContext = await this.buildSecurityContext(req);
      req.securityContext = securityContext;
      
      // Validar sesión activa si hay token JWT
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        await this.validateSessionActivity(req, securityContext);
      }
      
      next();
    } catch (error) {
      if (error instanceof UnauthorizedException || error instanceof ForbiddenException) {
        throw error;
      }
      this.logger.error(`Error en security context: ${error.message}`);
      next(); // No bloquear la petición si hay errores de contexto
    }
  }

  private async buildSecurityContext(req: Request): Promise<SecurityContext> {
    const ipAddress = this.extractIpAddress(req);
    const userAgent = req.headers['user-agent'] || '';
    const deviceFingerprint = this.generateDeviceFingerprint(ipAddress, userAgent);
    const sessionId = this.generateSessionId(deviceFingerprint);
    
    return {
      ipAddress,
      userAgent,
      deviceFingerprint,
      sessionId,
      lastActivity: new Date()
    };
  }

  private extractIpAddress(req: Request): string {
    const forwarded = req.headers['x-forwarded-for'] as string;
    const realIp = req.headers['x-real-ip'] as string;
    const cfConnectingIp = req.headers['cf-connecting-ip'] as string; // Cloudflare
    
    if (forwarded) {
      return forwarded.split(',')[0].trim();
    }
    if (realIp) {
      return realIp;
    }
    if (cfConnectingIp) {
      return cfConnectingIp;
    }
    
    return req.connection.remoteAddress || 
           req.socket.remoteAddress || 
           (req.connection as any)?.socket?.remoteAddress || 
           '127.0.0.1';
  }

  private generateDeviceFingerprint(ipAddress: string, userAgent: string): string {
    const fingerprintData = {
      ip: ipAddress,
      userAgent: userAgent,
      acceptLanguage: this.extractAcceptLanguage(),
      acceptEncoding: this.extractAcceptEncoding(),
      platform: this.extractPlatform(userAgent)
    };
    
    return crypto
      .createHash('sha256')
      .update(JSON.stringify(fingerprintData))
      .digest('hex');
  }

  private extractAcceptLanguage(): string {
    // Esto se puede extraer de headers si está disponible
    return 'es'; // Default
  }

  private extractAcceptEncoding(): string {
    // Esto se puede extraer de headers si está disponible  
    return 'gzip'; // Default
  }

  private extractPlatform(userAgent: string): string {
    const platforms = ['Windows', 'Mac', 'Linux', 'Android', 'iOS'];
    return platforms.find(platform => userAgent.includes(platform)) || 'Unknown';
  }

  private generateSessionId(deviceFingerprint: string): string {
    const timestamp = Date.now().toString();
    const random = crypto.randomBytes(16).toString('hex');
    
    return crypto
      .createHash('sha256')
      .update(`${deviceFingerprint}-${timestamp}-${random}`)
      .digest('hex');
  }

  private async validateSessionActivity(req: Request, securityContext: SecurityContext): Promise<void> {
    try {
      // Extraer userId del JWT (sin validar completamente, solo para tracking)
      const token = req.headers.authorization?.replace('Bearer ', '');
      if (!token) return;
      
      const decoded = this.decodeJWT(token);
      if (!decoded?.sub) return;
      
      const userId = decoded.sub;
      
      // Verificar si hay sesión activa en Redis
      const sessionKey = `session:${userId}:${securityContext.deviceFingerprint}`;
      const sessionData = await this.redis.get(sessionKey);
      
      if (!sessionData) {
        // No hay sesión activa, verificar si hay tokens válidos
        const hasValidTokens = await this.checkValidRefreshTokens(userId, securityContext);
        if (!hasValidTokens) {
          throw new UnauthorizedException('Sesión expirada por inactividad');
        }
        
        // Crear nueva sesión
        await this.createSession(userId, securityContext);
      } else {
        // Actualizar última actividad
        await this.updateSessionActivity(sessionKey, securityContext);
      }
      
      // Verificar actividad sospechosa
      await this.checkSuspiciousActivity(userId, securityContext);
      
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      // No bloquear si hay errores en la validación de sesión
    }
  }

  private decodeJWT(token: string): any {
    try {
      const payload = token.split('.')[1];
      return JSON.parse(Buffer.from(payload, 'base64').toString());
    } catch {
      return null;
    }
  }

  private async checkValidRefreshTokens(userId: string, securityContext: SecurityContext): Promise<boolean> {
    const validTokens = await this.prisma.refreshToken.findMany({
      where: {
        userId,
        revokedAt: null,
        expiresAt: {
          gt: new Date()
        }
      }
    });
    
    // Verificar si algún token coincide con el contexto actual
    return validTokens.some(token => 
      token.ipAddress === securityContext.ipAddress ||
      token.deviceInfo === securityContext.userAgent
    );
  }

  private async createSession(userId: string, securityContext: SecurityContext): Promise<void> {
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
  }

  private async updateSessionActivity(sessionKey: string, securityContext: SecurityContext): Promise<void> {
    const sessionData = await this.redis.get(sessionKey);
    if (sessionData) {
      const session = JSON.parse(sessionData);
      session.lastActivity = new Date();
      
      // Extender TTL 30 minutos más
      await this.redis.setex(sessionKey, 1800, JSON.stringify(session));
    }
  }

  private async checkSuspiciousActivity(userId: string, securityContext: SecurityContext): Promise<void> {
    const suspiciousKey = `suspicious:${userId}`;
    const suspiciousData = await this.redis.get(suspiciousKey);
    
    if (!suspiciousData) return;
    
    const suspicious = JSON.parse(suspiciousData);
    
    // Verificar cambio de IP
    if (suspicious.ipAddress !== securityContext.ipAddress) {
      await this.logSecurityEvent(userId, 'IP_CHANGE', {
        oldIp: suspicious.ipAddress,
        newIp: securityContext.ipAddress,
        userAgent: securityContext.userAgent
      });
      
      // Opcional: requerir re-autenticación si el cambio es significativo
      if (this.isSignificantIpChange(suspicious.ipAddress, securityContext.ipAddress)) {
        throw new ForbiddenException('Detectamos un cambio de ubicación. Por favor, inicia sesión nuevamente.');
      }
    }
    
    // Verificar cambio de dispositivo
    if (suspicious.deviceFingerprint !== securityContext.deviceFingerprint) {
      await this.logSecurityEvent(userId, 'DEVICE_CHANGE', {
        oldFingerprint: suspicious.deviceFingerprint,
        newFingerprint: securityContext.deviceFingerprint,
        userAgent: securityContext.userAgent
      });
    }
  }

  private isSignificantIpChange(oldIp: string, newIp: string): boolean {
    // Simplificado: considerar significativo si no es del mismo /24
    const oldParts = oldIp.split('.').map(Number);
    const newParts = newIp.split('.').map(Number);
    
    if (oldParts.length !== 4 || newParts.length !== 4) return true;
    
    // Comparar primeros 3 octetos (subred /24)
    return oldParts[0] !== newParts[0] || 
           oldParts[1] !== newParts[1] || 
           oldParts[2] !== newParts[2];
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

  private getEventSeverity(eventType: string): 'LOW' | 'MEDIUM' | 'HIGH' {
    const severityMap: Record<string, 'LOW' | 'MEDIUM' | 'HIGH'> = {
      'IP_CHANGE': 'MEDIUM',
      'DEVICE_CHANGE': 'MEDIUM',
      'MULTIPLE_FAILED_LOGIN': 'HIGH',
      'TOKEN_REUSE': 'HIGH',
      'BRUTE_FORCE_ATTEMPT': 'HIGH'
    };
    
    return severityMap[eventType] || 'LOW';
  }
}
