import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { I18nService } from 'nestjs-i18n';
import { PrismaService } from '../prisma/prisma.service';
import { Role, Sex } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { UpdateProfileDto } from '../auth/dto/update-profile.dto';
import { ChangePasswordDto } from '../auth/dto/change-password.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { MailService } from '../mail/mail.service';

export const CURRENT_TERMS_VERSION = '2.0';

@Injectable()
export class UsersService {
  constructor(
    private prisma: PrismaService,
    private mail: MailService,
    private i18n: I18nService,
  ) {}

  async create(data: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    phone?: string;
    birthDate?: string | Date;
    sex?: Sex;
    commerceName?: string;
    role?: Role;
    categoryId?: string;
    subcategoryId?: string;
    acceptTerms?: boolean;
  }) {
    const existing = await this.prisma.user.findUnique({
      where: { email: data.email },
    });
    if (existing) throw new ConflictException(this.i18n.t('users.email_taken'));

    const hashedPassword = await bcrypt.hash(data.password, 12);
    const role = data.role ?? Role.NORMAL;
    const createRestaurant =
      role === Role.COMMERCE || role === Role.ADMIN || role === Role.FREELANCER;

    const now = new Date();
    const user = await this.prisma.user.create({
      data: {
        email: data.email,
        password: hashedPassword,
        firstName: data.firstName,
        lastName: data.lastName,
        phone: data.phone,
        birthDate: data.birthDate ? new Date(data.birthDate) : undefined,
        sex: data.sex,
        role,
        ...(data.categoryId && { categoryId: data.categoryId }),
        ...(data.subcategoryId && { subcategoryId: data.subcategoryId }),
        wallet: { create: { currency: 'USD' } },
        ...(createRestaurant && data.commerceName
          ? { commerce: { create: { name: data.commerceName } } }
          : {}),
        ...(data.acceptTerms
          ? {
              termsAcceptedAt: now,
              termsVersion: CURRENT_TERMS_VERSION,
              privacyAcceptedAt: now,
            }
          : {}),
      },
      include: { commerce: true, category: true, subcategory: true },
    });

    const { password, twoFactorSecret, ...result } = user;
    return result;
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
      commerceName: dto.commerceName,
      categoryId: dto.categoryId,
      subcategoryId: dto.subcategoryId,
    });
  }

  async findAllUsers(options: {
    roleFilter?: Role;
    allowedRoles?: Role[];
    categoryId?: string;
    subcategoryId?: string;
    page: number;
    limit: number;
  }) {
    const { roleFilter, allowedRoles, categoryId, subcategoryId, page, limit } =
      options;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};
    if (allowedRoles) {
      where.role = {
        in:
          roleFilter && allowedRoles.includes(roleFilter)
            ? [roleFilter]
            : allowedRoles,
      };
    } else if (roleFilter) {
      where.role = roleFilter;
    }
    if (categoryId) where.categoryId = categoryId;
    if (subcategoryId) where.subcategoryId = subcategoryId;

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
          commerce: { select: { id: true, name: true } },
          category: { select: { id: true, name: true, icon: true } },
          subcategory: { select: { id: true, name: true } },
        },
      }),
      this.prisma.user.count({ where }),
    ]);

    return { data: users, total, page, limit };
  }

  async updateUser(id: string, dto: UpdateUserDto) {
    if (dto.email) {
      const existing = await this.prisma.user.findUnique({
        where: { email: dto.email },
      });
      if (existing && existing.id !== id) {
        throw new ConflictException(this.i18n.t('users.email_in_use'));
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
        ...(dto.categoryId !== undefined && {
          categoryId: dto.categoryId || null,
        }),
        ...(dto.subcategoryId !== undefined && {
          subcategoryId: dto.subcategoryId || null,
        }),
      },
      include: { commerce: true, category: true, subcategory: true },
    });

    const { password, twoFactorSecret, ...result } = user;
    return result;
  }

  async toggleUserStatus(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException(this.i18n.t('users.not_found'));

    const updated = await this.prisma.user.update({
      where: { id },
      data: { isActive: !user.isActive },
      select: { id: true, isActive: true },
    });
    return updated;
  }

  async deleteUser(id: string) {
    await this.prisma.user.findUnique({ where: { id } });
    await this.prisma.user.delete({ where: { id } });
    return { message: this.i18n.t('users.deleted') };
  }

  // ─── Categories CRUD ─────────────────────────────────────────────────────────

  async findAllCategories() {
    return this.prisma.userCategory.findMany({
      orderBy: { name: 'asc' },
      include: {
        subcategories: { orderBy: { name: 'asc' } },
        _count: { select: { users: true } },
      },
    });
  }

  async createCategory(data: {
    name: string;
    icon?: string;
    allowedModules?: string[];
  }) {
    const existing = await this.prisma.userCategory.findUnique({
      where: { name: data.name },
    });
    if (existing)
      throw new ConflictException(this.i18n.t('users.category.name_taken'));
    return this.prisma.userCategory.create({
      data: {
        name: data.name,
        icon: data.icon,
        allowedModules: data.allowedModules ?? [],
      },
      include: { subcategories: true, _count: { select: { users: true } } },
    });
  }

  async updateCategory(
    id: string,
    data: { name?: string; icon?: string; allowedModules?: string[] }
  ) {
    if (data.name) {
      const existing = await this.prisma.userCategory.findFirst({
        where: { name: data.name, NOT: { id } },
      });
      if (existing)
        throw new ConflictException(this.i18n.t('users.category.name_taken'));
    }
    return this.prisma.userCategory.update({
      where: { id },
      data,
      include: {
        subcategories: { orderBy: { name: 'asc' } },
        _count: { select: { users: true } },
      },
    });
  }

  async deleteCategory(id: string) {
    const count = await this.prisma.user.count({ where: { categoryId: id } });
    if (count > 0)
      throw new BadRequestException(
        this.i18n.t('users.category.in_use', { args: { count } })
      );
    await this.prisma.userCategory.delete({ where: { id } });
    return { message: this.i18n.t('users.category.deleted') };
  }

  // ─── Subcategories CRUD ───────────────────────────────────────────────────────

  async findSubcategoriesByCategory(categoryId: string) {
    return this.prisma.userSubcategory.findMany({
      where: { categoryId },
      orderBy: { name: 'asc' },
    });
  }

  async findAllSubcategories() {
    return this.prisma.userSubcategory.findMany({
      orderBy: { name: 'asc' },
    });
  }

  async createSubcategory(categoryId: string, data: { name: string }) {
    const cat = await this.prisma.userCategory.findUnique({
      where: { id: categoryId },
    });
    if (!cat) throw new NotFoundException(this.i18n.t('users.category.not_found'));
    const existing = await this.prisma.userSubcategory.findUnique({
      where: { name_categoryId: { name: data.name, categoryId } },
    });
    if (existing)
      throw new ConflictException(this.i18n.t('users.subcategory.name_taken'));
    return this.prisma.userSubcategory.create({
      data: { name: data.name, categoryId },
    });
  }

  async updateSubcategory(id: string, data: { name: string }) {
    const sub = await this.prisma.userSubcategory.findUnique({ where: { id } });
    if (!sub) throw new NotFoundException(this.i18n.t('users.subcategory.not_found'));
    const existing = await this.prisma.userSubcategory.findFirst({
      where: { name: data.name, categoryId: sub.categoryId, NOT: { id } },
    });
    if (existing)
      throw new ConflictException(this.i18n.t('users.subcategory.name_taken'));
    return this.prisma.userSubcategory.update({ where: { id }, data });
  }

  async deleteSubcategory(id: string) {
    const count = await this.prisma.user.count({
      where: { subcategoryId: id },
    });
    if (count > 0)
      throw new BadRequestException(
        this.i18n.t('users.subcategory.in_use', { args: { count } })
      );
    await this.prisma.userSubcategory.delete({ where: { id } });
    return { message: this.i18n.t('users.subcategory.deleted') };
  }

  async findByEmail(email: string) {
    const user = await this.prisma.user.findUnique({
      where: { email },
      include: { commerce: true, category: true, subcategory: true },
    });
    if (!user) return null;
    const { twoFactorSecret, ...result } = user;
    return result;
  }

  async findById(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: { commerce: true, category: true, profileSettings: true },
    });
    if (!user) throw new NotFoundException(this.i18n.t('users.not_found'));
    const { password, twoFactorSecret, ...result } = user;
    return result;
  }

  /**
   * Variante de findById que incluye twoFactorSecret (cifrado) y
   * twoFactorEnabled para el flujo de verificación 2FA. Uso interno
   * exclusivo — nunca devolver el resultado de este método al cliente.
   */
  async findByIdWithTwoFactor(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        role: true,
        twoFactorEnabled: true,
        twoFactorSecret: true,
      },
    });
  }

  async validatePassword(
    plainPassword: string,
    hashedPassword: string
  ): Promise<boolean> {
    return bcrypt.compare(plainPassword, hashedPassword);
  }

  async updateProfile(id: string, dto: UpdateProfileDto) {
    let previousEmail: string | undefined;
    if (dto.email) {
      const existing = await this.prisma.user.findUnique({
        where: { email: dto.email },
      });
      if (existing && existing.id !== id) {
        throw new ConflictException(this.i18n.t('users.email_in_use'));
      }

      const currentUser = await this.prisma.user.findUnique({ where: { id } });
      if (currentUser && currentUser.email !== dto.email) {
        previousEmail = currentUser.email;
      }
    }

    const USERNAME_COOLDOWN_DAYS = 30;
    let usernameChanged = false;

    if (dto.username !== undefined) {
      const currentUser = await this.prisma.user.findUnique({ where: { id } });
      const newUsername = dto.username || null;

      // Only apply restrictions when the username is actually changing
      if (newUsername !== currentUser.username) {
        if (newUsername) {
          const taken = await this.prisma.user.findUnique({
            where: { username: newUsername },
          });
          if (taken && taken.id !== id) {
            throw new ConflictException(this.i18n.t('users.username_taken'));
          }

          if (currentUser.usernameUpdatedAt) {
            const daysSince =
              (Date.now() - currentUser.usernameUpdatedAt.getTime()) /
              (1000 * 60 * 60 * 24);
            if (daysSince < USERNAME_COOLDOWN_DAYS) {
              const daysLeft = Math.ceil(USERNAME_COOLDOWN_DAYS - daysSince);
              throw new BadRequestException(
                this.i18n.t('users.username_cooldown', {
                  args: { cooldown: USERNAME_COOLDOWN_DAYS, daysLeft, count: daysLeft },
                })
              );
            }
          }
        }
        usernameChanged = true;
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
        ...((dto as any).categoryId !== undefined && { categoryId: (dto as any).categoryId || null }),
        ...(dto.country !== undefined && { country: dto.country || null }),
        ...(dto.state !== undefined && { state: dto.state || null }),
        ...(dto.city !== undefined && { city: dto.city || null }),
      },
      include: { commerce: true, profileSettings: true },
    });

    if (previousEmail) {
      this.mail
        .sendSecurityAlert(previousEmail, user.firstName, 'email_changed')
        .catch(() => {});
    }

    const { password, twoFactorSecret, ...result } = user;
    return result;
  }

  async checkUsernameAvailability(
    username: string,
    currentUserId: string
  ): Promise<{
    available: boolean;
    canChange: boolean;
    daysLeft: number;
    nextChangeAt: string | null;
  }> {
    const [existing, currentUser] = await Promise.all([
      this.prisma.user.findUnique({ where: { username } }),
      this.prisma.user.findUnique({ where: { id: currentUserId } }),
    ]);

    const available = !existing || existing.id === currentUserId;

    const USERNAME_COOLDOWN_DAYS = 30;
    let canChange = true;
    let daysLeft = 0;
    let nextChangeAt: string | null = null;

    if (currentUser?.usernameUpdatedAt && username !== currentUser.username) {
      const daysSince =
        (Date.now() - currentUser.usernameUpdatedAt.getTime()) /
        (1000 * 60 * 60 * 24);
      if (daysSince < USERNAME_COOLDOWN_DAYS) {
        canChange = false;
        daysLeft = Math.ceil(USERNAME_COOLDOWN_DAYS - daysSince);
        const next = new Date(
          currentUser.usernameUpdatedAt.getTime() +
            USERNAME_COOLDOWN_DAYS * 24 * 60 * 60 * 1000
        );
        nextChangeAt = next.toISOString();
      }
    }

    return { available, canChange, daysLeft, nextChangeAt };
  }

  async updateAvatar(id: string, avatarUrl: string) {
    const user = await this.prisma.user.update({
      where: { id },
      data: { avatar: avatarUrl },
      include: { commerce: true },
    });
    const { password, twoFactorSecret, ...result } = user;
    return result;
  }

  async changePassword(id: string, dto: ChangePasswordDto) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException(this.i18n.t('users.not_found'));

    const valid = await bcrypt.compare(dto.currentPassword, user.password);
    if (!valid)
      throw new UnauthorizedException(this.i18n.t('users.current_password_incorrect'));

    if (dto.currentPassword === dto.newPassword) {
      throw new BadRequestException(this.i18n.t('users.new_password_must_differ'));
    }

    const hashedPassword = await bcrypt.hash(dto.newPassword, 12);
    await this.prisma.user.update({
      where: { id },
      data: { password: hashedPassword },
    });

    this.mail
      .sendSecurityAlert(user.email, user.firstName, 'password_changed')
      .catch(() => {});

    return { message: this.i18n.t('users.password_updated') };
  }

  async getProfileCompletion(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        commerce: true,
      },
    });

    if (!user) {
      throw new NotFoundException(this.i18n.t('users.not_found'));
    }

    // Obtener información de categoría y subcategoría
    const category = user.categoryId ? 
      await this.prisma.userCategory.findUnique({ where: { id: user.categoryId } }) : null;
    const subcategory = user.subcategoryId ? 
      await this.prisma.userSubcategory.findUnique({ where: { id: user.subcategoryId } }) : null;

    // Verificar si tiene restaurante (para categoría Comida)
    let restaurant = null;
    if (category?.name === 'Comida') {
      restaurant = await this.prisma.restaurant.findUnique({ where: { userId } });
    }

    // Verificar campos básicos del perfil
    const hasBasicInfo = !!(user.firstName && user.lastName && user.phone);
    
    // Verificar categoría y subcategoría
    const hasCategory = !!(user.categoryId && category);
    const hasSubcategory = !!(user.subcategoryId && subcategory);

    // Verificaciones específicas por rol/categoría
    let hasBusinessSetup = false;
    let hasServicesSetup = false;

    if (user.role === 'COMMERCE') {
      if (category?.name === 'Comida') {
        // Para categoría Comida, necesita restaurante
        hasBusinessSetup = !!restaurant;
      } else {
        // Para otras categorías, necesita comercio configurado
        hasBusinessSetup = !!user.commerce;
      }
    } else if (user.role === 'FREELANCER') {
      // Freelancer necesita tener perfil completo y servicios (simulado por ahora)
      hasServicesSetup = hasBasicInfo && hasCategory;
    }

    // Calcular porcentaje de completitud
    const requiredFields = [
      hasBasicInfo,
      hasCategory,
      user.role === 'NORMAL' ? true : hasSubcategory, // NORMAL no requiere subcategoría
    ];

    if (user.role === 'COMMERCE') {
      requiredFields.push(hasBusinessSetup);
    } else if (user.role === 'FREELANCER') {
      requiredFields.push(hasServicesSetup);
    }

    const completedFields = requiredFields.filter(Boolean).length;
    const totalFields = requiredFields.length;
    const completionPercentage = Math.round((completedFields / totalFields) * 100);

    const isComplete = completionPercentage === 100;

    return {
      isComplete,
      completionPercentage,
      missingFields: requiredFields
        .map((has, index) => {
          const fieldNames = [
            this.i18n.t('users.profile_completion.basic_info'),
            this.i18n.t('users.profile_completion.category'),
            this.i18n.t('users.profile_completion.subcategory'),
            this.i18n.t('users.profile_completion.business_setup'),
            this.i18n.t('users.profile_completion.services_setup'),
          ];
          return has ? null : fieldNames[index];
        })
        .filter(Boolean),
      hasBasicInfo,
      hasCategory,
      hasSubcategory,
      hasBusinessSetup,
      hasServicesSetup,
      role: user.role,
      category: category?.name,
    };
  }
}
