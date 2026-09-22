import { Test, TestingModule } from '@nestjs/testing'
import { CategoryScopeService } from '../../common/category-scope/category-scope.service'
import { PrismaService } from '../../prisma/prisma.service'

describe('CategoryScopeService', () => {
  let service: CategoryScopeService
  let mockPrisma: any

  beforeEach(async () => {
    mockPrisma = {
      user: { findUnique: jest.fn() },
    }

    const module: TestingModule = await Test.createTestingModule({
      providers: [CategoryScopeService, { provide: PrismaService, useValue: mockPrisma }],
    }).compile()

    service = module.get<CategoryScopeService>(CategoryScopeService)
  })

  describe('isVisibleForCategory', () => {
    it('is visible for any userCategoryId when the item has no scope configured (empty array)', () => {
      expect(service.isVisibleForCategory([], 'cat-1')).toBe(true)
      expect(service.isVisibleForCategory([], null)).toBe(true)
    })

    it('is visible when the user categoryId is included in the item scope', () => {
      expect(service.isVisibleForCategory(['cat-1', 'cat-2'], 'cat-1')).toBe(true)
    })

    it('is NOT visible when the user categoryId is not included in the item scope', () => {
      expect(service.isVisibleForCategory(['cat-1', 'cat-2'], 'cat-3')).toBe(false)
    })

    it('is NOT visible when the item has a scope but the user has no categoryId', () => {
      expect(service.isVisibleForCategory(['cat-1'], null)).toBe(false)
      expect(service.isVisibleForCategory(['cat-1'], undefined)).toBe(false)
    })
  })

  describe('filterByCategory', () => {
    it('keeps unscoped items and items matching the userCategoryId, drops the rest', () => {
      const items = [
        { id: 'a', userCategoryIds: [] },
        { id: 'b', userCategoryIds: ['cat-1'] },
        { id: 'c', userCategoryIds: ['cat-2'] },
      ]

      const result = service.filterByCategory(items, 'cat-1')

      expect(result.map((i) => i.id)).toEqual(['a', 'b'])
    })

    it('keeps only unscoped items when the user has no categoryId', () => {
      const items = [
        { id: 'a', userCategoryIds: [] },
        { id: 'b', userCategoryIds: ['cat-1'] },
      ]

      const result = service.filterByCategory(items, null)

      expect(result.map((i) => i.id)).toEqual(['a'])
    })
  })

  describe('getUserCategoryId', () => {
    it('returns the user categoryId', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ categoryId: 'cat-1' })

      const result = await service.getUserCategoryId('user-1')

      expect(result).toBe('cat-1')
      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({ where: { id: 'user-1' }, select: { categoryId: true } })
    })

    it('returns null when the user has no categoryId', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ categoryId: null })

      expect(await service.getUserCategoryId('user-1')).toBeNull()
    })

    it('returns null when the user does not exist', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null)

      expect(await service.getUserCategoryId('missing-user')).toBeNull()
    })
  })
})
