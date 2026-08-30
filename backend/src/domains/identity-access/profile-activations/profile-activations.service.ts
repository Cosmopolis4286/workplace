import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { KycStatus, ProfileStatus, ProfileType } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { RedisService } from '../../../redis/redis.service';
import { userFindByIdCacheKey } from '../../../common/utils/cache-keys.util';
import { NotificationsService } from '../../engagement/notifications/notifications.service';
import { RoleResolverService } from '../../../common/account-type/role-resolver.service';
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
    private readonly roleResolver: RoleResolverService,
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

  // Fija User.activeProfileId — contexto de UX ("estoy usando WorkPlace
  // como..."), puramente presentacional. NO toca permisos ni capacidades:
  // esas siguen siendo la unión de TODOS los UserProfile ACTIVE del
  // usuario, no solo el activo (ver IDENTITY_ARCHITECTURE_PLAN.md, sección
  // "activeProfile"). El perfil debe pertenecer al usuario y estar ACTIVE
  // — no tiene sentido "activar" un perfil PENDING/REJECTED/SUSPENDED.
  async setActive(userId: string, profileId: string) {
    const profile = await this.prisma.userProfile.findUnique({ where: { id: profileId } });
    if (!profile || profile.userId !== userId) {
      throw new NotFoundException('Perfil no encontrado');
    }
    if (profile.status !== ProfileStatus.ACTIVE) {
      throw new BadRequestException('Solo se puede activar un perfil que ya está ACTIVE');
    }

    await this.prisma.user.update({ where: { id: userId }, data: { activeProfileId: profileId } });
    await this.redis.del(userFindByIdCacheKey(userId));

    return profile;
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

    const updated = await this.prisma.$transaction(async (tx) => {
      const result = await tx.userProfile.update({
        where: { id },
        data: {
          status: dto.status,
          rejectionReason: dto.status === ProfileStatus.REJECTED ? dto.rejectionReason : null,
          reviewedBy: reviewerId,
          reviewedAt: new Date(),
        },
      });

      // Mantiene User.categoryId/subcategoryId sincronizados, igual que
      // FreelancerApplication.review() — varios módulos existentes todavía
      // leen la categoría desde User, no desde UserProfile.
      if (dto.status === ProfileStatus.ACTIVE && profile.categoryId) {
        await tx.user.update({
          where: { id: profile.userId },
          data: { categoryId: profile.categoryId, subcategoryId: profile.subcategoryId },
        });
      }

      // RoleResolverService recalcula User.role a partir de TODOS los
      // UserProfile ACTIVE (no solo este) — reemplaza el chequeo ad-hoc que
      // solo cubría PROFESSIONAL/FREELANCER; ahora también cubre BUSINESS y
      // PROFESSIONAL/SERVICE_PROVIDER. Sin esto, aprobar un perfil de
      // negocio deja al usuario con UserProfile ACTIVE pero sin el rol
      // real, y el resto de la app (guards, middleware del frontend) sigue
      // leyendo User.role — sería un callejón sin salida silencioso.
      if (profile.type === ProfileType.BUSINESS || profile.type === ProfileType.PROFESSIONAL) {
        await this.roleResolver.syncRoleForUser(profile.userId, tx);
      }

      return result;
    });

    if (dto.status === ProfileStatus.ACTIVE) {
      await this.redis.del(userFindByIdCacheKey(profile.userId));
    }

    this.notifications
      .notifyProfileActivationReviewed(profile.userId, TYPE_LABEL[profile.type], dto.status, dto.rejectionReason)
      .catch(() => {});

    return updated;
  }
}
