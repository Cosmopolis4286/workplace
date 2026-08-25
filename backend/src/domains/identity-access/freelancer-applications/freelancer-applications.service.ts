import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { KycStatus, ProfessionalSubtype, ProfileStatus, ProfileType, ProposalStatus, Role } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { RedisService } from '../../../redis/redis.service';
import { userFindByIdCacheKey } from '../../../common/utils/cache-keys.util';
import { NotificationsService } from '../../engagement/notifications/notifications.service';
import { RoleResolverService } from '../../../common/account-type/role-resolver.service';
import { CreateFreelancerApplicationDto } from './dto/create-freelancer-application.dto';
import { ReviewFreelancerApplicationDto } from './dto/review-freelancer-application.dto';

@Injectable()
export class FreelancerApplicationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly notifications: NotificationsService,
    private readonly roleResolver: RoleResolverService,
  ) {}

  async getMine(userId: string) {
    return this.prisma.freelancerApplication.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: { category: { select: { id: true, name: true, icon: true } }, subcategory: { select: { id: true, name: true } } },
    });
  }

  async create(userId: string, dto: CreateFreelancerApplicationDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
    if (!user) throw new NotFoundException('Usuario no encontrado');
    if (user.role !== Role.NORMAL) {
      throw new BadRequestException('Solo un usuario con cuenta de cliente puede solicitar convertirse en freelancer');
    }

    const pending = await this.prisma.freelancerApplication.findFirst({
      where: { userId, status: ProposalStatus.PENDING },
    });
    if (pending) throw new ConflictException('Ya tienes una solicitud en revisión');

    const category = await this.prisma.userCategory.findUnique({ where: { id: dto.categoryId } });
    if (!category) throw new BadRequestException('Categoría inválida');

    if (dto.subcategoryId) {
      const subcategory = await this.prisma.userSubcategory.findUnique({ where: { id: dto.subcategoryId } });
      if (!subcategory || subcategory.categoryId !== dto.categoryId) {
        throw new BadRequestException('Subcategoría inválida');
      }
    }

    const created = await this.prisma.freelancerApplication.create({
      data: {
        userId,
        categoryId: dto.categoryId,
        subcategoryId: dto.subcategoryId,
        message: dto.message,
      },
    });

    // Dual-write a UserProfile (ver WORKPLACE_VISION.md — modelo de perfiles
    // múltiples). No es la fuente de verdad todavía (sigue siendo
    // FreelancerApplication, que es lo que lee el frontend); es un espejo
    // para que AccountTypeResolver y /profile-activations vean este perfil.
    // No @@unique en UserProfile(userId, type): si por lo que sea ya hay uno,
    // actualizamos en vez de duplicar.
    const existingProfile = await this.prisma.userProfile.findFirst({
      where: { userId, type: ProfileType.PROFESSIONAL, status: { in: [ProfileStatus.PENDING, ProfileStatus.ACTIVE] } },
    });
    if (existingProfile) {
      await this.prisma.userProfile.update({
        where: { id: existingProfile.id },
        data: {
          subtype: ProfessionalSubtype.FREELANCER,
          categoryId: dto.categoryId,
          subcategoryId: dto.subcategoryId,
          status: ProfileStatus.PENDING,
          rejectionReason: null,
          reviewedBy: null,
          reviewedAt: null,
        },
      });
    } else {
      await this.prisma.userProfile.create({
        data: {
          userId,
          type: ProfileType.PROFESSIONAL,
          subtype: ProfessionalSubtype.FREELANCER,
          categoryId: dto.categoryId,
          subcategoryId: dto.subcategoryId,
          status: ProfileStatus.PENDING,
        },
      });
    }

    return created;
  }

  // ─── Admin ────────────────────────────────────────────────────────────────────

  async findAllPending(page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.prisma.freelancerApplication.findMany({
        where: { status: ProposalStatus.PENDING },
        orderBy: { createdAt: 'asc' },
        skip,
        take: limit,
        include: {
          user: { select: { id: true, firstName: true, lastName: true, email: true, role: true, kycStatus: true } },
          category: { select: { id: true, name: true, icon: true } },
          subcategory: { select: { id: true, name: true } },
        },
      }),
      this.prisma.freelancerApplication.count({ where: { status: ProposalStatus.PENDING } }),
    ]);
    return { data, total, page, limit };
  }

  async review(id: string, reviewerId: string, dto: ReviewFreelancerApplicationDto) {
    const application = await this.prisma.freelancerApplication.findUnique({
      where: { id },
      include: { user: { select: { kycStatus: true } } },
    });
    if (!application) throw new NotFoundException('Solicitud no encontrada');
    if (application.status !== ProposalStatus.PENDING) {
      throw new BadRequestException('Esta solicitud ya fue revisada');
    }
    if (dto.status === ProposalStatus.APPROVED && application.user.kycStatus !== KycStatus.APPROVED) {
      throw new BadRequestException(
        'El solicitante debe tener su identidad verificada (KYC aprobado) antes de convertirse en freelancer'
      );
    }

    // Espejo en UserProfile (ver create() más arriba): busca el PENDING que
    // esta misma solicitud creó/actualizó para mantenerlo sincronizado.
    const linkedProfile = await this.prisma.userProfile.findFirst({
      where: { userId: application.userId, type: ProfileType.PROFESSIONAL, status: ProfileStatus.PENDING },
    });
    const profileStatus = dto.status === ProposalStatus.APPROVED ? ProfileStatus.ACTIVE : ProfileStatus.REJECTED;

    const updated = await this.prisma.$transaction(async (tx) => {
      const result = await tx.freelancerApplication.update({
        where: { id },
        data: {
          status: dto.status,
          rejectionReason: dto.status === ProposalStatus.REJECTED ? dto.rejectionReason : null,
          reviewedBy: reviewerId,
          reviewedAt: new Date(),
        },
      });

      if (dto.status === ProposalStatus.APPROVED) {
        await tx.user.update({
          where: { id: application.userId },
          data: { categoryId: application.categoryId, subcategoryId: application.subcategoryId },
        });
      }

      if (linkedProfile) {
        await tx.userProfile.update({
          where: { id: linkedProfile.id },
          data: {
            status: profileStatus,
            rejectionReason: dto.status === ProposalStatus.REJECTED ? dto.rejectionReason : null,
            reviewedBy: reviewerId,
            reviewedAt: new Date(),
          },
        });
      } else if (dto.status === ProposalStatus.APPROVED) {
        // Self-healing: si por lo que sea el dual-write de create() no dejó
        // un UserProfile PENDING (dato legacy, o creado antes de que
        // existiera ese dual-write), crear uno ACTIVE ahora — sin esto,
        // RoleResolverService no vería ningún perfil de este usuario y no
        // otorgaría el rol (ver comentario en syncRoleForUser).
        await tx.userProfile.create({
          data: {
            userId: application.userId,
            type: ProfileType.PROFESSIONAL,
            subtype: ProfessionalSubtype.FREELANCER,
            categoryId: application.categoryId,
            subcategoryId: application.subcategoryId,
            status: ProfileStatus.ACTIVE,
            reviewedBy: reviewerId,
            reviewedAt: new Date(),
          },
        });
      }

      // RoleResolverService recalcula User.role a partir de los UserProfile
      // ACTIVE del usuario (reemplaza el `role: Role.FREELANCER` directo de
      // antes) — consistente con el mismo camino que usa
      // ProfileActivationsService.review(), y respeta si el usuario además
      // tiene un perfil BUSINESS activo (BUSINESS gana sobre PROFESSIONAL).
      await this.roleResolver.syncRoleForUser(application.userId, tx);

      return result;
    });

    if (dto.status === ProposalStatus.APPROVED) {
      await this.redis.del(userFindByIdCacheKey(application.userId));
    }

    this.notifications
      .notifyFreelancerApplicationReviewed(application.userId, dto.status, dto.rejectionReason)
      .catch(() => {});

    return updated;
  }
}
