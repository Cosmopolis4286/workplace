import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from '../../domains/identity-access/users/users.service';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../redis/redis.service';
import { MailService } from '../../domains/engagement/mail/mail.service';
import { CommerceProfileCompletionStrategy } from '../../domains/identity-access/users/strategies/commerce-profile-completion.strategy';
import { FreelancerProfileCompletionStrategy } from '../../domains/identity-access/users/strategies/freelancer-profile-completion.strategy';
import { AccountTypeResolver } from '../../common/account-type/account-type.resolver';
import { CommerceResolverService } from '../../common/commerce-resolver/commerce-resolver.service';
import { RoleResolverService } from '../../common/account-type/role-resolver.service';
import { Role } from '@prisma/client';
import { I18nService } from 'nestjs-i18n';
import * as bcrypt from 'bcrypt';

describe('UsersService', () => {
  let service: UsersService;

  const mockPrismaService: any = {
    user: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      updateMany: jest.fn(),
      count: jest.fn(),
      findUniqueOrThrow: jest.fn(),
    },
    refreshToken: { updateMany: jest.fn() },
    auditLog: { findMany: jest.fn() },
    userProfile: {
      create: jest.fn(),
      update: jest.fn(),
      findFirst: jest.fn(),
    },
    // Transacción interactiva: el callback recibe el mismo mock como `tx`.
    $transaction: jest.fn((fn: any) => fn(mockPrismaService)),
  };

  const redisStore = new Map<string, string>();
  const mockRedisService = {
    get: jest.fn((key: string) => Promise.resolve(redisStore.get(key) ?? null)),
    setex: jest.fn((key: string, _ttl: number, value: string) => {
      redisStore.set(key, value);
      return Promise.resolve();
    }),
    deleteByPattern: jest.fn(() => Promise.resolve(0)),
    del: jest.fn((key: string) => {
      redisStore.delete(key);
      return Promise.resolve();
    }),
  };

  const mockMailService = {
    sendSecurityAlert: jest.fn().mockResolvedValue(undefined),
    sendAccountStatusUpdate: jest.fn().mockResolvedValue(undefined),
  };

  const I18N_MESSAGES: Record<string, string> = {
    'users.not_found': 'Usuario no encontrado',
    'users.deleted': 'Usuario eliminado correctamente',
  };
  const mockI18nService = {
    t: jest.fn((key: string) => I18N_MESSAGES[key] ?? key),
  };

  const mockAccountTypeResolver = {
    resolve: jest.fn().mockResolvedValue(null),
    isFreelancer: jest.fn(
      (accountType: string | null) => accountType === 'FREELANCER'
    ),
    isCommerce: jest.fn(
      (accountType: string | null) => accountType === 'COMMERCE'
    ),
  };

  const mockCommerceResolver = {
    ensureForUser: jest.fn().mockResolvedValue(null),
  };

  beforeEach(async () => {
    redisStore.clear();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        CommerceProfileCompletionStrategy,
        FreelancerProfileCompletionStrategy,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: RedisService,
          useValue: mockRedisService,
        },
        {
          provide: MailService,
          useValue: mockMailService,
        },
        {
          provide: I18nService,
          useValue: mockI18nService,
        },
        {
          provide: AccountTypeResolver,
          useValue: mockAccountTypeResolver,
        },
        {
          provide: RoleResolverService,
          useValue: {
            syncRoleForUser: jest.fn().mockResolvedValue(Role.NORMAL),
          },
        },
        {
          provide: CommerceResolverService,
          useValue: mockCommerceResolver,
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  describe('changePassword session revocation', () => {
    it('increments authVersion and revokes refresh tokens in one transaction', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: 'user-1',
        email: 'user@example.com',
        firstName: 'User',
        password: 'current-hash',
      });
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(true);
      jest.spyOn(bcrypt, 'hash').mockResolvedValue('new-hash' as never);

      await service.changePassword('user-1', {
        currentPassword: 'CurrentPassword123',
        newPassword: 'NewPassword123!',
      } as any);

      expect(mockPrismaService.$transaction).toHaveBeenCalled();
      expect(mockPrismaService.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'user-1' },
          data: expect.objectContaining({
            password: 'new-hash',
            authVersion: { increment: 1 },
          }),
        })
      );
      expect(mockPrismaService.refreshToken.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: 'user-1', revokedAt: null },
        })
      );
      expect(mockRedisService.del).toHaveBeenCalled();
      jest.restoreAllMocks();
    });
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('buildUsersWhere', () => {
    it('keeps explicit active and inactive filters', () => {
      expect(service.buildUsersWhere({ isActive: false })).toEqual({
        isActive: false,
      });
      expect(service.buildUsersWhere({ isActive: true })).toEqual({
        isActive: true,
      });
    });

    it('searches users by phone and username as well', () => {
      const where = service.buildUsersWhere({ search: 'ana' });
      expect(where.OR).toEqual(
        expect.arrayContaining([
          { phone: { contains: 'ana', mode: 'insensitive' } },
          { username: { contains: 'ana', mode: 'insensitive' } },
        ])
      );
    });
  });

  describe('findAll', () => {
    it('should return paginated users', async () => {
      const users = [
        { id: 1, email: 'user1@example.com', name: 'User 1' },
        { id: 2, email: 'user2@example.com', name: 'User 2' },
      ];

      mockPrismaService.user.findMany.mockResolvedValue(users);
      mockPrismaService.user.count.mockResolvedValue(2);

      const result = await service.findAllUsers({ page: 1, limit: 10 });

      expect(result).toEqual({
        data: users,
        total: 2,
        page: 1,
        limit: 10,
      });
      expect(mockPrismaService.user.findMany).toHaveBeenCalledWith({
        skip: 0,
        take: 10,
        orderBy: { createdAt: 'desc' },
        select: expect.any(Object),
        where: expect.any(Object),
      });
    });

    it('should handle pagination correctly', async () => {
      const users = [{ id: 3, email: 'user3@example.com', name: 'User 3' }];

      mockPrismaService.user.findMany.mockResolvedValue(users);
      mockPrismaService.user.count.mockResolvedValue(25);

      const result = await service.findAllUsers({ page: 2, limit: 10 });

      expect(result).toEqual({
        data: users,
        total: 25,
        page: 2,
        limit: 10,
      });
      expect(mockPrismaService.user.findMany).toHaveBeenCalledWith({
        skip: 10,
        take: 10,
        orderBy: { createdAt: 'desc' },
        select: expect.any(Object),
        where: expect.any(Object),
      });
    });
  });

  describe('getAdminOverview', () => {
    it('throws NotFoundException when the account does not exist', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.getAdminOverview('missing-user')).rejects.toThrow(
        NotFoundException
      );
      expect(mockPrismaService.auditLog.findMany).not.toHaveBeenCalled();
    });

    it('returns account, profiles, masked identity documents and recent activity', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: 'user-kyc',
        email: 'person@example.com',
        role: Role.NORMAL,
        isActive: true,
        identityVerifications: [
          {
            id: 'verification-1',
            documentNumber: 'V12345678',
            status: 'APPROVED',
          },
        ],
        profiles: [],
      });
      mockPrismaService.auditLog.findMany.mockResolvedValue([
        { id: 'audit-1', summary: 'Solicitud KYC enviada' },
      ]);

      const result = await service.getAdminOverview('user-kyc');

      expect(result.user.identityVerifications[0].documentNumber).toBe(
        '*****5678'
      );
      expect(result.activity).toHaveLength(1);
      expect(mockPrismaService.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            module: { in: ['users', 'kyc', 'account', 'auth'] },
            OR: expect.arrayContaining([
              { userId: 'user-kyc' },
              { entityId: 'user-kyc' },
              { details: { path: ['targetUserId'], equals: 'user-kyc' } },
            ]),
          }),
          take: 30,
        })
      );
    });

    it('does not return a full document number when it is short', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: 'user-kyc',
        identityVerifications: [
          { id: 'verification-2', documentNumber: '123' },
        ],
        profiles: [],
      });
      mockPrismaService.auditLog.findMany.mockResolvedValue([]);

      const result = await service.getAdminOverview('user-kyc');

      expect(result.user.identityVerifications[0].documentNumber).toBe('****');
    });
  });

  describe('findById', () => {
    it('should return user if found', async () => {
      const user = { id: 1, email: 'test@example.com', name: 'Test User' };

      mockPrismaService.user.findUnique.mockResolvedValue(user);

      const result = await service.findById('1');

      expect(result).toEqual(user);
      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: { id: '1' },
        include: { commerce: true, category: true, profileSettings: true },
      });
    });

    it('should throw NotFoundException if user not found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.findById('999')).rejects.toThrow(
        'Usuario no encontrado'
      );
    });
  });

  describe('create', () => {
    beforeEach(() => {
      mockPrismaService.user.findUnique.mockReset().mockResolvedValue(null);
      mockPrismaService.userProfile.create.mockReset();
    });

    it('should create new user', async () => {
      const createUserDto = {
        email: 'newuser@example.com',
        password: 'password123',
        firstName: 'New',
        lastName: 'User',
        role: Role.NORMAL,
      };

      const createdUser = {
        id: 2,
        email: 'newuser@example.com',
        firstName: 'New',
        lastName: 'User',
        role: 'NORMAL',
        isActive: true,
      };

      mockPrismaService.user.create.mockResolvedValue(createdUser);

      const result = await service.create(createUserDto);

      expect(result).toEqual(createdUser);
      expect(mockPrismaService.user.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          email: createUserDto.email,
          firstName: createUserDto.firstName,
          lastName: createUserDto.lastName,
          role: createUserDto.role,
        }),
        include: expect.any(Object),
      });
      // Solo el perfil Cliente (todo usuario puede comprar); ninguno de negocio.
      expect(mockPrismaService.userProfile.create).toHaveBeenCalledTimes(1);
      expect(mockPrismaService.userProfile.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ type: 'CUSTOMER', status: 'ACTIVE' }),
      });
    });

    it('creates a BUSINESS UserProfile when role is PROFESIONAL with a commerceName (inferred)', async () => {
      const createUserDto = {
        email: 'commerce@example.com',
        password: 'password123',
        firstName: 'Comercio',
        lastName: 'Uno',
        role: Role.PROFESIONAL,
        commerceName: 'Mi Negocio',
        categoryId: 'cat-1',
      };

      mockPrismaService.user.create.mockResolvedValue({
        id: 'user-1',
        role: 'PROFESIONAL',
      });

      await service.create(createUserDto);

      expect(mockPrismaService.userProfile.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: 'user-1',
          type: 'BUSINESS',
          subtype: null,
          categoryId: 'cat-1',
          status: 'ACTIVE',
        }),
      });
    });

    it('creates a PROFESSIONAL/FREELANCER UserProfile when role is PROFESIONAL without a commerceName', async () => {
      const createUserDto = {
        email: 'freelancer@example.com',
        password: 'password123',
        firstName: 'Free',
        lastName: 'Lancer',
        role: Role.PROFESIONAL,
        categoryId: 'cat-2',
      };

      mockPrismaService.user.create.mockResolvedValue({
        id: 'user-2',
        role: 'PROFESIONAL',
      });

      await service.create(createUserDto);

      expect(mockPrismaService.userProfile.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: 'user-2',
          type: 'PROFESSIONAL',
          subtype: 'FREELANCER',
          categoryId: 'cat-2',
          status: 'ACTIVE',
        }),
      });
    });

    it('creates a PROFESSIONAL/SERVICE_PROVIDER UserProfile when businessProfileType/professionalSubtype are explicit', async () => {
      const createUserDto = {
        email: 'plumber@example.com',
        password: 'password123',
        firstName: 'Service',
        lastName: 'Provider',
        role: Role.PROFESIONAL,
        businessProfileType: 'PROFESSIONAL' as any,
        professionalSubtype: 'SERVICE_PROVIDER' as any,
        categoryId: 'cat-3',
      };

      mockPrismaService.user.create.mockResolvedValue({
        id: 'user-3',
        role: 'PROFESIONAL',
      });

      await service.create(createUserDto);

      expect(mockPrismaService.userProfile.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: 'user-3',
          type: 'PROFESSIONAL',
          subtype: 'SERVICE_PROVIDER',
          categoryId: 'cat-3',
          status: 'ACTIVE',
        }),
      });
    });

    it('does NOT create a UserProfile when role is ADMIN (even though it also gets a Commerce)', async () => {
      const createUserDto = {
        email: 'admin@example.com',
        password: 'password123',
        firstName: 'Admin',
        lastName: 'User',
        role: Role.ADMIN,
      };

      mockPrismaService.user.create.mockResolvedValue({
        id: 'admin-1',
        role: 'ADMIN',
      });

      await service.create(createUserDto);

      // Solo el perfil Cliente (todo usuario puede comprar); ninguno de negocio.
      expect(mockPrismaService.userProfile.create).toHaveBeenCalledTimes(1);
      expect(mockPrismaService.userProfile.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ type: 'CUSTOMER', status: 'ACTIVE' }),
      });
    });
  });

  describe('update', () => {
    it('should update user', async () => {
      const updateUserDto = {
        firstName: 'Updated',
        lastName: 'Name',
        email: 'updated@example.com',
      };

      const updatedUser = {
        id: 1,
        firstName: 'Updated',
        lastName: 'Name',
        email: 'updated@example.com',
        role: 'NORMAL',
      };

      mockPrismaService.user.update.mockResolvedValue(updatedUser);

      const result = await service.updateUser('1', updateUserDto);

      expect(result).toEqual(updatedUser);
      expect(mockPrismaService.user.update).toHaveBeenCalledWith({
        where: { id: '1' },
        data: updateUserDto,
        include: expect.any(Object),
      });
    });
  });

  // El rol se deriva de los perfiles: el admin no puede dejar un
  // PROFESIONAL sin perfil de negocio ni un perfil activo con rol NORMAL.
  describe('update — rol derivado de los perfiles', () => {
    const base = {
      id: 'u1',
      role: 'NORMAL',
      commerce: null,
      category: null,
      subcategory: null,
    };

    it('elegir PROFESIONAL sin perfil de negocio crea uno Profesional y recalcula el rol', async () => {
      mockPrismaService.user.update.mockResolvedValue(base);
      mockPrismaService.userProfile.findFirst
        .mockResolvedValueOnce(null) // ¿tiene perfil de negocio activo?
        .mockResolvedValueOnce(null); // applyBusinessProfileType: existente
      const roleResolver = (service as any).roleResolver;
      roleResolver.syncRoleForUser.mockResolvedValueOnce(Role.PROFESIONAL);
      mockPrismaService.user.findUniqueOrThrow.mockResolvedValue({
        ...base,
        role: 'PROFESIONAL',
      });

      const result = await service.updateUser('u1', {
        role: Role.PROFESIONAL,
      } as any);

      expect(mockPrismaService.userProfile.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: 'u1',
          type: 'PROFESSIONAL',
          status: 'ACTIVE',
        }),
      });
      expect(roleResolver.syncRoleForUser).toHaveBeenCalledWith(
        'u1',
        mockPrismaService
      );
      expect(result.role).toBe('PROFESIONAL');
    });

    it('elegir NORMAL desactiva el perfil de negocio', async () => {
      mockPrismaService.user.update.mockResolvedValue({
        ...base,
        role: 'NORMAL',
      });
      mockPrismaService.userProfile.findFirst.mockResolvedValueOnce({
        id: 'p1',
      });

      await service.updateUser('u1', { role: Role.NORMAL } as any);

      expect(mockPrismaService.userProfile.update).toHaveBeenCalledWith({
        where: { id: 'p1' },
        data: { status: 'SUSPENDED' },
      });
    });
  });

  describe('setAccountStatus', () => {
    beforeEach(() => {
      mockMailService.sendAccountStatusUpdate.mockClear();
      mockPrismaService.user.findUnique.mockReset();
      mockPrismaService.user.updateMany.mockReset();
      mockPrismaService.user.count.mockReset();
      mockPrismaService.refreshToken.updateMany.mockReset();
    });

    const activeUser = {
      id: 'user-1',
      role: Role.NORMAL,
      isActive: true,
      email: 'u@x.com',
      firstName: 'Ana',
      suspensionReason: null,
      suspensionNote: null,
    };

    it('suspende con motivo, guarda quién/cuándo y revoca tokens y sesiones', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(activeUser);
      mockPrismaService.user.updateMany.mockResolvedValue({ count: 1 });
      mockPrismaService.refreshToken.updateMany.mockResolvedValue({ count: 2 });

      const result = await service.setAccountStatus('user-1', {
        active: false,
        reason: 'FRAUD' as any,
        note: '  Pagos reportados falsos  ',
        actorId: 'admin-1',
      });

      expect(result).toMatchObject({
        id: 'user-1',
        isActive: false,
        changed: true,
      });
      expect(mockPrismaService.user.updateMany).toHaveBeenCalledWith({
        where: { id: 'user-1', isActive: true },
        data: {
          isActive: false,
          suspensionReason: 'FRAUD',
          suspensionNote: 'Pagos reportados falsos',
          suspendedAt: expect.any(Date),
          suspendedById: 'admin-1',
        },
      });
      expect(mockPrismaService.refreshToken.updateMany).toHaveBeenCalledWith({
        where: { userId: 'user-1', revokedAt: null },
        data: { revokedAt: expect.any(Date) },
      });
      expect(mockRedisService.deleteByPattern).toHaveBeenCalledWith(
        'session:user-1:*'
      );
      // Al usuario le llega el motivo, nunca la nota interna.
      expect(mockMailService.sendAccountStatusUpdate).toHaveBeenCalledWith(
        'u@x.com',
        'Ana',
        false,
        'Sospecha de fraude'
      );
    });

    it('exige motivo para suspender', async () => {
      await expect(
        service.setAccountStatus('user-1', { active: false, actorId: 'a' })
      ).rejects.toThrow('Indica el motivo de la suspensión');
      expect(mockPrismaService.user.updateMany).not.toHaveBeenCalled();
    });

    it('pedir dos veces lo mismo no revierte nada (no es un interruptor)', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        ...activeUser,
        isActive: false,
        suspensionReason: 'ABUSE',
      });

      const result = await service.setAccountStatus('user-1', {
        active: false,
        reason: 'FRAUD' as any,
        actorId: 'admin-1',
      });

      expect(result).toMatchObject({ isActive: false, changed: false });
      expect(mockPrismaService.user.updateMany).not.toHaveBeenCalled();
      expect(mockMailService.sendAccountStatusUpdate).not.toHaveBeenCalled();
      expect(mockPrismaService.refreshToken.updateMany).not.toHaveBeenCalled();
    });

    it('al reactivar limpia el motivo y devuelve el anterior para la auditoría', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        ...activeUser,
        isActive: false,
        suspensionReason: 'ABUSE',
        suspensionNote: 'Insultos',
      });
      mockPrismaService.user.updateMany.mockResolvedValue({ count: 1 });

      const result = await service.setAccountStatus('user-1', {
        active: true,
        actorId: 'admin-1',
      });

      expect(result).toMatchObject({
        isActive: true,
        changed: true,
        previous: { suspensionReason: 'ABUSE', suspensionNote: 'Insultos' },
      });
      expect(mockPrismaService.user.updateMany).toHaveBeenCalledWith({
        where: { id: 'user-1', isActive: false },
        data: {
          isActive: true,
          suspensionReason: null,
          suspensionNote: null,
          suspendedAt: null,
          suspendedById: null,
        },
      });
      expect(mockPrismaService.refreshToken.updateMany).not.toHaveBeenCalled();
    });

    it('protects the last active SUPERADMIN', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        ...activeUser,
        id: 'root-1',
        role: Role.SUPERADMIN,
      });
      mockPrismaService.user.count.mockResolvedValue(1);

      await expect(
        service.setAccountStatus('root-1', {
          active: false,
          reason: 'SECURITY' as any,
          actorId: 'root-2',
        })
      ).rejects.toThrow('No se puede suspender al último SUPERADMIN activo');
      expect(mockPrismaService.user.updateMany).not.toHaveBeenCalled();
      expect(mockPrismaService.refreshToken.updateMany).not.toHaveBeenCalled();
    });

    it('rejects stale status updates', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        ...activeUser,
        id: 'user-2',
      });
      mockPrismaService.user.updateMany.mockResolvedValue({ count: 0 });

      await expect(
        service.setAccountStatus('user-2', {
          active: false,
          reason: 'OTHER' as any,
          note: 'Revisión',
          actorId: 'admin-1',
        })
      ).rejects.toThrow('La cuenta cambió mientras se procesaba la operación');
    });
  });

  describe('getProfileCompletion', () => {
    beforeEach(() => {
      mockAccountTypeResolver.resolve.mockReset();
      mockAccountTypeResolver.isFreelancer
        .mockReset()
        .mockImplementation(
          (accountType: string | null) => accountType === 'FREELANCER'
        );
    });

    it('classifies a PROFESIONAL user without a Commerce as freelancer via AccountTypeResolver, not via a local role heuristic', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: 'user-1',
        role: Role.PROFESIONAL,
        firstName: 'Ana',
        lastName: 'Perez',
        phone: '123',
        categoryId: 'cat-1',
        subcategoryId: 'sub-1',
        commerce: null,
      });
      mockPrismaService.userCategory = {
        findUnique: jest.fn().mockResolvedValue({ id: 'cat-1' }),
      };
      mockPrismaService.userSubcategory = {
        findUnique: jest.fn().mockResolvedValue({ id: 'sub-1' }),
      };
      // El perfil BUSINESS quedó ACTIVE un instante antes de que el usuario
      // cree su Commerce — AccountTypeResolver ya lo resolvería como COMMERCE,
      // pero acá no hay Commerce todavía, así que debe caer a freelancer.
      mockAccountTypeResolver.resolve.mockResolvedValue('FREELANCER');

      const result = await service.getProfileCompletion('user-1');

      expect(mockAccountTypeResolver.resolve).toHaveBeenCalledWith('user-1');
      expect(result).toBeDefined();
    });

    it('short-circuits isFreelancer when the user already has a Commerce (isBusiness wins, no ambiguity possible)', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: 'user-2',
        role: Role.PROFESIONAL,
        firstName: 'Luis',
        lastName: 'Gomez',
        phone: '456',
        categoryId: 'cat-1',
        subcategoryId: 'sub-1',
        commerce: { id: 'commerce-1' },
      });
      mockPrismaService.userCategory = {
        findUnique: jest.fn().mockResolvedValue({ id: 'cat-1' }),
      };
      mockPrismaService.userSubcategory = {
        findUnique: jest.fn().mockResolvedValue({ id: 'sub-1' }),
      };
      mockAccountTypeResolver.resolve.mockResolvedValue('COMMERCE');

      const result = await service.getProfileCompletion('user-2');

      expect(mockAccountTypeResolver.resolve).toHaveBeenCalledWith('user-2');
      expect(mockAccountTypeResolver.isFreelancer).not.toHaveBeenCalled();
      expect(result).toBeDefined();
    });
  });
});
