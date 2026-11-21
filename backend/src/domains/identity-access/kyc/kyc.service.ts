import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EnhancedReviewStatus, KycStatus, Role } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { RedisService } from '../../../redis/redis.service';
import { userFindByIdCacheKey } from '../../../common/utils/cache-keys.util';
import { MailService } from '../../engagement/mail/mail.service';
import { AuditService } from '../audit/audit.service';
import { SubmitVerificationDto } from './dto/submit-verification.dto';
import { ReviewVerificationDto } from './dto/review-verification.dto';

const IMAGE_FIELDS = [
  'frontImageUrl',
  'backImageUrl',
  'selfieImageUrl',
] as const;
type ImageField = (typeof IMAGE_FIELDS)[number];

@Injectable()
export class KycService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly mail: MailService,
    private readonly audit: AuditService
  ) {}

  async getMyStatus(userId: string) {
    const latest = await this.prisma.identityVerification.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { kycStatus: true },
    });

    const enhancedReview = await this.getMyEnhancedReview(userId);

    return {
      kycStatus: user?.kycStatus ?? KycStatus.NONE,
      latestSubmission: latest,
      enhancedReview,
    };
  }

  async getMyEnhancedReview(userId: string) {
    return this.prisma.enhancedReviewRequest.findUnique({
      where: { userId },
      select: {
        id: true,
        status: true,
        requestReason: true,
        decisionReason: true,
        reviewedAt: true,
        expiresAt: true,
        revokedAt: true,
        revocationReason: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async requestEnhancedReview(userId: string, reason: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { kycStatus: true },
    });
    if (!user) throw new NotFoundException('Usuario no encontrado');
    if (user.kycStatus !== KycStatus.APPROVED) {
      throw new BadRequestException(
        'Debes tener tu identidad KYC aprobada antes de solicitar una revisión reforzada'
      );
    }

    const now = new Date();
    const current = await this.prisma.enhancedReviewRequest.findUnique({
      where: { userId },
    });
    if (current?.status === EnhancedReviewStatus.PENDING) {
      throw new ConflictException('Ya tienes una revisión reforzada pendiente');
    }
    if (
      current?.status === EnhancedReviewStatus.APPROVED &&
      (!current.expiresAt || current.expiresAt > now)
    ) {
      throw new ConflictException('Ya tienes una revisión reforzada vigente');
    }

    let request;
    try {
      if (current) {
        const changed = await this.prisma.enhancedReviewRequest.updateMany({
          where: {
            id: current.id,
            status: current.status,
            ...(current.status === EnhancedReviewStatus.APPROVED
              ? { expiresAt: { lte: now } }
              : {}),
          },
          data: {
            status: EnhancedReviewStatus.PENDING,
            requestReason: reason.trim(),
            decisionReason: null,
            reviewedBy: null,
            reviewedAt: null,
            expiresAt: null,
            revokedBy: null,
            revokedAt: null,
            revocationReason: null,
          },
        });
        if (changed.count !== 1) {
          throw new ConflictException(
            'La solicitud cambió mientras se procesaba. Actualiza el estado e inténtalo de nuevo.'
          );
        }
        request = await this.prisma.enhancedReviewRequest.findUniqueOrThrow({
          where: { id: current.id },
        });
      } else {
        request = await this.prisma.enhancedReviewRequest.create({
          data: { userId, requestReason: reason.trim() },
        });
      }
    } catch (error) {
      if (
        error instanceof ConflictException ||
        (error as { code?: string })?.code !== 'P2002'
      ) {
        throw error;
      }
      throw new ConflictException('Ya existe una solicitud de revisión reforzada');
    }

    await this.audit.log({
      userId,
      action: 'CREATE',
      module: 'kyc',
      entityId: request.id,
      summary: 'Solicitud de revisión reforzada enviada',
      details: { targetUserId: userId, status: EnhancedReviewStatus.PENDING },
    });
    return this.getMyEnhancedReview(userId);
  }

  async findAllPendingEnhancedReviews(page = 1, limit = 20) {
    const safePage = Number.isInteger(page) && page > 0 ? page : 1;
    const safeLimit = Number.isInteger(limit)
      ? Math.min(Math.max(limit, 1), 100)
      : 20;
    const [data, total] = await Promise.all([
      this.prisma.enhancedReviewRequest.findMany({
        where: { status: EnhancedReviewStatus.PENDING },
        orderBy: { createdAt: 'asc' },
        skip: (safePage - 1) * safeLimit,
        take: safeLimit,
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              role: true,
              kycStatus: true,
            },
          },
        },
      }),
      this.prisma.enhancedReviewRequest.count({
        where: { status: EnhancedReviewStatus.PENDING },
      }),
    ]);
    return { data, total, page: safePage, limit: safeLimit };
  }

  async findActiveEnhancedReviews(page = 1, limit = 20) {
    const safePage = Number.isInteger(page) && page > 0 ? page : 1;
    const safeLimit = Number.isInteger(limit)
      ? Math.min(Math.max(limit, 1), 100)
      : 20;
    const now = new Date();
    const where = {
      status: EnhancedReviewStatus.APPROVED,
      OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
    };
    const [data, total] = await Promise.all([
      this.prisma.enhancedReviewRequest.findMany({
        where,
        orderBy: { reviewedAt: 'desc' },
        skip: (safePage - 1) * safeLimit,
        take: safeLimit,
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              role: true,
              kycStatus: true,
            },
          },
        },
      }),
      this.prisma.enhancedReviewRequest.count({ where }),
    ]);
    return { data, total, page: safePage, limit: safeLimit };
  }

  async reviewEnhancedRequest(
    id: string,
    reviewerId: string,
    dto: {
      status: EnhancedReviewStatus.APPROVED | EnhancedReviewStatus.REJECTED;
      reason: string;
      expiresAt?: string;
    }
  ) {
    const current = await this.prisma.enhancedReviewRequest.findUnique({
      where: { id },
      include: { user: { select: { kycStatus: true } } },
    });
    if (!current)
      throw new NotFoundException('Solicitud de revisión reforzada no encontrada');
    if (current.status !== EnhancedReviewStatus.PENDING) {
      throw new BadRequestException('Esta solicitud ya fue revisada');
    }
    if (
      dto.status === EnhancedReviewStatus.APPROVED &&
      current.user.kycStatus !== KycStatus.APPROVED
    ) {
      throw new BadRequestException(
        'No se puede aprobar la revisión reforzada si el KYC base ya no está aprobado'
      );
    }

    const now = new Date();
    let expiresAt: Date | null = null;
    if (dto.status === EnhancedReviewStatus.APPROVED) {
      expiresAt = dto.expiresAt
        ? new Date(dto.expiresAt)
        : new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);
      const maxExpiry = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);
      if (
        Number.isNaN(expiresAt.getTime()) ||
        expiresAt <= now ||
        expiresAt > maxExpiry
      ) {
        throw new BadRequestException(
          'La vigencia debe ser futura y no puede superar 365 días'
        );
      }
    } else if (dto.expiresAt) {
      throw new BadRequestException(
        'No se debe indicar una vigencia al rechazar una solicitud'
      );
    }

    const changed = await this.prisma.enhancedReviewRequest.updateMany({
      where: { id, status: EnhancedReviewStatus.PENDING },
      data: {
        status: dto.status,
        decisionReason: dto.reason.trim(),
        reviewedBy: reviewerId,
        reviewedAt: now,
        expiresAt,
      },
    });
    if (changed.count !== 1) {
      throw new ConflictException(
        'La solicitud fue revisada por otro administrador. Actualiza la bandeja.'
      );
    }

    const updated = await this.prisma.enhancedReviewRequest.findUniqueOrThrow({
      where: { id },
    });
    await this.audit.log({
      userId: reviewerId,
      action: 'UPDATE',
      module: 'kyc',
      entityId: id,
      summary:
        dto.status === EnhancedReviewStatus.APPROVED
          ? 'Revisión reforzada aprobada por SUPERADMIN'
          : 'Revisión reforzada rechazada por SUPERADMIN',
      details: {
        targetUserId: current.userId,
        previousStatus: current.status,
        status: dto.status,
        reason: dto.reason.trim(),
        expiresAt,
      },
    });
    return updated;
  }

  async revokeEnhancedReview(
    id: string,
    reviewerId: string,
    reason: string
  ) {
    const now = new Date();
    const changed = await this.prisma.enhancedReviewRequest.updateMany({
      where: {
        id,
        status: EnhancedReviewStatus.APPROVED,
        OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
      },
      data: {
        status: EnhancedReviewStatus.REVOKED,
        revokedBy: reviewerId,
        revokedAt: now,
        revocationReason: reason.trim(),
      },
    });
    if (changed.count !== 1) {
      throw new ConflictException(
        'La revisión reforzada no está vigente o ya fue revocada'
      );
    }
    const updated = await this.prisma.enhancedReviewRequest.findUniqueOrThrow({
      where: { id },
    });
    await this.audit.log({
      userId: reviewerId,
      action: 'UPDATE',
      module: 'kyc',
      entityId: id,
      summary: 'Revisión reforzada revocada por SUPERADMIN',
      details: {
        targetUserId: updated.userId,
        previousStatus: EnhancedReviewStatus.APPROVED,
        status: EnhancedReviewStatus.REVOKED,
        reason: reason.trim(),
      },
    });
    return updated;
  }

  async submit(
    userId: string,
    dto: SubmitVerificationDto,
    files: {
      frontImageUrl: string;
      backImageUrl?: string;
      selfieImageUrl: string;
    }
  ) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { kycStatus: true },
    });
    if (!user) throw new NotFoundException('Usuario no encontrado');

    if (user.kycStatus === KycStatus.APPROVED) {
      throw new ConflictException('Tu identidad ya está verificada');
    }
    if (user.kycStatus === KycStatus.PENDING) {
      throw new ConflictException(
        'Ya tienes una solicitud de verificación en revisión'
      );
    }

    const verification = await this.prisma.$transaction(async (tx) => {
      // El estado se vuelve a comprobar dentro de la transacción para impedir
      // dos solicitudes PENDING si llegan envíos simultáneos.
      const claimed = await tx.user.updateMany({
        where: {
          id: userId,
          kycStatus: { notIn: [KycStatus.PENDING, KycStatus.APPROVED] },
        },
        data: { kycStatus: KycStatus.PENDING },
      });
      if (claimed.count !== 1) {
        throw new ConflictException(
          'Ya existe una solicitud de verificación o la cuenta cambió. Actualiza el estado e inténtalo de nuevo.'
        );
      }

      const created = await tx.identityVerification.create({
        data: {
          userId,
          documentType: dto.documentType,
          documentNumber: dto.documentNumber,
          fullName: dto.fullName,
          birthDate: dto.birthDate ? new Date(dto.birthDate) : undefined,
          frontImageUrl: files.frontImageUrl,
          backImageUrl: files.backImageUrl,
          selfieImageUrl: files.selfieImageUrl,
          status: KycStatus.PENDING,
        },
      });

      return created;
    });

    await this.audit.log({
      userId,
      action: 'CREATE',
      module: 'kyc',
      entityId: verification.id,
      summary: 'Solicitud de verificación de identidad enviada',
      details: { documentType: dto.documentType, status: KycStatus.PENDING },
    });

    return verification;
  }

  // ─── Imágenes ──────────────────────────────────────────────────────────────────

  async resolveImageFilename(
    verificationId: string,
    field: string,
    requesterId: string,
    requesterRole: Role
  ): Promise<string> {
    if (!IMAGE_FIELDS.includes(field as ImageField)) {
      throw new BadRequestException('Campo de imagen inválido');
    }

    const verification = await this.prisma.identityVerification.findUnique({
      where: { id: verificationId },
      select: {
        userId: true,
        frontImageUrl: true,
        backImageUrl: true,
        selfieImageUrl: true,
      },
    });
    if (!verification)
      throw new NotFoundException('Solicitud de verificación no encontrada');

    const isOwner = verification.userId === requesterId;
    const isAdmin =
      requesterRole === Role.SUPERADMIN || requesterRole === Role.ADMIN;
    if (!isOwner && !isAdmin) {
      throw new ForbiddenException('No tienes permiso para ver esta imagen');
    }

    const url = verification[field as ImageField];
    if (!url) throw new NotFoundException('Imagen no encontrada');

    // Las URLs guardadas tienen forma "/uploads/kyc/{filename}"; nos quedamos
    // solo con el nombre de archivo para evitar cualquier path traversal.
    return url.split('/').pop()!;
  }

  // ─── Admin ────────────────────────────────────────────────────────────────────

  async findAllPending(page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.prisma.identityVerification.findMany({
        where: { status: KycStatus.PENDING },
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
      this.prisma.identityVerification.count({
        where: { status: KycStatus.PENDING },
      }),
    ]);
    return { data, total, page, limit };
  }

  async findOne(id: string, requesterRole: Role) {
    if (requesterRole !== Role.SUPERADMIN && requesterRole !== Role.ADMIN) {
      throw new ForbiddenException('No tienes permiso para ver esta solicitud');
    }
    const verification = await this.prisma.identityVerification.findUnique({
      where: { id },
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
    });
    if (!verification)
      throw new NotFoundException('Solicitud de verificación no encontrada');
    return verification;
  }

  async review(id: string, reviewerId: string, dto: ReviewVerificationDto) {
    const verification = await this.prisma.identityVerification.findUnique({
      where: { id },
    });
    if (!verification)
      throw new NotFoundException('Solicitud de verificación no encontrada');
    if (verification.status !== KycStatus.PENDING) {
      throw new BadRequestException('Esta solicitud ya fue revisada');
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const changed = await tx.identityVerification.updateMany({
        where: { id, status: KycStatus.PENDING },
        data: {
          status: dto.status,
          rejectionReason:
            dto.status === KycStatus.REJECTED ? dto.rejectionReason : null,
          reviewedBy: reviewerId,
          reviewedAt: new Date(),
        },
      });
      if (changed.count !== 1) {
        throw new ConflictException(
          'La solicitud fue revisada por otro administrador. Actualiza la bandeja.'
        );
      }

      await tx.user.update({
        where: { id: verification.userId },
        data: { kycStatus: dto.status },
      });

      return tx.identityVerification.findUniqueOrThrow({ where: { id } });
    });
    await this.redis.del(userFindByIdCacheKey(verification.userId));
    await this.audit.log({
      userId: reviewerId,
      action: 'UPDATE',
      module: 'kyc',
      entityId: id,
      summary:
        dto.status === KycStatus.APPROVED
          ? 'Solicitud KYC aprobada por administración'
          : 'Solicitud KYC rechazada por administración',
      details: {
        targetUserId: verification.userId,
        status: dto.status,
        ...(dto.status === KycStatus.REJECTED
          ? { rejectionReason: dto.rejectionReason }
          : {}),
      },
    });

    const user = await this.prisma.user.findUnique({
      where: { id: verification.userId },
      select: { email: true, firstName: true },
    });
    if (user) {
      this.mail
        .sendKycStatusUpdate(
          user.email,
          user.firstName,
          dto.status,
          dto.rejectionReason
        )
        .catch(() => undefined);
    }

    return updated;
  }
}
