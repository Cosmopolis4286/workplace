import { Injectable } from '@nestjs/common';
import { authenticator } from 'otplib';
import * as QRCode from 'qrcode';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';

const BACKUP_CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // sin caracteres ambiguos (0/O, 1/I/L)

@Injectable()
export class TwoFactorService {
  generateSecret(email: string): { secret: string; otpAuthUrl: string } {
    const secret = authenticator.generateSecret();
    const otpAuthUrl = authenticator.keyuri(email, 'WorkPlace', secret);
    return { secret, otpAuthUrl };
  }

  verifyToken(token: string, secret: string): boolean {
    try {
      return authenticator.verify({ token, secret });
    } catch {
      return false;
    }
  }

  async generateQrCodeDataUrl(otpAuthUrl: string): Promise<string> {
    return QRCode.toDataURL(otpAuthUrl);
  }

  generateBackupCodes(count = 10): string[] {
    const codes: string[] = [];
    for (let i = 0; i < count; i++) {
      const part1 = this.randomChars(4);
      const part2 = this.randomChars(4);
      codes.push(`${part1}-${part2}`);
    }
    return codes;
  }

  async hashBackupCodes(codes: string[]): Promise<string[]> {
    return Promise.all(codes.map((code) => bcrypt.hash(code, 10)));
  }

  private randomChars(length: number): string {
    const bytes = randomBytes(length);
    let result = '';
    for (let i = 0; i < length; i++) {
      result += BACKUP_CODE_CHARS[bytes[i] % BACKUP_CODE_CHARS.length];
    }
    return result;
  }
}
