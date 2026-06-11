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

## Increment 2 — Branches + mensajes compartidos (hecho)

- Namespace `common.errors` agregado para mensajes reutilizables entre
  módulos (`access_denied`, usado por `customers`, `appointments`,
  `delivery`, `menu`, `employees`, `branches`, etc.). Otros módulos deben
  reusar esta clave en vez de duplicarla.
- Namespace `branches` creado (`not_found`, `name_taken`).
- Migrado `backend/src/branches/branches.service.ts` (3 mensajes) a
  `i18n.t(...)`.
- Verificado en `i18n-pilot-check.spec.ts` (6/6 OK).
- Fuera de alcance: mensajes de validación de DTOs (`class-validator`
  decorators, ej. `@Matches(... { message: '...' })`) — requieren un
  `ValidationPipe` con i18n aparte; no migrados todavía.

## Increment 3 — Customers + Employees (hecho)

- Namespaces `customers` (`not_found`, `email_taken`) y `employees`
  (`not_found`, `email_taken`) creados (es/en).
- Migrados `backend/src/customers/customers.service.ts` y
  `backend/src/employees/employees.service.ts` (3 mensajes cada uno,
  incluyendo `common.errors.access_denied` compartido).
- Verificado en `i18n-pilot-check.spec.ts` (8/8 OK).

## Increment 4 — Users (hecho)

- Namespace `users` creado (es/en): mensajes de cuenta (`not_found`,
  `email_taken`, `email_in_use`, `username_taken`, `deleted`,
  `current_password_incorrect`, `new_password_must_differ`,
  `password_updated`), `category.*` y `subcategory.*` (incluye
  pluralización de `in_use` por cantidad de usuarios), `permissions.*`
  (mensajes de `ForbiddenException` del controller) y
  `profile_completion.*` (etiquetas de `missingFields`).
- Migrados `backend/src/users/users.service.ts` (todas las excepciones y
  mensajes de retorno) y `backend/src/users/users.controller.ts` (8
  `ForbiddenException`). Ambos ahora reciben `I18nService` por
  constructor.
- Pluralización agregada para `users.category.in_use`,
  `users.subcategory.in_use` y `users.username_cooldown` (cooldown de
  cambio de nombre de usuario).
- Verificado en `i18n-pilot-check.spec.ts` (11/11 OK).
- `frontend/composables/useAuth.ts` revisado — no tiene strings
  user-facing en español que migrar (ya cubierto por
  `useApiErrors.ts`).

## Increment 5 — Appointments + Delivery (hecho)

- Namespace `appointments` creado (`not_found`, `customer_not_found`).
- Namespace `delivery` creado, con sub-secciones `driver.*`
  (`not_found`, `not_found_in_restaurant`, `not_active`) y
  `delivery.*` (`not_found`).
- Migrados `appointments.service.ts` (3 mensajes) y
  `delivery.service.ts` (6 mensajes), reusando
  `common.errors.access_denied`.
- Verificado en `i18n-pilot-check.spec.ts` (13/13 OK).
- **Fuera de alcance / pendiente de decisión**: `delivery.service.ts`
  tiene plantillas de notificación por Telegram con emojis y texto en
  español (`statusEmoji` en `updateDeliveryStatus`) — son mensajes que
  recibe el cliente final por Telegram, no la UI del comercio. No se
  migraron porque su tratamiento (¿deben seguir solo en español? ¿usar
  el idioma preferido del cliente?) requiere una decisión de producto
  aparte.

## Increment 6 — Expenses (hecho)

- Namespace `expenses` creado: `not_found`, `deleted`, `category.*`
  (`not_found`, `name_taken`, `deleted`, `in_use` pluralizado por
  cantidad de gastos asociados).
- Migrado `expenses.service.ts` (8 mensajes).
- Verificado en `i18n-pilot-check.spec.ts` (15/15 OK).

## Próximos incrementos (sin empezar)

- Resto de módulos backend con strings hardcodeados en español: `orders`,
  `menu`, `plans`, `notifications`, `permissions`. Reusar
  `common.errors.access_denied` donde aplique; cada módulo con su propio
  namespace para mensajes específicos (`not_found`, `name_taken`, etc.).
- Mensajes de validación de DTOs (`class-validator`) vía i18n
  `ValidationPipe`.
- Frontend: `@nuxtjs/i18n` para mensajes de UI, validaciones de formularios y
  el selector de idioma.
- Selector de idioma visible para el usuario (hoy solo se resuelve por
  header/query, sin UI).
