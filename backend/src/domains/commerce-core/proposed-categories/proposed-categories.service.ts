import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { ProposalStatus, ProposedCategoryTarget } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { MailService } from '../../engagement/mail/mail.service';
import { NotificationsService } from '../../engagement/notifications/notifications.service';
import { ProposeCategoryDto } from './dto/propose-category.dto';
import { ReviewProposedCategoryDto } from './dto/review-proposed-category.dto';

@Injectable()
export class ProposedCategoriesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mail: MailService,
    private readonly notifications: NotificationsService,
  ) {}

  async propose(userId: string, dto: ProposeCategoryDto) {
    const existingPending = await this.prisma.proposedCategory.findFirst({
      where: {
        proposedBy: userId,
        target: dto.target,
        status: ProposalStatus.PENDING,
        name: { equals: dto.name, mode: 'insensitive' },
      },
    });
    if (existingPending) {
      throw new ConflictException('Ya tienes una propuesta pendiente con ese nombre');
    }

    const existingReal = await this.nameExistsInRealTable(dto.target, dto.name, dto.parentCategoryId);
    if (existingReal) {
      throw new ConflictException('Ya existe una categoría con ese nombre');
    }

    return this.prisma.proposedCategory.create({
      data: {
        name: dto.name,
        description: dto.description,
        color: dto.color,
        icon: dto.icon,
        target: dto.target,
        parentCategoryId: dto.target === ProposedCategoryTarget.USER_CATEGORY ? dto.parentCategoryId : undefined,
        proposedBy: userId,
      },
    });
  }

  async findMine(userId: string) {
    return this.prisma.proposedCategory.findMany({
      where: { proposedBy: userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findAllPending(page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [rows, total] = await Promise.all([
      this.prisma.proposedCategory.findMany({
        where: { status: ProposalStatus.PENDING },
        orderBy: { createdAt: 'asc' },
        skip,
        take: limit,
        include: {
          proposer: { select: { id: true, firstName: true, lastName: true, email: true, role: true } },
        },
      }),
      this.prisma.proposedCategory.count({ where: { status: ProposalStatus.PENDING } }),
    ]);

    // parentCategoryId no es una FK de Prisma (apunta a tablas distintas
    // según target, así que no puede resolverse con `include`) — se
    // completa con una consulta aparte solo para las propuestas que lo usan.
    const parentIds = [...new Set(rows.filter((r) => r.parentCategoryId).map((r) => r.parentCategoryId!))];
    const parents = parentIds.length
      ? await this.prisma.userCategory.findMany({
          where: { id: { in: parentIds } },
          select: { id: true, name: true },
        })
      : [];
    const parentNameById = new Map(parents.map((p) => [p.id, p.name]));

    const data = rows.map((r) => ({
      ...r,
      parentCategoryName: r.parentCategoryId ? (parentNameById.get(r.parentCategoryId) ?? null) : null,
    }));
    return { data, total, page, limit };
  }

  async review(id: string, reviewerId: string, dto: ReviewProposedCategoryDto) {
    const proposal = await this.prisma.proposedCategory.findUnique({ where: { id } });
    if (!proposal) throw new NotFoundException('Propuesta no encontrada');
    if (proposal.status !== ProposalStatus.PENDING) {
      throw new BadRequestException('Esta propuesta ya fue revisada');
    }

    let resultingCategoryId: string | null = null;
    if (dto.status === ProposalStatus.APPROVED) {
      resultingCategoryId = await this.createRealCategory(proposal.target, {
        name: proposal.name,
        color: proposal.color,
        icon: proposal.icon,
        description: proposal.description,
        parentCategoryId: proposal.parentCategoryId,
      });
    }

    const updated = await this.prisma.proposedCategory.update({
      where: { id },
      data: {
        status: dto.status,
        rejectionReason: dto.status === ProposalStatus.REJECTED ? dto.rejectionReason : null,
        reviewedBy: reviewerId,
        reviewedAt: new Date(),
        resultingCategoryId,
      },
    });

    const proposer = await this.prisma.user.findUnique({
      where: { id: proposal.proposedBy },
      select: { email: true, firstName: true },
    });
    if (proposer) {
      this.mail
        .sendProposedCategoryStatusUpdate(proposer.email, proposer.firstName, proposal.name, dto.status, dto.rejectionReason)
        .catch(() => undefined);
      this.notifications
        .notifyProposedCategoryReviewed(proposal.proposedBy, proposal.name, dto.status)
        .catch(() => undefined);
    }

    return updated;
  }

  // ─── Helpers ────────────────────────────────────────────────────────────────

  private async nameExistsInRealTable(
    target: ProposedCategoryTarget,
    name: string,
    parentCategoryId?: string,
  ): Promise<boolean> {
    if (target === ProposedCategoryTarget.PRODUCT) {
      const found = await this.prisma.category.findFirst({
        where: { name: { equals: name, mode: 'insensitive' }, isGlobal: true },
      });
      return !!found;
    }
    if (target === ProposedCategoryTarget.SERVICE) {
      const found = await this.prisma.serviceCategory.findFirst({
        where: { name: { equals: name, mode: 'insensitive' } },
      });
      return !!found;
    }
    if (target === ProposedCategoryTarget.JOB) {
      const found = await this.prisma.jobCategory.findFirst({
        where: { name: { equals: name, mode: 'insensitive' } },
      });
      return !!found;
    }
    // USER_CATEGORY
    if (parentCategoryId) {
      const found = await this.prisma.userSubcategory.findFirst({
        where: { name: { equals: name, mode: 'insensitive' }, categoryId: parentCategoryId },
      });
      return !!found;
    }
    const found = await this.prisma.userCategory.findFirst({
      where: { name: { equals: name, mode: 'insensitive' } },
    });
    return !!found;
  }

  private async createRealCategory(
    target: ProposedCategoryTarget,
    data: {
      name: string;
      color: string | null;
      icon: string | null;
      description: string | null;
      parentCategoryId?: string | null;
    },
  ): Promise<string> {
    if (target === ProposedCategoryTarget.PRODUCT) {
      const created = await this.prisma.category.create({
        data: {
          name: data.name,
          color: data.color ?? undefined,
          icon: data.icon,
          description: data.description,
          isGlobal: true,
        },
      });
      return created.id;
    }
    if (target === ProposedCategoryTarget.SERVICE) {
      const created = await this.prisma.serviceCategory.create({
        data: {
          name: data.name,
          color: data.color ?? undefined,
          icon: data.icon,
        },
      });
      return created.id;
    }
    if (target === ProposedCategoryTarget.JOB) {
      const created = await this.prisma.jobCategory.create({
        data: {
          name: data.name,
          color: data.color ?? undefined,
          icon: data.icon,
          description: data.description,
        },
      });
      return created.id;
    }
    // USER_CATEGORY
    if (data.parentCategoryId) {
      const created = await this.prisma.userSubcategory.create({
        data: { name: data.name, categoryId: data.parentCategoryId },
      });
      return created.id;
    }
    const created = await this.prisma.userCategory.create({
      data: { name: data.name, icon: data.icon },
    });
    return created.id;
  }
}
