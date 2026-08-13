// Formato compartido de precios/límites de plan — antes duplicado entre
// usePlans.ts y pricing.vue con comportamiento ligeramente distinto para
// el mismo dominio de datos (precio de USD nominal, límites de plan).
export function useMoneyFormat() {
  /** "$25" / "Gratis" si el precio es 0 — USD nominal, sin decimales */
  function formatPrice(amount: number): string {
    if (amount === 0) return 'Gratis'
    return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(amount)
  }

  /**
   * "Ilimitado" (-1/null/undefined), "No incluido" (0), o el número tal cual.
   * `unlimitedLabel` permite un texto distinto para "sin límite" (ej. "∞" en
   * contextos donde "Ilimitado X" leería mal gramaticalmente).
   */
  function formatLimit(value: number | null | undefined, unlimitedLabel = 'Ilimitado'): string {
    if (value === null || value === undefined || value === -1) return unlimitedLabel
    if (value === 0) return 'No incluido'
    return value.toLocaleString('es-MX')
  }

  return { formatPrice, formatLimit }
}
