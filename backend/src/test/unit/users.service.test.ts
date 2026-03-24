import { Test, TestingModule } from '@nestjs/testing'
import { UsersService } from '../users/users.service'
import { PrismaService } from '../prisma/prisma.service'

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

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
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

      const result = await service.findAll({ page: 1, limit: 10 })

      expect(result).toEqual({
        data: users,
        total: 2,
        page: 1,
        limit: 10,
        totalPages: 1,
      })
      expect(mockPrismaService.user.findMany).toHaveBeenCalledWith({
        skip: 0,
        take: 10,
        orderBy: { createdAt: 'desc' },
      })
    })

    it('should handle pagination correctly', async () => {
      const users = [{ id: 3, email: 'user3@example.com', name: 'User 3' }]

      mockPrismaService.user.findMany.mockResolvedValue(users)
      mockPrismaService.user.count.mockResolvedValue(25)

      const result = await service.findAll({ page: 2, limit: 10 })

      expect(result).toEqual({
        data: users,
        total: 25,
        page: 2,
        limit: 10,
        totalPages: 3,
      })
      expect(mockPrismaService.user.findMany).toHaveBeenCalledWith({
        skip: 10,
        take: 10,
        orderBy: { createdAt: 'desc' },
      })
    })
  })

  describe('findById', () => {
    it('should return user if found', async () => {
      const user = { id: 1, email: 'test@example.com', name: 'Test User' }

      mockPrismaService.user.findUnique.mockResolvedValue(user)

      const result = await service.findById(1)

      expect(result).toEqual(user)
      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: { id: 1 },
      })
    })

    it('should return null if user not found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null)

      const result = await service.findById(999)

      expect(result).toBeNull()
    })
  })

  describe('create', () => {
    it('should create new user', async () => {
      const createUserDto = {
        email: 'newuser@example.com',
        name: 'New User',
        password: 'password123',
        role: 'USER',
      }

      const createdUser = {
        id: 2,
        email: 'newuser@example.com',
        name: 'New User',
        role: 'USER',
        isActive: true,
      }

      mockPrismaService.user.create.mockResolvedValue(createdUser)

      const result = await service.create(createUserDto)

      expect(result).toEqual(createdUser)
      expect(mockPrismaService.user.create).toHaveBeenCalledWith({
        data: createUserDto,
      })
    })
  })

  describe('update', () => {
    it('should update user', async () => {
      const updateUserDto = {
        name: 'Updated Name',
        email: 'updated@example.com',
      }

      const updatedUser = {
        id: 1,
        name: 'Updated Name',
        email: 'updated@example.com',
        role: 'USER',
      }

      mockPrismaService.user.update.mockResolvedValue(updatedUser)

      const result = await service.update(1, updateUserDto)

      expect(result).toEqual(updatedUser)
      expect(mockPrismaService.user.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: updateUserDto,
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

      const result = await service.delete(1)

      expect(result).toEqual(deletedUser)
      expect(mockPrismaService.user.delete).toHaveBeenCalledWith({
        where: { id: 1 },
      })
    })
  })
})
