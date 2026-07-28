import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { I18nService } from 'nestjs-i18n';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBranchDto } from './dto/create-branch.dto';
import { UpdateBranchDto } from './dto/update-branch.dto';
import { BranchStatus } from '@prisma/client';
import { PlanLimitsService } from '../domains/money/plans/plan-limits.service';

@Injectable()
export class BranchesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly planLimits: PlanLimitsService,
    private readonly i18n: I18nService
  ) {}

  // ─── Helpers ────────────────────────────────────────────────────────────────

  private async getCommerceId(userId: string): Promise<string> {
    const restaurant = await this.prisma.restaurant.findUnique({
      where: { userId },
      select: { id: true },
    });

    // Si no tiene restaurante, usar el userId como commerceId
    return restaurant?.id ?? userId;
  }

  private async assertOwnership(branchId: string, commerceId: string) {
    const branch = await this.prisma.branch.findUnique({
      where: { id: branchId },
    });
    if (!branch) throw new NotFoundException(this.i18n.t('branches.not_found'));
    if (branch.commerceId !== commerceId)
      throw new ForbiddenException(this.i18n.t('common.errors.access_denied'));
    return branch;
  }

  // ─── Stats ──────────────────────────────────────────────────────────────────

  async getStats(userId: string) {
    const commerceId = await this.getCommerceId(userId);

    const [total, active, byStatusRaw] = await Promise.all([
      this.prisma.branch.count({ where: { commerceId } }),
      this.prisma.branch.count({
        where: { commerceId, status: BranchStatus.ACTIVA },
      }),
      this.prisma.branch.groupBy({
        by: ['status'],
        where: { commerceId },
        _count: { status: true },
      }),
    ]);

    const byStatus = Object.fromEntries(
      byStatusRaw.map((r) => [r.status, r._count.status])
    ) as Record<BranchStatus, number>;

    return { total, active, byStatus };
  }

  // ─── CRUD ───────────────────────────────────────────────────────────────────

  async findAll(userId: string) {
    const commerceId = await this.getCommerceId(userId);
    return this.prisma.branch.findMany({
      where: { commerceId },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(userId: string, branchId: string) {
    const commerceId = await this.getCommerceId(userId);
    return this.assertOwnership(branchId, commerceId);
  }

  async create(userId: string, dto: CreateBranchDto) {
    const commerceId = await this.getCommerceId(userId);
    await this.planLimits.assertBranchLimit(userId, commerceId);

    const exists = await this.prisma.branch.findUnique({
      where: { name_commerceId: { name: dto.name, commerceId } },
    });
    if (exists)
      throw new ConflictException(this.i18n.t('branches.name_taken'));

    return this.prisma.branch.create({
      data: { ...dto, commerceId },
    });
  }

  async update(userId: string, branchId: string, dto: UpdateBranchDto) {
    const commerceId = await this.getCommerceId(userId);
    await this.assertOwnership(branchId, commerceId);

    if (dto.name) {
      const exists = await this.prisma.branch.findUnique({
        where: { name_commerceId: { name: dto.name, commerceId } },
      });
      if (exists && exists.id !== branchId)
        throw new ConflictException(this.i18n.t('branches.name_taken'));
    }

    return this.prisma.branch.update({
      where: { id: branchId },
      data: dto,
    });
  }

  async remove(userId: string, branchId: string) {
    const commerceId = await this.getCommerceId(userId);
    await this.assertOwnership(branchId, commerceId);
    await this.prisma.branch.delete({ where: { id: branchId } });
  }

  async updateStatus(userId: string, branchId: string, status: BranchStatus) {
    const commerceId = await this.getCommerceId(userId);
    await this.assertOwnership(branchId, commerceId);
    return this.prisma.branch.update({
      where: { id: branchId },
      data: { status },
    });
  }
}
