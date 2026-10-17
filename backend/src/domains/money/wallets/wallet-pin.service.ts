import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../../prisma/prisma.service';
import { RedisService } from '../../../redis/redis.service';

const PIN_MAX_ATTEMPTS = 5;
const PIN_LOCK_TTL = 15 * 60; // 15 min lockout after max failed attempts
const PIN_ATTEMPT_TTL = 5 * 60; // 5 min window to count failed attempts

@Injectable()
export class WalletPinService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService
  ) {}

  async setPin(userId: string, pin: string) {
    this.assertValidPin(pin);

    const wallet = await this.getWalletOrFail(userId);
    const hashed = await bcrypt.hash(pin, 12);

    await this.prisma.wallet.update({
      where: { id: wallet.id },
      data: { pin: hashed, pinSetAt: new Date() },
    });

    await this.clearLock(userId);
    return { message: 'PIN configurado correctamente' };
  }

  async verifyPin(userId: string, pin: string): Promise<void> {
    await this.assertNotLocked(userId);

    const wallet = await this.getWalletOrFail(userId);

    if (!wallet.pin) {
      throw new BadRequestException(
        'No tienes PIN configurado. Configura uno antes de operar.'
      );
    }

    const valid = await bcrypt.compare(pin, wallet.pin);

    if (!valid) {
      await this.recordFailedAttempt(userId);
      const remaining = await this.getRemainingAttempts(userId);
      throw new ForbiddenException(
        `PIN incorrecto. Te quedan ${remaining} intento${remaining !== 1 ? 's' : ''}.`
      );
    }

    await this.clearAttempts(userId);
  }

  async removePin(userId: string, pin: string) {
    await this.verifyPin(userId, pin);
    await this.prisma.wallet.update({
      where: { userId },
      data: { pin: null, pinSetAt: null },
    });
    return { message: 'PIN eliminado' };
  }

  async changePin(userId: string, currentPin: string, newPin: string) {
    await this.verifyPin(userId, currentPin);
    return this.setPin(userId, newPin);
  }

  hasPin(wallet: { pin: string | null }): boolean {
    return !!wallet.pin;
  }

  // ─── Internal helpers ────────────────────────────────────────────────────────

  private assertValidPin(pin: string) {
    if (!/^\d{6}$/.test(pin)) {
      throw new BadRequestException(
        'El PIN debe ser de exactamente 6 dígitos numéricos'
      );
    }
    // Reject trivially sequential / repeated PINs
    const sequential = [
      '012345',
      '123456',
      '234567',
      '345678',
      '456789',
      '987654',
      '876543',
      '765432',
      '654321',
      '543210',
    ];
    const repeated = Array.from({ length: 10 }, (_, i) => String(i).repeat(6));
    if ([...sequential, ...repeated].includes(pin)) {
      throw new BadRequestException(
        'El PIN es demasiado simple. Elige uno más seguro'
      );
    }
  }

  private lockKey(userId: string) {
    return `wallet:pin:lock:${userId}`;
  }
  private attemptsKey(userId: string) {
    return `wallet:pin:attempts:${userId}`;
  }

  private async assertNotLocked(userId: string) {
    const locked = await this.redis.exists(this.lockKey(userId));
    if (locked) {
      throw new ForbiddenException(
        'Billetera bloqueada temporalmente por demasiados intentos de PIN incorrectos. Espera 15 minutos.'
      );
    }
  }

  private async recordFailedAttempt(userId: string) {
    const key = this.attemptsKey(userId);
    const raw = await this.redis.get(key);
    const attempts = raw ? parseInt(raw) + 1 : 1;

    await this.redis.setex(key, PIN_ATTEMPT_TTL, String(attempts));

    if (attempts >= PIN_MAX_ATTEMPTS) {
      await this.redis.setex(this.lockKey(userId), PIN_LOCK_TTL, '1');
      await this.redis.del(key);
      throw new ForbiddenException(
        'Demasiados intentos incorrectos. La billetera ha sido bloqueada por 15 minutos.'
      );
    }
  }

  private async getRemainingAttempts(userId: string): Promise<number> {
    const raw = await this.redis.get(this.attemptsKey(userId));
    const used = raw ? parseInt(raw) : 0;
    return Math.max(0, PIN_MAX_ATTEMPTS - used);
  }

  private async clearAttempts(userId: string) {
    await this.redis.del(this.attemptsKey(userId));
  }

  private async clearLock(userId: string) {
    await this.redis.del(this.lockKey(userId));
    await this.redis.del(this.attemptsKey(userId));
  }

  private async getWalletOrFail(userId: string) {
    const wallet = await this.prisma.wallet.findUnique({ where: { userId } });
    if (!wallet) throw new NotFoundException('Billetera no encontrada');
    return wallet;
  }
}
