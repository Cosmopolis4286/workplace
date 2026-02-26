import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { CreateCustomerDto } from './dto/create-customer.dto'
import { UpdateCustomerDto } from './dto/update-customer.dto'

@Injectable()
export class CustomersService {
  constructor(private readonly prisma: PrismaService) {}

  // ─── Helpers ────────────────────────────────────────────────────────────────

  private async getRestaurantId(userId: string): Promise<string> {
    const restaurant = await this.prisma.restaurant.findUnique({
      where: { userId },
      select: { id: true },
    })
    if (!restaurant) throw new ForbiddenException('El usuario no tiene un restaurante asociado')
    return restaurant.id
  }

  private async assertOwnership(customerId: string, restaurantId: string) {
    const customer = await this.prisma.customer.findUnique({ where: { id: customerId } })
    if (!customer) throw new NotFoundException('Cliente no encontrado')
    if (customer.restaurantId !== restaurantId) throw new ForbiddenException('Acceso denegado')
    return customer
  }

  // ─── Stats ──────────────────────────────────────────────────────────────────

  async getStats(userId: string) {
    const restaurantId = await this.getRestaurantId(userId)

    const [total, active, avgResult] = await Promise.all([
      this.prisma.customer.count({ where: { restaurantId } }),
      this.prisma.customer.count({ where: { restaurantId, isActive: true } }),
      this.prisma.customer.aggregate({
        where: { restaurantId, totalOrders: { gt: 0 } },
        _avg: { totalSpent: true },
      }),
    ])

    return {
      totalClients: total,
      activeClients: active,
      avgSpent: Number((avgResult._avg.totalSpent ?? 0).toFixed(2)),
    }
  }

  // ─── CRUD ───────────────────────────────────────────────────────────────────

  async findAll(userId: string) {
    const restaurantId = await this.getRestaurantId(userId)
    return this.prisma.customer.findMany({
      where: { restaurantId },
      orderBy: [{ segment: 'asc' }, { name: 'asc' }],
    })
  }

  async findOne(userId: string, customerId: string) {
    const restaurantId = await this.getRestaurantId(userId)
    return this.assertOwnership(customerId, restaurantId)
  }

  async create(userId: string, dto: CreateCustomerDto) {
    const restaurantId = await this.getRestaurantId(userId)

    if (dto.email) {
      const exists = await this.prisma.customer.findUnique({
        where: { email_restaurantId: { email: dto.email, restaurantId } },
      })
      if (exists) throw new ConflictException('Ya existe un cliente con ese correo electrónico')
    }

    return this.prisma.customer.create({
      data: { ...dto, restaurantId },
    })
  }

  async update(userId: string, customerId: string, dto: UpdateCustomerDto) {
    const restaurantId = await this.getRestaurantId(userId)
    await this.assertOwnership(customerId, restaurantId)

    if (dto.email) {
      const exists = await this.prisma.customer.findUnique({
        where: { email_restaurantId: { email: dto.email, restaurantId } },
      })
      if (exists && exists.id !== customerId)
        throw new ConflictException('Ya existe un cliente con ese correo electrónico')
    }

    return this.prisma.customer.update({
      where: { id: customerId },
      data: dto,
    })
  }

  async remove(userId: string, customerId: string) {
    const restaurantId = await this.getRestaurantId(userId)
    await this.assertOwnership(customerId, restaurantId)
    await this.prisma.customer.delete({ where: { id: customerId } })
  }

  async toggleStatus(userId: string, customerId: string) {
    const restaurantId = await this.getRestaurantId(userId)
    const customer = await this.assertOwnership(customerId, restaurantId)
    return this.prisma.customer.update({
      where: { id: customerId },
      data: { isActive: !customer.isActive },
    })
  }
}
