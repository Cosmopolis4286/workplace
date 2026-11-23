import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../../prisma/prisma.service';
import { randomBytes } from 'crypto';
import { RedisService } from '../../../redis/redis.service';

@Injectable()
export class TelegramService {
  private readonly logger = new Logger(TelegramService.name);
  private readonly botToken: string;
  private readonly apiBase: string;

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
    private readonly redis: RedisService
  ) {
    this.botToken = this.config.get<string>('TELEGRAM_BOT_TOKEN') ?? '';
    this.apiBase = `https://api.telegram.org/bot${this.botToken}`;
  }

  // ─── Send a message to a specific chat ──────────────────────────────────────

  async sendMessage(chatId: string, text: string): Promise<void> {
    if (!this.botToken) return;
    try {
      const res = await fetch(`${this.apiBase}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML' }),
      });
      if (!res.ok) {
        const err = await res.text();
        this.logger.warn(`Telegram sendMessage failed: ${err}`);
      }
    } catch (e) {
      this.logger.warn(`Telegram sendMessage error: ${(e as Error).message}`);
    }
  }

  // ─── Notify a customer linked to a specific order ────────────────────────────

  async notifyCustomer(customerId: string, text: string): Promise<void> {
    const customer = await this.prisma.customer.findUnique({
      where: { id: customerId },
      select: { telegramChatId: true },
    });
    if (!customer?.telegramChatId) return;
    await this.sendMessage(customer.telegramChatId, text);
  }

  // ─── Enlaces de vinculación ─────────────────────────────────────────────────
  //
  // Telegram solo acepta en ?start= hasta 64 caracteres [A-Za-z0-9_-]. Antes
  // se mandaba un JWT completo (más largo y con puntos), así que el enlace
  // nunca llegaba al bot. Ahora el enlace lleva un token corto y aleatorio, y
  // a qué corresponde se guarda en Redis por 24 h, de un solo uso.

  private static readonly LINK_TTL_SECONDS = 24 * 60 * 60;

  private async createLinkToken(prefix: 'c' | 'u', value: object) {
    const token = `${prefix}_${randomBytes(16).toString('hex')}`;
    await this.redis.setex(
      `telegram:link:${token}`,
      TelegramService.LINK_TTL_SECONDS,
      JSON.stringify(value)
    );
    return token;
  }

  /** Enlace para que un cliente del POS reciba avisos de sus pedidos. */
  generateLinkToken(customerId: string, commerceId: string): Promise<string> {
    return this.createLinkToken('c', { customerId, commerceId });
  }

  /** Enlace para que un usuario reciba sus avisos importantes por Telegram. */
  generateUserLinkToken(userId: string): Promise<string> {
    return this.createLinkToken('u', { userId });
  }

  async unlinkUser(userId: string): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: { telegramChatId: null },
    });
  }

  /** Avisa a un usuario por Telegram si lo vinculó. Nunca lanza. */
  async notifyUser(userId: string, text: string): Promise<void> {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { telegramChatId: true, isActive: true },
      });
      if (!user?.telegramChatId || !user.isActive) return;
      await this.sendMessage(user.telegramChatId, text);
    } catch (e) {
      this.logger.warn(`Telegram notifyUser error: ${(e as Error).message}`);
    }
  }

  getBotUsername(): string {
    return this.config.get<string>('TELEGRAM_BOT_USERNAME') ?? '';
  }

  // Telegram reenvía este mismo valor en el header X-Telegram-Bot-Api-Secret-Token
  // en cada request al webhook si se configuró vía setWebhook({secret_token}).
  // Sin esto, POST /telegram/webhook queda abierto a cualquiera en internet.
  verifyWebhookSecret(receivedSecret: string | undefined): boolean {
    const expected = this.config.get<string>('TELEGRAM_WEBHOOK_SECRET');
    // Fail-closed: sin secret configurado, no se acepta ningún webhook — más
    // seguro que aceptar todo por defecto solo porque el operador no lo configuró.
    if (!expected) return false;
    return receivedSecret === expected;
  }

  // ─── Process /start payload from webhook ─────────────────────────────────────

  async processStart(chatId: string, startPayload: string): Promise<string> {
    if (!/^[cu]_[0-9a-f]{32}$/.test(startPayload)) {
      return '❌ El enlace es inválido. Genera uno nuevo desde WorkPlace.';
    }
    const key = `telegram:link:${startPayload}`;
    const raw = await this.redis.get(key);
    if (!raw) {
      return '❌ El enlace venció o ya se usó. Genera uno nuevo desde WorkPlace.';
    }
    await this.redis.del(key);
    const payload = JSON.parse(raw) as {
      customerId?: string;
      commerceId?: string;
      userId?: string;
    };

    if (payload.userId) {
      const user = await this.prisma.user.findUnique({
        where: { id: payload.userId },
        select: { firstName: true },
      });
      if (!user) return '❌ No se encontró tu cuenta.';
      // Un chat solo puede estar vinculado a una cuenta (telegramChatId @unique).
      await this.prisma.user.updateMany({
        where: { telegramChatId: String(chatId), NOT: { id: payload.userId } },
        data: { telegramChatId: null },
      });
      await this.prisma.user.update({
        where: { id: payload.userId },
        data: { telegramChatId: String(chatId) },
      });
      return `✅ ¡Hola ${user.firstName}! Recibirás aquí los avisos importantes de WorkPlace (pedidos nuevos, pagos reportados) aunque no tengas la app abierta.`;
    }

    const customer = await this.prisma.customer.findFirst({
      where: { id: payload.customerId, commerceId: payload.commerceId },
      include: { commerce: { select: { name: true } } },
    });
    if (!customer) return '❌ No se encontró el cliente.';
    await this.prisma.customer.update({
      where: { id: customer.id },
      data: { telegramChatId: String(chatId) },
    });
    return `✅ ¡Hola ${customer.name}! Tu cuenta ha sido vinculada a <b>${customer.commerce.name}</b>. Recibirás notificaciones de tus pedidos aquí.`;
  }
}
