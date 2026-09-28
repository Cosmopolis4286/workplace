import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { I18nService } from 'nestjs-i18n';
import { PrismaService } from '../../../prisma/prisma.service';
import { RedisService } from '../../../redis/redis.service';
import { Prisma, Role, Sex, ProfileType, ProfessionalSubtype, ProfileStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { UpdateProfileDto } from '../auth/dto/update-profile.dto';
import { ChangePasswordDto } from '../auth/dto/change-password.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UpdateOwnProfileDto } from './dto/update-own-profile.dto';
import { MailService } from '../../engagement/mail/mail.service';
import { CommerceProfileCompletionStrategy } from './strategies/commerce-profile-completion.strategy';
import { FreelancerProfileCompletionStrategy } from './strategies/freelancer-profile-completion.strategy';
import { userFindByIdCacheKey } from '../../../common/utils/cache-keys.util';
import { AccountTypeResolver } from '../../../common/account-type/account-type.resolver';
import { CommerceResolverService } from '../../../common/commerce-resolver/commerce-resolver.service';

export const CURRENT_TERMS_VERSION = '2.0';

// Días de espera obligatorios entre dos cambios de username — compartida
// entre updateProfile() y checkUsernameAvailability() para que ambos
// apliquen siempre la misma política sin poder divergir.
export const USERNAME_COOLDOWN_DAYS = 30;

// findById se llama en JwtStrategy.validate() en CADA request autenticado —
// cachear evita una query a Postgres por request. TTL corto porque además de
// la invalidación explícita en cada write (ver userFindByIdCacheKey en
// common/utils/cache-keys.util.ts), hay un caso de fan-out
// (UserCategory.update/delete) donde el TTL es el único límite de staleness
// aceptado a propósito en vez de invalidar N usuarios.
export const FIND_BY_ID_CACHE_TTL = 120;

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
    private mail: MailService,
    private i18n: I18nService,
    private commerceProfileCompletion: CommerceProfileCompletionStrategy,
    private freelancerProfileCompletion: FreelancerProfileCompletionStrategy,
    private accountTypeResolver: AccountTypeResolver,
    private commerceResolver: CommerceResolverService,
  ) {}

  // Invalida el caché de findById para un usuario. Llamar después de
  // cualquier write que toque User, su Commerce (commerce), UserCategory
  // (category) o ProfileSettings — ver auditoría de escalabilidad para el
  // mapeo completo de puntos de invalidación.
  private async invalidateFindByIdCache(userId: string): Promise<void> {
    await this.redis.del(userFindByIdCacheKey(userId));
  }

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
    // Role.PROFESIONAL ya no distingue "tiene Commerce" de "es freelancer/
    // service provider" — el caller debe indicarlo explícitamente. Si se
    // omite pero viene commerceName, se infiere BUSINESS (comportamiento
    // histórico); si no, PROFESSIONAL/FREELANCER por defecto.
    businessProfileType?: ProfileType;
    professionalSubtype?: ProfessionalSubtype;
    categoryId?: string;
    subcategoryId?: string;
    acceptTerms?: boolean;
  }) {
    // Early exit para el caso común; la unicidad real la garantiza el
    // constraint @unique en email (ver catch de P2002 abajo), cerrando la
    // ventana de carrera entre este check y el create.
    const existing = await this.prisma.user.findUnique({
      where: { email: data.email },
    });
    if (existing) throw new ConflictException(this.i18n.t('users.email_taken'));

    const hashedPassword = await bcrypt.hash(data.password, 12);
    const role = data.role ?? Role.NORMAL;
    const createCommerce = role === Role.PROFESIONAL || role === Role.ADMIN;
    // UserProfile es la fuente de verdad del tipo de negocio (ver
    // RoleResolverService) — ADMIN queda fuera a propósito, no es un perfil
    // de negocio aunque también reciba un Commerce por conveniencia arriba.
    const businessProfileType =
      role !== Role.PROFESIONAL ? null
      : data.businessProfileType ?? (data.commerceName ? ProfileType.BUSINESS : ProfileType.PROFESSIONAL);

    const now = new Date();
    let user;
    try {
      user = await this.prisma.$transaction(async (tx) => {
        const created = await tx.user.create({
          data: {
            email: data.email,
            password: hashedPassword,
            firstName: data.firstName,
            lastName: data.lastName,
            phone: data.phone,
            birthDate: data.birthDate ? new Date(data.birthDate) : undefined,
            sex: data.sex,
            role,
            // El registro no pide ubicación; Venezuela es el mercado por defecto
            // de la plataforma y el usuario puede ajustarlo después en /perfil.
            country: 'Venezuela',
            ...(data.categoryId && { categoryId: data.categoryId }),
            ...(data.subcategoryId && { subcategoryId: data.subcategoryId }),
            wallet: { create: { currency: 'USD' } },
            ...(createCommerce && data.commerceName
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

        if (businessProfileType) {
          await tx.userProfile.create({
            data: {
              userId: created.id,
              type: businessProfileType,
              subtype: businessProfileType === ProfileType.PROFESSIONAL
                ? (data.professionalSubtype ?? ProfessionalSubtype.FREELANCER)
                : null,
              categoryId: data.categoryId,
              subcategoryId: data.subcategoryId,
              status: ProfileStatus.ACTIVE,
            },
          });

          // Un PROFESSIONAL creado directo por admin en una categoría que
          // vende producto también necesita su Commerce (shouldProvisionCommerce).
          if (!created.commerce && (await this.commerceResolver.ensureForUser(tx, created.id))) {
            return tx.user.findUniqueOrThrow({
              where: { id: created.id },
              include: { commerce: true, category: true, subcategory: true },
            });
          }
        }

        return created;
      });
    } catch (e) {
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === 'P2002'
      ) {
        throw new ConflictException(this.i18n.t('users.email_taken'));
      }
      throw e;
    }

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
      businessProfileType: dto.businessProfileType,
      professionalSubtype: dto.professionalSubtype,
      commerceName: dto.commerceName,
      categoryId: dto.categoryId,
      subcategoryId: dto.subcategoryId,
    });
  }

  /**
   * Construye el `where` de Prisma compartido por findAllUsers y por
   * PermissionsService.listUsers, para no mantener dos veces la lógica de
   * scoping por rol/categoría/búsqueda.
   */
  buildUsersWhere(options: {
    roleFilter?: Role;
    allowedRoles?: Role[];
    categoryId?: string;
    subcategoryId?: string;
    search?: string;
    excludeUserId?: string;
    // Desglose fino que Role ya no captura (ver comentario en getUsersStats)
    // — filtra por el UserProfile ACTIVE del usuario, no por Role.
    profileKind?: 'BUSINESS' | 'FREELANCER' | 'SERVICE_PROVIDER';
  }): Record<string, unknown> {
    const { roleFilter, allowedRoles, categoryId, subcategoryId, search, excludeUserId, profileKind } =
      options;
    const where: Record<string, unknown> = {};
    if (allowedRoles) {
      // Si se pide un rol fuera del conjunto permitido, no debe devolver
      // nada (en vez de ignorar silenciosamente la restricción de scoping).
      where.role = {
        in: roleFilter ? (allowedRoles.includes(roleFilter) ? [roleFilter] : []) : allowedRoles,
      };
    } else if (roleFilter) {
      where.role = roleFilter;
    }
    if (categoryId) where.categoryId = categoryId;
    if (subcategoryId) where.subcategoryId = subcategoryId;
    if (excludeUserId) where.id = { not: excludeUserId };
    if (profileKind) {
      where.profiles = {
        some: profileKind === 'BUSINESS'
          ? { type: 'BUSINESS', status: 'ACTIVE' }
          : { type: 'PROFESSIONAL', subtype: profileKind, status: 'ACTIVE' },
      };
    }
    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }
    return where;
  }

  async findAllUsers(options: {
    roleFilter?: Role;
    allowedRoles?: Role[];
    categoryId?: string;
    subcategoryId?: string;
    search?: string;
    profileKind?: 'BUSINESS' | 'FREELANCER' | 'SERVICE_PROVIDER';
    page: number;
    limit: number;
  }) {
    const { page, limit } = options;
    const skip = (page - 1) * limit;
    const where = this.buildUsersWhere(options);

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
          // Role.PROFESIONAL ya no distingue Comercio/Freelancer/Prestador
          // de servicio — esa distinción vive acá (ver
          // AccountTypeResolver). Solo el perfil ACTIVE de negocio importa
          // para la UI de administración de usuarios.
          profiles: {
            where: { status: ProfileStatus.ACTIVE, type: { in: [ProfileType.BUSINESS, ProfileType.PROFESSIONAL] } },
            select: { type: true, subtype: true },
            take: 1,
          },
        },
      }),
      this.prisma.user.count({ where }),
    ]);

    return { data: users, total, page, limit };
  }

  /**
   * Agregados sobre TODO el conjunto filtrado (no solo la página actual),
   * usado por el header de /usuarios. Sin esto, contar sobre `data` de
   * findAllUsers solo refleja los 20 registros de la página visible.
   */
  async getUsersStats(options: {
    roleFilter?: Role;
    allowedRoles?: Role[];
    categoryId?: string;
    subcategoryId?: string;
    search?: string;
    profileKind?: 'BUSINESS' | 'FREELANCER' | 'SERVICE_PROVIDER';
  }) {
    const where = this.buildUsersWhere(options);
    // "commerce"/"freelancer" ya no son valores de Role (colapsados en
    // PROFESIONAL) — el desglose fino ahora se cuenta vía UserProfile
    // ACTIVE, que es donde vive esa distinción real.
    const withActiveProfile = (type: 'BUSINESS' | 'PROFESSIONAL', subtype?: ProfessionalSubtype) => ({
      AND: [
        where,
        { profiles: { some: { type, status: 'ACTIVE' as const, ...(subtype && { subtype }) } } },
      ],
    });
    const [total, commerce, freelancer, serviceProvider, active] = await Promise.all([
      this.prisma.user.count({ where }),
      this.prisma.user.count({ where: withActiveProfile('BUSINESS') }),
      this.prisma.user.count({ where: withActiveProfile('PROFESSIONAL', ProfessionalSubtype.FREELANCER) }),
      this.prisma.user.count({ where: withActiveProfile('PROFESSIONAL', ProfessionalSubtype.SERVICE_PROVIDER) }),
      this.prisma.user.count({ where: { AND: [where, { isActive: true }] } }),
    ]);
    return { total, commerce, freelancer, serviceProvider, active };
  }

  async updateUser(id: string, dto: UpdateUserDto) {
    // Early exit para el caso común (evita un round-trip de update fallido);
    // la unicidad real la garantiza el constraint @unique en email, cuyo
    // P2002 el AllExceptionsFilter global convierte en 409 — así se cierra
    // la ventana de carrera entre este check y el update de abajo.
    if (dto.email) {
      const existing = await this.prisma.user.findUnique({
        where: { email: dto.email },
      });
      if (existing && existing.id !== id) {
        throw new ConflictException(this.i18n.t('users.email_in_use'));
      }
    }

    let user;
    try {
      user = await this.prisma.$transaction(async (tx) => {
        const updated = await tx.user.update({
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

        // businessProfileType: undefined = no tocar el UserProfile actual;
        // null explícito = quitar el perfil de negocio (desactivarlo, no
        // borrarlo — conserva el historial); un ProfileType = crear/actualizar.
        if (dto.businessProfileType !== undefined) {
          await this.applyBusinessProfileType(tx, updated.id, dto.businessProfileType, dto.professionalSubtype);
        }

        // Cambio de perfil o de categoría puede volver obligatorio el Commerce.
        if (
          !updated.commerce &&
          (dto.businessProfileType !== undefined || dto.categoryId !== undefined) &&
          (await this.commerceResolver.ensureForUser(tx, updated.id))
        ) {
          return tx.user.findUniqueOrThrow({
            where: { id: updated.id },
            include: { commerce: true, category: true, subcategory: true },
          });
        }

        return updated;
      });
    } catch (e) {
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === 'P2002'
      ) {
        throw new ConflictException(this.i18n.t('users.email_in_use'));
      }
      throw e;
    }

    const { password, twoFactorSecret, ...result } = user;
    await this.invalidateFindByIdCache(id);
    return result;
  }

  // Crea, actualiza o desactiva el UserProfile de tipo BUSINESS/PROFESSIONAL
  // de un usuario ya existente — mismo efecto que el bloque de creación en
  // `create()`, pero operando sobre un usuario que puede ya tener uno
  // (a diferencia de create, que siempre parte de cero).
  private async applyBusinessProfileType(
    tx: Prisma.TransactionClient,
    userId: string,
    businessProfileType: ProfileType | null,
    professionalSubtype?: ProfessionalSubtype,
  ) {
    const existing = await tx.userProfile.findFirst({
      where: { userId, type: { in: [ProfileType.BUSINESS, ProfileType.PROFESSIONAL] } },
    });

    if (businessProfileType === null) {
      // Se conserva la fila (historial de reviewedBy/categoría) pero se
      // desactiva — igual semántica que ProfileActivationsService, que
      // nunca borra un UserProfile, solo cambia su status.
      if (existing) {
        await tx.userProfile.update({ where: { id: existing.id }, data: { status: ProfileStatus.SUSPENDED } });
      }
      return;
    }

    const subtype = businessProfileType === ProfileType.PROFESSIONAL
      ? (professionalSubtype ?? ProfessionalSubtype.FREELANCER)
      : null;

    if (existing) {
      await tx.userProfile.update({
        where: { id: existing.id },
        data: { type: businessProfileType, subtype, status: ProfileStatus.ACTIVE },
      });
    } else {
      await tx.userProfile.create({
        data: { userId, type: businessProfileType, subtype, status: ProfileStatus.ACTIVE },
      });
    }
  }

  async updateOwnProfile(id: string, dto: UpdateOwnProfileDto) {
    const user = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.user.update({
        where: { id },
        data: {
          ...(dto.categoryId !== undefined && {
            categoryId: dto.categoryId || null,
          }),
          ...(dto.subcategoryId !== undefined && {
            subcategoryId: dto.subcategoryId || null,
          }),
        },
        include: { commerce: true, category: true, subcategory: true },
      });
      // Un profesional que se pasa a una categoría que vende producto recibe
      // su Commerce (misma regla que al aprobar el perfil).
      if (!updated.commerce && dto.categoryId && (await this.commerceResolver.ensureForUser(tx, id))) {
        return tx.user.findUniqueOrThrow({
          where: { id },
          include: { commerce: true, category: true, subcategory: true },
        });
      }
      return updated;
    });

    const { password, twoFactorSecret, ...result } = user;
    await this.invalidateFindByIdCache(id);
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
    // Crítico: isActive es lo que JwtStrategy.validate() chequea en cada
    // request — un caché stale acá dejaría a un usuario desactivado seguir
    // autenticado hasta que expire el TTL.
    await this.invalidateFindByIdCache(id);
    return updated;
  }

  async deleteUser(id: string) {
    await this.prisma.user.findUnique({ where: { id } });
    await this.prisma.user.delete({ where: { id } });
    await this.invalidateFindByIdCache(id);
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
    const updated = await this.prisma.userCategory.update({
      where: { id },
      data,
      include: {
        subcategories: { orderBy: { name: 'asc' } },
        _count: { select: { users: true } },
      },
    });
    // Fan-out: findById cachea la categoría completa (nombre/icon/módulos),
    // así que TODOS los usuarios de esta categoría quedan con caché stale,
    // no solo uno. No hay forma de resolver esto por un único userId.
    await this.invalidateFindByIdCacheForCategory(id);
    return updated;
  }

  async deleteCategory(id: string) {
    const count = await this.prisma.user.count({ where: { categoryId: id } });
    if (count > 0)
      throw new BadRequestException(
        this.i18n.t('users.category.in_use', { args: { count } })
      );
    // Sin fan-out necesario: el guard de arriba garantiza 0 usuarios
    // referenciando esta categoría al llegar acá.
    await this.prisma.userCategory.delete({ where: { id } });
    return { message: this.i18n.t('users.category.deleted') };
  }

  private async invalidateFindByIdCacheForCategory(
    categoryId: string
  ): Promise<void> {
    const affectedUsers = await this.prisma.user.findMany({
      where: { categoryId },
      select: { id: true },
    });
    await Promise.all(
      affectedUsers.map((u) => this.invalidateFindByIdCache(u.id))
    );
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

  async createSubcategory(categoryId: string, data: { name: string; icon?: string; description?: string }) {
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
      data: { name: data.name, icon: data.icon, description: data.description, categoryId },
    });
  }

  async updateSubcategory(id: string, data: { name?: string; icon?: string; description?: string }) {
    const sub = await this.prisma.userSubcategory.findUnique({ where: { id } });
    if (!sub) throw new NotFoundException(this.i18n.t('users.subcategory.not_found'));
    if (data.name) {
      const existing = await this.prisma.userSubcategory.findFirst({
        where: { name: data.name, categoryId: sub.categoryId, NOT: { id } },
      });
      if (existing)
        throw new ConflictException(this.i18n.t('users.subcategory.name_taken'));
    }
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
    const cached = await this.redis.get(userFindByIdCacheKey(id));
    if (cached) return JSON.parse(cached);

    const user = await this.prisma.user.findUnique({
      where: { id },
      include: { commerce: true, category: true, profileSettings: true },
    });
    if (!user) throw new NotFoundException(this.i18n.t('users.not_found'));
    const { password, twoFactorSecret, ...result } = user;

    await this.redis.setex(
      userFindByIdCacheKey(id),
      FIND_BY_ID_CACHE_TTL,
      JSON.stringify(result)
    );
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

    let user;
    try {
      user = await this.prisma.user.update({
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
          ...(dto.municipality !== undefined && { municipality: dto.municipality || null }),
          ...(dto.parish !== undefined && { parish: dto.parish || null }),
          ...(dto.latitude !== undefined && { latitude: dto.latitude ?? null }),
          ...(dto.longitude !== undefined && { longitude: dto.longitude ?? null }),
        },
        include: { commerce: true, profileSettings: true },
      });
    } catch (err) {
      // Cierra la misma ventana de carrera que create() ya documenta: dos
      // requests cambiando a el mismo email/username en paralelo pueden
      // ambas pasar el pre-check de arriba; el constraint @unique es la
      // garantía real.
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        const target = (err.meta?.target as string[] | undefined)?.join(',') ?? '';
        if (target.includes('email')) throw new ConflictException(this.i18n.t('users.email_in_use'));
        if (target.includes('username')) throw new ConflictException(this.i18n.t('users.username_taken'));
      }
      throw err;
    }

    if (previousEmail) {
      this.mail
        .sendSecurityAlert(previousEmail, user.firstName, 'email_changed')
        .catch((err) => {
          this.logger.warn(`Failed to send email-changed security alert: ${err.message}`);
        });
    }

    const { password, twoFactorSecret, ...result } = user;
    await this.invalidateFindByIdCache(id);
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
    await this.invalidateFindByIdCache(id);
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

    // Revocar todas las sesiones existentes: si un atacante tenía un refresh
    // token robado, cambiar la contraseña debe cerrarle el acceso (igual que
    // ya hace resetPassword() vía email en AuthService).
    await this.prisma.refreshToken.updateMany({
      where: { userId: id, revokedAt: null },
      data: { revokedAt: new Date() },
    });

    this.mail
      .sendSecurityAlert(user.email, user.firstName, 'password_changed')
      .catch((err) => {
        this.logger.warn(`Failed to send password-changed security alert: ${err.message}`);
      });

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

    // Verificar campos básicos del perfil
    const hasBasicInfo = !!(user.firstName && user.lastName && user.phone);

    // Verificar categoría y subcategoría
    const hasCategory = !!(user.categoryId && category);
    const hasSubcategory = !!(user.subcategoryId && subcategory);

    // Verificaciones específicas por rol/categoría. NORMAL no tiene
    // requisito de negocio adicional, ambos flags quedan en false.
    let hasBusinessSetup = false;
    let hasServicesSetup = false;

    // Role.COMMERCE/FREELANCER se fusionaron en Role.PROFESIONAL — la
    // distinción "es comercio vs es freelancer" ya no vive en role, vive en
    // UserProfile (ver AccountTypeResolver). isBusiness usa `!!user.commerce`
    // en vez del resolver porque acá lo que importa es si YA existe el
    // Commerce físico para chequear su completitud, no solo el perfil
    // BUSINESS aprobado (que puede estar activo un instante antes de que el
    // usuario cree su Commerce).
    const isBusiness = !!user.commerce;
    const accountType = await this.accountTypeResolver.resolve(userId);
    const isFreelancerProfile = !isBusiness && this.accountTypeResolver.isFreelancer(accountType);

    const profileContext = { hasBasicInfo, hasCategory, category };
    if (isBusiness) {
      hasBusinessSetup = (await this.commerceProfileCompletion.check(user, profileContext)).isSetupComplete;
    } else if (isFreelancerProfile) {
      hasServicesSetup = (await this.freelancerProfileCompletion.check(user, profileContext)).isSetupComplete;
    }

    // Calcular porcentaje de completitud
    const requiredFields = [
      hasBasicInfo,
      hasCategory,
      user.role === 'NORMAL' ? true : hasSubcategory, // NORMAL no requiere subcategoría
    ];

    if (isBusiness) {
      requiredFields.push(hasBusinessSetup);
    } else if (isFreelancerProfile) {
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
