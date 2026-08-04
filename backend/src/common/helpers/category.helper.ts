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
   * Verifica si un usuario necesita restaurante (solo usuarios de categoría "Comida")
   */
  async userNeedsRestaurant(userId: string): Promise<boolean> {
    return this.isUserInFoodCategory(userId);
  }

  /**
   * Obtiene el commerce ID de un usuario (solo si es de categoría "Comida")
   */
  async getRestaurantIdForUser(userId: string): Promise<string | null> {
    const needsRestaurant = await this.userNeedsRestaurant(userId);
    if (!needsRestaurant) {
      return null;
    }

    const commerce = await this.prisma.commerce.findUnique({
      where: { userId },
      select: { id: true }
    });

    return commerce?.id || null;
  }

  /**
   * Valida que un usuario de categoría "Comida" tenga restaurante asociado
   * Lanza excepción si el usuario es de "Comida" pero no tiene restaurante
   */
  async validateRestaurantForFoodCategory(userId: string): Promise<string> {
    const needsRestaurant = await this.userNeedsRestaurant(userId);
    
    if (!needsRestaurant) {
      // Usuario no es de categoría "Comida", no necesita restaurante
      return null;
    }

    const commerce = await this.prisma.commerce.findUnique({
      where: { userId },
      select: { id: true }
    });

    if (!commerce) {
      throw new ForbiddenException(
        'Los usuarios de la categoría "Comida" deben tener un restaurante asociado'
      );
    }

    return commerce.id;
  }
}
