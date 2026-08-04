import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BnplProvider, BnplTransactionStatus, NotificationType, Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { NotificationsService } from '../../engagement/notifications/notifications.service';
import { TelegramService } from '../../engagement/telegram/telegram.service';
import { encryptSecret, decryptSecret } from '../../../common/utils/crypto.util';
import { SimulatedAdapter } from './adapters/simulated.adapter';
import { CasheaAdapter } from './adapters/cashea.adapter';
import { KreceAdapter } from './adapters/krece.adapter';
import { BnplProviderAdapter, BnplProviderCredentials } from './adapters/bnpl-provider.interface';
import { UpsertBnplSettingsDto } from './dto/upsert-bnpl-settings.dto';
import { BnplWebhookDto } from './dto/bnpl-webhook.dto';

@Injectable()
export class BnplService {
  private readonly logger = new Logger(BnplService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly notifications: NotificationsService,
    private readonly telegram: TelegramService,
    private readonly simulatedAdapter: SimulatedAdapter,
    private readonly casheaAdapter: CasheaAdapter,
    private readonly kreceAdapter: KreceAdapter
  ) {}

  // ──────────────────────────────────────────────────────────────────────────
  // Helpers
  // ──────────────────────────────────────────────────────────────────────────
  async getCommerceId(userId: string): Promise<string> {
    const commerce = await this.prisma.commerce.findUnique({
      where: { userId },
      select: { id: true },
    });
    return commerce?.id ?? userId;
  }

  private encryptField(value?: string): string | undefined {
    if (!value) return undefined;
    return encryptSecret(value, this.config.get('ENCRYPTION_KEY') as string);
  }

  private decryptField(value?: string | null): string | undefined {
    if (!value) return undefined;
    return decryptSecret(value, this.config.get('ENCRYPTION_KEY') as string);
  }

  private getAdapter(isSimulated: boolean, provider: BnplProvider): BnplProviderAdapter {
    if (isSimulated) return this.simulatedAdapter;
    return provider === 'CASHEA' ? this.casheaAdapter : this.kreceAdapter;
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Settings (credenciales por comercio y proveedor)
  // ──────────────────────────────────────────────────────────────────────────
  async getSettings(commerceId: string) {
    const rows = await this.prisma.bnplSettings.findMany({ where: { commerceId } });
    return (['CASHEA', 'KRECE'] as BnplProvider[]).map((provider) => {
      const row = rows.find((r) => r.provider === provider);
      return {
        provider,
        isEnabled: row?.isEnabled ?? false,
        isSimulated: row?.isSimulated ?? true,
        hasPrivateKey: !!row?.privateApiKeyEnc,
        storeId: row?.storeId ?? null,
        storeName: row?.storeName ?? null,
        lastVerifiedAt: row?.lastVerifiedAt ?? null,
      };
    });
  }

  async upsertSettings(commerceId: string, provider: BnplProvider, dto: UpsertBnplSettingsDto) {
    const existing = await this.prisma.bnplSettings.findUnique({
      where: { commerceId_provider: { commerceId, provider } },
    });

    const data = {
      isEnabled: dto.isEnabled,
      publicApiKeyEnc: this.encryptField(dto.publicApiKey) ?? existing?.publicApiKeyEnc,
      privateApiKeyEnc: this.encryptField(dto.privateApiKey) ?? existing?.privateApiKeyEnc,
      storeId: dto.storeId ?? existing?.storeId,
      storeName: dto.storeName ?? existing?.storeName,
      externalClientIdEnc:
        this.encryptField(dto.externalClientId) ?? existing?.externalClientIdEnc,
      extraConfig: (dto.extraConfig ?? existing?.extraConfig) as Prisma.InputJsonValue | undefined,
    };

    if (existing) {
      return this.prisma.bnplSettings.update({
        where: { commerceId_provider: { commerceId, provider } },
        data,
      });
    }
    return this.prisma.bnplSettings.create({
      data: { commerceId, provider, ...data },
    });
  }

  async getEligibleProviders(commerceId: string) {
    const rows = await this.prisma.bnplSettings.findMany({
      where: { commerceId, isEnabled: true },
      select: { provider: true },
    });
    return rows.map((r) => r.provider);
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Elegibilidad de la orden
  // ──────────────────────────────────────────────────────────────────────────
  private async assertOrderIsFinanceable(orderId: string) {
    const items = await this.prisma.orderItem.findMany({
      where: { orderId, productId: { not: null } },
      select: { productId: true, productName: true },
    });
    const productIds = items.map((i) => i.productId).filter((id): id is string => !!id);
    if (productIds.length === 0) return;

    const ineligible = await this.prisma.product.findMany({
      where: { id: { in: productIds }, bnplEligible: false },
      select: { name: true },
    });
    if (ineligible.length > 0) {
      throw new BadRequestException(
        `Este pedido incluye productos no financiables: ${ineligible.map((p) => p.name).join(', ')}`
      );
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Ciclo de vida de la transacción
  // ──────────────────────────────────────────────────────────────────────────
  async initiate(commerceId: string, orderId: string, provider: BnplProvider) {
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, commerceId },
    });
    if (!order) throw new NotFoundException('Pedido no encontrado');
    if (order.paymentStatus !== 'PENDING') {
      throw new BadRequestException('El pedido ya no está pendiente de pago');
    }

    await this.assertOrderIsFinanceable(orderId);

    const settings = await this.prisma.bnplSettings.findUnique({
      where: { commerceId_provider: { commerceId, provider } },
    });
    if (!settings?.isEnabled) {
      throw new BadRequestException(`${provider} no está habilitado para este comercio`);
    }

    const creds: BnplProviderCredentials = {
      publicApiKey: this.decryptField(settings.publicApiKeyEnc),
      privateApiKey: this.decryptField(settings.privateApiKeyEnc),
      storeId: settings.storeId ?? undefined,
      storeName: settings.storeName ?? undefined,
      externalClientId: this.decryptField(settings.externalClientIdEnc),
      extraConfig: (settings.extraConfig as Record<string, unknown>) ?? undefined,
    };

    const adapter = this.getAdapter(settings.isSimulated, provider);
    const result = await adapter.initiate(creds, {
      orderId: order.id,
      orderNumber: order.orderNumber,
      amount: order.total,
      currency: 'USD',
      customerName: order.customerName,
      customerPhone: order.customerPhone ?? undefined,
      customerEmail: order.customerEmail ?? undefined,
    });

    const transaction = await this.prisma.bnplTransaction.upsert({
      where: { orderId },
      create: {
        orderId,
        commerceId,
        provider,
        status: 'PENDING',
        externalReference: result.externalReference,
        checkoutUrl: result.checkoutUrl,
        amount: order.total,
        expiresAt: result.expiresAt,
        rawResponse: result.rawResponse as any,
      },
      update: {
        provider,
        status: 'PENDING',
        externalReference: result.externalReference,
        checkoutUrl: result.checkoutUrl,
        amount: order.total,
        expiresAt: result.expiresAt,
        rawResponse: result.rawResponse as any,
        confirmedAt: null,
        cancelledAt: null,
        failureReason: null,
      },
    });

    await this.prisma.order.update({
      where: { id: orderId },
      data: { paymentMethod: provider },
    });

    return {
      transactionId: transaction.id,
      checkoutUrl: transaction.checkoutUrl,
      expiresAt: transaction.expiresAt,
    };
  }

  async getStatus(transactionId: string, commerceId: string) {
    const transaction = await this.prisma.bnplTransaction.findFirst({
      where: { id: transactionId, commerceId },
    });
    if (!transaction) throw new NotFoundException('Transacción no encontrada');
    return transaction;
  }

  async cancel(transactionId: string, commerceId: string) {
    const transaction = await this.prisma.bnplTransaction.findFirst({
      where: { id: transactionId, commerceId },
    });
    if (!transaction) throw new NotFoundException('Transacción no encontrada');

    const settings = await this.prisma.bnplSettings.findUnique({
      where: { commerceId_provider: { commerceId, provider: transaction.provider } },
    });
    if (settings && transaction.externalReference) {
      const adapter = this.getAdapter(settings.isSimulated, transaction.provider);
      const creds: BnplProviderCredentials = {
        publicApiKey: this.decryptField(settings.publicApiKeyEnc),
        privateApiKey: this.decryptField(settings.privateApiKeyEnc),
        storeId: settings.storeId ?? undefined,
        externalClientId: this.decryptField(settings.externalClientIdEnc),
      };
      await adapter.cancel(creds, transaction.externalReference).catch((err) => {
        this.logger.warn(`No se pudo cancelar en el proveedor: ${err.message}`);
      });
    }

    return this.prisma.bnplTransaction.update({
      where: { id: transactionId },
      data: { status: 'CANCELLED', cancelledAt: new Date() },
    });
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Webhook (confirmación del proveedor)
  // ──────────────────────────────────────────────────────────────────────────
  async handleWebhook(provider: BnplProvider, payload: BnplWebhookDto) {
    // TODO: validar firma/origen real del proveedor cuando entreguen el
    // mecanismo (HMAC de header, secreto compartido, etc). Por ahora se
    // registra el payload crudo para depuración y se confía en
    // externalReference para localizar la transacción.
    this.logger.log(`Webhook ${provider} recibido: ${JSON.stringify(payload)}`);

    const transaction = await this.prisma.bnplTransaction.findFirst({
      where: { externalReference: payload.externalReference, provider },
    });
    if (!transaction) {
      this.logger.warn(`Webhook ${provider} sin transacción asociada: ${payload.externalReference}`);
      return { received: true, matched: false };
    }

    const nextStatus: BnplTransactionStatus = payload.status ?? 'APPROVED';

    const updated = await this.prisma.bnplTransaction.update({
      where: { id: transaction.id },
      data: {
        status: nextStatus,
        installments: payload.installments ?? transaction.installments,
        confirmedAt: nextStatus === 'APPROVED' ? new Date() : transaction.confirmedAt,
        rawResponse: payload as any,
      },
    });

    if (nextStatus === 'APPROVED') {
      const order = await this.prisma.order.update({
        where: { id: transaction.orderId },
        data: { paymentStatus: 'PAID' },
      });

      this.notifications
        .create(transaction.commerceId, {
          type: NotificationType.ORDER,
          title: `Financiamiento aprobado — ${order.orderNumber}`,
          message: `${provider} aprobó el financiamiento del pedido ${order.orderNumber}`,
          link: '/customer-dashboard',
          metadata: { orderNumber: order.orderNumber, provider },
        })
        .catch(() => null);

      if (order.customerId) {
        this.telegram
          .notifyCustomer(
            order.customerId,
            `✅ <b>Financiamiento aprobado</b>\nPedido: <b>${order.orderNumber}</b>\nProveedor: <b>${provider}</b>`
          )
          .catch(() => null);
      }
    }

    return { received: true, matched: true, status: updated.status };
  }

  // Solo para desarrollo/pruebas mientras no hay credenciales reales: fuerza
  // el estado de una transacción simulada para poder probar el resto del
  // flujo (confirmación de orden, UI) sin sandbox real de Cashea/Krece.
  // Recibe externalReference (no el id local) porque es lo único que conoce
  // la página pública de resolución simulada (viene embebido en checkoutUrl).
  async simulateResolve(externalReference: string, status: 'APPROVED' | 'REJECTED') {
    const transaction = await this.prisma.bnplTransaction.findFirst({
      where: { externalReference },
    });
    if (!transaction) throw new NotFoundException('Transacción no encontrada');

    return this.handleWebhook(transaction.provider, { externalReference, status });
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Expiración (cron)
  // ──────────────────────────────────────────────────────────────────────────
  async expirePending() {
    const { count } = await this.prisma.bnplTransaction.updateMany({
      where: { status: 'PENDING', expiresAt: { lte: new Date() } },
      data: { status: 'EXPIRED' },
    });
    if (count > 0) {
      this.logger.log(`Expiradas ${count} transacciones BNPL pendientes`);
    }
    return count;
  }
}
