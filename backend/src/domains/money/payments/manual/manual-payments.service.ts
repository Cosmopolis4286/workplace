import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  ExternalCommissionCollectionMode,
  ExternalPaymentProvider,
  ExternalPaymentStatus,
  ExternalSettlementMode,
  FeePayer,
  ManualPaymentReportStatus,
  NotificationType,
  Prisma,
  SellerPaymentAccount,
} from '@prisma/client';
import { PrismaService } from '../../../../prisma/prisma.service';
import { NotificationsService } from '../../../engagement/notifications/notifications.service';
import {
  EXCHANGE_RATES_FACADE,
  ExchangeRatesFacade,
} from '../../exchange-rates/exchange-rates.facade';
import { PaymentsService } from '../payments.service';
import { PaymentSourceResolverRegistry } from '../payment-source-resolver.registry';
import type { PaymentSourceType } from '../payment-source-resolver.interface';
import { ReportManualPaymentDto } from '../dto/manual-payment.dto';
import { SellerPaymentAccountsService } from './seller-payment-accounts.service';

// Un intent manual "vivo" es uno que todavía puede pagarse o ya se pagó.
const OPEN_STATUSES: ExternalPaymentStatus[] = [
  ExternalPaymentStatus.DRAFT,
  ExternalPaymentStatus.REQUIRES_ACTION,
  ExternalPaymentStatus.PROCESSING,
  ExternalPaymentStatus.REQUIRES_RECONCILIATION,
  ExternalPaymentStatus.SUCCEEDED,
];
// Estados en los que el comprador puede (re)portar un pago.
const REPORTABLE: ExternalPaymentStatus[] = [
  ExternalPaymentStatus.REQUIRES_ACTION,
  ExternalPaymentStatus.REQUIRES_RECONCILIATION,
];
const PAID_AT_MAX_AGE_DAYS = 30;

const PAYER_LINK: Record<string, string> = {
  SERVICE_REQUEST: '/service-requests',
  CATALOG_ORDER: '/my-orders',
};

/**
 * Pago directo al vendedor (paso 1 del modelo "orquestador"): el comprador
 * paga a una cuenta PROPIA del vendedor, reporta la referencia y el vendedor
 * confirma que el dinero llegó. WorkPlace no recibe ni custodia fondos.
 *
 * La comisión de la plataforma NO se registra aquí (rate 0): hoy se cobra al
 * completar la solicitud/pedido (PlatformFeesService.chargeProviderFee) y
 * registrarla también acá la duplicaría. Pasará a este flujo con el estado de
 * cuenta del vendedor (paso 2).
 */
@Injectable()
export class ManualPaymentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly payments: PaymentsService,
    private readonly sources: PaymentSourceResolverRegistry,
    private readonly accounts: SellerPaymentAccountsService,
    private readonly notifications: NotificationsService,
    @Inject(EXCHANGE_RATES_FACADE)
    private readonly rates: ExchangeRatesFacade
  ) {}

  /**
   * Devuelve el intent manual vigente del origen (o lo crea) junto con las
   * cuentas del vendedor y el monto a pagar en cada moneda. El precio sale
   * siempre del servidor (resolver del origen), nunca del cliente.
   */
  async start(
    payerUserId: string,
    sourceType: PaymentSourceType,
    sourceId: string
  ) {
    const source = await this.sources.resolve(
      sourceType,
      sourceId,
      payerUserId
    );
    const sellerAccounts = await this.accounts.listActiveForSeller(
      source.sellerUserId
    );

    const previous = await this.prisma.externalPaymentIntent.findMany({
      where: {
        sourceType,
        sourceId,
        payerUserId,
        provider: ExternalPaymentProvider.MANUAL,
      },
      orderBy: { createdAt: 'desc' },
    });
    const current = previous.find((i) => OPEN_STATUSES.includes(i.status));

    let intent = current;
    const sameQuote =
      current &&
      current.currency === source.currency &&
      current.baseAmount.equals(new Prisma.Decimal(source.baseAmount));
    const locked =
      current &&
      (current.status === ExternalPaymentStatus.PROCESSING ||
        current.status === ExternalPaymentStatus.SUCCEEDED);

    if (!current || (!sameQuote && !locked)) {
      if (sellerAccounts.length === 0) {
        throw new ConflictException(
          'El vendedor todavía no configuró cuentas para recibir pagos'
        );
      }
      // El precio cambió antes de que se reportara un pago: el intent viejo
      // se cancela para que nadie pague un monto desactualizado.
      if (current) {
        await this.payments.transitionIntent(
          current.id,
          ExternalPaymentStatus.CANCELLED,
          'QUOTE_CHANGED'
        );
      }
      const draft = await this.payments.prepareIntent({
        idempotencyKey: `manual:${sourceType}:${sourceId}:${previous.length}`,
        sourceType,
        sourceId,
        payerUserId,
        sellerUserId: source.sellerUserId,
        provider: ExternalPaymentProvider.MANUAL,
        currency: source.currency,
        baseAmount: source.baseAmount,
        commissionRateBps: 0,
        commissionPayer: FeePayer.PROVIDER,
        settlementMode: ExternalSettlementMode.DIRECT_TO_SELLER,
        collectionMode: ExternalCommissionCollectionMode.PERIODIC_INVOICE,
        metadata: { description: source.description },
      });
      intent =
        draft.status === ExternalPaymentStatus.DRAFT
          ? await this.payments.transitionIntent(
              draft.id,
              ExternalPaymentStatus.REQUIRES_ACTION
            )
          : draft;
    }

    const reports = await this.prisma.manualPaymentReport.findMany({
      where: { paymentIntentId: intent!.id },
      orderBy: { createdAt: 'desc' },
    });

    return {
      intent: intent!,
      description: source.description,
      priceChanged: Boolean(current && !sameQuote && locked),
      accounts: await this.withAmounts(
        sellerAccounts,
        intent!.currency,
        intent!.amount
      ),
      reports,
    };
  }

  async report(
    payerUserId: string,
    intentId: string,
    dto: ReportManualPaymentDto
  ) {
    const intent = await this.findManualIntent(intentId);
    if (intent.payerUserId !== payerUserId) {
      throw new ForbiddenException('Este pago no te pertenece');
    }
    if (!REPORTABLE.includes(intent.status)) {
      throw new ConflictException(
        intent.status === ExternalPaymentStatus.PROCESSING
          ? 'Ya reportaste este pago; el vendedor debe confirmarlo'
          : 'Este pago ya no admite reportes'
      );
    }

    const account = await this.prisma.sellerPaymentAccount.findFirst({
      where: {
        id: dto.sellerPaymentAccountId,
        userId: intent.sellerUserId,
        isActive: true,
      },
    });
    if (!account) {
      throw new BadRequestException('La cuenta de destino no está disponible');
    }

    const reference = dto.reference.toUpperCase().replace(/\s+/g, '');
    if (!/^[A-Z0-9-]{4,30}$/.test(reference)) {
      throw new BadRequestException(
        'Referencia inválida: usa entre 4 y 30 letras o números'
      );
    }
    const paidAt = this.validatePaidAt(dto.paidAt);

    // La misma referencia no puede respaldar dos pagos al mismo vendedor.
    const duplicate = await this.prisma.manualPaymentReport.findFirst({
      where: {
        sellerUserId: intent.sellerUserId,
        reference,
        status: { not: ManualPaymentReportStatus.REJECTED },
      },
      select: { id: true },
    });
    if (duplicate) {
      throw new ConflictException('Esa referencia ya fue reportada');
    }

    const [priced] = await this.withAmounts(
      [account],
      intent.currency,
      intent.amount
    );
    if (priced.amount === null) {
      throw new ConflictException(
        'No hay una tasa de cambio vigente para pagar en esta moneda'
      );
    }

    let reportId = '';
    await this.payments.transitionIntent(
      intent.id,
      ExternalPaymentStatus.PROCESSING,
      'MANUAL_REPORTED',
      undefined,
      undefined,
      async (tx) => {
        const created = await tx.manualPaymentReport.create({
          data: {
            paymentIntentId: intent.id,
            sellerPaymentAccountId: account.id,
            destination: this.snapshot(account),
            payerUserId,
            sellerUserId: intent.sellerUserId,
            reference,
            payerBankCode: dto.payerBankCode,
            paidAt,
            paidCurrency: account.currency,
            paidAmount: priced.amount!,
            exchangeRate: priced.exchangeRate,
          },
        });
        reportId = created.id;
      }
    );

    await this.notifySafe(intent.sellerUserId, {
      title: '💸 Pago reportado',
      message: `Te reportaron un pago de ${this.formatMoney(priced.amount!, account.currency)} (ref. ${reference}). Verifica tu cuenta y confírmalo.`,
      link: '/payments/incoming',
      metadata: { paymentIntentId: intent.id, reportId },
    });

    return this.prisma.manualPaymentReport.findUniqueOrThrow({
      where: { id: reportId },
    });
  }

  async confirm(sellerUserId: string, reportId: string) {
    const report = await this.findSellerReport(sellerUserId, reportId);
    await this.payments.transitionIntent(
      report.paymentIntentId,
      ExternalPaymentStatus.SUCCEEDED,
      'MANUAL_CONFIRMED',
      undefined,
      undefined,
      async (tx) =>
        this.settleReport(tx, report.id, ManualPaymentReportStatus.CONFIRMED)
    );
    const intent = await this.findManualIntent(report.paymentIntentId);
    await this.notifySafe(report.payerUserId, {
      title: '✅ Pago confirmado',
      message: `El vendedor confirmó tu pago (ref. ${report.reference}).`,
      link: PAYER_LINK[intent.sourceType],
      metadata: { paymentIntentId: intent.id, reportId },
    });
    return this.prisma.manualPaymentReport.findUniqueOrThrow({
      where: { id: reportId },
    });
  }

  async reject(sellerUserId: string, reportId: string, reason: string) {
    const trimmed = reason?.trim();
    if (!trimmed || trimmed.length < 5) {
      throw new BadRequestException(
        'Explica al comprador por qué no se recibió el pago'
      );
    }
    const report = await this.findSellerReport(sellerUserId, reportId);
    // REQUIRES_RECONCILIATION: el comprador puede corregir y reportar de nuevo.
    await this.payments.transitionIntent(
      report.paymentIntentId,
      ExternalPaymentStatus.REQUIRES_RECONCILIATION,
      'MANUAL_REJECTED',
      undefined,
      undefined,
      async (tx) =>
        this.settleReport(
          tx,
          report.id,
          ManualPaymentReportStatus.REJECTED,
          trimmed
        )
    );
    const intent = await this.findManualIntent(report.paymentIntentId);
    await this.notifySafe(report.payerUserId, {
      title: '⚠️ Pago no recibido',
      message: `El vendedor no encontró tu pago (ref. ${report.reference}): ${trimmed}. Revisa los datos y repórtalo de nuevo.`,
      link: PAYER_LINK[intent.sourceType],
      metadata: { paymentIntentId: intent.id, reportId },
    });
    return this.prisma.manualPaymentReport.findUniqueOrThrow({
      where: { id: reportId },
    });
  }

  async cancel(payerUserId: string, intentId: string) {
    const intent = await this.findManualIntent(intentId);
    if (intent.payerUserId !== payerUserId) {
      throw new ForbiddenException('Este pago no te pertenece');
    }
    if (intent.status !== ExternalPaymentStatus.REQUIRES_ACTION) {
      throw new ConflictException(
        'Solo puedes cancelar un pago que aún no reportaste'
      );
    }
    return this.payments.transitionIntent(
      intent.id,
      ExternalPaymentStatus.CANCELLED,
      'PAYER_CANCELLED'
    );
  }

  async listIncoming(sellerUserId: string, status?: ManualPaymentReportStatus) {
    const reports = await this.prisma.manualPaymentReport.findMany({
      where: { sellerUserId, ...(status && { status }) },
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: {
        paymentIntent: {
          select: {
            id: true,
            sourceType: true,
            sourceId: true,
            currency: true,
            amount: true,
            status: true,
            metadata: true,
          },
        },
      },
    });
    const payers = await this.prisma.user.findMany({
      where: { id: { in: [...new Set(reports.map((r) => r.payerUserId))] } },
      select: { id: true, firstName: true, lastName: true },
    });
    const names = new Map(
      payers.map((p) => [
        p.id,
        `${p.firstName ?? ''} ${p.lastName ?? ''}`.trim(),
      ])
    );
    return reports.map((r) => ({
      ...r,
      payerName: names.get(r.payerUserId) ?? null,
    }));
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────

  private async settleReport(
    tx: Prisma.TransactionClient,
    id: string,
    status: ManualPaymentReportStatus,
    rejectionReason?: string
  ) {
    const changed = await tx.manualPaymentReport.updateMany({
      where: { id, status: ManualPaymentReportStatus.SUBMITTED },
      data: { status, rejectionReason, reviewedAt: new Date() },
    });
    if (changed.count !== 1) {
      throw new ConflictException('Este reporte ya fue revisado');
    }
  }

  private async findManualIntent(id: string) {
    const intent = await this.prisma.externalPaymentIntent.findUnique({
      where: { id },
    });
    if (!intent || intent.provider !== ExternalPaymentProvider.MANUAL) {
      throw new NotFoundException('Pago no encontrado');
    }
    return intent;
  }

  private async findSellerReport(sellerUserId: string, reportId: string) {
    const report = await this.prisma.manualPaymentReport.findUnique({
      where: { id: reportId },
    });
    if (!report || report.sellerUserId !== sellerUserId) {
      throw new NotFoundException('Reporte de pago no encontrado');
    }
    if (report.status !== ManualPaymentReportStatus.SUBMITTED) {
      throw new ConflictException('Este reporte ya fue revisado');
    }
    return report;
  }

  /**
   * Monto a pagar en la moneda de cada cuenta. Si difiere de la del intent se
   * convierte con la tasa vigente del servidor (rateToUsd = unidades de la
   * moneda por 1 USD); sin tasa, amount queda null y esa cuenta no se puede
   * usar.
   */
  private async withAmounts(
    accounts: SellerPaymentAccount[],
    intentCurrency: string,
    intentAmount: Prisma.Decimal
  ) {
    const rateCache = new Map<string, Prisma.Decimal | null>();
    const rateOf = async (code: string) => {
      if (code === 'USD') return new Prisma.Decimal(1);
      if (!rateCache.has(code)) {
        const r = await this.rates.resolveRateToUsd(code);
        rateCache.set(code, r && r.rateToUsd.gt(0) ? r.rateToUsd : null);
      }
      return rateCache.get(code)!;
    };

    return Promise.all(
      accounts.map(async (account) => {
        if (account.currency === intentCurrency) {
          return { ...account, amount: intentAmount, exchangeRate: null };
        }
        const from = await rateOf(intentCurrency);
        const to = await rateOf(account.currency);
        if (!from || !to) {
          return { ...account, amount: null, exchangeRate: null };
        }
        const exchangeRate = to.div(from).toDecimalPlaces(8);
        const amount = intentAmount
          .mul(exchangeRate)
          .toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
        return { ...account, amount, exchangeRate };
      })
    );
  }

  private snapshot(account: SellerPaymentAccount): Prisma.InputJsonValue {
    return {
      method: account.method,
      currency: account.currency,
      bankCode: account.bankCode,
      bankName: account.bankName,
      holderName: account.holderName,
      holderDocument: account.holderDocument,
      phone: account.phone,
      accountNumber: account.accountNumber,
      email: account.email,
    };
  }

  private validatePaidAt(value: string) {
    const paidAt = new Date(value);
    const now = Date.now();
    if (
      Number.isNaN(paidAt.getTime()) ||
      paidAt.getTime() > now + 60 * 60 * 1000
    ) {
      throw new BadRequestException('La fecha del pago no puede ser futura');
    }
    if (now - paidAt.getTime() > PAID_AT_MAX_AGE_DAYS * 24 * 60 * 60 * 1000) {
      throw new BadRequestException(
        `La fecha del pago no puede tener más de ${PAID_AT_MAX_AGE_DAYS} días`
      );
    }
    return paidAt;
  }

  private formatMoney(amount: Prisma.Decimal, currency: string) {
    const symbol = currency === 'VES' ? 'Bs.' : '$';
    return `${symbol} ${amount.toFixed(2)}`;
  }

  // Una notificación fallida no debe revertir un pago ya registrado.
  private async notifySafe(
    userId: string,
    dto: {
      title: string;
      message: string;
      link?: string;
      metadata?: Record<string, unknown>;
    }
  ) {
    try {
      await this.notifications.createForUser(userId, {
        type: NotificationType.SYSTEM,
        ...dto,
      });
    } catch {
      // best-effort
    }
  }
}
