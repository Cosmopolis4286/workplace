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

  async review(
    id: string,
    reviewerId: string,
    reviewerRole: Role,
    dto: ReviewDepositRequestDto
  ) {
    const request = await this.prisma.walletDepositRequest.findUnique({
      where: { id },
    });
    if (!request)
      throw new NotFoundException('Solicitud de depósito no encontrada');
    if (request.userId === reviewerId) {
      throw new ForbiddenException(
        'No puedes revisar tu propia solicitud de depósito'
      );
    }
    // Acreditar es crear saldo retirable a un banco: solo SUPERADMIN, igual
    // que el resto de confirmaciones de dinero real. Rechazar sí puede ADMIN.
    if (
      dto.status === ProposalStatus.APPROVED &&
      reviewerRole !== Role.SUPERADMIN
    ) {
      throw new ForbiddenException(
        'Solo un SUPERADMIN puede aprobar depósitos'
      );
    }

    // Se "reclama" la solicitud con un UPDATE condicionado al estado: dos
    // revisiones simultáneas no pueden acreditar dos veces.
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
      return this.prisma.walletDepositRequest.findUniqueOrThrow({
        where: { id },
      });
    }

    const user = await this.prisma.user.findUnique({
      where: { id: request.userId },
      select: { role: true },
    });

    // Acredita el saldo real via el mismo deposit() que usa el resto del
    // sistema (mismos límites de saldo por rol, mismo registro de
    // WalletTransaction). Si falla, la solicitud vuelve a PENDING para no
    // quedar aprobada sin saldo acreditado.
    let transaction;
    try {
      if (!user) throw new NotFoundException('Usuario no encontrado');
      ({ transaction } = await this.wallets.deposit(request.userId, user.role, {
        amount: toNumber(request.amount),
        description: `Depósito aprobado (${request.paymentMethod}${request.reference ? ` — ${request.reference}` : ''})`,
        reference: `DEPOSIT-REQ-${id}`,
      }));
    } catch (err) {
      await this.prisma.walletDepositRequest.update({
        where: { id },
        data: {
          status: ProposalStatus.PENDING,
          reviewedBy: null,
          reviewedAt: null,
        },
      });
      throw err;
    }

    return this.prisma.walletDepositRequest.update({
      where: { id },
      data: { resultingTransactionId: transaction.id },
    });
  }
}
