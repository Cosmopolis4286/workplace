import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ProposalStatus, Role } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { WalletsService } from '../wallets/wallets.service';
import { CreateDepositRequestDto } from './dto/create-deposit-request.dto';
import { ReviewDepositRequestDto } from './dto/review-deposit-request.dto';
import { toNumber } from '../../../common/money/money';

@Injectable()
export class WalletDepositRequestsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly wallets: WalletsService
  ) {}

  async getMine(userId: string) {
    return this.prisma.walletDepositRequest.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(
    userId: string,
    dto: CreateDepositRequestDto,
    proofImageUrl: string
  ) {
    return this.prisma.walletDepositRequest.create({
      data: {
        userId,
        amount: dto.amount,
        paymentMethod: dto.paymentMethod,
        reference: dto.reference,
        proofImageUrl,
      },
    });
  }

  // ─── Imagen del comprobante (dueño o admin) ────────────────────────────────

  async resolveImageFilename(
    id: string,
    requesterId: string,
    requesterRole: Role
  ): Promise<string> {
    const request = await this.prisma.walletDepositRequest.findUnique({
      where: { id },
      select: { userId: true, proofImageUrl: true },
    });
    if (!request)
      throw new NotFoundException('Solicitud de depósito no encontrada');

    const isOwner = request.userId === requesterId;
    const isAdmin =
      requesterRole === Role.SUPERADMIN || requesterRole === Role.ADMIN;
    if (!isOwner && !isAdmin) {
      throw new ForbiddenException(
        'No tienes permiso para ver este comprobante'
      );
    }

    return request.proofImageUrl.split('/').pop()!;
  }

  // ─── Admin ────────────────────────────────────────────────────────────────────

  async findAllPending(page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.prisma.walletDepositRequest.findMany({
        where: { status: ProposalStatus.PENDING },
        orderBy: { createdAt: 'asc' },
        skip,
        take: limit,
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              role: true,
            },
          },
        },
      }),
      this.prisma.walletDepositRequest.count({
        where: { status: ProposalStatus.PENDING },
      }),
    ]);
    return { data, total, page, limit };
  }

  async review(id: string, reviewerId: string, dto: ReviewDepositRequestDto) {
    const request = await this.prisma.walletDepositRequest.findUnique({
      where: { id },
    });
    if (!request)
      throw new NotFoundException('Solicitud de depósito no encontrada');
    if (request.status !== ProposalStatus.PENDING) {
      throw new BadRequestException('Esta solicitud ya fue revisada');
    }

    // Toma la solicitud con un UPDATE condicionado a PENDING: dos admins (o
    // dos clics) revisando a la vez ya no pueden acreditar dos veces — solo
    // uno cambia la fila; el otro recibe "ya fue revisada".
    const claimed = await this.prisma.walletDepositRequest.updateMany({
      where: { id, status: ProposalStatus.PENDING },
      data: {
        status: dto.status,
        rejectionReason:
          dto.status === ProposalStatus.REJECTED
            ? dto.rejectionReason
            : undefined,
        reviewedBy: reviewerId,
        reviewedAt: new Date(),
      },
    });
    if (claimed.count !== 1) {
      throw new BadRequestException('Esta solicitud ya fue revisada');
    }

    if (dto.status === ProposalStatus.REJECTED) {
      return this.prisma.walletDepositRequest.findUnique({ where: { id } });
    }

    try {
      const user = await this.prisma.user.findUnique({
        where: { id: request.userId },
        select: { role: true },
      });
      if (!user) throw new NotFoundException('Usuario no encontrado');

      // Acredita el saldo real vía el mismo deposit() que usa el resto del
      // sistema (mismos límites de saldo, mismo registro de
      // WalletTransaction) — la solicitud aprobada es la única vía que llega
      // hasta acá con dinero verificado por un admin.
      const { transaction } = await this.wallets.deposit(
        request.userId,
        user.role,
        {
          amount: toNumber(request.amount),
          description: `Depósito aprobado (${request.paymentMethod}${request.reference ? ` — ${request.reference}` : ''})`,
          reference: `DEPOSIT-REQ-${id}`,
        }
      );

      return this.prisma.walletDepositRequest.update({
        where: { id },
        data: { resultingTransactionId: transaction.id },
      });
    } catch (err) {
      // No se acreditó (p. ej. superaría el tope de saldo): la solicitud
      // vuelve a PENDING para poder aprobarla o rechazarla después.
      await this.prisma.walletDepositRequest.updateMany({
        where: { id, status: ProposalStatus.APPROVED, resultingTransactionId: null },
        data: { status: ProposalStatus.PENDING, reviewedBy: null, reviewedAt: null },
      });
      throw err;
    }
  }
}
