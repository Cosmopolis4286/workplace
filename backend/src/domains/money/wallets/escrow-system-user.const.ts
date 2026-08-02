// Email fijo del usuario de sistema que intermedia los fondos en garantía
// (escrow) de ServiceRequest. Se autocrea de forma perezosa (lazy) la primera
// vez que se necesita — ver WalletsService.ensureEscrowSystemUserId — así no
// depende de que el seed haya corrido antes en un ambiente nuevo.
export const ESCROW_SYSTEM_USER_EMAIL = 'escrow-system@workplace.internal';
