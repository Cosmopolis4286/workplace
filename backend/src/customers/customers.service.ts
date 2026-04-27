import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';

@Injectable()
export class CustomersService {
  constructor(private readonly prisma: PrismaService) {}

  // ─── Helpers ────────────────────────────────────────────────────────────────

  private async getCommerceId(userId: string): Promise<string> {
    const restaurant = await this.prisma.restaurant.findUnique({
      where: { userId },
      select: { id: true },
    });

    // Si no tiene restaurante, usar el userId como commerceId
    return restaurant?.id ?? userId;
  }

  private async assertOwnership(customerId: string, commerceId: string) {
    const customer = await this.prisma.customer.findUnique({
      where: { id: customerId },
    });
    if (!customer) throw new NotFoundException('Cliente no encontrado');
    if (customer.commerceId !== commerceId)
      throw new ForbiddenException('Acceso denegado');
    return customer;
  }

  // ─── Stats ──────────────────────────────────────────────────────────────────

  async getStats(userId: string) {
    const commerceId = await this.getCommerceId(userId);

    const [total, active, avgResult] = await Promise.all([
      this.prisma.customer.count({ where: { commerceId } }),
      this.prisma.customer.count({ where: { commerceId, isActive: true } }),
      this.prisma.customer.aggregate({
        where: { commerceId, totalOrders: { gt: 0 } },
        _avg: { totalSpent: true },
      }),
    ]);

    return {
      totalClients: total,
      activeClients: active,
      avgSpent: Number((avgResult._avg.totalSpent ?? 0).toFixed(2)),
    };
  }

  // ─── CRUD ───────────────────────────────────────────────────────────────────

  async findAll(userId: string) {
    const commerceId = await this.getCommerceId(userId);
    return this.prisma.customer.findMany({
      where: { commerceId },
      orderBy: [{ segment: 'asc' }, { name: 'asc' }],
    });
  }

  async findOne(userId: string, customerId: string) {
    const commerceId = await this.getCommerceId(userId);
    return this.assertOwnership(customerId, commerceId);
  }

  async create(userId: string, dto: CreateCustomerDto) {
    const commerceId = await this.getCommerceId(userId);

    if (dto.email) {
      const exists = await this.prisma.customer.findUnique({
        where: { email_commerceId: { email: dto.email, commerceId } },
      });
      if (exists)
        throw new ConflictException(
          'Ya existe un cliente con ese correo electrónico'
        );
    }

    return this.prisma.customer.create({
      data: { ...dto, commerceId },
    });
  }

  async update(userId: string, customerId: string, dto: UpdateCustomerDto) {
    const commerceId = await this.getCommerceId(userId);
    await this.assertOwnership(customerId, commerceId);

    if (dto.email) {
      const exists = await this.prisma.customer.findUnique({
        where: { email_commerceId: { email: dto.email, commerceId } },
      });
      if (exists && exists.id !== customerId)
        throw new ConflictException(
          'Ya existe un cliente con ese correo electrónico'
        );
    }

    return this.prisma.customer.update({
      where: { id: customerId },
      data: dto,
    });
  }

  async remove(userId: string, customerId: string) {
    const commerceId = await this.getCommerceId(userId);
    await this.assertOwnership(customerId, commerceId);
    await this.prisma.customer.delete({ where: { id: customerId } });
  }

  async toggleStatus(userId: string, customerId: string) {
    const commerceId = await this.getCommerceId(userId);
    const customer = await this.assertOwnership(customerId, commerceId);
    return this.prisma.customer.update({
      where: { id: customerId },
      data: { isActive: !customer.isActive },
    });
  }
}
