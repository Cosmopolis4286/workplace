import { Injectable } from '@nestjs/common';
import { ProfileCompletionAccountCheck, ProfileCompletionContext } from './profile-completion.strategy.interface';

@Injectable()
export class FreelancerProfileCompletionStrategy implements ProfileCompletionAccountCheck {
  async check(_user: { id: string; commerce: unknown }, context: ProfileCompletionContext) {
    // Freelancer necesita tener perfil completo y servicios (simulado por ahora)
    return { isSetupComplete: context.hasBasicInfo && context.hasCategory };
  }
}
