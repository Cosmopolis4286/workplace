// Error interno (no HTTP) que distingue "saldo insuficiente" — la única causa
// de holdEscrow() que amerita dejar la solicitud en PENDING_FUNDS para
// reintento automático — de cualquier otra falla (wallet inexistente,
// congelada, suspendida) que debe propagarse como error real y NO reintentarse
// indefinidamente sin que nadie lo note.
//
// Vive fuera de wallets.service.ts para que otros dominios (catalog,
// services) puedan capturarlo sin importar el servicio.
export class InsufficientEscrowFundsError extends Error {}
