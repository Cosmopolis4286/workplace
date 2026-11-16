import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, randomInt, timingSafeEqual } from 'crypto';
import { MessangiSmsProvider } from './messangi-sms.provider';
import { PrismaService } from '../../../prisma/prisma.service';
import { RedisService } from '../../../redis/redis.service';

const OTP_TTL_SECONDS = 5 * 60;
const MAX_VERIFY_ATTEMPTS = 5;
const SEND_LIMIT_PER_USER = 3;
const SEND_LIMIT_PER_PHONE = 5;

@Injectable()
export class PhoneVerificationService {
  private readonly logger = new Logger(PhoneVerificationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly config: ConfigService,
    private readonly smsProvider: MessangiSmsProvider
  ) {}

  async sendCode(userId: string, rawPhone: string) {
    const phone = this.normalizeVenezuelanPhone(rawPhone);
    const secret = this.config.get<string>('PHONE_OTP_SECRET');

    if (!secret) {
      throw new ServiceUnavailableException(
        'La verificación telefónica no está habilitada'
      );
    }

    const existing = await this.prisma.user.findFirst({
      where: { phone, id: { not: userId } },
      select: { id: true },
    });
    if (existing) {
      throw new ConflictException(
        'Este teléfono ya está asociado a otra cuenta'
      );
    }

    const cooldown = await this.redis.incrWithExpire(
      `phone-otp:send:cooldown:${userId}`,
      60
    );
    if (cooldown > 1) {
      throw new BadRequestException(
        'Espera un minuto antes de solicitar otro código'
      );
    }

    const userLimit = await this.redis.incrWithExpire(
      `phone-otp:send:user:${userId}`,
      60 * 60
    );
    if (userLimit > SEND_LIMIT_PER_USER) {
      throw new BadRequestException(
        'Has alcanzado el límite de códigos. Inténtalo más tarde'
      );
    }

    const phoneKey = this.phoneKey(phone, secret);
    const phoneLimit = await this.redis.incrWithExpire(
      `phone-otp:send:phone:${phoneKey}`,
      60 * 60
    );
    if (phoneLimit > SEND_LIMIT_PER_PHONE) {
      throw new BadRequestException(
        'No se pueden enviar más códigos a este teléfono por ahora'
      );
    }

    const code = String(randomInt(0, 1_000_000)).padStart(6, '0');
    const digest = this.digest(userId, phone, code, secret);
    const challengeKey = `phone-otp:challenge:${userId}`;
    const attemptsKey = `phone-otp:attempts:${userId}`;

    await this.redis.setex(
      challengeKey,
      OTP_TTL_SECONDS,
      JSON.stringify({ phone, digest })
    );
    await this.redis.del(attemptsKey);

    try {
      await this.smsProvider.send({
        to: phone,
        text:
          `Tu codigo WorkPlace: ${code}. Vence en 5 minutos. No lo compartas.`,
        externalId: `wp-phone-${userId.slice(0, 8)}`,
        clientId: userId,
      });
    } catch {
      await this.redis.del(challengeKey);
      this.logger.warn('No se pudo entregar el SMS de verificación');
      throw new ServiceUnavailableException(
        'No se pudo enviar el código. Inténtalo nuevamente'
      );
    }

    return {
      message: 'Código enviado',
      expiresInSeconds: OTP_TTL_SECONDS,
      destination: this.maskPhone(phone),
    };
  }

  async verifyCode(userId: string, rawCode: string) {
    if (!/^\d{6}$/.test(rawCode ?? '')) {
      throw new BadRequestException('El código debe tener 6 dígitos');
    }

    const challengeKey = `phone-otp:challenge:${userId}`;
    const attemptsKey = `phone-otp:attempts:${userId}`;
    const rawChallenge = await this.redis.get(challengeKey);
    if (!rawChallenge) {
      throw new BadRequestException(
        'El código venció o no existe. Solicita otro'
      );
    }

    const challenge = JSON.parse(rawChallenge) as {
      phone: string;
      digest: string;
    };
    const secret = this.config.get<string>('PHONE_OTP_SECRET');
    if (!secret) {
      throw new ServiceUnavailableException(
        'La verificación telefónica no está configurada'
      );
    }

    const attempts = await this.redis.incrWithExpire(
      attemptsKey,
      OTP_TTL_SECONDS
    );
    if (attempts > MAX_VERIFY_ATTEMPTS) {
      await this.redis.del(challengeKey);
      throw new BadRequestException(
        'Demasiados intentos. Solicita un código nuevo'
      );
    }

    const expected = Buffer.from(challenge.digest, 'hex');
    const received = Buffer.from(
      this.digest(userId, challenge.phone, rawCode, secret),
      'hex'
    );
    if (
      expected.length !== received.length ||
      !timingSafeEqual(expected, received)
    ) {
      throw new BadRequestException('El código es incorrecto');
    }

    const existing = await this.prisma.user.findFirst({
      where: { phone: challenge.phone, id: { not: userId } },
      select: { id: true },
    });
    if (existing) {
      await this.redis.del(challengeKey);
      throw new ConflictException(
        'Este teléfono ya está asociado a otra cuenta'
      );
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        phone: challenge.phone,
        phoneVerifiedAt: new Date(),
      },
    });
    await this.redis.del(challengeKey);
    await this.redis.del(attemptsKey);

    return {
      verified: true,
      phone: this.maskPhone(challenge.phone),
    };
  }

  private normalizeVenezuelanPhone(value: string): string {
    const digits = String(value ?? '').replace(/[\s()-]/g, '');
    const normalized = digits.startsWith('00')
      ? `+${digits.slice(2)}`
      : digits.startsWith('+')
        ? digits
        : digits.startsWith('58')
          ? `+${digits}`
          : digits.startsWith('0')
            ? `+58${digits.slice(1)}`
            : `+58${digits}`;

    // Numero movil venezolano E.164: +58 y diez digitos nacionales.
    if (!/^\+584\d{9}$/.test(normalized)) {
      throw new BadRequestException(
        'Introduce un número móvil venezolano válido, por ejemplo +584121234567'
      );
    }
    return normalized;
  }

  private digest(
    userId: string,
    phone: string,
    code: string,
    secret: string
  ): string {
    return createHmac('sha256', secret)
      .update(`${userId}:${phone}:${code}`)
      .digest('hex');
  }

  private phoneKey(phone: string, secret: string): string {
    return createHmac('sha256', secret)
      .update(phone)
      .digest('hex');
  }

  private maskPhone(phone: string): string {
    return `${phone.slice(0, 6)}******${phone.slice(-2)}`;
  }
}
