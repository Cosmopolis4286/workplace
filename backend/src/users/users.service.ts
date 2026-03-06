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
    categoryId?: string
    subcategoryId?: string
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
        ...(data.categoryId && { categoryId: data.categoryId }),
        ...(data.subcategoryId && { subcategoryId: data.subcategoryId }),
        ...(createRestaurant && data.restaurantName
          ? { restaurant: { create: { name: data.restaurantName } } }
          : {}),
      },
      include: { restaurant: true, category: true, subcategory: true },
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
      categoryId: dto.categoryId,
      subcategoryId: dto.subcategoryId,
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
          category:    { select: { id: true, name: true, icon: true } },
          subcategory: { select: { id: true, name: true } },
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
        ...(dto.categoryId !== undefined && { categoryId: dto.categoryId || null }),
        ...(dto.subcategoryId !== undefined && { subcategoryId: dto.subcategoryId || null }),
      },
      include: { restaurant: true, category: true, subcategory: true },
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

  // ─── Categories CRUD ─────────────────────────────────────────────────────────

  async findAllCategories() {
    return this.prisma.userCategory.findMany({
      orderBy: { name: 'asc' },
      include: {
        subcategories: { orderBy: { name: 'asc' } },
        _count: { select: { users: true } },
      },
    })
  }

  async createCategory(data: { name: string; icon?: string }) {
    const existing = await this.prisma.userCategory.findUnique({ where: { name: data.name } })
    if (existing) throw new ConflictException('Ya existe una categoría con ese nombre')
    return this.prisma.userCategory.create({
      data: { name: data.name, icon: data.icon },
      include: { subcategories: true, _count: { select: { users: true } } },
    })
  }

  async updateCategory(id: string, data: { name?: string; icon?: string }) {
    if (data.name) {
      const existing = await this.prisma.userCategory.findFirst({
        where: { name: data.name, NOT: { id } },
      })
      if (existing) throw new ConflictException('Ya existe una categoría con ese nombre')
    }
    return this.prisma.userCategory.update({
      where: { id },
      data,
      include: { subcategories: { orderBy: { name: 'asc' } }, _count: { select: { users: true } } },
    })
  }

  async deleteCategory(id: string) {
    const count = await this.prisma.user.count({ where: { categoryId: id } })
    if (count > 0) throw new BadRequestException(`No se puede eliminar: ${count} usuario(s) usan esta categoría`)
    await this.prisma.userCategory.delete({ where: { id } })
    return { message: 'Categoría eliminada' }
  }

  // ─── Subcategories CRUD ───────────────────────────────────────────────────────

  async createSubcategory(categoryId: string, data: { name: string }) {
    const cat = await this.prisma.userCategory.findUnique({ where: { id: categoryId } })
    if (!cat) throw new NotFoundException('Categoría no encontrada')
    const existing = await this.prisma.userSubcategory.findUnique({
      where: { name_categoryId: { name: data.name, categoryId } },
    })
    if (existing) throw new ConflictException('Ya existe esa subcategoría en esta categoría')
    return this.prisma.userSubcategory.create({ data: { name: data.name, categoryId } })
  }

  async updateSubcategory(id: string, data: { name: string }) {
    const sub = await this.prisma.userSubcategory.findUnique({ where: { id } })
    if (!sub) throw new NotFoundException('Subcategoría no encontrada')
    const existing = await this.prisma.userSubcategory.findFirst({
      where: { name: data.name, categoryId: sub.categoryId, NOT: { id } },
    })
    if (existing) throw new ConflictException('Ya existe esa subcategoría en esta categoría')
    return this.prisma.userSubcategory.update({ where: { id }, data })
  }

  async deleteSubcategory(id: string) {
    const count = await this.prisma.user.count({ where: { subcategoryId: id } })
    if (count > 0) throw new BadRequestException(`No se puede eliminar: ${count} usuario(s) usan esta subcategoría`)
    await this.prisma.userSubcategory.delete({ where: { id } })
    return { message: 'Subcategoría eliminada' }
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

    const USERNAME_COOLDOWN_DAYS = 30
    let usernameChanged = false

    if (dto.username !== undefined) {
      const currentUser = await this.prisma.user.findUnique({ where: { id } })
      const newUsername = dto.username || null

      // Only apply restrictions when the username is actually changing
      if (newUsername !== currentUser.username) {
        if (newUsername) {
          const taken = await this.prisma.user.findUnique({ where: { username: newUsername } })
          if (taken && taken.id !== id) {
            throw new ConflictException('El nombre de usuario ya está en uso')
          }

          if (currentUser.usernameUpdatedAt) {
            const daysSince = (Date.now() - currentUser.usernameUpdatedAt.getTime()) / (1000 * 60 * 60 * 24)
            if (daysSince < USERNAME_COOLDOWN_DAYS) {
              const daysLeft = Math.ceil(USERNAME_COOLDOWN_DAYS - daysSince)
              throw new BadRequestException(
                `Solo puedes cambiar el nombre de usuario cada ${USERNAME_COOLDOWN_DAYS} días. Podrás cambiarlo en ${daysLeft} día${daysLeft !== 1 ? 's' : ''}.`,
              )
            }
          }
        }
        usernameChanged = true
      }
    }

    const user = await this.prisma.user.update({
      where: { id },
      data: {
        ...(dto.firstName && { firstName: dto.firstName }),
        ...(dto.lastName && { lastName: dto.lastName }),
        ...(dto.email && { email: dto.email }),
        ...(dto.phone !== undefined && { phone: dto.phone || null }),
        ...(dto.username !== undefined && { username: dto.username || null }),
        ...(usernameChanged && { usernameUpdatedAt: new Date() }),
      },
      include: { restaurant: true },
    })

    const { password, ...result } = user
    return result
  }

  async checkUsernameAvailability(
    username: string,
    currentUserId: string,
  ): Promise<{ available: boolean; canChange: boolean; daysLeft: number; nextChangeAt: string | null }> {
    const [existing, currentUser] = await Promise.all([
      this.prisma.user.findUnique({ where: { username } }),
      this.prisma.user.findUnique({ where: { id: currentUserId } }),
    ])

    const available = !existing || existing.id === currentUserId

    const USERNAME_COOLDOWN_DAYS = 30
    let canChange = true
    let daysLeft = 0
    let nextChangeAt: string | null = null

    if (currentUser?.usernameUpdatedAt && username !== currentUser.username) {
      const daysSince = (Date.now() - currentUser.usernameUpdatedAt.getTime()) / (1000 * 60 * 60 * 24)
      if (daysSince < USERNAME_COOLDOWN_DAYS) {
        canChange = false
        daysLeft = Math.ceil(USERNAME_COOLDOWN_DAYS - daysSince)
        const next = new Date(currentUser.usernameUpdatedAt.getTime() + USERNAME_COOLDOWN_DAYS * 24 * 60 * 60 * 1000)
        nextChangeAt = next.toISOString()
      }
    }

    return { available, canChange, daysLeft, nextChangeAt }
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
