// Sin SMTP la verificación de email y el reseteo de contraseña fallan en
// silencio al primer envío. No se aborta el arranque (un .env de producción
// sin correo no debe tumbar el servicio), pero el aviso queda en el log.
export function warnMissingMail(env: {
  APP_ENV?: string;
  MAIL_HOST?: string;
  MAIL_USER?: string;
  MAIL_PASS?: string;
}): string[] {
  if (env.APP_ENV !== 'production') return [];
  const missing = (['MAIL_HOST', 'MAIL_USER', 'MAIL_PASS'] as const).filter(
    (key) => !env[key]?.trim()
  );
  if (missing.length > 0) {
    console.error(
      `\n⚠️  Correo sin configurar (${missing.join(', ')}): la verificación de email y el reseteo de contraseña no funcionarán.\n`
    );
  }
  return missing;
}
