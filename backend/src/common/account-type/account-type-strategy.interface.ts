/**
 * Contrato base para resolver comportamiento distinto por tipo de cuenta
 * de negocio (COMMERCE/FREELANCER) sin `if (accountType === ...)` esparcido
 * por los servicios. Cada módulo de negocio define su propio TResult y sus
 * propias implementaciones — no hay un registro global por DI, así que un
 * módulo (ej. analytics) no queda acoplado a otro (ej. settings) a través
 * de un factory compartido.
 */
export interface AccountTypeStrategy<TArgs extends unknown[], TResult> {
  execute(...args: TArgs): Promise<TResult>;
}

export type BusinessAccountType = 'COMMERCE' | 'FREELANCER';
