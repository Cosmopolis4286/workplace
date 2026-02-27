import { Injectable, ConflictException, NotFoundException, BadRequestException, UnauthorizedException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { Role } from '@prisma/client'
import * as bcrypt from 'bcrypt'
import { UpdateProfileDto } from '../auth/dto/update-profile.dto'
import { ChangePasswordDto } from '../auth/dto/change-password.dto'
import { CreateUserDto } from './dto/create-user.dto'
import { UpdateUserDto } from './dto/update-user.dto'

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async create(data: {
    email: string
    password: string
    firstName: string
    lastName: string
    phone?: string
    restaurantName?: string
    role?: Role
  }) {
    const existing = await this.prisma.user.findUnique({ where: { email: data.email } })
    if (existing) throw new ConflictException('El correo ya está registrado')

    const hashedPassword = await bcrypt.hash(data.password, 12)
    const role = data.role ?? Role.COMMERCE
    const createRestaurant = role === Role.COMMERCE || role === Role.ADMIN

    const user = await this.prisma.user.create({
      data: {
        email: data.email,
        password: hashedPassword,
        firstName: data.firstName,
        lastName: data.lastName,
        phone: data.phone,
        role,
        ...(createRestaurant && data.restaurantName
          ? { restaurant: { create: { name: data.restaurantName } } }
          : {}),
      },
      include: { restaurant: true },
    })

    const { password, ...result } = user
    return result
  }

  // ─── Admin user management ───────────────────────────────────────────────────

  async createUser(dto: CreateUserDto) {
    return this.create({
      email: dto.email,
      password: dto.password,
      firstName: dto.firstName,
      lastName: dto.lastName,
      phone: dto.phone,
      role: dto.role,
      restaurantName: dto.restaurantName,
    })
  }

  async findAllUsers(options: {
    roleFilter?: Role
    allowedRoles?: Role[]
    page: number
    limit: number
  }) {
    const { roleFilter, allowedRoles, page, limit } = options
    const skip = (page - 1) * limit

    const where: Record<string, unknown> = {}
    if (allowedRoles) {
      where.role = { in: roleFilter && allowedRoles.includes(roleFilter) ? [roleFilter] : allowedRoles }
    } else if (roleFilter) {
      where.role = roleFilter
    }

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          phone: true,
          avatar: true,
          role: true,
          isActive: true,
          createdAt: true,
          restaurant: { select: { id: true, name: true } },
        },
      }),
      this.prisma.user.count({ where }),
    ])

    return { data: users, total, page, limit }
  }

  async updateUser(id: string, dto: UpdateUserDto) {
    if (dto.email) {
      const existing = await this.prisma.user.findUnique({ where: { email: dto.email } })
      if (existing && existing.id !== id) {
        throw new ConflictException('El correo ya está en uso por otra cuenta')
      }
    }

    const user = await this.prisma.user.update({
      where: { id },
      data: {
        ...(dto.firstName !== undefined && { firstName: dto.firstName }),
        ...(dto.lastName !== undefined && { lastName: dto.lastName }),
        ...(dto.email !== undefined && { email: dto.email }),
        ...(dto.phone !== undefined && { phone: dto.phone || null }),
        ...(dto.role !== undefined && { role: dto.role }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      },
      include: { restaurant: true },
    })

    const { password, ...result } = user
    return result
  }

  async toggleUserStatus(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id } })
    if (!user) throw new NotFoundException('Usuario no encontrado')

    const updated = await this.prisma.user.update({
      where: { id },
      data: { isActive: !user.isActive },
      select: { id: true, isActive: true },
    })
    return updated
  }

  async deleteUser(id: string) {
    await this.prisma.user.findUnique({ where: { id } })
    await this.prisma.user.delete({ where: { id } })
    return { message: 'Usuario eliminado correctamente' }
  }

  async findByEmail(email: string) {
    return this.prisma.user.findUnique({
      where: { email },
      include: { restaurant: true },
    })
  }

  async findById(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: { restaurant: true },
    })
    if (!user) throw new NotFoundException('Usuario no encontrado')
    const { password, ...result } = user
    return result
  }

  async validatePassword(plainPassword: string, hashedPassword: string): Promise<boolean> {
    return bcrypt.compare(plainPassword, hashedPassword)
  }

  async updateProfile(id: string, dto: UpdateProfileDto) {
    if (dto.email) {
      const existing = await this.prisma.user.findUnique({ where: { email: dto.email } })
      if (existing && existing.id !== id) {
        throw new ConflictException('El correo ya está en uso por otra cuenta')
      }
    }

    const user = await this.prisma.user.update({
      where: { id },
      data: {
        ...(dto.firstName && { firstName: dto.firstName }),
        ...(dto.lastName && { lastName: dto.lastName }),
        ...(dto.email && { email: dto.email }),
        ...(dto.phone !== undefined && { phone: dto.phone || null }),
      },
      include: { restaurant: true },
    })

    const { password, ...result } = user
    return result
  }

  async updateAvatar(id: string, avatarUrl: string) {
    const user = await this.prisma.user.update({
      where: { id },
      data: { avatar: avatarUrl },
      include: { restaurant: true },
    })
    const { password, ...result } = user
    return result
  }

  async changePassword(id: string, dto: ChangePasswordDto) {
    const user = await this.prisma.user.findUnique({ where: { id } })
    if (!user) throw new NotFoundException('Usuario no encontrado')

    const valid = await bcrypt.compare(dto.currentPassword, user.password)
    if (!valid) throw new UnauthorizedException('La contraseña actual es incorrecta')

    if (dto.currentPassword === dto.newPassword) {
      throw new BadRequestException('La nueva contraseña debe ser diferente a la actual')
    }

    const hashedPassword = await bcrypt.hash(dto.newPassword, 12)
    await this.prisma.user.update({ where: { id }, data: { password: hashedPassword } })

    return { message: 'Contraseña actualizada correctamente' }
  }
}
