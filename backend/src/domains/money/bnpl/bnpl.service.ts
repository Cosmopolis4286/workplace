import { timingSafeEqual } from 'crypto';
import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  BnplProvider,
  BnplTransactionStatus,
  NotificationType,
  Prisma,
} from '@prisma/client';
import { features } from '../../../common/config/features';
import { PrismaService } from '../../../prisma/prisma.service';
import { CommerceResolverService } from '../../../common/commerce-resolver/commerce-resolver.service';
import { NotificationsService } from '../../engagement/notifications/notifications.service';
import { TelegramService } from '../../engagement/telegram/telegram.service';
import {
  encryptSecret,
  decryptSecret,
} from '../../../common/utils/crypto.util';
import { SimulatedAdapter } from './adapters/simulated.adapter';
import { CasheaAdapter } from './adapters/cashea.adapter';
import { KreceAdapter } from './adapters/krece.adapter';
import {
  BnplProviderAdapter,
  BnplProviderCredentials,
} from './adapters/bnpl-provider.interface';
import { UpsertBnplSettingsDto } from './dto/upsert-bnpl-settings.dto';
import { BnplWebhookDto } from './dto/bnpl-webhook.dto';
import { toNumber } from '../../../common/money/money';

@Injectable()
export class BnplService {
  private readonly logger = new Logger(BnplService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly commerceResolver: CommerceResolverService,
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

  // Cashea/Krece quedan apagados hasta tener credenciales reales: sus
  // adaptadores todavía delegan al simulador, así que un pedido financiado
  // en producción quedaría PENDING hasta expirar. Se enciende con
  // BNPL_ENABLED=true (y NUXT_PUBLIC_BNPL_ENABLED=true en el frontend).
  isEnabled(): boolean {
    return features.bnpl();
  }

  private assertEnabled() {
    if (!this.isEnabled()) {
      throw new NotFoundException(
        'El financiamiento con Cashea/Krece todavía no está disponible'
      );
    }
  }
  async getCommerceId(userId: string): Promise<string> {
    return this.commerceResolver.resolve(userId);
  }

  private encryptField(value?: string): string | undefined {
    if (!value) return undefined;
    return encryptSecret(value, this.config.get('ENCRYPTION_KEY') as string);
  }

  private decryptField(value?: string | null): string | undefined {
    if (!value) return undefined;
    return decryptSecret(value, this.config.get('ENCRYPTION_KEY') as string);
  }

  private getAdapter(
    isSimulated: boolean,
    provider: BnplProvider
  ): BnplProviderAdapter {
    if (isSimulated) return this.simulatedAdapter;
    return provider === 'CASHEA' ? this.casheaAdapter : this.kreceAdapter;
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Settings (credenciales por comercio y proveedor)
  // ──────────────────────────────────────────────────────────────────────────
  async getSettings(commerceId: string) {
    const rows = await this.prisma.bnplSettings.findMany({
      where: { commerceId },
    });
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

  async upsertSettings(
    commerceId: string,
    provider: BnplProvider,
    dto: UpsertBnplSettingsDto
  ) {
    this.assertEnabled();
    const existing = await this.prisma.bnplSettings.findUnique({
      where: { commerceId_provider: { commerceId, provider } },
    });

    const data = {
      isEnabled: dto.isEnabled,
      publicApiKeyEnc:
        this.encryptField(dto.publicApiKey) ?? existing?.publicApiKeyEnc,
      privateApiKeyEnc:
        this.encryptField(dto.privateApiKey) ?? existing?.privateApiKeyEnc,
      storeId: dto.storeId ?? existing?.storeId,
      storeName: dto.storeName ?? existing?.storeName,
      externalClientIdEnc:
        this.encryptField(dto.externalClientId) ??
        existing?.externalClientIdEnc,
      extraConfig: (dto.extraConfig ?? existing?.extraConfig) as
        Prisma.InputJsonValue | undefined,
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
    if (!this.isEnabled()) return [];
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
    const productIds = items
      .map((i) => i.productId)
      .filter((id): id is string => !!id);
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
    this.assertEnabled();
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
      throw new BadRequestException(
        `${provider} no está habilitado para este comercio`
      );
    }

    const creds: BnplProviderCredentials = {
      publicApiKey: this.decryptField(settings.publicApiKeyEnc),
      privateApiKey: this.decryptField(settings.privateApiKeyEnc),
      storeId: settings.storeId ?? undefined,
      storeName: settings.storeName ?? undefined,
      externalClientId: this.decryptField(settings.externalClientIdEnc),
      extraConfig:
        (settings.extraConfig as Record<string, unknown>) ?? undefined,
    };

    const adapter = this.getAdapter(settings.isSimulated, provider);
    const result = await adapter.initiate(creds, {
      orderId: order.id,
      orderNumber: order.orderNumber,
      amount: toNumber(order.total),
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
      where: {
        commerceId_provider: { commerceId, provider: transaction.provider },
      },
    });
    if (settings && transaction.externalReference) {
      const adapter = this.getAdapter(
        settings.isSimulated,
        transaction.provider
      );
      const creds: BnplProviderCredentials = {
        publicApiKey: this.decryptField(settings.publicApiKeyEnc),
        privateApiKey: this.decryptField(settings.privateApiKeyEnc),
        storeId: settings.storeId ?? undefined,
        externalClientId: this.decryptField(settings.externalClientIdEnc),
      };
      await adapter
        .cancel(creds, transaction.externalReference)
        .catch((err) => {
          this.logger.warn(
            `No se pudo cancelar en el proveedor: ${err.message}`
          );
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

  // Secreto compartido por proveedor, enviado en el header `x-bnpl-webhook-secret`
  // (mismo patrón que TelegramService.verifyWebhookSecret). Cashea/Krece no
  // firman HMAC del payload todavía (no hay specs reales del proveedor), así
  // que esto es la mitigación real disponible hoy: sin secreto configurado,
  // fail-closed — no se acepta ningún webhook, en vez de aceptar todo por
  // defecto solo porque el operador no lo configuró.
  verifyWebhookSecret(
    provider: BnplProvider,
    receivedSecret: string | undefined
  ): boolean {
    const key =
      provider === 'CASHEA'
        ? 'BNPL_CASHEA_WEBHOOK_SECRET'
        : 'BNPL_KRECE_WEBHOOK_SECRET';
    const expected = this.config.get<string>(key);
    if (!expected || !receivedSecret) return false;
    // Comparación en tiempo constante: con === el tiempo de respuesta
    // filtra cuántos caracteres del secreto coinciden.
    const a = Buffer.from(receivedSecret);
    const b = Buffer.from(expected);
    return a.length === b.length && timingSafeEqual(a, b);
  }

  async handleWebhook(provider: BnplProvider, payload: BnplWebhookDto) {
    this.logger.log(`Webhook ${provider} recibido: ${JSON.stringify(payload)}`);

    const transaction = await this.prisma.bnplTransaction.findFirst({
      where: { externalReference: payload.externalReference, provider },
    });
    if (!transaction) {
      this.logger.warn(
        `Webhook ${provider} sin transacción asociada: ${payload.externalReference}`
      );
      return { received: true, matched: false };
    }

    const nextStatus: BnplTransactionStatus = payload.status ?? 'APPROVED';

    // Solo una transacción PENDING puede resolverse. Un webhook repetido o
    // tardío (después de expirar o cancelarse) no debe reabrirla ni marcar
    // pagado un pedido que ya no espera ese financiamiento.
    if (transaction.status !== 'PENDING') {
      this.logger.warn(
        `Webhook ${provider} ignorado: la transacción ${transaction.id} ya está ${transaction.status}`
      );
      return {
        received: true,
        matched: true,
        ignored: true,
        status: transaction.status,
      };
    }

    // Condicionado a PENDING: dos webhooks simultáneos no la resuelven dos veces.
    const claimed = await this.prisma.bnplTransaction.updateMany({
      where: { id: transaction.id, status: 'PENDING' },
      data: { status: nextStatus },
    });
    if (claimed.count !== 1) {
      return { received: true, matched: true, ignored: true };
    }

    const updated = await this.prisma.bnplTransaction.update({
      where: { id: transaction.id },
      data: {
        status: nextStatus,
        installments: payload.installments ?? transaction.installments,
        confirmedAt:
          nextStatus === 'APPROVED' ? new Date() : transaction.confirmedAt,
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
  // Bloqueado por completo en APP_ENV=production a nivel de controller; acá
  // se agrega una segunda capa: solo resuelve referencias generadas por
  // SimulatedAdapter (prefijo "SIM-"), nunca una transacción que haya
  // llegado a usar un adapter real.
  async simulateResolve(
    externalReference: string,
    status: 'APPROVED' | 'REJECTED'
  ) {
    if (!externalReference.startsWith('SIM-')) {
      throw new BadRequestException(
        'Solo se pueden resolver transacciones simuladas'
      );
    }
    const transaction = await this.prisma.bnplTransaction.findFirst({
      where: { externalReference },
    });
    if (!transaction) throw new NotFoundException('Transacción no encontrada');
    // Evita reabrir/re-resolver una transacción ya cerrada — sin esto,
    // conocer un externalReference viejo (aunque sea un UUID impredecible)
    // permitiría revertir una aprobación/rechazo ya procesado.
    if (transaction.status !== 'PENDING') {
      throw new BadRequestException('Esta transacción ya fue resuelta');
    }

    return this.handleWebhook(transaction.provider, {
      externalReference,
      status,
    });
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
