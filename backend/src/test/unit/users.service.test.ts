import { Test, TestingModule } from '@nestjs/testing'
import { UsersService } from '../../users/users.service'
import { PrismaService } from '../../prisma/prisma.service'
import { MailService } from '../../mail/mail.service'
import { Role } from '@prisma/client'
import { I18nService } from 'nestjs-i18n'

describe('UsersService', () => {
  let service: UsersService
  let prismaService: PrismaService

  const mockPrismaService = {
    user: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
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
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
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
        include: { commerce: true },
      })
    })

    it('should throw NotFoundException if user not found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null)

      await expect(service.findById('999')).rejects.toThrow('Usuario no encontrado')
    })
  })

  describe('create', () => {
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
