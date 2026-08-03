import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { ProposalStatus, Role } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { RedisService } from '../../../redis/redis.service';
import { userFindByIdCacheKey } from '../../../common/utils/cache-keys.util';
import { NotificationsService } from '../../engagement/notifications/notifications.service';
import { CreateFreelancerApplicationDto } from './dto/create-freelancer-application.dto';
import { ReviewFreelancerApplicationDto } from './dto/review-freelancer-application.dto';

@Injectable()
export class FreelancerApplicationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly notifications: NotificationsService,
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

    return this.prisma.freelancerApplication.create({
      data: {
        userId,
        categoryId: dto.categoryId,
        subcategoryId: dto.subcategoryId,
        message: dto.message,
      },
    });
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
    const application = await this.prisma.freelancerApplication.findUnique({ where: { id } });
    if (!application) throw new NotFoundException('Solicitud no encontrada');
    if (application.status !== ProposalStatus.PENDING) {
      throw new BadRequestException('Esta solicitud ya fue revisada');
    }

    const [updated] = await this.prisma.$transaction([
      this.prisma.freelancerApplication.update({
        where: { id },
        data: {
          status: dto.status,
          rejectionReason: dto.status === ProposalStatus.REJECTED ? dto.rejectionReason : null,
          reviewedBy: reviewerId,
          reviewedAt: new Date(),
        },
      }),
      ...(dto.status === ProposalStatus.APPROVED
        ? [
            this.prisma.user.update({
              where: { id: application.userId },
              data: {
                role: Role.FREELANCER,
                categoryId: application.categoryId,
                subcategoryId: application.subcategoryId,
              },
            }),
          ]
        : []),
    ]);

    if (dto.status === ProposalStatus.APPROVED) {
      await this.redis.del(userFindByIdCacheKey(application.userId));
    }

    this.notifications
      .notifyFreelancerApplicationReviewed(application.userId, dto.status, dto.rejectionReason)
      .catch(() => {});

    return updated;
  }
}
