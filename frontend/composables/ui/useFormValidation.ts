/**
 * useFormValidation — composable reutilizable para validación de formularios.
 * Provee reglas comunes y un runner que acumula errores por campo.
 */

export type ValidationRule<T = string> = (value: T) => string | true

export function useFormValidation() {
  const { t } = useI18n()

  // ─── Reglas atómicas ────────────────────────────────────────────────────────

  const required = (label?: string): ValidationRule =>
    (v) => (v && v.trim().length > 0
      ? true
      : label ? t('validation.required', { field: label }) : t('validation.requiredDefault'))

  const email = (): ValidationRule =>
    (v) => (/^\S+@\S+\.\S+$/.test(v) ? true : t('validation.invalidEmail'))

  const minLength = (min: number): ValidationRule =>
    (v) => (v.length >= min ? true : t('validation.minLength', { min }))

  const maxLength = (max: number): ValidationRule =>
    (v) => (v.length <= max ? true : t('validation.maxLength', { max }))

  // La regla dura de validación y la barra visual de fortaleza (passwordScore
  // más abajo) solían tener criterios independientes — una contraseña podía
  // puntuar "fuerte" en la barra y aun así fallar esta regla, o viceversa.
  // passwordStrength ahora se deriva del mismo passwordScore (umbral score
  // >= 3 de 5: longitud >=8 + al menos 2 de {minúscula, mayúscula, dígito,
  // símbolo}) para que ambos cuenten siempre la misma historia.
  const passwordStrength = (): ValidationRule =>
    (v) => (passwordScore(v) >= 3 ? true : t('validation.passwordStrength'))

  const matches = (other: () => string, label?: string): ValidationRule =>
    (v) => (v === other()
      ? true
      : label ? t('validation.matches', { field: label }) : t('validation.matchesDefault'))

  const phone = (): ValidationRule =>
    (v) =>
      /^\+?[\d\s\-().]{7,20}$/.test(v)
        ? true
        : t('validation.invalidPhone')

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
    ['', t('auth.passwordStrengthLabel.weak'), t('auth.passwordStrengthLabel.fair'), t('auth.passwordStrengthLabel.good'), t('auth.passwordStrengthLabel.strong')][score] ?? ''

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
