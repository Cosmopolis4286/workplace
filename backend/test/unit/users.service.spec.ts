import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from '../../src/users/users.service';
import { PrismaService } from '../../src/prisma/prisma.service';
import { ConflictException, NotFoundException, BadRequestException } from '@nestjs/common';
import { Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';

describe('UsersService', () => {
  let service: UsersService;
  let mockPrismaService: Partial<PrismaService>;

  beforeEach(async () => {
    mockPrismaService = {
      user: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      } as any,
      $transaction: jest.fn().mockImplementation((ops) => Promise.all(ops)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  describe('create', () => {
    it('should create a new user successfully', async () => {
      const mockUser = {
        id: 'user-id',
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
        role: Role.NORMAL,
        commerce: null,
        category: null,
        subcategory: null,
      };

      mockPrismaService.user.findUnique = jest.fn().mockResolvedValue(null);
      mockPrismaService.user.create = jest.fn().mockResolvedValue({
        ...mockUser,
        password: 'hashed-password',
      });

      const result = await service.create({
        email: 'test@example.com',
        password: 'password123',
        firstName: 'John',
        lastName: 'Doe',
      });

      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('email', 'test@example.com');
      expect(result).not.toHaveProperty('password');
      expect(mockPrismaService.user.create).toHaveBeenCalled();
    });

    it('should throw ConflictException when email already exists', async () => {
      mockPrismaService.user.findUnique = jest.fn().mockResolvedValue({
        id: 'existing-id',
        email: 'test@example.com',
      });

      await expect(
        service.create({
          email: 'test@example.com',
          password: 'password123',
          firstName: 'John',
          lastName: 'Doe',
        })
      ).rejects.toThrow(ConflictException);
    });

    it('should create commerce for COMMERCE role', async () => {
      const mockUser = {
        id: 'user-id',
        email: 'commerce@example.com',
        firstName: 'Business',
        lastName: 'Owner',
        role: Role.COMMERCE,
        commerce: { id: 'commerce-id', name: 'My Business' },
        category: null,
        subcategory: null,
      };

      mockPrismaService.user.findUnique = jest.fn().mockResolvedValue(null);
      mockPrismaService.user.create = jest.fn().mockResolvedValue({
        ...mockUser,
        password: 'hashed-password',
      });

      const result = await service.create({
        email: 'commerce@example.com',
        password: 'password123',
        firstName: 'Business',
        lastName: 'Owner',
        role: Role.COMMERCE,
        commerceName: 'My Business',
      });

      expect(result).toHaveProperty('commerce');
      expect(result.commerce).toHaveProperty('name', 'My Business');
    });
  });

  describe('findByEmail', () => {
    it('should find user by email', async () => {
      const mockUser = {
        id: 'user-id',
        email: 'test@example.com',
        role: Role.NORMAL,
      };

      mockPrismaService.user.findUnique = jest.fn().mockResolvedValue(mockUser);

      const result = await service.findByEmail('test@example.com');

      expect(result).toEqual(mockUser);
      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'test@example.com' },
      });
    });

    it('should return null when user not found', async () => {
      mockPrismaService.user.findUnique = jest.fn().mockResolvedValue(null);

      const result = await service.findByEmail('nonexistent@example.com');

      expect(result).toBeNull();
    });
  });

  describe('findById', () => {
    it('should find user by id', async () => {
      const mockUser = {
        id: 'user-id',
        email: 'test@example.com',
        role: Role.NORMAL,
        password: 'hashed-password',
      };

      mockPrismaService.user.findUnique = jest.fn().mockResolvedValue(mockUser);

      const result = await service.findById('user-id');

      expect(result).toEqual(mockUser);
    });

    it('should throw NotFoundException when user not found', async () => {
      mockPrismaService.user.findUnique = jest.fn().mockResolvedValue(null);

      await expect(service.findById('nonexistent-id')).rejects.toThrow(NotFoundException);
    });
  });

  describe('validatePassword', () => {
    it('should return true for valid password', async () => {
      const hashedPassword = await bcrypt.hash('password123', 10);

      const result = await service.validatePassword('password123', hashedPassword);

      expect(result).toBe(true);
    });

    it('should return false for invalid password', async () => {
      const hashedPassword = await bcrypt.hash('password123', 10);

      const result = await service.validatePassword('wrongpassword', hashedPassword);

      expect(result).toBe(false);
    });
  });

  describe('updateProfile', () => {
    it('should update user profile', async () => {
      const mockUser = {
        id: 'user-id',
        email: 'test@example.com',
        firstName: 'Updated',
        lastName: 'Name',
        role: Role.NORMAL,
        commerce: null,
      };

      mockPrismaService.user.findUnique = jest.fn().mockResolvedValue({ id: 'user-id' });
      mockPrismaService.user.update = jest.fn().mockResolvedValue({
        ...mockUser,
        password: 'hashed-password',
      });

      const result = await service.updateProfile('user-id', {
        firstName: 'Updated',
        lastName: 'Name',
      } as any);

      expect(result.firstName).toBe('Updated');
      expect(result.lastName).toBe('Name');
    });
  });

  describe('changePassword', () => {
    it('should change password with valid current password', async () => {
      const hashedPassword = await bcrypt.hash('currentpassword', 10);

      mockPrismaService.user.findUnique = jest.fn().mockResolvedValue({
        id: 'user-id',
        password: hashedPassword,
      });
      mockPrismaService.user.update = jest.fn().mockResolvedValue({ id: 'user-id' });

      await service.changePassword('user-id', {
        currentPassword: 'currentpassword',
        newPassword: 'newpassword123',
      } as any);

      expect(mockPrismaService.user.update).toHaveBeenCalled();
    });

    it('should throw BadRequestException with invalid current password', async () => {
      const hashedPassword = await bcrypt.hash('currentpassword', 10);

      mockPrismaService.user.findUnique = jest.fn().mockResolvedValue({
        id: 'user-id',
        password: hashedPassword,
      });

      await expect(
        service.changePassword('user-id', {
          currentPassword: 'wrongpassword',
          newPassword: 'newpassword123',
        } as any)
      ).rejects.toThrow(BadRequestException);
    });
  });
});
