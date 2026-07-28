import { Test, TestingModule } from '@nestjs/testing'
import { PermissionsService } from '../../domains/identity-access/permissions/permissions.service'
import { PrismaService } from '../../prisma/prisma.service'
import { RedisService } from '../../redis/redis.service'
import { UsersService } from '../../domains/identity-access/users/users.service'
import { Role } from '@prisma/client'

describe('PermissionsService', () => {
  let service: PermissionsService

  const mockPrisma = {
    rolePermission: { findMany: jest.fn(), upsert: jest.fn(), deleteMany: jest.fn(), createMany: jest.fn() },
    userPermission: { findMany: jest.fn(), upsert: jest.fn(), deleteMany: jest.fn() },
    permission: { findMany: jest.fn(), findUnique: jest.fn(), findUniqueOrThrow: jest.fn(), create: jest.fn(), delete: jest.fn() },
    user: { findUnique: jest.fn() },
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
  })
})
