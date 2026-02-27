import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { NotificationsService } from '../notifications/notifications.service'
import { CreateDriverDto } from './dto/create-driver.dto'
import { UpdateDriverDto } from './dto/update-driver.dto'
import { CreateDeliveryDto } from './dto/create-delivery.dto'
import { UpdateDeliveryDto } from './dto/update-delivery.dto'
import { QueryDeliveriesDto } from './dto/query-delivery.dto'
import { DeliveryStatus, DriverStatus } from '@prisma/client'

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0)
}
function endOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999)
}

@Injectable()
export class DeliveryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  // ─── Helpers ──────────────────────────────────────────────────────────────

  private async getRestaurantId(userId: string): Promise<string> {
    const restaurant = await this.prisma.restaurant.findUnique({
      where: { userId },
      select: { id: true },
    })
    if (!restaurant) throw new ForbiddenException('El usuario no tiene un restaurante asociado')
    return restaurant.id
  }

  private async assertDriverOwnership(driverId: string, restaurantId: string) {
    const driver = await this.prisma.driver.findUnique({ where: { id: driverId } })
    if (!driver) throw new NotFoundException('Repartidor no encontrado')
    if (driver.restaurantId !== restaurantId) throw new ForbiddenException('Acceso denegado')
    return driver
  }

  private async assertDeliveryOwnership(deliveryId: string, restaurantId: string) {
    const delivery = await this.prisma.delivery.findUnique({ where: { id: deliveryId } })
    if (!delivery) throw new NotFoundException('Entrega no encontrada')
    if (delivery.restaurantId !== restaurantId) throw new ForbiddenException('Acceso denegado')
    return delivery
  }

  // ─── Stats ────────────────────────────────────────────────────────────────

  async getStats(userId: string) {
    const restaurantId = await this.getRestaurantId(userId)
    const todayStart = startOfDay(new Date())
    const todayEnd = endOfDay(new Date())

    const [
      activeDeliveries,
      todayDeliveries,
      totalDrivers,
      onlineDrivers,
      deliveredToday,
      pendingDeliveries,
      cancelledToday,
    ] = await Promise.all([
      this.prisma.delivery.count({
        where: {
          restaurantId,
          status: { in: [DeliveryStatus.ASIGNADO, DeliveryStatus.RECOGIENDO, DeliveryStatus.EN_CAMINO] },
        },
      }),
      this.prisma.delivery.count({
        where: { restaurantId, createdAt: { gte: todayStart, lte: todayEnd } },
      }),
      this.prisma.driver.count({ where: { restaurantId, isActive: true } }),
      this.prisma.driver.count({
        where: { restaurantId, isActive: true, status: DriverStatus.DISPONIBLE },
      }),
      this.prisma.delivery.count({
        where: { restaurantId, status: DeliveryStatus.ENTREGADO, deliveredAt: { gte: todayStart, lte: todayEnd } },
      }),
      this.prisma.delivery.count({
        where: { restaurantId, status: DeliveryStatus.PENDIENTE },
      }),
      this.prisma.delivery.count({
        where: { restaurantId, status: DeliveryStatus.CANCELADO, updatedAt: { gte: todayStart, lte: todayEnd } },
      }),
    ])

    // Average delivery time for today's completed deliveries
    const completedToday = await this.prisma.delivery.findMany({
      where: {
        restaurantId,
        status: DeliveryStatus.ENTREGADO,
        deliveredAt: { gte: todayStart, lte: todayEnd },
        pickedUpAt: { not: null },
      },
      select: { pickedUpAt: true, deliveredAt: true },
    })

    let avgDeliveryTime = 0
    if (completedToday.length > 0) {
      const totalMinutes = completedToday.reduce((sum, d) => {
        const mins = (d.deliveredAt!.getTime() - d.pickedUpAt!.getTime()) / 60000
        return sum + mins
      }, 0)
      avgDeliveryTime = Math.round(totalMinutes / completedToday.length)
    }

    return {
      activeDeliveries,
      todayDeliveries,
      totalDrivers,
      onlineDrivers,
      deliveredToday,
      pendingDeliveries,
      cancelledToday,
      avgDeliveryTime,
    }
  }

  // ─── Drivers CRUD ─────────────────────────────────────────────────────────

  async findAllDrivers(userId: string) {
    const restaurantId = await this.getRestaurantId(userId)
    return this.prisma.driver.findMany({
      where: { restaurantId, isActive: true },
      include: {
        _count: {
          select: {
            deliveries: {
              where: {
                createdAt: { gte: startOfDay(new Date()), lte: endOfDay(new Date()) },
              },
            },
          },
        },
      },
      orderBy: { name: 'asc' },
    })
  }

  async createDriver(userId: string, dto: CreateDriverDto) {
    const restaurantId = await this.getRestaurantId(userId)
    return this.prisma.driver.create({ data: { ...dto, restaurantId } })
  }

  async updateDriver(userId: string, driverId: string, dto: UpdateDriverDto) {
    const restaurantId = await this.getRestaurantId(userId)
    await this.assertDriverOwnership(driverId, restaurantId)
    return this.prisma.driver.update({ where: { id: driverId }, data: dto })
  }

  async removeDriver(userId: string, driverId: string) {
    const restaurantId = await this.getRestaurantId(userId)
    const driver = await this.assertDriverOwnership(driverId, restaurantId)
    // Soft delete: mark as inactive
    return this.prisma.driver.update({
      where: { id: driver.id },
      data: { isActive: false, status: DriverStatus.INACTIVO },
    })
  }

  async updateDriverStatus(userId: string, driverId: string, status: DriverStatus) {
    const restaurantId = await this.getRestaurantId(userId)
    await this.assertDriverOwnership(driverId, restaurantId)
    return this.prisma.driver.update({ where: { id: driverId }, data: { status } })
  }

  // ─── Deliveries CRUD ──────────────────────────────────────────────────────

  async findAllDeliveries(userId: string, query: QueryDeliveriesDto) {
    const restaurantId = await this.getRestaurantId(userId)
    const { status, driverId, dateFrom, dateTo, page = 1, limit = 50 } = query

    const where: Record<string, unknown> = { restaurantId }
    if (status) where.status = status
    if (driverId) where.driverId = driverId
    if (dateFrom || dateTo) {
      where.createdAt = {}
      if (dateFrom) (where.createdAt as Record<string, unknown>).gte = startOfDay(new Date(dateFrom))
      if (dateTo) (where.createdAt as Record<string, unknown>).lte = endOfDay(new Date(dateTo))
    }

    const [items, total] = await Promise.all([
      this.prisma.delivery.findMany({
        where,
        include: { driver: { select: { id: true, name: true, vehicleType: true, vehicleModel: true, phone: true, status: true } } },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.delivery.count({ where }),
    ])

    return { items, total, page, limit }
  }

  async findOneDelivery(userId: string, deliveryId: string) {
    const restaurantId = await this.getRestaurantId(userId)
    await this.assertDeliveryOwnership(deliveryId, restaurantId)
    return this.prisma.delivery.findUnique({
      where: { id: deliveryId },
      include: { driver: true },
    })
  }

  async createDelivery(userId: string, dto: CreateDeliveryDto) {
    const restaurantId = await this.getRestaurantId(userId)

    if (dto.driverId) {
      const driver = await this.prisma.driver.findUnique({ where: { id: dto.driverId } })
      if (!driver || driver.restaurantId !== restaurantId)
        throw new BadRequestException('Repartidor no encontrado en este restaurante')
    }

    const delivery = await this.prisma.delivery.create({
      data: { ...dto, restaurantId, status: dto.status ?? DeliveryStatus.PENDIENTE },
      include: { driver: { select: { id: true, name: true, vehicleType: true, vehicleModel: true, phone: true, status: true } } },
    })

    // If driver assigned, update driver status to EN_ENTREGA
    if (dto.driverId && delivery.status !== DeliveryStatus.ENTREGADO) {
      await this.prisma.driver.update({
        where: { id: dto.driverId },
        data: { status: DriverStatus.EN_ENTREGA },
      })
    }

    return delivery
  }

  async updateDelivery(userId: string, deliveryId: string, dto: UpdateDeliveryDto) {
    const restaurantId = await this.getRestaurantId(userId)
    await this.assertDeliveryOwnership(deliveryId, restaurantId)

    if (dto.driverId) {
      const driver = await this.prisma.driver.findUnique({ where: { id: dto.driverId } })
      if (!driver || driver.restaurantId !== restaurantId)
        throw new BadRequestException('Repartidor no encontrado en este restaurante')
    }

    return this.prisma.delivery.update({
      where: { id: deliveryId },
      data: dto,
      include: { driver: { select: { id: true, name: true, vehicleType: true, vehicleModel: true, phone: true, status: true } } },
    })
  }

  async removeDelivery(userId: string, deliveryId: string) {
    const restaurantId = await this.getRestaurantId(userId)
    await this.assertDeliveryOwnership(deliveryId, restaurantId)
    await this.prisma.delivery.delete({ where: { id: deliveryId } })
  }

  async updateDeliveryStatus(userId: string, deliveryId: string, status: DeliveryStatus) {
    const restaurantId = await this.getRestaurantId(userId)
    const delivery = await this.assertDeliveryOwnership(deliveryId, restaurantId)

    const data: Record<string, unknown> = { status }

    if (status === DeliveryStatus.RECOGIENDO || status === DeliveryStatus.EN_CAMINO) {
      data.pickedUpAt = data.pickedUpAt ?? delivery.pickedUpAt ?? new Date()
    }
    if (status === DeliveryStatus.ENTREGADO) {
      data.deliveredAt = new Date()
      // Free the driver
      if (delivery.driverId) {
        await this.prisma.driver.update({
          where: { id: delivery.driverId },
          data: { status: DriverStatus.DISPONIBLE, totalDeliveries: { increment: 1 } },
        })
      }
    }
    if (status === DeliveryStatus.CANCELADO || status === DeliveryStatus.FALLIDO) {
      // Free the driver
      if (delivery.driverId) {
        await this.prisma.driver.update({
          where: { id: delivery.driverId },
          data: { status: DriverStatus.DISPONIBLE },
        })
      }
    }

    const updated = await this.prisma.delivery.update({
      where: { id: deliveryId },
      data,
      include: { driver: { select: { id: true, name: true, vehicleType: true, vehicleModel: true, phone: true, status: true } } },
    })

    this.notifications
      .notifyDeliveryStatusChange(restaurantId, delivery.orderNumber, status)
      .catch(() => null)

    return updated
  }

  async assignDriver(userId: string, deliveryId: string, driverId: string) {
    const restaurantId = await this.getRestaurantId(userId)
    await this.assertDeliveryOwnership(deliveryId, restaurantId)

    const driver = await this.prisma.driver.findUnique({ where: { id: driverId } })
    if (!driver || driver.restaurantId !== restaurantId)
      throw new BadRequestException('Repartidor no encontrado en este restaurante')
    if (!driver.isActive)
      throw new BadRequestException('El repartidor no está activo')

    const [delivery] = await Promise.all([
      this.prisma.delivery.update({
        where: { id: deliveryId },
        data: { driverId, status: DeliveryStatus.ASIGNADO },
        include: { driver: { select: { id: true, name: true, vehicleType: true, vehicleModel: true, phone: true, status: true } } },
      }),
      this.prisma.driver.update({
        where: { id: driverId },
        data: { status: DriverStatus.EN_ENTREGA },
      }),
    ])

    return delivery
  }
}
