import { Injectable, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class CategoryHelper {
  constructor(private prisma: PrismaService) {}

  /**
   * Verifica si un usuario pertenece a la categoría "Comida"
   */
  async isUserInFoodCategory(userId: string): Promise<boolean> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        category: {
          select: { name: true }
        }
      }
    });

    return user?.category?.name === 'Comida';
  }

  /**
   * Verifica si un usuario necesita un comercio asociado (solo usuarios de categoría "Comida")
   */
  async userNeedsCommerce(userId: string): Promise<boolean> {
    return this.isUserInFoodCategory(userId);
  }

  /**
   * Obtiene el commerce ID de un usuario (solo si es de categoría "Comida")
   */
  async getCommerceIdForUser(userId: string): Promise<string | null> {
    const needsCommerce = await this.userNeedsCommerce(userId);
    if (!needsCommerce) {
      return null;
    }

    const commerce = await this.prisma.commerce.findUnique({
      where: { userId },
      select: { id: true }
    });

    return commerce?.id || null;
  }

  /**
   * Valida que un usuario de categoría "Comida" tenga un comercio asociado
   * Lanza excepción si el usuario es de "Comida" pero no tiene comercio
   */
  async validateCommerceForFoodCategory(userId: string): Promise<string> {
    const needsCommerce = await this.userNeedsCommerce(userId);

    if (!needsCommerce) {
      // Usuario no es de categoría "Comida", no necesita comercio
      return null;
    }

    const commerce = await this.prisma.commerce.findUnique({
      where: { userId },
      select: { id: true }
    });

    if (!commerce) {
      throw new ForbiddenException(
        'Los usuarios de la categoría "Comida" deben tener un comercio asociado'
      );
    }

    return commerce.id;
  }
}
