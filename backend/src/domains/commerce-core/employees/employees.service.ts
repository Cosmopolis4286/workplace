import {
  Inject,
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { I18nService } from 'nestjs-i18n';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';
import { EmployeeRole } from '@prisma/client';
import { PlanLimitsFacade, PLAN_LIMITS_FACADE } from '../../money/plans/plan-limits.facade';

@Injectable()
export class EmployeesService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(PLAN_LIMITS_FACADE) private readonly planLimits: PlanLimitsFacade,
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

  private async assertOwnership(employeeId: string, commerceId: string) {
    const employee = await this.prisma.employee.findUnique({
      where: { id: employeeId },
    });
    if (!employee) throw new NotFoundException(this.i18n.t('employees.not_found'));
    if (employee.commerceId !== commerceId)
      throw new ForbiddenException(this.i18n.t('common.errors.access_denied'));
    return employee;
  }

  // ─── Stats ──────────────────────────────────────────────────────────────────

  async getStats(userId: string) {
    const commerceId = await this.getCommerceId(userId);

    const [total, active, byRoleRaw] = await Promise.all([
      this.prisma.employee.count({ where: { commerceId } }),
      this.prisma.employee.count({ where: { commerceId, isActive: true } }),
      this.prisma.employee.groupBy({
        by: ['role'],
        where: { commerceId },
        _count: { role: true },
      }),
    ]);

    const byRole = Object.fromEntries(
      byRoleRaw.map((r) => [r.role, r._count.role])
    ) as Record<EmployeeRole, number>;

    return { total, active, byRole };
  }

  // ─── CRUD ───────────────────────────────────────────────────────────────────

  async findAll(userId: string) {
    const commerceId = await this.getCommerceId(userId);
    return this.prisma.employee.findMany({
      where: { commerceId },
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
    });
  }

  async findOne(userId: string, employeeId: string) {
    const commerceId = await this.getCommerceId(userId);
    return this.assertOwnership(employeeId, commerceId);
  }

  async create(userId: string, dto: CreateEmployeeDto) {
    const commerceId = await this.getCommerceId(userId);
    await this.planLimits.assertEmployeeLimit(userId, commerceId);

    if (dto.email) {
      const exists = await this.prisma.employee.findUnique({
        where: { email_commerceId: { email: dto.email, commerceId } },
      });
      if (exists)
        throw new ConflictException(this.i18n.t('employees.email_taken'));
    }

    return this.prisma.employee.create({
      data: { ...dto, commerceId },
    });
  }

  async update(userId: string, employeeId: string, dto: UpdateEmployeeDto) {
    const commerceId = await this.getCommerceId(userId);
    await this.assertOwnership(employeeId, commerceId);

    if (dto.email) {
      const exists = await this.prisma.employee.findUnique({
        where: { email_commerceId: { email: dto.email, commerceId } },
      });
      if (exists && exists.id !== employeeId)
        throw new ConflictException(this.i18n.t('employees.email_taken'));
    }

    return this.prisma.employee.update({
      where: { id: employeeId },
      data: dto,
    });
  }

  async remove(userId: string, employeeId: string) {
    const commerceId = await this.getCommerceId(userId);
    await this.assertOwnership(employeeId, commerceId);
    await this.prisma.employee.delete({ where: { id: employeeId } });
  }

  async toggleStatus(userId: string, employeeId: string) {
    const commerceId = await this.getCommerceId(userId);
    const employee = await this.assertOwnership(employeeId, commerceId);
    return this.prisma.employee.update({
      where: { id: employeeId },
      data: { isActive: !employee.isActive },
    });
  }
}
