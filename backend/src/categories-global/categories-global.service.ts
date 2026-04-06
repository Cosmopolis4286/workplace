import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { CreateCategoryDto, UpdateCategoryDto } from '../menu/dto/category.dto'
import { CreateSubcategoryDto, UpdateSubcategoryDto } from '../menu/dto/subcategory.dto'
import { Category, Subcategory } from '@prisma/client'

@Injectable()
export class CategoriesGlobalService {
  constructor(private readonly prisma: PrismaService) {}

  // ==================== CATEGORÍAS GLOBALES ====================

  async findAllCategories(): Promise<Category[]> {
    return this.prisma.category.findMany({
      where: {
        isGlobal: true,
      },
      include: {
        subcategories: {
          where: {
            isActive: true,
          },
          orderBy: {
            sortOrder: 'asc',
          },
        },
      },
      orderBy: {
        sortOrder: 'asc',
      },
    })
  }

  async findCategoryById(id: string): Promise<Category> {
    const category = await this.prisma.category.findFirst({
      where: {
        id,
        isGlobal: true,
      },
      include: {
        subcategories: {
          where: {
            isActive: true,
          },
          orderBy: {
            sortOrder: 'asc',
          },
        },
      },
    })

    if (!category) {
      throw new NotFoundException('Categoría global no encontrada')
    }

    return category
  }

  async createCategory(createCategoryDto: CreateCategoryDto): Promise<Category> {
    const { name, ...data } = createCategoryDto

    // Verificar si ya existe una categoría global con el mismo nombre
    const existingCategory = await this.prisma.category.findFirst({
      where: {
        name,
        isGlobal: true,
      },
    })

    if (existingCategory) {
      throw new ConflictException('Ya existe una categoría global con este nombre')
    }

    return this.prisma.category.create({
      data: {
        ...data,
        name,
        isGlobal: true,
        commerceId: null, // Las categorías globales no tienen comercio
      },
      include: {
        subcategories: true,
      },
    })
  }

  async updateCategory(id: string, updateCategoryDto: UpdateCategoryDto): Promise<Category> {
    const { name, ...data } = updateCategoryDto

    // Verificar si la categoría existe y es global
    const existingCategory = await this.prisma.category.findFirst({
      where: {
        id,
        isGlobal: true,
      },
    })

    if (!existingCategory) {
      throw new NotFoundException('Categoría global no encontrada')
    }

    // Si se está actualizando el nombre, verificar que no exista otra categoría global con ese nombre
    if (name && name !== existingCategory.name) {
      const duplicateCategory = await this.prisma.category.findFirst({
        where: {
          name,
          isGlobal: true,
          id: { not: id },
        },
      })

      if (duplicateCategory) {
        throw new ConflictException('Ya existe una categoría global con este nombre')
      }
    }

    return this.prisma.category.update({
      where: { id },
      data: {
        ...data,
        ...(name && { name }),
      },
      include: {
        subcategories: true,
      },
    })
  }

  async deleteCategory(id: string): Promise<Category> {
    // Verificar si la categoría existe y es global
    const existingCategory = await this.prisma.category.findFirst({
      where: {
        id,
        isGlobal: true,
      },
      include: {
        products: true,
        subcategories: true,
      },
    })

    if (!existingCategory) {
      throw new NotFoundException('Categoría global no encontrada')
    }

    // Verificar si hay productos asociados
    if (existingCategory.products.length > 0) {
      throw new BadRequestException(
        'No se puede eliminar la categoría porque tiene productos asociados. Elimine o reasigne los productos primero.',
      )
    }

    // Eliminar subcategorías primero
    await this.prisma.subcategory.deleteMany({
      where: {
        categoryId: id,
      },
    })

    // Eliminar categoría
    return this.prisma.category.delete({
      where: { id },
    })
  }

  // ==================== SUBCATEGORÍAS GLOBALES ====================

  async findSubcategoriesByCategory(categoryId: string): Promise<Subcategory[]> {
    // Verificar que la categoría exista y sea global
    const category = await this.prisma.category.findFirst({
      where: {
        id: categoryId,
        isGlobal: true,
      },
    })

    if (!category) {
      throw new NotFoundException('Categoría global no encontrada')
    }

    return this.prisma.subcategory.findMany({
      where: {
        categoryId,
        isActive: true,
      },
      orderBy: {
        sortOrder: 'asc',
      },
    })
  }

  async findSubcategoryById(id: string): Promise<Subcategory> {
    const subcategory = await this.prisma.subcategory.findFirst({
      where: {
        id,
        category: {
          isGlobal: true,
        },
      },
      include: {
        category: true,
      },
    })

    if (!subcategory) {
      throw new NotFoundException('Subcategoría global no encontrada')
    }

    return subcategory
  }

  async createSubcategory(categoryId: string, createSubcategoryDto: CreateSubcategoryDto): Promise<Subcategory> {
    const { name, ...data } = createSubcategoryDto

    // Verificar que la categoría exista y sea global
    const category = await this.prisma.category.findFirst({
      where: {
        id: categoryId,
        isGlobal: true,
      },
    })

    if (!category) {
      throw new NotFoundException('Categoría global no encontrada')
    }

    // Verificar si ya existe una subcategoría con el mismo nombre en esta categoría
    const existingSubcategory = await this.prisma.subcategory.findFirst({
      where: {
        name,
        categoryId,
      },
    })

    if (existingSubcategory) {
      throw new ConflictException('Ya existe una subcategoría con este nombre en esta categoría')
    }

    return this.prisma.subcategory.create({
      data: {
        ...data,
        name,
        categoryId,
      },
      include: {
        category: true,
      },
    })
  }

  async updateSubcategory(id: string, updateSubcategoryDto: UpdateSubcategoryDto): Promise<Subcategory> {
    const { name, ...data } = updateSubcategoryDto

    // Verificar si la subcategoría existe y pertenece a una categoría global
    const existingSubcategory = await this.prisma.subcategory.findFirst({
      where: {
        id,
        category: {
          isGlobal: true,
        },
      },
    })

    if (!existingSubcategory) {
      throw new NotFoundException('Subcategoría global no encontrada')
    }

    // Si se está actualizando el nombre, verificar que no exista otra subcategoría con ese nombre en la misma categoría
    if (name && name !== existingSubcategory.name) {
      const duplicateSubcategory = await this.prisma.subcategory.findFirst({
        where: {
          name,
          categoryId: existingSubcategory.categoryId,
          id: { not: id },
        },
      })

      if (duplicateSubcategory) {
        throw new ConflictException('Ya existe una subcategoría con este nombre en esta categoría')
      }
    }

    return this.prisma.subcategory.update({
      where: { id },
      data: {
        ...data,
        ...(name && { name }),
      },
      include: {
        category: true,
      },
    })
  }

  async deleteSubcategory(id: string): Promise<Subcategory> {
    // Verificar si la subcategoría existe y pertenece a una categoría global
    const existingSubcategory = await this.prisma.subcategory.findFirst({
      where: {
        id,
        category: {
          isGlobal: true,
        },
      },
      include: {
        products: true,
      },
    })

    if (!existingSubcategory) {
      throw new NotFoundException('Subcategoría global no encontrada')
    }

    // Verificar si hay productos asociados
    if (existingSubcategory.products.length > 0) {
      throw new BadRequestException(
        'No se puede eliminar la subcategoría porque tiene productos asociados. Elimine o reasigne los productos primero.',
      )
    }

    return this.prisma.subcategory.delete({
      where: { id },
    })
  }

  // ==================== UTILIDADES ====================

  async exportCategoriesToCsv(): Promise<string> {
    const categories = await this.findAllCategories()
    
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
