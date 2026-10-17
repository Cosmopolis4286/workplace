import { Injectable } from '@nestjs/common';
import {
  ProfileCompletionAccountCheck,
  ProfileCompletionContext,
} from './profile-completion.strategy.interface';

@Injectable()
export class CommerceProfileCompletionStrategy implements ProfileCompletionAccountCheck {
  // El caller (UsersService.getProfileCompletion) solo invoca este check
  // cuando isBusiness=!!user.commerce ya es true, así que el requisito real
  // es simplemente tener un Commerce — sin importar la categoría de negocio.
  async check(
    user: { id: string; commerce: unknown },
    _context: ProfileCompletionContext
  ) {
    return { isSetupComplete: !!user.commerce };
  }
}
