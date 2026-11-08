/**
 * Pago Protegido (garantía retenida por la plataforma) está APAGADO salvo que
 * PROTECTED_PAYMENTS_ENABLED=true. Retener dinero de terceros en cuentas
 * propias puede ser custodia/intermediación de fondos del público, actividad
 * reservada en Venezuela a instituciones autorizadas (bancos, ITFB de
 * SUDEBAN). Hasta tener un aliado autorizado que custodie la garantía, la
 * plataforma no recibe dinero de terceros: solo pago directo al vendedor y
 * el cobro de su propia comisión.
 *
 * Apagado: no se crean garantías nuevas (servicios ni catálogo) ni se aceptan
 * pagos de garantía. Las que ya existen se terminan de liquidar normalmente
 * (liberación, reembolso, disputas, retiros del saldo que quede).
 */
export function protectedPaymentsEnabled(): boolean {
  return process.env.PROTECTED_PAYMENTS_ENABLED === 'true';
}
