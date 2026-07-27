export interface ProfileCompletionCheckResult {
  /** True si el requisito específico de este tipo de cuenta está satisfecho. */
  isSetupComplete: boolean;
}

export interface ProfileCompletionContext {
  hasBasicInfo: boolean;
  hasCategory: boolean;
  category: { name: string } | null;
}

/**
 * Cada tipo de cuenta de negocio (COMMERCE/FREELANCER) exige un requisito
 * adicional distinto para considerar el perfil completo. NORMAL no
 * implementa esto — no tiene un requisito de negocio adicional, ver
 * UsersService.getProfileCompletion.
 */
export interface ProfileCompletionAccountCheck {
  check(
    user: { id: string; commerce: unknown },
    context: ProfileCompletionContext
  ): Promise<ProfileCompletionCheckResult>;
}
