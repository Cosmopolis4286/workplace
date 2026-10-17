import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { KycStatus, Role } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { RedisService } from '../../../redis/redis.service';
import { userFindByIdCacheKey } from '../../../common/utils/cache-keys.util';
import { MailService } from '../../engagement/mail/mail.service';
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
    private readonly mail: MailService
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

    return {
      kycStatus: user?.kycStatus ?? KycStatus.NONE,
      latestSubmission: latest,
    };
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

      await tx.user.update({
        where: { id: userId },
        data: { kycStatus: KycStatus.PENDING },
      });

      return created;
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

    const [updated] = await this.prisma.$transaction([
      this.prisma.identityVerification.update({
        where: { id },
        data: {
          status: dto.status,
          rejectionReason:
            dto.status === KycStatus.REJECTED ? dto.rejectionReason : null,
          reviewedBy: reviewerId,
          reviewedAt: new Date(),
        },
      }),
      this.prisma.user.update({
        where: { id: verification.userId },
        data: { kycStatus: dto.status },
      }),
    ]);
    await this.redis.del(userFindByIdCacheKey(verification.userId));

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
