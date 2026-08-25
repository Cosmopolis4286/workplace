import { Test, TestingModule } from '@nestjs/testing'
import { PermissionsService } from '../../domains/identity-access/permissions/permissions.service'
import { PrismaService } from '../../prisma/prisma.service'
import { RedisService } from '../../redis/redis.service'
import { UsersService } from '../../domains/identity-access/users/users.service'
import { Role, ProfileType, ProfessionalSubtype } from '@prisma/client'

describe('PermissionsService', () => {
  let service: PermissionsService

  const mockPrisma = {
    rolePermission: { findMany: jest.fn(), upsert: jest.fn(), deleteMany: jest.fn(), createMany: jest.fn() },
    userPermission: { findMany: jest.fn(), upsert: jest.fn(), deleteMany: jest.fn() },
    permission: { findMany: jest.fn(), findUnique: jest.fn(), findUniqueOrThrow: jest.fn(), create: jest.fn(), delete: jest.fn() },
    user: { findUnique: jest.fn() },
    userProfile: { findMany: jest.fn() },
    profilePermission: { findMany: jest.fn(), findFirst: jest.fn(), create: jest.fn(), update: jest.fn(), createMany: jest.fn() },
  }

  const redisStore = new Map<string, string>()
  const mockRedis = {
    get: jest.fn((key: string) => Promise.resolve(redisStore.get(key) ?? null)),
    set: jest.fn((key: string, value: string) => { redisStore.set(key, value); return Promise.resolve() }),
    setex: jest.fn((key: string, _ttl: number, value: string) => { redisStore.set(key, value); return Promise.resolve() }),
    del: jest.fn((key: string) => { redisStore.delete(key); return Promise.resolve() }),
  }

  const mockUsersService = { buildUsersWhere: jest.fn() }

  beforeEach(async () => {
    jest.clearAllMocks()
    redisStore.clear()

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PermissionsService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: RedisService, useValue: mockRedis },
        { provide: UsersService, useValue: mockUsersService },
      ],
    }).compile()

    service = module.get<PermissionsService>(PermissionsService)
  })

  it('should be defined', () => {
    expect(service).toBeDefined()
  })

  describe('hasEffectivePermission', () => {
    beforeEach(() => {
      // Sin perfiles activos por defecto — mismo comportamiento que antes de
      // que existiera ProfilePermission, salvo que un test lo sobrescriba.
      mockPrisma.userProfile.findMany.mockResolvedValue([])
    })

    it('grants when the role has it and there is no override', async () => {
      mockPrisma.rolePermission.findMany.mockResolvedValue([
        { permission: { key: 'orders:view' } },
      ])
      mockPrisma.userPermission.findMany.mockResolvedValue([])

      const result = await service.hasEffectivePermission('user-1', Role.COMMERCE, 'orders:view')

      expect(result).toBe(true)
    })

    it('denies when the role grants it but the user has an explicit deny override', async () => {
      mockPrisma.rolePermission.findMany.mockResolvedValue([
        { permission: { key: 'orders:view' } },
      ])
      mockPrisma.userPermission.findMany.mockResolvedValue([
        { granted: false, expiresAt: null, permission: { key: 'orders:view' } },
      ])

      const result = await service.hasEffectivePermission('user-1', Role.COMMERCE, 'orders:view')

      expect(result).toBe(false)
    })

    it('grants when the role denies it but the user has an explicit grant override', async () => {
      mockPrisma.rolePermission.findMany.mockResolvedValue([])
      mockPrisma.userPermission.findMany.mockResolvedValue([
        { granted: true, expiresAt: null, permission: { key: 'orders:view' } },
      ])

      const result = await service.hasEffectivePermission('user-1', Role.COMMERCE, 'orders:view')

      expect(result).toBe(true)
    })

    it('falls back to the role permission when the override has already expired', async () => {
      mockPrisma.rolePermission.findMany.mockResolvedValue([
        { permission: { key: 'orders:view' } },
      ])
      mockPrisma.userPermission.findMany.mockResolvedValue([
        { granted: false, expiresAt: new Date('2020-01-01'), permission: { key: 'orders:view' } },
      ])

      const result = await service.hasEffectivePermission('user-1', Role.COMMERCE, 'orders:view')

      expect(result).toBe(true)
    })

    it('grants when an active UserProfile has the permission even if the role does not', async () => {
      mockPrisma.rolePermission.findMany.mockResolvedValue([]) // NORMAL sin permisos de negocio
      mockPrisma.userPermission.findMany.mockResolvedValue([])
      mockPrisma.userProfile.findMany.mockResolvedValue([
        { type: ProfileType.PROFESSIONAL, subtype: ProfessionalSubtype.FREELANCER },
      ])
      mockPrisma.profilePermission.findMany.mockResolvedValue([
        { permission: { key: 'services:view' } },
      ])

      const result = await service.hasEffectivePermission('user-1', Role.NORMAL, 'services:view')

      expect(result).toBe(true)
    })

    it('unions permissions across multiple simultaneously active profiles', async () => {
      mockPrisma.rolePermission.findMany.mockResolvedValue([])
      mockPrisma.userPermission.findMany.mockResolvedValue([])
      mockPrisma.userProfile.findMany.mockResolvedValue([
        { type: ProfileType.PROFESSIONAL, subtype: ProfessionalSubtype.FREELANCER },
        { type: ProfileType.BUSINESS, subtype: null },
      ])
      mockPrisma.profilePermission.findMany.mockImplementation(({ where }: any) => {
        if (where.profileType === ProfileType.BUSINESS) {
          return Promise.resolve([{ permission: { key: 'menu:view' } }])
        }
        return Promise.resolve([{ permission: { key: 'services:view' } }])
      })

      const hasServices = await service.hasEffectivePermission('user-1', Role.NORMAL, 'services:view')
      const hasMenu = await service.hasEffectivePermission('user-1', Role.NORMAL, 'menu:view')

      expect(hasServices).toBe(true)
      expect(hasMenu).toBe(true)
    })

    it('a user-level deny override still wins over a profile-granted permission', async () => {
      mockPrisma.rolePermission.findMany.mockResolvedValue([])
      mockPrisma.userPermission.findMany.mockResolvedValue([
        { granted: false, expiresAt: null, permission: { key: 'services:view' } },
      ])
      mockPrisma.userProfile.findMany.mockResolvedValue([
        { type: ProfileType.PROFESSIONAL, subtype: ProfessionalSubtype.FREELANCER },
      ])
      mockPrisma.profilePermission.findMany.mockResolvedValue([
        { permission: { key: 'services:view' } },
      ])

      const result = await service.hasEffectivePermission('user-1', Role.NORMAL, 'services:view')

      expect(result).toBe(false)
    })
  })

  describe('getUserOverrides', () => {
    it('caches the overrides map and excludes expired entries', async () => {
      mockPrisma.userPermission.findMany.mockResolvedValue([
        { granted: true, expiresAt: null, permission: { key: 'orders:view' } },
        { granted: false, expiresAt: new Date('2020-01-01'), permission: { key: 'menu:view' } },
      ])

      const first = await service.getUserOverrides('user-1')
      expect(first).toEqual({ 'orders:view': true })

      // Segunda llamada: debe venir de cache, sin volver a golpear Prisma.
      await service.getUserOverrides('user-1')
      expect(mockPrisma.userPermission.findMany).toHaveBeenCalledTimes(1)
    })
  })

  describe('bumpUserVersion / getUserVersion', () => {
    it('persists a version that getUserVersion then returns unchanged', async () => {
      // getOrSet crea una versión si no existe.
      const v1 = await service.getUserVersion('user-1')
      expect(v1).toBe(redisStore.get('permissions:version:user:user-1'))

      // Una segunda lectura sin bump de por medio debe devolver el mismo valor.
      const v1Again = await service.getUserVersion('user-1')
      expect(v1Again).toBe(v1)
    })

    it('bumpUserVersion overwrites whatever version was previously stored', async () => {
      await service.getUserVersion('user-1') // crea una versión inicial
      const forced = '9999999999999'
      jest.spyOn(Date, 'now').mockReturnValueOnce(Number(forced))

      const bumped = await service.bumpUserVersion('user-1')

      expect(bumped).toBe(forced)
      expect(await service.getUserVersion('user-1')).toBe(forced)
    })
  })

  describe('createPermission with grantedRoles', () => {
    it('grants only the selected roles and leaves the rest false', async () => {
      mockPrisma.permission.findUnique.mockResolvedValue(null)
      mockPrisma.permission.create.mockResolvedValue({ id: 'perm-1', key: 'reports:export' })

      await service.createPermission(
        {
          key: 'reports:export',
          module: 'reports',
          action: 'export',
          label: 'Exportar reportes',
          grantedRoles: [Role.COMMERCE, Role.FREELANCER],
        } as any,
        'admin-1'
      )

      const data = mockPrisma.rolePermission.createMany.mock.calls[0][0].data
      const grantedRoles = data.filter((d: any) => d.granted).map((d: any) => d.role)
      expect(grantedRoles.sort()).toEqual([Role.COMMERCE, Role.FREELANCER].sort())
      expect(data.find((d: any) => d.role === Role.NORMAL).granted).toBe(false)
    })

    it('also creates base profile_permissions rows, all ungranted by default', async () => {
      mockPrisma.permission.findUnique.mockResolvedValue(null)
      mockPrisma.permission.create.mockResolvedValue({ id: 'perm-1', key: 'reports:export' })

      await service.createPermission(
        {
          key: 'reports:export',
          module: 'reports',
          action: 'export',
          label: 'Exportar reportes',
        } as any,
        'admin-1'
      )

      const data = mockPrisma.profilePermission.createMany.mock.calls[0][0].data
      expect(data.every((d: any) => d.granted === false)).toBe(true)
      expect(data).toEqual(expect.arrayContaining([
        expect.objectContaining({ profileType: ProfileType.BUSINESS, subtype: null }),
        expect.objectContaining({ profileType: ProfileType.PROFESSIONAL, subtype: ProfessionalSubtype.FREELANCER }),
        expect.objectContaining({ profileType: ProfileType.PROFESSIONAL, subtype: ProfessionalSubtype.SERVICE_PROVIDER }),
      ]))
    })
  })

  describe('toggleProfilePermission', () => {
    it('creates a new row when none exists yet', async () => {
      mockPrisma.permission.findUniqueOrThrow.mockResolvedValue({ id: 'perm-1', isSystem: false })
      mockPrisma.profilePermission.findFirst.mockResolvedValue(null)

      await service.toggleProfilePermission(ProfileType.BUSINESS, null, 'perm-1', true, 'admin-1')

      expect(mockPrisma.profilePermission.create).toHaveBeenCalledWith({
        data: { profileType: ProfileType.BUSINESS, subtype: null, permissionId: 'perm-1', granted: true, updatedBy: 'admin-1' },
      })
      expect(mockPrisma.profilePermission.update).not.toHaveBeenCalled()
    })

    it('updates the existing row instead of duplicating it', async () => {
      mockPrisma.permission.findUniqueOrThrow.mockResolvedValue({ id: 'perm-1', isSystem: false })
      mockPrisma.profilePermission.findFirst.mockResolvedValue({ id: 'pp-1' })

      await service.toggleProfilePermission(ProfileType.PROFESSIONAL, ProfessionalSubtype.FREELANCER, 'perm-1', false, 'admin-1')

      expect(mockPrisma.profilePermission.update).toHaveBeenCalledWith({
        where: { id: 'pp-1' },
        data: { granted: false, updatedBy: 'admin-1' },
      })
      expect(mockPrisma.profilePermission.create).not.toHaveBeenCalled()
    })

    it('refuses to toggle a system permission', async () => {
      mockPrisma.permission.findUniqueOrThrow.mockResolvedValue({ id: 'perm-1', isSystem: true })

      await expect(
        service.toggleProfilePermission(ProfileType.BUSINESS, null, 'perm-1', true, 'admin-1')
      ).rejects.toThrow('No se puede modificar un permiso de sistema')
    })
  })

  describe('bulkUpdateProfilePermissions', () => {
    it('applies every update and refuses system permissions as a whole batch', async () => {
      mockPrisma.permission.findMany.mockResolvedValue([])
      mockPrisma.profilePermission.findFirst.mockResolvedValue(null)

      await service.bulkUpdateProfilePermissions(
        [
          { profileType: ProfileType.BUSINESS, permissionId: 'perm-1', granted: true },
          { profileType: ProfileType.PROFESSIONAL, subtype: ProfessionalSubtype.SERVICE_PROVIDER, permissionId: 'perm-2', granted: false },
        ],
        'admin-1'
      )

      expect(mockPrisma.profilePermission.create).toHaveBeenCalledTimes(2)
    })

    it('rejects the whole batch if any permission is system-level', async () => {
      mockPrisma.permission.findMany.mockResolvedValue([{ id: 'perm-1', isSystem: true }])

      await expect(
        service.bulkUpdateProfilePermissions(
          [{ profileType: ProfileType.BUSINESS, permissionId: 'perm-1', granted: true }],
          'admin-1'
        )
      ).rejects.toThrow('No se pueden modificar permisos de sistema')
    })
  })

  describe('getActiveProfilePermissions', () => {
    it('returns an empty array when the user has no active profiles', async () => {
      mockPrisma.userProfile.findMany.mockResolvedValue([])

      const keys = await service.getActiveProfilePermissions('user-1')

      expect(keys).toEqual([])
      expect(mockPrisma.profilePermission.findMany).not.toHaveBeenCalled()
    })

    it('deduplicates keys shared by multiple active profiles', async () => {
      mockPrisma.userProfile.findMany.mockResolvedValue([
        { type: ProfileType.BUSINESS, subtype: null },
        { type: ProfileType.PROFESSIONAL, subtype: ProfessionalSubtype.FREELANCER },
      ])
      mockPrisma.profilePermission.findMany.mockResolvedValue([
        { permission: { key: 'shared:key' } },
      ])

      const keys = await service.getActiveProfilePermissions('user-1')

      expect(keys).toEqual(['shared:key'])
    })
  })
})
