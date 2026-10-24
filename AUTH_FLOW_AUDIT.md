# Auditoría del flujo de autenticación — WorkPlace Manager

> Revisión end-to-end (backend NestJS + frontend Nuxt 3) del flujo de login, registro, 2FA, recuperación de contraseña y verificación de email. 21 hallazgos identificados y aplicados en esta pasada, de mayor a menor impacto.

Fecha: 2026-08-15

---

## Resumen

| Severidad | Hallazgos | Estado |
|---|---|---|
| Crítico | 3 | ✅ Todos aplicados |
| Importante | 8 | ✅ Todos aplicados |
| Mejora | 7 | ✅ Todos aplicados |
| Ya estaba bien | 3 | — (sin cambios, documentado como referencia) |

---

## Críticos

### 1. `changePassword` no revocaba las sesiones activas

**Antes**: al cambiar la contraseña desde el perfil, los refresh tokens existentes seguían siendo válidos. Un atacante con un token robado conservaba acceso incluso después de que la víctima cambiara su contraseña pensando que se había protegido. Contrastaba con `resetPassword` (vía email), que sí revocaba todo.

**Fix**: `changePassword` ahora revoca (`revokedAt`) todos los refresh tokens del usuario tras el cambio, igual que ya hacía el flujo de reset por email.

- `backend/src/domains/identity-access/users/users.service.ts`

### 2. Refresh tokens y tokens de un solo uso en texto plano en DB

**Antes**: `RefreshToken.token` (el JWT firmado completo), `PasswordResetToken.token` y `EmailVerificationToken.token` (ambos UUID crudo) se guardaban sin hashear. Un dump de la base de datos comprometía directamente sesiones activas y links de reset/verificación pendientes. Los códigos de respaldo 2FA sí estaban hasheados — el patrón correcto ya existía en el proyecto, solo no se aplicaba de forma consistente.

**Fix**: nueva función `hashToken()` (SHA-256) en `crypto.util.ts`, aplicada en los tres modelos. El valor crudo sigue siendo el que se envía por email o se guarda en la cookie — solo lo persistido en DB cambia. Como el campo `token` dejó de ser un JWT decodificable, se agregó una columna `jti` dedicada en `RefreshToken` para poder seguir blacklisteando access tokens en logout/revocación sin depender de decodificar el hash.

- `backend/src/common/utils/crypto.util.ts` (nueva función `hashToken`)
- `backend/prisma/schema.prisma` (comentarios de documentación + columna `jti` nueva en `RefreshToken`)
- `backend/prisma/migrations/20260815225958_hash_tokens_add_jti/`
- `backend/src/domains/identity-access/auth/auth.service.ts` (todos los puntos de creación/búsqueda/revocación de estos tres tipos de token)

**Nota de despliegue**: los refresh tokens emitidos antes de esta migración quedaron incompatibles con el nuevo formato (nunca volverán a hacer match por hash) — se revocaron explícitamente en la base de datos de desarrollo tras aplicar el fix. En producción, este mismo paso (revocar todo `RefreshToken` con `revokedAt IS NULL` antes/durante el deploy) es necesario para forzar un re-login limpio.

### 3. Rate limiter custom con race condition

**Antes**: `RateLimitGuard` leía el contador con `GET` y lo actualizaba con `SETEX` en dos operaciones separadas — dos requests concurrentes podían leer el mismo valor antes de que ninguna escribiera, pasando el límite en +1 por cada carrera ganada. Afectaba directamente la protección contra fuerza bruta en login.

**Fix**: nuevo método `RedisService.incrWithExpire()` que usa `INCR` (atómico en Redis) + `EXPIRE` condicional solo en el primer hit, replicando el patrón que ya usaba `incrementLoginAttempts`. `RateLimitGuard` se actualizó para usarlo.

- `backend/src/redis/redis.service.ts`
- `backend/src/common/guards/rate-limit.guard.ts`

---

## Importantes

### 4. Constante de cooldown de username duplicada

`USERNAME_COOLDOWN_DAYS = 30` estaba definida por separado en `updateProfile()` y `checkUsernameAvailability()`. Subida a constante de módulo compartida (`UsersService`) para que ambos métodos no puedan divergir.

### 5. `updateProfile` sin protección contra condición de carrera en cambio de email/username

`create()` ya documentaba y manejaba el caso (catch de `P2002` como defensa en profundidad tras el pre-check de unicidad), pero `updateProfile()` no lo replicaba. Agregado el mismo `try/catch`, distinguiendo si el conflicto es por email o por username.

### 6. Fire-and-forget de alertas de seguridad sin log de error

`changePassword`, `updateProfile` (cambio de email) y `resetPassword` disparaban `mail.sendSecurityAlert(...).catch(() => {})` — si el envío fallaba, no quedaba rastro. Cambiado a `catch(err => logger.warn(...))` en los tres puntos.

- `backend/src/domains/identity-access/users/users.service.ts`
- `backend/src/domains/identity-access/auth/auth.service.ts`

### 7. Detección de user-agent sospechoso — comportamiento aclarado

El código ya registraba el evento correctamente (`logSecurityEvent`, visible en `GET /auth/security-events`); el hallazgo real era un `logger.warn` duplicado y un comentario que sonaba a TODO pendiente ("por ahora solo registrar"). Limpiado el log redundante y reescrito el comentario como decisión consciente documentada (el algoritmo de similitud genera falsos positivos frecuentes con actualizaciones normales de navegador/OS).

- `backend/src/domains/identity-access/auth/strategies/jwt.strategy.ts`

### 8. Detección de cambio de IP sin soporte IPv6

`isSignificantIpChange` solo parseaba IPv4 (4 octetos separados por punto); cualquier IPv6 se marcaba automáticamente como "cambio significativo", generando falsos positivos en redes con IPv6. Reescrito con `net.isIP()` de Node para detectar la familia y comparar por subred /24 (IPv4) o prefijo /64 (IPv6, primeros 4 hextets).

- `backend/src/domains/identity-access/auth/strategies/jwt.strategy.ts`

### 9. Heurística frágil de "sesión expirada" en 2FA (substring del mensaje)

El frontend detectaba sesión expirada buscando la palabra `"expir"` dentro del mensaje de error traducido — se rompía en silencio si el copy o el idioma cambiaban. El backend ahora expone `errorCode: 'TWO_FA_SESSION_EXPIRED'` estructurado en el body de la excepción; el frontend compara por código.

- `backend/src/domains/identity-access/auth/auth.service.ts`
- `frontend/composables/core/useApiErrors.ts` (nueva función `getApiErrorCode`)
- `frontend/pages/auth/2fa-verify.vue`

### 10. Extracción de segundos de rate-limit acoplada a un string en inglés

`getRateLimitSeconds` parseaba con regex el mensaje crudo de `ThrottlerException` — se rompía si el backend cambiaba el formato o devolvía el mensaje ya traducido. Ambos guards (`SpanishThrottlerGuard`, `RateLimitGuard`) ahora exponen `retryAfterSeconds` estructurado en el body de la excepción y setean el header estándar `Retry-After`. El frontend lee el campo estructurado directamente.

- `backend/src/common/guards/spanish-throttler.guard.ts`
- `backend/src/common/guards/rate-limit.guard.ts`
- `frontend/composables/core/useApiErrors.ts`

### 11. Duplicación de la regla de acceso a `/menu`

`middleware/auth.ts` (bloque 4c) y `middleware/menu-category.ts` cubrían exactamente el mismo caso (solo categoría "Comida" puede acceder a `/menu`) de forma independiente, con destinos de redirect ligeramente distintos. Eliminado `menu-category.ts` (el guard global ya es más completo, incluye chequeo de permiso además de categoría) y actualizada la única página que lo declaraba.

- `frontend/middleware/menu-category.ts` (eliminado)
- `frontend/pages/(top)/menu.vue`

### 12. Dos páginas de onboarding con nombres casi idénticos en rutas distintas

`pages/(auth)/onboarding.vue` (`/onboarding`, flujo completo de 3 pasos) y `pages/auth/onboarding.vue` (`/auth/onboarding`, formulario simple post-Google) diferían solo en el route group — fácil de confundir al editar. Renombrado el segundo a `onboarding-quick.vue` y actualizada la única referencia (callback de Google OAuth).

- `frontend/pages/auth/onboarding.vue` → `frontend/pages/auth/onboarding-quick.vue`
- `frontend/pages/auth/google/callback.vue`

---

## Mejoras

### 13. Sin rate-limit dedicado en `send-verification` / `verify-email`

Ambos endpoints solo tenían el throttler global (20/60s). Agregado `@RateLimit` específico a `send-verification` (5/hora por IP — nota: por IP y no por usuario, ya que los guards globales corren antes que `JwtAuthGuard` en el pipeline de NestJS) y `@Throttle` a `verify-email` (10/60s), por consistencia con el resto de endpoints de auth.

- `backend/src/domains/identity-access/auth/auth.controller.ts`

### 14. Reenviar recuperación de contraseña sin cooldown visible

El botón "reenviar" en `recover-password.vue` no reflejaba el límite del backend (5/hora por IP) — el usuario podía hacer clic varias veces sin feedback antes del 429. Agregado un countdown visual (45s tras envío exitoso, o el valor real de `retryAfterSeconds` si el backend responde 429) que deshabilita el botón mientras corre.

- `frontend/pages/(auth)/recover-password.vue`
- `frontend/i18n/locales/es.json`, `en.json` (nueva clave `resendCooldown`)

### 15. `AuthMarketingPanel` acoplado al nombre de la ruta

El panel lateral decidía su copy (`panelCtx`) inspeccionando `route.name` — si un archivo de página se renombraba, caía en silencio al fallback "login" sin ningún error. Reemplazado por una prop explícita `variant`, que cada página que usa `AuthLayout` debe declarar a propósito.

- `frontend/components/auth/AuthMarketingPanel.vue`
- `frontend/components/auth/AuthLayout.vue`
- Las 7 páginas que usan `AuthLayout` (login, register, verify-email, recover-password, reset-password, 2fa-verify, onboarding-quick)

### 16. Graceful shutdown duplicado entre SIGTERM y SIGINT

El mismo bloque de cierre (cerrar servidor HTTP, Prisma, Redis, timeout forzado a 30s) estaba escrito dos veces en `main.ts`. Extraído a una función `gracefulShutdown(signal)` compartida.

- `backend/src/main.ts`

### 17. Dos definiciones independientes de "fortaleza de contraseña"

La regla dura de validación (`passwordStrength()`) y el score 0-4 que alimenta la barra visual (`passwordScore()`) tenían criterios distintos — una contraseña podía puntuar "fuerte" visualmente y aun así fallar la validación, o viceversa. `passwordStrength()` ahora se deriva del mismo `passwordScore()` (umbral score ≥ 3).

- `frontend/composables/ui/useFormValidation.ts`

### 18. Credenciales demo dependían de una condición cliente más laxa que el backend *(hallazgo original de la auditoría, resuelto durante la implementación de otros fixes)*

`DemoCredentials.vue` y `useDemoCredentials.ts` decidían mostrar el modal con su propia condición (`useDemoCredentials === true` OR `environment === 'development'` OR `process.dev`), duplicando — de forma más laxa — el guard real del backend (`GET /auth/demo-credentials`, que rechaza con 403 en producción sin importar `USE_DEMO`). Eliminada la condición cliente: ahora siempre se intenta el fetch, y el 403 del backend es la única fuente de verdad sobre si demo está disponible.

- `frontend/composables/auth/useDemoCredentials.ts`
- `frontend/components/auth/DemoCredentials.vue`

---

## Ya estaba bien (sin cambios)

- **Anti-enumeración consistente**: `requestPasswordReset` y `sendVerificationEmailByEmail` siempre responden éxito exista o no la cuenta; el frontend respeta esto.
- **CORS sin comodines, `trust proxy` exacto**: whitelist explícita de orígenes, nunca `origin: true` con credentials; `trust proxy: 1` confía exactamente en el hop de Traefik.
- **Códigos de respaldo 2FA hasheados**: `TwoFactorBackupCode.codeHash` ya seguía el patrón correcto — la referencia que motivó extenderlo a los demás tokens (hallazgo #2).

---

## Fuera de alcance de esta pasada

- **Rediseño completo de `middleware/auth.ts`** hacia `definePageMeta` por página: el guard mantiene listas estáticas (`KNOWN_PROTECTED_ROUTES`, `ADMIN_ONLY_ROUTES`, etc.) con riesgo documentado de "fail open" si una ruta nueva no se agrega a ninguna lista. Es un cambio de alto esfuerzo/alto riesgo que toca decenas de páginas — se resolvió únicamente la duplicación puntual y confirmada con `/menu` (hallazgo #11), no la arquitectura completa.
- **Blacklist de JWT en Redis**: actualizado en la revisión del 2026-10-24. Si Redis no permite verificar el estado de revocación, la estrategia JWT ahora rechaza la autenticación con `503 Service Unavailable` en vez de aceptar el token (fail-closed). Esto prioriza seguridad sobre disponibilidad y requiere alertas operativas para detectar interrupciones de Redis.
- **Consulta a DB en el hot path cuando no hay sesión Redis** (`checkValidRefreshTokens` en `jwt.strategy.ts`): de bajo impacto en tráfico normal, relevante solo si Redis se vaciara con muchos usuarios activos simultáneos. No se tocó en esta pasada.

---

## Endurecimiento adicional de autenticación — 2026-10-24

En el PR #36 se agregaron los siguientes cambios, pendientes de validación por CI antes de merge:

1. **Rotación atómica de refresh tokens**: el token anterior se consume con un `updateMany` condicional (`revokedAt: null`, usuario y expiración) y el reemplazo se crea en la misma transacción Prisma. Si dos solicitudes compiten, solo una puede consumir el token; si crear el reemplazo falla, la transacción revierte la revocación. La rotación conserva la duración original de la sesión (por ejemplo, 1 día para sesión corta frente a 7 días para `rememberMe`) en lugar de ampliar accidentalmente todas las sesiones a 7 días.
2. **Estado de cuenta**: no se emiten tokens nuevos para cuentas inactivas durante el refresh.
3. **Claims requeridos**: las estrategias JWT rechazan tokens sin `sub` y `jti` válidos.
4. **Revocación fail-closed**: un fallo de Redis al consultar la blacklist ya no se trata como “token no revocado”.
5. **Mitigación CSRF por Origin**: las peticiones mutables que usan cookies o incluyen un `Origin` deben venir de un origen permitido; se conserva el acceso de clientes nativos/API sin cookies y sin `Origin`.
6. **Pruebas nuevas**: rotación exitosa, carrera de refresh y cuenta inactiva.

**Validación pendiente:** esta revisión se hizo mediante GitHub; no se ejecutaron localmente Jest, type-check, lint ni build. No considerar el PR listo para merge hasta que CI esté verde y se revisen los casos de CORS/CSRF en los entornos reales.

---

## Changelog del proceso

1. **Revisión inicial** — mapeo completo del flujo de auth (páginas, middleware, guards, estrategias JWT, servicios, schema Prisma) vía agente Explore; 21 hallazgos identificados y publicados como artifact interactivo con scorecard, hallazgos por severidad y orden sugerido de trabajo.
2. **Aplicación de fixes, de mayor a menor impacto**:
   - Críticos (3): revocación de sesiones en cambio de contraseña, hashing de tokens + migración de Prisma (columna `jti`), rate limiter atómico.
   - Importantes (8): deduplicación de constantes, protección de condición de carrera, logs de errores silenciados, soporte IPv6, códigos de error estructurados (2FA, rate-limit), deduplicación de guard de `/menu`, rename de páginas de onboarding ambiguas.
   - Mejoras (7): rate-limit en endpoints de verificación, cooldown visible en recuperación de contraseña, desacoplar panel de marketing de `route.name`, deduplicar graceful shutdown, unificar criterios de fortaleza de contraseña, delegar credenciales demo al backend.
3. **Migración de base de datos**: `npx prisma migrate dev --name hash_tokens_add_jti` ejecutada dentro del contenedor `backend-hybrid`; columna `jti` agregada a `refresh_tokens`. Refresh tokens pre-existentes (formato incompatible con el nuevo hash) revocados explícitamente en la base de datos de desarrollo.
4. **Verificación end-to-end**:
   - Backend: 21 tests unitarios pasando (`auth.service`, `auth.controller`, `recaptcha.service` — este último de una sesión previa), type-check limpio (sin errores nuevos sobre los 13 preexistentes de un Prisma client desactualizado en otro módulo no relacionado).
   - Backend en runtime: login → refresh → logout probados contra el contenedor real, confirmando que el token guardado en DB es un hash SHA-256 (64 caracteres hex, no el JWT crudo) y que `jti` queda poblado correctamente.
   - Frontend: dev server reiniciado limpio, las 5 páginas de auth tocadas responden 200, bundle transformado confirmado con los cambios de `2fa-verify.vue` (código de error estructurado) presentes en el código servido.
5. **Documentación**: este archivo (`AUTH_FLOW_AUDIT.md`) y actualización de la memoria del proyecto con las decisiones de diseño no obvias (por qué `rememberMe` afecta la duración de sesión, por qué reCAPTCHA se implementó de forma simétrica al frontend, por qué el hashing de tokens requirió una columna `jti` separada).

### Archivos tocados

**Backend**
- `src/domains/identity-access/users/users.service.ts`
- `src/domains/identity-access/auth/auth.service.ts`
- `src/domains/identity-access/auth/auth.controller.ts`
- `src/domains/identity-access/auth/strategies/jwt.strategy.ts`
- `src/common/utils/crypto.util.ts`
- `src/common/guards/rate-limit.guard.ts`
- `src/common/guards/spanish-throttler.guard.ts`
- `src/redis/redis.service.ts`
- `src/main.ts`
- `prisma/schema.prisma` + nueva migración
- `src/test/unit/auth.service.test.ts`, `auth.controller.test.ts` (mocks actualizados)

**Frontend**
- `composables/core/useApiErrors.ts`
- `composables/ui/useFormValidation.ts`
- `composables/auth/useDemoCredentials.ts`
- `components/auth/DemoCredentials.vue`
- `components/auth/AuthMarketingPanel.vue`
- `components/auth/AuthLayout.vue`
- `pages/auth/2fa-verify.vue`
- `pages/(auth)/recover-password.vue`
- `pages/(top)/menu.vue`
- `pages/auth/google/callback.vue`
- `pages/(auth)/{login,register,verify-email,reset-password}.vue` (prop `panel-variant`)
- `pages/auth/onboarding.vue` → `pages/auth/onboarding-quick.vue` (rename)
- `middleware/menu-category.ts` (eliminado)
- `i18n/locales/{es,en}.json`

**Infraestructura**
- Migración de Prisma: `prisma/migrations/20260815225958_hash_tokens_add_jti/`
- Refresh tokens pre-migración revocados en la base de datos de desarrollo (`backend-hybrid` / `postgres-hybrid`)
