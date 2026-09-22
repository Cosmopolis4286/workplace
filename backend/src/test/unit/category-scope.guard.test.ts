import { Test, TestingModule } from '@nestjs/testing'
import { Reflector } from '@nestjs/core'
import { ExecutionContext, ForbiddenException, BadRequestException } from '@nestjs/common'
import { CategoryScopeGuard } from '../../common/guards/category-scope.guard'
import { CategoryScopeService } from '../../common/category-scope/category-scope.service'
import { PrismaService } from '../../prisma/prisma.service'
import { CategoryScopeOptions } from '../../common/decorators/require-category-scope.decorator'

describe('CategoryScopeGuard', () => {
  let guard: CategoryScopeGuard
  let reflector: { getAllAndOverride: jest.Mock }
  let mockCategoryScope: { isVisibleForCategory: jest.Mock; getUserCategoryId: jest.Mock; filterByCategory: jest.Mock }
  let mockPrisma: any

  function buildContext(body: Record<string, unknown>, user: unknown): ExecutionContext {
    return {
      switchToHttp: () => ({
        getRequest: () => ({ body, user }),
      }),
      getHandler: () => ({}),
      getClass: () => ({}),
    } as unknown as ExecutionContext
  }

  beforeEach(async () => {
    reflector = { getAllAndOverride: jest.fn() }
    mockCategoryScope = {
      isVisibleForCategory: jest.fn(),
      getUserCategoryId: jest.fn(),
      filterByCategory: jest.fn(),
    }
    mockPrisma = {
      serviceCategory: { findUnique: jest.fn() },
      jobCategory: { findUnique: jest.fn() },
    }

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CategoryScopeGuard,
        { provide: Reflector, useValue: reflector },
        { provide: CategoryScopeService, useValue: mockCategoryScope },
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile()

    guard = module.get<CategoryScopeGuard>(CategoryScopeGuard)
  })

  const OPTIONS: CategoryScopeOptions = { model: 'serviceCategory', bodyField: 'categoryId' }

  it('allows the request when no @RequireCategoryScope metadata is present', async () => {
    reflector.getAllAndOverride.mockReturnValue(undefined)

    const result = await guard.canActivate(buildContext({}, { id: 'u1', role: 'PROFESIONAL' }))

    expect(result).toBe(true)
  })

  it('allows the request when the body has no value for the configured field (categoría opcional)', async () => {
    reflector.getAllAndOverride.mockReturnValue(OPTIONS)

    const result = await guard.canActivate(buildContext({}, { id: 'u1', role: 'PROFESIONAL' }))

    expect(result).toBe(true)
    expect(mockPrisma.serviceCategory.findUnique).not.toHaveBeenCalled()
  })

  it('rejects with false when there is no authenticated user', async () => {
    reflector.getAllAndOverride.mockReturnValue(OPTIONS)

    const result = await guard.canActivate(buildContext({ categoryId: 'cat-1' }, undefined))

    expect(result).toBe(false)
  })

  it('allows SUPERADMIN/ADMIN without checking the category scope', async () => {
    reflector.getAllAndOverride.mockReturnValue(OPTIONS)

    const result = await guard.canActivate(buildContext({ categoryId: 'cat-1' }, { id: 'admin-1', role: 'ADMIN' }))

    expect(result).toBe(true)
    expect(mockPrisma.serviceCategory.findUnique).not.toHaveBeenCalled()
  })

  it('throws BadRequestException when the referenced category does not exist', async () => {
    reflector.getAllAndOverride.mockReturnValue(OPTIONS)
    mockPrisma.serviceCategory.findUnique.mockResolvedValue(null)

    await expect(
      guard.canActivate(buildContext({ categoryId: 'missing-cat' }, { id: 'u1', role: 'PROFESIONAL' })),
    ).rejects.toBeInstanceOf(BadRequestException)
  })

  it('allows the request when the category is visible for the user rubro', async () => {
    reflector.getAllAndOverride.mockReturnValue(OPTIONS)
    mockPrisma.serviceCategory.findUnique.mockResolvedValue({ userCategoryIds: ['rubro-1'] })
    mockCategoryScope.getUserCategoryId.mockResolvedValue('rubro-1')
    mockCategoryScope.isVisibleForCategory.mockReturnValue(true)

    const result = await guard.canActivate(buildContext({ categoryId: 'cat-1' }, { id: 'u1', role: 'PROFESIONAL' }))

    expect(result).toBe(true)
    expect(mockCategoryScope.isVisibleForCategory).toHaveBeenCalledWith(['rubro-1'], 'rubro-1')
  })

  it('throws ForbiddenException when the category does not apply to the user rubro', async () => {
    reflector.getAllAndOverride.mockReturnValue(OPTIONS)
    mockPrisma.serviceCategory.findUnique.mockResolvedValue({ userCategoryIds: ['rubro-1'] })
    mockCategoryScope.getUserCategoryId.mockResolvedValue('rubro-2')
    mockCategoryScope.isVisibleForCategory.mockReturnValue(false)

    await expect(
      guard.canActivate(buildContext({ categoryId: 'cat-1' }, { id: 'u1', role: 'PROFESIONAL' })),
    ).rejects.toBeInstanceOf(ForbiddenException)
  })

  it('queries the model named in the decorator options (jobCategory vs serviceCategory)', async () => {
    reflector.getAllAndOverride.mockReturnValue({ model: 'jobCategory', bodyField: 'categoryId' } as CategoryScopeOptions)
    mockPrisma.jobCategory.findUnique.mockResolvedValue({ userCategoryIds: [] })
    mockCategoryScope.getUserCategoryId.mockResolvedValue('rubro-1')
    mockCategoryScope.isVisibleForCategory.mockReturnValue(true)

    await guard.canActivate(buildContext({ categoryId: 'cat-1' }, { id: 'u1', role: 'PROFESIONAL' }))

    expect(mockPrisma.jobCategory.findUnique).toHaveBeenCalledWith({ where: { id: 'cat-1' }, select: { userCategoryIds: true } })
    expect(mockPrisma.serviceCategory.findUnique).not.toHaveBeenCalled()
  })
})
