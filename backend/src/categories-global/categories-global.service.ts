import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { CreateCategoryDto, UpdateCategoryDto } from './dto/category.dto'
import { CreateSubcategoryDto, UpdateSubcategoryDto } from './dto/subcategory.dto'
import { Category, Subcategory } from '@prisma/client'

@Injectable()
export class CategoriesGlobalService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(params: { page: number; limit: number }) {
    const { page, limit } = params
    const skip = (page - 1) * limit

    const [categories, total] = await Promise.all([
      this.prisma.category.findMany({
        where: { isGlobal: true },
        skip,
        take: limit,
        orderBy: { sortOrder: 'asc' },
        include: { subcategories: true }
      }),
      this.prisma.category.count({ where: { isGlobal: true } })
    ])

    return {
      data: categories,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    }
  }

  async createCategory(createCategoryDto: CreateCategoryDto) {
    const existingCategory = await this.prisma.category.findFirst({
      where: { 
        name: createCategoryDto.name,
        isGlobal: true 
      }
    })

    if (existingCategory) {
      throw new ConflictException(`Ya existe una categoría global con el nombre "${createCategoryDto.name}"`)
    }

    return this.prisma.category.create({
      data: {
        ...createCategoryDto,
        isGlobal: true,
        commerceId: null
      },
      include: { subcategories: true }
    })
  }

  async updateCategory(id: string, updateCategoryDto: UpdateCategoryDto) {
    const existingCategory = await this.prisma.category.findFirst({
      where: { id, isGlobal: true }
    })

    if (!existingCategory) {
      throw new NotFoundException(`Categoría global con ID ${id} no encontrada`)
    }

    if (updateCategoryDto.name && updateCategoryDto.name !== existingCategory.name) {
      const duplicateCategory = await this.prisma.category.findFirst({
        where: { 
          name: updateCategoryDto.name,
          isGlobal: true 
        }
      })

      if (duplicateCategory) {
        throw new ConflictException(`Ya existe una categoría global con el nombre "${updateCategoryDto.name}"`)
      }
    }

    return this.prisma.category.update({
      where: { id },
      data: updateCategoryDto,
      include: { subcategories: true }
    })
  }

  async deleteCategory(id: string) {
    const category = await this.prisma.category.findFirst({
      where: { id, isGlobal: true }
    })

    if (!category) {
      throw new NotFoundException(`Categoría global con ID ${id} no encontrada`)
    }

    await this.prisma.subcategory.deleteMany({
      where: { categoryId: id }
    })

    return this.prisma.category.delete({
      where: { id }
    })
  }

  async findSubcategories(categoryId: string) {
    const category = await this.prisma.category.findFirst({
      where: { id: categoryId, isGlobal: true }
    })

    if (!category) {
      throw new NotFoundException(`Categoría global con ID ${categoryId} no encontrada`)
    }

    return this.prisma.subcategory.findMany({
      where: { categoryId },
      orderBy: { sortOrder: 'asc' }
    })
  }

  async createSubcategory(categoryId: string, createSubcategoryDto: CreateSubcategoryDto) {
    const category = await this.prisma.category.findFirst({
      where: { id: categoryId, isGlobal: true }
    })

    if (!category) {
      throw new NotFoundException(`Categoría global con ID ${categoryId} no encontrada`)
    }

    const existingSubcategory = await this.prisma.subcategory.findFirst({
      where: { 
        name: createSubcategoryDto.name,
        categoryId 
      }
    })

    if (existingSubcategory) {
      throw new ConflictException(`Ya existe una subcategoría con el nombre "${createSubcategoryDto.name}"`)
    }

    return this.prisma.subcategory.create({
      data: {
        ...createSubcategoryDto,
        categoryId
      }
    })
  }

  async updateSubcategory(id: string, updateSubcategoryDto: UpdateSubcategoryDto) {
    const existingSubcategory = await this.prisma.subcategory.findUnique({
      where: { id },
      include: { category: true }
    })

    if (!existingSubcategory) {
      throw new NotFoundException(`Subcategoría con ID ${id} no encontrada`)
    }

    if (!existingSubcategory.category?.isGlobal) {
      throw new NotFoundException(`Esta subcategoría no pertenece a una categoría global`)
    }

    if (updateSubcategoryDto.name && updateSubcategoryDto.name !== existingSubcategory.name) {
      const duplicateSubcategory = await this.prisma.subcategory.findFirst({
        where: { 
          name: updateSubcategoryDto.name,
          categoryId: existingSubcategory.categoryId 
        }
      })

      if (duplicateSubcategory) {
        throw new ConflictException(`Ya existe una subcategoría con el nombre "${updateSubcategoryDto.name}"`)
      }
    }

    return this.prisma.subcategory.update({
      where: { id },
      data: updateSubcategoryDto
    })
  }

  async deleteSubcategory(id: string) {
    const subcategory = await this.prisma.subcategory.findUnique({
      where: { id },
      include: { category: true }
    })

    if (!subcategory) {
      throw new NotFoundException(`Subcategoría con ID ${id} no encontrada`)
    }

    if (!subcategory.category?.isGlobal) {
      throw new NotFoundException(`Esta subcategoría no pertenece a una categoría global`)
    }

    return this.prisma.subcategory.delete({
      where: { id }
    })
  }

  async exportCategoriesToCsv(): Promise<string> {
    const result = await this.findAll({ page: 1, limit: 1000 })
    const categories = result.data
    
    const csvHeaders = [
      'ID',
      'Nombre',
      'Descripción',
      'Icono',
      'Color',
      'Orden',
      'Subcategorías',
      'Fecha Creación',
    ]

    const csvRows = categories.map((category) => [
      category.id,
      category.name,
      category.description || '',
      category.icon || '',
      category.color,
      category.sortOrder,
      category.subcategories.length,
      category.createdAt.toISOString(),
    ])

    const csvContent = [csvHeaders, ...csvRows]
      .map((row) => row.map((cell) => `"${cell}"`).join(','))
      .join('\n')

    return csvContent
  }

  async importCategoriesFromCsv(categoriesData: any[]): Promise<{ created: number; updated: number }> {
    let created = 0
    let updated = 0

    for (const categoryData of categoriesData) {
      try {
        const existingCategory = await this.prisma.category.findFirst({
          where: {
            name: categoryData.name,
            isGlobal: true,
          },
        })

        if (existingCategory) {
          // Actualizar categoría existente
          await this.prisma.category.update({
            where: { id: existingCategory.id },
            data: {
              description: categoryData.description,
              icon: categoryData.icon,
              color: categoryData.color,
              sortOrder: categoryData.sortOrder || 0,
            },
          })
          updated++
        } else {
          // Crear nueva categoría
          await this.prisma.category.create({
            data: {
              name: categoryData.name,
              description: categoryData.description,
              icon: categoryData.icon,
              color: categoryData.color,
              sortOrder: categoryData.sortOrder || 0,
              isGlobal: true,
              commerceId: null,
            },
          })
          created++
        }
      } catch (error) {
        // Continuar con la siguiente categoría si hay un error
        console.error(`Error importando categoría ${categoryData.name}:`, error.message)
      }
    }

    return { created, updated }
  }
}
