import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { KycStatus, ProfileStatus, ProfileType } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { RedisService } from '../../../redis/redis.service';
import { userFindByIdCacheKey } from '../../../common/utils/cache-keys.util';
import { NotificationsService } from '../../engagement/notifications/notifications.service';
import { CreateProfileActivationDto } from './dto/create-profile-activation.dto';
import { ReviewProfileActivationDto } from './dto/review-profile-activation.dto';

// Tipos que requieren revisión de un admin antes de quedar ACTIVE (mismo
// criterio que aplicaba FreelancerApplication: ejercen una actividad de
// negocio dentro del ecosistema). CUSTOMER y JOB_SEEKER se activan solo.
const REQUIRES_APPROVAL: ProfileType[] = [ProfileType.PROFESSIONAL, ProfileType.BUSINESS];

const TYPE_LABEL: Record<ProfileType, string> = {
  CUSTOMER: 'Cliente',
  PROFESSIONAL: 'Profesional',
  JOB_SEEKER: 'Candidato de empleo',
  BUSINESS: 'Negocio',
};

@Injectable()
export class ProfileActivationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly notifications: NotificationsService,
  ) {}

  async getMine(userId: string) {
    return this.prisma.userProfile.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        category: { select: { id: true, name: true, icon: true } },
        subcategory: { select: { id: true, name: true } },
      },
    });
  }

  async create(userId: string, dto: CreateProfileActivationDto) {
    const existing = await this.prisma.userProfile.findFirst({
      where: { userId, type: dto.type, status: { in: [ProfileStatus.PENDING, ProfileStatus.ACTIVE] } },
    });
    if (existing) {
      throw new ConflictException(
        existing.status === ProfileStatus.PENDING
          ? 'Ya tienes una solicitud de este perfil en revisión'
          : 'Ya tienes este perfil activo'
      );
    }

    if (dto.categoryId) {
      const category = await this.prisma.userCategory.findUnique({ where: { id: dto.categoryId } });
      if (!category) throw new BadRequestException('Categoría inválida');

      if (dto.subcategoryId) {
        const subcategory = await this.prisma.userSubcategory.findUnique({ where: { id: dto.subcategoryId } });
        if (!subcategory || subcategory.categoryId !== dto.categoryId) {
          throw new BadRequestException('Subcategoría inválida');
        }
      }
    }

    const needsApproval = REQUIRES_APPROVAL.includes(dto.type);

    return this.prisma.userProfile.create({
      data: {
        userId,
        type: dto.type,
        subtype: dto.subtype,
        categoryId: dto.categoryId,
        subcategoryId: dto.subcategoryId,
        status: needsApproval ? ProfileStatus.PENDING : ProfileStatus.ACTIVE,
      },
    });
  }

  // ─── Admin ────────────────────────────────────────────────────────────────────

  async findAllPending(page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.prisma.userProfile.findMany({
        where: { status: ProfileStatus.PENDING },
        orderBy: { createdAt: 'asc' },
        skip,
        take: limit,
        include: {
          user: { select: { id: true, firstName: true, lastName: true, email: true, role: true, kycStatus: true } },
          category: { select: { id: true, name: true, icon: true } },
          subcategory: { select: { id: true, name: true } },
        },
      }),
      this.prisma.userProfile.count({ where: { status: ProfileStatus.PENDING } }),
    ]);
    return { data, total, page, limit };
  }

  async review(id: string, reviewerId: string, dto: ReviewProfileActivationDto) {
    const profile = await this.prisma.userProfile.findUnique({
      where: { id },
      include: { user: { select: { kycStatus: true } } },
    });
    if (!profile) throw new NotFoundException('Solicitud de perfil no encontrada');
    if (profile.status !== ProfileStatus.PENDING) {
      throw new BadRequestException('Esta solicitud ya fue revisada');
    }
    if (dto.status === ProfileStatus.ACTIVE && profile.user.kycStatus !== KycStatus.APPROVED) {
      throw new BadRequestException(
        'El solicitante debe tener su identidad verificada (KYC aprobado) antes de activar este perfil'
      );
    }

    const [updated] = await this.prisma.$transaction([
      this.prisma.userProfile.update({
        where: { id },
        data: {
          status: dto.status,
          rejectionReason: dto.status === ProfileStatus.REJECTED ? dto.rejectionReason : null,
          reviewedBy: reviewerId,
          reviewedAt: new Date(),
        },
      }),
      // Mantiene User.categoryId/subcategoryId sincronizados, igual que
      // FreelancerApplication.review() — varios módulos existentes todavía
      // leen la categoría desde User, no desde UserProfile.
      ...(dto.status === ProfileStatus.ACTIVE && profile.categoryId
        ? [
            this.prisma.user.update({
              where: { id: profile.userId },
              data: { categoryId: profile.categoryId, subcategoryId: profile.subcategoryId },
            }),
          ]
        : []),
    ]);

    if (dto.status === ProfileStatus.ACTIVE) {
      await this.redis.del(userFindByIdCacheKey(profile.userId));
    }

    this.notifications
      .notifyProfileActivationReviewed(profile.userId, TYPE_LABEL[profile.type], dto.status, dto.rejectionReason)
      .catch(() => {});

    return updated;
  }
}
