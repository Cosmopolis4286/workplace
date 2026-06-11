import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class TelegramService {
  private readonly logger = new Logger(TelegramService.name);
  private readonly botToken: string;
  private readonly apiBase: string;

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
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

  // ─── Generate a deep-link for customer to link their Telegram ────────────────

  generateLinkToken(customerId: string, commerceId: string): string {
    return this.jwt.sign(
      { customerId, commerceId, purpose: 'telegram_link' },
      { expiresIn: '24h' },
    );
  }

  getBotUsername(): string {
    return this.config.get<string>('TELEGRAM_BOT_USERNAME') ?? '';
  }

  // ─── Process /start payload from webhook ─────────────────────────────────────

  async processStart(chatId: string, startPayload: string): Promise<string> {
    try {
      const payload = this.jwt.verify(startPayload) as {
        customerId: string;
        commerceId: string;
        purpose: string;
      };

      if (payload.purpose !== 'telegram_link') {
        return '❌ Token inválido.';
      }

      const customer = await this.prisma.customer.findFirst({
        where: { id: payload.customerId, commerceId: payload.commerceId },
        include: { commerce: { select: { name: true } } },
      });

      if (!customer) {
        return '❌ No se encontró el cliente.';
      }

      await this.prisma.customer.update({
        where: { id: payload.customerId },
        data: { telegramChatId: String(chatId) },
      });

      return `✅ ¡Hola ${customer.name}! Tu cuenta ha sido vinculada a <b>${customer.commerce.name}</b>. Recibirás notificaciones de tus pedidos aquí.`;
    } catch {
      return '❌ El enlace ha expirado o es inválido. Pide uno nuevo al negocio.';
    }
  }
}
