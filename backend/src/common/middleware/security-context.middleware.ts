import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
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

/**
 * Builds request metadata only. Authentication and session validation belong
 * to Passport/JwtStrategy, where the JWT signature and revocation state are
 * verified. Never decode an unverified bearer token in middleware.
 */
@Injectable()
export class SecurityContextMiddleware implements NestMiddleware {
  use(req: Request, _res: Response, next: NextFunction): void {
    const ipAddress = this.extractIpAddress(req);
    const userAgent = req.headers['user-agent'] || '';
    const deviceFingerprint = this.generateDeviceFingerprint(userAgent);

    req.securityContext = {
      ipAddress,
      userAgent,
      deviceFingerprint,
      sessionId: crypto.randomUUID(),
      lastActivity: new Date(),
    };

    next();
  }

  /**
   * Express resolves req.ip using the explicitly configured trusted-proxy
   * chain. Reading X-Forwarded-For / X-Real-IP directly lets clients spoof
   * their address and poison rate limits, audit records and session metadata.
   */
  private extractIpAddress(req: Request): string {
    return req.ip || req.socket?.remoteAddress || '127.0.0.1';
  }

  /**
   * IP is a risk signal, not a device identity: mobile networks, VPNs and
   * carrier NAT can change it during a legitimate session. Keep the session
   * key stable across IP changes and record IP changes separately.
   */
  private generateDeviceFingerprint(userAgent: string): string {
    return crypto
      .createHash('sha256')
      .update(userAgent || 'unknown-user-agent')
      .digest('hex');
  }
}
