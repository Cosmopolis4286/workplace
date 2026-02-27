/**
 * useFormValidation — composable reutilizable para validación de formularios auth.
 * Provee reglas comunes y un runner que acumula errores por campo.
 */

export type ValidationRule<T = string> = (value: T) => string | true

export function useFormValidation() {
  // ─── Reglas atómicas ────────────────────────────────────────────────────────

  const required = (label = 'Este campo'): ValidationRule =>
    (v) => (v && v.trim().length > 0 ? true : `${label} es requerido`)

  const email = (): ValidationRule =>
    (v) => (/^\S+@\S+\.\S+$/.test(v) ? true : 'Correo electrónico inválido')

  const minLength = (min: number): ValidationRule =>
    (v) => (v.length >= min ? true : `Mínimo ${min} caracteres`)

  const maxLength = (max: number): ValidationRule =>
    (v) => (v.length <= max ? true : `Máximo ${max} caracteres`)

  const passwordStrength = (): ValidationRule =>
    (v) =>
      /(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(v)
        ? true
        : 'Debe incluir mayúsculas, minúsculas y números'

  const matches = (other: () => string, label = 'Los campos'): ValidationRule =>
    (v) => (v === other() ? true : `${label} no coinciden`)

  const phone = (): ValidationRule =>
    (v) =>
      /^\+?[\d\s\-().]{7,20}$/.test(v)
        ? true
        : 'Número de teléfono inválido'

  // ─── Runner ─────────────────────────────────────────────────────────────────

  /**
   * Valida un valor contra una lista de reglas.
   * Retorna el primer mensaje de error, o '' si es válido.
   */
  function validate(value: string, rules: ValidationRule[]): string {
    for (const rule of rules) {
      const result = rule(value)
      if (result !== true) return result
    }
    return ''
  }

  /**
   * Valida un objeto completo de campos.
   * `schema` mapea fieldName → array de reglas.
   * Retorna { errors, isValid }.
   */
  function validateAll<T extends Record<string, string>>(
    values: T,
    schema: Partial<Record<keyof T, ValidationRule[]>>
  ): { errors: Record<keyof T, string>; isValid: boolean } {
    const errors = {} as Record<keyof T, string>
    let isValid = true

    for (const key in schema) {
      const rules = schema[key] ?? []
      const error = validate(values[key] ?? '', rules)
      errors[key] = error
      if (error) isValid = false
    }

    return { errors, isValid }
  }

  // ─── Password strength score (0–4) ─────────────────────────────────────────

  function passwordScore(value: string): number {
    let score = 0
    if (value.length >= 8) score++
    if (/[a-z]/.test(value)) score++
    if (/[A-Z]/.test(value)) score++
    if (/\d/.test(value)) score++
    if (/[^a-zA-Z0-9]/.test(value)) score++
    return Math.min(score, 4)
  }

  const strengthLabel = (score: number) =>
    ['', 'Débil', 'Regular', 'Buena', 'Fuerte'][score] ?? ''

  const strengthColor = (score: number) =>
    ['', 'bg-red-500', 'bg-orange-400', 'bg-yellow-400', 'bg-green-500'][score] ?? ''

  return {
    // rules
    required,
    email,
    minLength,
    maxLength,
    passwordStrength,
    matches,
    phone,
    // runners
    validate,
    validateAll,
    // password strength helpers
    passwordScore,
    strengthLabel,
    strengthColor
  }
}
