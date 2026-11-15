import { envSchema, envErrors, envWarnings, type Env } from './env.schema';
import { warnMissingMail } from './mail-warning';

// Valida las variables al arrancar (main.ts lo importa primero): si falta
// algo obligatorio o un valor tiene mal formato, el backend no arranca y dice
// exactamente qué corregir. Los nombres y la interpretación de cada variable
// están en env.schema.ts y app-config.ts.
function validateEnv(): Env {
  const errors = envErrors(process.env);
  if (errors.length) {
    console.error(
      '\n❌ Variables de entorno inválidas:\n' +
        errors.map((e) => `  • ${e}`).join('\n') +
        '\n'
    );
    process.exit(1);
  }
  const warnings = envWarnings(process.env);
  if (warnings.length) {
    console.warn(
      '\n⚠️  Variables opcionales mal escritas (se usa su valor por defecto):\n' +
        warnings.map((w) => `  • ${w}`).join('\n') +
        '\n'
    );
  }
  const parsed = envSchema.parse(process.env);
  warnMissingMail(parsed);
  return parsed;
}

export type { Env };
export const env = validateEnv();
