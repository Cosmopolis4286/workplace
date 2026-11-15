# Variables de entorno: una sola fuente de verdad

Cada variable se nombra, se interpreta y recibe su valor por defecto **en un
solo lugar**. El resto del código usa esa definición, nunca `process.env`
directo.

## Backend (`backend/src/config/`)

| Archivo | Para qué |
|---|---|
| `app-config.ts` | **Lectura.** `appConfig.frontendUrl()`, `appConfig.mail()`, `appConfig.platformVatRate()`, `appConfig.features.protectedPayments()`… Lee en cada llamada, así los tests pueden cambiar variables entre casos. |
| `env.schema.ts` | **Validación.** Qué es obligatorio y qué formato tiene cada variable (también las opcionales: interruptores `'true'/'false'`, IVA 0-100, JSON de Firebase…). |
| `env.ts` | Valida al arrancar (`main.ts` lo importa primero). Si falta algo **obligatorio** o tiene mal formato, el backend no arranca y dice exactamente qué corregir. Una **opcional** mal escrita (p. ej. un interruptor `TRUE`) solo genera un aviso y se usa su valor por defecto: una errata no debe tumbar producción. |

- ESLint prohíbe `process.env` fuera de `src/config/` (regla `no-restricted-properties`). Los tests sí pueden usarlo.
- Los módulos de Nest que reciben configuración por `ConfigService` (JWT, Redis, Telegram, reCAPTCHA, Google) siguen así: leen el mismo entorno y quedan validados por `env.schema.ts`.

**Agregar una variable nueva al backend:**
1. Su formato en `env.schema.ts` (opcional u obligatoria).
2. Su lectura, con su valor por defecto, en `app-config.ts`.
3. Usarla con `appConfig.…()`.
4. Documentarla en `.env.dev.example` y `.env.local.prod.example`.

## Frontend (`frontend/config/env.ts`)

- `nuxt.config.ts` llama a `loadFrontendConfig()`, que arma `runtimeConfig.public`. Cada clave se define una sola vez ahí.
- En la app, la configuración se lee con `useRuntimeConfig().public`, nunca con `process.env` ni `import.meta.env`.
- **En desarrollo (`pnpm dev`) manda `../.env.dev`.** Toda variable definida ahí reemplaza a las de Windows, la terminal y `frontend/.env`, y se avisa en la consola cuáles reemplazó. Antes, un `API_URL` de producción definido en Windows hacía que el frontend local llamara al API de producción.
- En build/generate/APK no se toca nada: se usan las variables del entorno (p. ej. `NUXT_PUBLIC_API_URL=… nuxt generate`).

## Docker Compose (desarrollo)

- `docker compose` da prioridad a las variables de Windows/la terminal sobre `--env-file` al completar `${DOMAIN}`, `${POSTGRES_PASSWORD}`… `scripts/dev/dev-hybrid.ps1` (y `.sh`) detecta las que tienen otro valor que `.env.dev` y las ignora solo durante ese arranque, con un aviso.
- La contraseña de Postgres se sincroniza con `.env.dev` en cada arranque (`docker/postgres/dev-entrypoint.sh`).

## Prioridad, de mayor a menor

| | Desarrollo | Producción |
|---|---|---|
| Frontend | `.env.dev` → Windows/terminal → `frontend/.env` | entorno del build/contenedor |
| Backend (contenedor) | `env_file: .env.dev` del compose | `.env` del servidor |
| Compose `${VAR}` | `.env.dev` (vía `dev-hybrid`) | `--env-file` del deploy |
