import { Test, TestingModule } from '@nestjs/testing'
import { UsersService } from '../../domains/identity-access/users/users.service'
import { PrismaService } from '../../prisma/prisma.service'
import { RedisService } from '../../redis/redis.service'
import { MailService } from '../../domains/engagement/mail/mail.service'
import { CommerceProfileCompletionStrategy } from '../../domains/identity-access/users/strategies/commerce-profile-completion.strategy'
import { FreelancerProfileCompletionStrategy } from '../../domains/identity-access/users/strategies/freelancer-profile-completion.strategy'
import { Role } from '@prisma/client'
import { I18nService } from 'nestjs-i18n'

describe('UsersService', () => {
  let service: UsersService
  let prismaService: PrismaService

  const mockPrismaService: any = {
    user: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    userProfile: {
      create: jest.fn(),
    },
    // Transacción interactiva: el callback recibe el mismo mock como `tx`.
    $transaction: jest.fn((fn: any) => fn(mockPrismaService)),
  }

  const redisStore = new Map<string, string>()
  const mockRedisService = {
    get: jest.fn((key: string) => Promise.resolve(redisStore.get(key) ?? null)),
    setex: jest.fn((key: string, _ttl: number, value: string) => { redisStore.set(key, value); return Promise.resolve() }),
    del: jest.fn((key: string) => { redisStore.delete(key); return Promise.resolve() }),
  }

  const mockMailService = {
    sendSecurityAlert: jest.fn().mockResolvedValue(undefined),
  }

  const I18N_MESSAGES: Record<string, string> = {
    'users.not_found': 'Usuario no encontrado',
    'users.deleted': 'Usuario eliminado correctamente',
  }
  const mockI18nService = {
    t: jest.fn((key: string) => I18N_MESSAGES[key] ?? key),
  }

  beforeEach(async () => {
    redisStore.clear()

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
      ],
    }).compile()

    service = module.get<UsersService>(UsersService)
    prismaService = module.get<PrismaService>(PrismaService)
  })

  it('should be defined', () => {
    expect(service).toBeDefined()
  })

  describe('findAll', () => {
    it('should return paginated users', async () => {
      const users = [
        { id: 1, email: 'user1@example.com', name: 'User 1' },
        { id: 2, email: 'user2@example.com', name: 'User 2' },
      ]

      mockPrismaService.user.findMany.mockResolvedValue(users)
      mockPrismaService.user.count.mockResolvedValue(2)

      const result = await service.findAllUsers({ page: 1, limit: 10 })

      expect(result).toEqual({
        data: users,
        total: 2,
        page: 1,
        limit: 10,
      })
      expect(mockPrismaService.user.findMany).toHaveBeenCalledWith({
        skip: 0,
        take: 10,
        orderBy: { createdAt: 'desc' },
        select: expect.any(Object),
        where: expect.any(Object),
      })
    })

    it('should handle pagination correctly', async () => {
      const users = [{ id: 3, email: 'user3@example.com', name: 'User 3' }]

      mockPrismaService.user.findMany.mockResolvedValue(users)
      mockPrismaService.user.count.mockResolvedValue(25)

      const result = await service.findAllUsers({ page: 2, limit: 10 })

      expect(result).toEqual({
        data: users,
        total: 25,
        page: 2,
        limit: 10,
      })
      expect(mockPrismaService.user.findMany).toHaveBeenCalledWith({
        skip: 10,
        take: 10,
        orderBy: { createdAt: 'desc' },
        select: expect.any(Object),
        where: expect.any(Object),
      })
    })
  })

  describe('findById', () => {
    it('should return user if found', async () => {
      const user = { id: 1, email: 'test@example.com', name: 'Test User' }

      mockPrismaService.user.findUnique.mockResolvedValue(user)

      const result = await service.findById('1')

      expect(result).toEqual(user)
      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: { id: '1' },
        include: { commerce: true, category: true, profileSettings: true },
      })
    })

    it('should throw NotFoundException if user not found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null)

      await expect(service.findById('999')).rejects.toThrow('Usuario no encontrado')
    })
  })

  describe('create', () => {
    beforeEach(() => {
      mockPrismaService.user.findUnique.mockReset().mockResolvedValue(null)
      mockPrismaService.userProfile.create.mockReset()
    })

    it('should create new user', async () => {
      const createUserDto = {
        email: 'newuser@example.com',
        password: 'password123',
        firstName: 'New',
        lastName: 'User',
        role: Role.NORMAL,
      }

      const createdUser = {
        id: 2,
        email: 'newuser@example.com',
        firstName: 'New',
        lastName: 'User',
        role: 'NORMAL',
        isActive: true,
      }

      mockPrismaService.user.create.mockResolvedValue(createdUser)

      const result = await service.create(createUserDto)

      expect(result).toEqual(createdUser)
      expect(mockPrismaService.user.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          email: createUserDto.email,
          firstName: createUserDto.firstName,
          lastName: createUserDto.lastName,
          role: createUserDto.role,
        }),
        include: expect.any(Object),
      })
      expect(mockPrismaService.userProfile.create).not.toHaveBeenCalled()
    })

    it('creates a BUSINESS UserProfile when role is COMMERCE', async () => {
      const createUserDto = {
        email: 'commerce@example.com',
        password: 'password123',
        firstName: 'Comercio',
        lastName: 'Uno',
        role: Role.COMMERCE,
        commerceName: 'Mi Negocio',
        categoryId: 'cat-1',
      }

      mockPrismaService.user.create.mockResolvedValue({ id: 'user-1', role: 'COMMERCE' })

      await service.create(createUserDto)

      expect(mockPrismaService.userProfile.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: 'user-1',
          type: 'BUSINESS',
          subtype: null,
          categoryId: 'cat-1',
          status: 'ACTIVE',
        }),
      })
    })

    it('creates a PROFESSIONAL/FREELANCER UserProfile when role is FREELANCER', async () => {
      const createUserDto = {
        email: 'freelancer@example.com',
        password: 'password123',
        firstName: 'Free',
        lastName: 'Lancer',
        role: Role.FREELANCER,
        categoryId: 'cat-2',
      }

      mockPrismaService.user.create.mockResolvedValue({ id: 'user-2', role: 'FREELANCER' })

      await service.create(createUserDto)

      expect(mockPrismaService.userProfile.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: 'user-2',
          type: 'PROFESSIONAL',
          subtype: 'FREELANCER',
          categoryId: 'cat-2',
          status: 'ACTIVE',
        }),
      })
    })

    it('does NOT create a UserProfile when role is ADMIN (even though it also gets a Commerce)', async () => {
      const createUserDto = {
        email: 'admin@example.com',
        password: 'password123',
        firstName: 'Admin',
        lastName: 'User',
        role: Role.ADMIN,
      }

      mockPrismaService.user.create.mockResolvedValue({ id: 'admin-1', role: 'ADMIN' })

      await service.create(createUserDto)

      expect(mockPrismaService.userProfile.create).not.toHaveBeenCalled()
    })
  })

  describe('update', () => {
    it('should update user', async () => {
      const updateUserDto = {
        firstName: 'Updated',
        lastName: 'Name',
        email: 'updated@example.com',
      }

      const updatedUser = {
        id: 1,
        firstName: 'Updated',
        lastName: 'Name',
        email: 'updated@example.com',
        role: 'NORMAL',
      }

      mockPrismaService.user.update.mockResolvedValue(updatedUser)

      const result = await service.updateUser('1', updateUserDto)

      expect(result).toEqual(updatedUser)
      expect(mockPrismaService.user.update).toHaveBeenCalledWith({
        where: { id: '1' },
        data: updateUserDto,
        include: expect.any(Object),
      })
    })
  })

  describe('delete', () => {
    it('should delete user', async () => {
      const deletedUser = {
        id: 1,
        email: 'deleted@example.com',
        name: 'Deleted User',
      }

      mockPrismaService.user.delete.mockResolvedValue(deletedUser)

      const result = await service.deleteUser('1')

      expect(result).toEqual({ message: 'Usuario eliminado correctamente' })
      expect(mockPrismaService.user.delete).toHaveBeenCalledWith({
        where: { id: '1' },
      })
    })
  })
})
