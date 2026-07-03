import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  UseGuards,
  HttpCode,
} from '@nestjs/common';
import { TelegramService } from './telegram.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { PrismaService } from '../prisma/prisma.service';

@Controller('telegram')
export class TelegramController {
  constructor(
    private readonly telegram: TelegramService,
    private readonly prisma: PrismaService,
  ) {}

  // ─── Generate link for a customer (commerce use) ─────────────────────────────

  @UseGuards(JwtAuthGuard)
  @Get('link/:customerId')
  async getLink(
    @Param('customerId') customerId: string,
    @CurrentUser() user: { id: string },
  ) {
    const restaurant = await this.prisma.restaurant.findUnique({
      where: { userId: user.id },
      select: { id: true },
    });
    const commerceId = restaurant?.id ?? user.id;

    const customer = await this.prisma.customer.findFirst({
      where: { id: customerId, commerceId },
      select: { id: true, name: true, telegramChatId: true },
    });

    if (!customer) {
      return { linked: false, url: null };
    }

    const token = this.telegram.generateLinkToken(customerId, commerceId);
    const botUsername = this.telegram.getBotUsername();
    const url = botUsername
      ? `https://t.me/${botUsername}?start=${token}`
      : null;

    return {
      linked: !!customer.telegramChatId,
      url,
      token,
    };
  }

  // ─── Webhook: Telegram bot sends updates here ─────────────────────────────────

  @Post('webhook')
  @HttpCode(200)
  async webhook(@Body() body: any) {
    const message = body?.message;
    if (!message) return { ok: true };

    const chatId = String(message.chat?.id);
    const text: string = message.text ?? '';

    if (text.startsWith('/start ')) {
      const startPayload = text.slice(7).trim();
      const reply = await this.telegram.processStart(chatId, startPayload);
      await this.telegram.sendMessage(chatId, reply);
    } else if (text === '/start') {
      await this.telegram.sendMessage(
        chatId,
        '👋 Hola. Para vincular tu cuenta, usa el enlace que te proporcionó el negocio.',
      );
    }

    return { ok: true };
  }
}
