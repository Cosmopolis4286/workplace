import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  ManualPaymentReportStatus,
  NotificationType,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { NotificationsService } from '../../engagement/notifications/notifications.service';
import {
  SERVICES_FACADE,
  type ServicesFacade,
} from '../../commerce-core/services/services.facade';
import {
  EXCHANGE_RATES_FACADE,
  ExchangeRatesFacade,
} from '../exchange-rates/exchange-rates.facade';
import {
  normalizeReference,
  parsePaidAt,
  snapshotAccount,
  withPayableAmounts,
} from '../payments/manual/payable-accounts';
import { WalletsService } from '../wallets/wallets.service';
import { ReportEscrowFundingDto } from './dto/escrow-funding.dto';

export const ESCROW_SOURCE_SERVICE_REQUEST = 'SERVICE_REQUEST';

/**
 * Pago Protegido por operación. La billetera ya no se recarga: cuando una
 * solicitud queda esperando garantía (escrowStatus=PENDING_FUNDS), el cliente
 * paga ESE monto a una cuenta de la plataforma y reporta la referencia. Al
 * confirmarlo un admin, el dinero se acredita a su billetera (contabilidad
 * interna de la garantía) y se retiene de inmediato para esa solicitud. Al
 * completarse, la liberación al proveedor sigue el camino de siempre.
 */
@Injectable()
export class EscrowFundingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly wallets: WalletsService,
    private readonly notifications: NotificationsService,
    @Inject(SERVICES_FACADE)
    private readonly services: ServicesFacade,
    @Inject(EXCHANGE_RATES_FACADE)
    private readonly rates: ExchangeRatesFacade
  ) {}

  async getServiceRequestOptions(userId: string, requestId: string) {
    const req = await this.findOwnedPendingRequest(userId, requestId);
    const due = await this.amountDue(userId, req);

    const reports = await this.prisma.escrowFundingReport.findMany({
      where: {
        sourceType: ESCROW_SOURCE_SERVICE_REQUEST,
        sourceId: req.id,
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
    });
    const pendingReport =
      reports.find((r) => r.status === ManualPaymentReportStatus.SUBMITTED) ??
      null;
    const lastRejected =
      reports[0]?.status === ManualPaymentReportStatus.REJECTED
        ? reports[0]
        : null;

    // El saldo de la billetera ya alcanza (ej. una devolución anterior):
    // se retiene ahora y no hay nada que pagar.
    if (!due.amountDue.gt(0) && !pendingReport) {
      const held = await this.services.retryPendingEscrowForRequest(req.id);
      if (held) return { ...due, held: true, accounts: [], pendingReport };
    }

    const accounts = await this.prisma.platformCollectionAccount.findMany({
      where: { isActive: true },
      orderBy: { createdAt: 'asc' },
    });
    return {
      ...due,
      held: false,
      serviceName: req.serviceName,
      providerName: req.providerName,
      pendingReport,
      lastRejected,
      accounts: await withPayableAmounts(
        this.rates,
        accounts,
        'USD',
        due.amountDue
      ),
    };
  }

  async reportServiceRequestPayment(
    userId: string,
    requestId: string,
    dto: ReportEscrowFundingDto
  ) {
    const req = await this.findOwnedPendingRequest(userId, requestId);
    const pending = await this.prisma.escrowFundingReport.findFirst({
      where: {
        sourceType: ESCROW_SOURCE_SERVICE_REQUEST,
        sourceId: req.id,
        status: ManualPaymentReportStatus.SUBMITTED,
      },
      select: { id: true },
    });
    if (pending) {
      throw new ConflictException('Ya reportaste un pago; está en revisión');
    }

    const { amountDue } = await this.amountDue(userId, req);
    if (!amountDue.gt(0)) {
      throw new ConflictException(
        'Tu saldo ya cubre la garantía; recarga la solicitud'
      );
    }

    const account = await this.prisma.platformCollectionAccount.findFirst({
      where: { id: dto.platformAccountId, isActive: true },
    });
    if (!account) {
      throw new BadRequestException('La cuenta de destino no está disponible');
    }
    const reference = normalizeReference(dto.reference);
    if (!reference) {
      throw new BadRequestException(
        'Referencia inválida: usa entre 4 y 30 letras o números'
      );
    }
    const paidAt = parsePaidAt(dto.paidAt);
    if (typeof paidAt === 'string') throw new BadRequestException(paidAt);

    const duplicate = await this.prisma.escrowFundingReport.findFirst({
      where: {
        reference,
        status: { not: ManualPaymentReportStatus.REJECTED },
      },
      select: { id: true },
    });
    if (duplicate) {
      throw new ConflictException('Esa referencia ya fue reportada');
    }

    const [priced] = await withPayableAmounts(
      this.rates,
      [account],
      'USD',
      amountDue
    );
    if (priced.amount === null) {
      throw new ConflictException(
        'No hay una tasa de cambio vigente para pagar en esta moneda'
      );
    }

    return this.prisma.escrowFundingReport.create({
      data: {
        sourceType: ESCROW_SOURCE_SERVICE_REQUEST,
        sourceId: req.id,
        payerUserId: userId,
        amount: amountDue,
        platformAccountId: account.id,
        destination: snapshotAccount(account),
        reference,
        payerBankCode: dto.payerBankCode,
        paidAt,
        paidCurrency: account.currency,
        paidAmount: priced.amount,
        exchangeRate: priced.exchangeRate,
      },
    });
  }

  // ─── Admin ────────────────────────────────────────────────────────────────

  async list(status?: ManualPaymentReportStatus) {
    const reports = await this.prisma.escrowFundingReport.findMany({
      where: status ? { status } : undefined,
      orderBy: { createdAt: 'desc' },
      take: 200,
      include: {
        payer: { select: { firstName: true, lastName: true, email: true } },
      },
    });
    const requests = await this.prisma.serviceRequest.findMany({
      where: {
        id: {
          in: reports
            .filter((r) => r.sourceType === ESCROW_SOURCE_SERVICE_REQUEST)
            .map((r) => r.sourceId),
        },
      },
      select: {
        id: true,
        serviceName: true,
        providerName: true,
        escrowStatus: true,
      },
    });
    const byId = new Map(requests.map((r) => [r.id, r]));
    return reports.map(({ payer, ...r }) => ({
      ...r,
      payerName: `${payer.firstName ?? ''} ${payer.lastName ?? ''}`.trim(),
      payerEmail: payer.email,
      source: byId.get(r.sourceId) ?? null,
    }));
  }

  async confirm(adminId: string, id: string) {
    const report = await this.findSubmitted(id);
    await this.settle(id, ManualPaymentReportStatus.CONFIRMED, adminId);

    const payer = await this.prisma.user.findUniqueOrThrow({
      where: { id: report.payerUserId },
      select: { role: true },
    });
    try {
      await this.wallets.ensureWalletForUser(report.payerUserId);
      await this.wallets.deposit(
        report.payerUserId,
        payer.role,
        {
          amount: report.amount.toNumber(),
          description: 'Pago de garantía (Pago Protegido)',
          reference: `ESCROW-FUND-${id}`,
        },
        { retryEscrows: false }
      );
    } catch (err) {
      // Sin acreditar, el reporte vuelve a revisión para no perder el pago.
      await this.prisma.escrowFundingReport.update({
        where: { id },
        data: {
          status: ManualPaymentReportStatus.SUBMITTED,
          reviewedById: null,
          reviewedAt: null,
        },
      });
      throw new ConflictException(
        `No se pudo acreditar el pago: ${(err as Error).message}`
      );
    }

    const held = await this.services
      .retryPendingEscrowForRequest(report.sourceId)
      .catch(() => false);

    await this.notify(report.payerUserId, {
      title: held ? '🛡️ Garantía confirmada' : '✅ Pago recibido',
      message: held
        ? `Confirmamos tu pago (ref. ${report.reference}). La plataforma retiene $${report.amount.toFixed(2)} hasta que el servicio se complete.`
        : `Confirmamos tu pago (ref. ${report.reference}), pero la solicitud ya no esperaba la garantía: $${report.amount.toFixed(2)} quedaron en tu billetera y puedes retirarlos.`,
      link: held ? '/service-requests' : '/wallet',
      metadata: { escrowFundingId: id, serviceRequestId: report.sourceId },
    });
    return { confirmed: true, held };
  }

  async reject(adminId: string, id: string, reason: string) {
    const trimmed = reason?.trim();
    if (!trimmed || trimmed.length < 5) {
      throw new BadRequestException(
        'Explica al cliente por qué no se encontró el pago'
      );
    }
    const report = await this.findSubmitted(id);
    await this.settle(id, ManualPaymentReportStatus.REJECTED, adminId, trimmed);
    await this.notify(report.payerUserId, {
      title: '⚠️ Pago de garantía no encontrado',
      message: `No encontramos tu pago (ref. ${report.reference}): ${trimmed}. Revisa los datos y repórtalo de nuevo.`,
      link: '/service-requests',
      metadata: { escrowFundingId: id, serviceRequestId: report.sourceId },
    });
    return { rejected: true };
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────

  private async findOwnedPendingRequest(userId: string, requestId: string) {
    const req = await this.prisma.serviceRequest.findUnique({
      where: { id: requestId },
    });
    if (!req || req.requesterId !== userId) {
      throw new NotFoundException('Solicitud no encontrada');
    }
    if (req.escrowStatus !== 'PENDING_FUNDS') {
      throw new ConflictException('Esta solicitud no espera una garantía');
    }
    return req;
  }

  /**
   * Lo que falta para retener la garantía: el delta de un aumento de precio
   * aprobado sin fondos o la garantía completa (igual que el reintento de
   * ServicesService), menos el saldo que ya tenga la billetera.
   */
  private async amountDue(
    userId: string,
    req: { id: string; escrowAmount: Prisma.Decimal | null }
  ) {
    const proposal =
      await this.prisma.serviceRequestPriceChangeProposal.findFirst({
        where: { serviceRequestId: req.id, status: 'APPROVED_PENDING_FUNDS' },
        orderBy: { createdAt: 'asc' },
      });
    const required =
      proposal?.deltaAmount ?? req.escrowAmount ?? new Prisma.Decimal(0);
    const wallet = await this.prisma.wallet.findUnique({
      where: { userId },
      select: { balance: true },
    });
    const walletBalance = wallet?.balance ?? new Prisma.Decimal(0);
    const amountDue = Prisma.Decimal.max(required.sub(walletBalance), 0);
    return { currency: 'USD', required, walletBalance, amountDue };
  }

  private async findSubmitted(id: string) {
    const report = await this.prisma.escrowFundingReport.findUnique({
      where: { id },
    });
    if (!report) throw new NotFoundException('Pago no encontrado');
    if (report.status !== ManualPaymentReportStatus.SUBMITTED) {
      throw new ConflictException('Este pago ya fue revisado');
    }
    return report;
  }

  private async settle(
    id: string,
    status: ManualPaymentReportStatus,
    adminId: string,
    rejectionReason?: string
  ) {
    const changed = await this.prisma.escrowFundingReport.updateMany({
      where: { id, status: ManualPaymentReportStatus.SUBMITTED },
      data: {
        status,
        rejectionReason,
        reviewedById: adminId,
        reviewedAt: new Date(),
      },
    });
    if (changed.count !== 1) {
      throw new ConflictException('Este pago ya fue revisado');
    }
  }

  // Una notificación fallida no debe revertir una operación de dinero.
  private async notify(
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
