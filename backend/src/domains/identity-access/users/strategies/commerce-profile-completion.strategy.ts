import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';
import { ProfileCompletionAccountCheck, ProfileCompletionContext } from './profile-completion.strategy.interface';

@Injectable()
export class CommerceProfileCompletionStrategy implements ProfileCompletionAccountCheck {
  constructor(private readonly prisma: PrismaService) {}

  async check(user: { id: string; commerce: unknown }, context: ProfileCompletionContext) {
    if (context.category?.name === 'Comida') {
      // Para categoría Comida, necesita restaurante
      const restaurant = await this.prisma.restaurant.findUnique({ where: { userId: user.id } });
      return { isSetupComplete: !!restaurant };
    }
    // Para otras categorías, necesita comercio configurado
    return { isSetupComplete: !!user.commerce };
  }
}
