# Migración i18n — Changelog

Internacionalización (es/en) del backend con `nestjs-i18n`. La migración se hace
módulo por módulo para no romper nada y poder revisar incrementos pequeños.

## Arquitectura

- **Librería**: `nestjs-i18n` (^10.8.4)
- **Idioma por defecto**: `es` (`fallbackLanguage`)
- **Resolución de idioma**: query param `?lang=` o header `Accept-Language`
- **Archivos de traducción**: `backend/src/i18n/<lang>/<namespace>.json`
- **Build**: `tsc` no copia `.json` a `dist/`, así que `backend/scripts/copy-i18n.js`
  copia `src/i18n` → `dist/i18n` después de compilar (`pnpm build`)
- **Uso en servicios/guards**:
  ```ts
  constructor(private i18n: I18nService) {}

  // mensaje simple
  this.i18n.t('auth.login.invalid_credentials')

  // con idioma explícito (en guards, desde el ExecutionContext)
  const lang = I18nContext.current(context)?.lang;
  this.i18n.t('common.rate_limit.exceeded', { lang, args: { wait } })
  ```
- **Pluralización**: el valor de la clave es un objeto `{ one, other, ... }`,
  seleccionado automáticamente con `args.count` (ver `common.rate_limit.wait_minutes`).

## Increment 1 — Auth + rate limiting (hecho)

- Namespaces creados: `common` (rate limiting), `auth` (login, sesión, password
  reset, verificación de email, demo)
- Migrados a `i18n.t(...)`:
  - `backend/src/auth/auth.service.ts` (15 mensajes)
  - `backend/src/common/guards/rate-limit.guard.ts`
  - `backend/src/common/guards/spanish-throttler.guard.ts`
- Verificado con test de integración aislado (`I18nModule.forRoot` +
  `I18nService.t`) cubriendo es/en, interpolación y pluralización — 4/4 OK.
- Pendiente: verificación end-to-end contra el servidor en caliente (no se
  reinició el dev server para no afectar otras sesiones en curso).

## Próximos incrementos (sin empezar)

- Resto de módulos backend con strings hardcodeados en español: `orders`,
  `customers`, `appointments`, `delivery`, `expenses`, `menu`, `plans`,
  `notifications`, etc. Cada uno como su propio namespace de traducción.
- Frontend: `@nuxtjs/i18n` para mensajes de UI, validaciones de formularios y
  el selector de idioma.
- Selector de idioma visible para el usuario (hoy solo se resuelve por
  header/query, sin UI).
