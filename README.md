# WorkPlace Manager

Plataforma de gestión para **comercios, profesionales autónomos y personas** en un mismo ecosistema. Una sola cuenta (`User`) puede activar varios perfiles — cliente, profesional, candidato de empleo o negocio — y la app adapta módulos, navegación y permisos según el perfil activo, la categoría de negocio y el plan contratado.

Monorepo **pnpm** con frontend **Nuxt 3** (SPA + PWA + app móvil Capacitor) y backend **NestJS** (API REST + WebSocket) sobre **PostgreSQL**, **Prisma** y **Redis**.

> Visión de producto: [`WORKPLACE_VISION.md`](./WORKPLACE_VISION.md) · Historial de cambios: [`CHANGELOG.md`](./CHANGELOG.md) · Seguridad: [`SECURITY.md`](./SECURITY.md) · Cómo contribuir: [`CONTRIBUTING.md`](./CONTRIBUTING.md)

---

## Estructura del proyecto

```
workplace/
├── frontend/                 # Nuxt 3 SPA (Vue 3, Tailwind, Pinia, Capacitor)
│   ├── pages/                # Rutas agrupadas: (top) (sales) (operations) (company)
│   │                         #   (business) (administration) (my-account) (auth) (public)
│   ├── composables/          # Lógica reactiva — auto-importada (composables/**)
│   ├── components/           # Componentes y modales
│   ├── middleware/           # auth.ts + modules.global.ts (gating por módulo)
│   ├── config/               # dashboard.config.ts (widgets, hero, quick actions)
│   ├── scripts/              # typecheck-ratchet.mjs
│   └── typecheck-baseline.json
├── backend/                  # NestJS 10
│   ├── src/
│   │   ├── common/           # Guards, decorators y servicios transversales
│   │   │                     #   (AccountTypeResolver, CapabilitiesService,
│   │   │                     #    CategoryScopeService, ModuleAccessGuard…)
│   │   └── domains/          # Código organizado por dominio de negocio
│   │       ├── identity-access/  # auth, users, profiles, profile-activations,
│   │       │                     #   permissions (RBAC), kyc, audit
│   │       ├── commerce-core/    # menu, catalog, services, matching, search,
│   │       │                     #   branches, employees, group-buying
│   │       ├── operations/       # orders, customers, delivery, rides, cash,
│   │       │                     #   expenses, purchases, suppliers, appointments…
│   │       ├── money/            # plans, wallets, escrow, exchange-rates,
│   │       │                     #   platform-fees, bnpl, accounts…
│   │       ├── engagement/       # analytics, notifications, mail, reports, telegram
│   │       ├── platform/         # navigation, settings, jobs, system-modules,
│   │       │                     #   landing, health, ai-orchestrator
│   │       └── reputation/       # WorkPlace Score
│   └── prisma/
│       ├── schema.prisma
│       ├── migrations/           # Migraciones SQL versionadas
│       ├── seed.js               # Seed idempotente (catálogos, planes, usuarios demo)
│       ├── permission-defaults.js
│       └── data/                 # Datos de seed (catalog-categories.js, ve-locations.json)
├── docs/                     # Deploy, Codecov
├── monitoring/ loki/ promtail/   # Observabilidad (Grafana, Prometheus, Loki)
├── traefik/ security/ pgbouncer/ redis/  # Infraestructura
├── scripts/                  # Scripts de CI/deploy
└── docker-compose.*.yml      # hybrid (dev), lite (prod), lite.dev, canary…
```

## Requisitos

- Node.js 20+ (CI usa 22)
- pnpm 9 — `corepack enable` o `npm i -g pnpm@9`
- Docker y Docker Compose

## Desarrollo local (modo híbrido recomendado)

Backend, PostgreSQL y Redis en Docker; frontend en el host para recarga rápida.

```bash
# 1. Dependencias
pnpm install

# 2. Variables de entorno
cp .env.dev.example .env.dev      # completar valores

# 3. Backend + Postgres + Redis + Mailhog + Adminer
docker compose --env-file .env.dev -f docker-compose.hybrid.yml up -d

# 4. Migraciones y seed (dentro del contenedor, que resuelve el host "postgres")
docker exec backend-hybrid sh -c "cd /app/backend && npx prisma migrate deploy && node prisma/seed.js"

# 5. Frontend en el host
pnpm dev:frontend
```

| Servicio          | URL                          |
|-------------------|------------------------------|
| Frontend          | http://localhost:3000        |
| API               | http://localhost:3001/api    |
| Mailhog           | http://localhost:8025        |
| Adminer           | http://localhost:8081        |
| Traefik dashboard | http://localhost:8080        |

El seed es idempotente: crea catálogos (categorías de usuario, servicios, empleos), planes, matriz de permisos y usuarios demo (`*@demo.com`), e invalida la caché de permisos en Redis al terminar.

## Scripts

| Comando (raíz)          | Descripción                                    |
|-------------------------|------------------------------------------------|
| `pnpm dev`              | Frontend y backend en paralelo (sin Docker)    |
| `pnpm dev:frontend`     | Solo Nuxt                                      |
| `pnpm dev:backend`      | Solo NestJS                                    |
| `pnpm build`            | Build de producción de ambos                   |
| `pnpm migrate`          | `prisma migrate dev`                           |
| `pnpm migrate:deploy`   | `prisma migrate deploy`                        |
| `pnpm seed`             | Ejecuta `prisma/seed.js`                       |

| Comando (backend)       | Descripción                                    |
|-------------------------|------------------------------------------------|
| `pnpm test`             | Tests unitarios (Jest)                         |
| `pnpm type-check`       | `tsc --noEmit`                                 |
| `pnpm lint:ci`          | ESLint en modo CI                              |
| `pnpm deps:check`       | Valida límites de imports entre dominios       |

| Comando (frontend)                        | Descripción                                   |
|-------------------------------------------|-----------------------------------------------|
| `node scripts/typecheck-ratchet.mjs`      | Typecheck con trinquete: los errores solo pueden bajar |
| `node scripts/typecheck-ratchet.mjs --update` | Reescribe la línea base tras corregir errores |
| `pnpm test`                               | Tests (Vitest)                                |

## Modelo de identidad y acceso

El acceso se decide en capas; cada capa tiene una única fuente de verdad:

| Capa | Pregunta | Fuente de verdad |
|------|----------|------------------|
| Rol de plataforma | ¿Es staff? | `User.role`: `SUPERADMIN`, `ADMIN`, `PROFESIONAL`, `NORMAL` — recalculado por `RoleResolverService` desde los perfiles activos |
| Perfiles | ¿Qué actividades tiene? | `UserProfile` (`CUSTOMER`, `PROFESSIONAL` con subtipo `FREELANCER`/`SERVICE_PROVIDER`, `JOB_SEEKER`, `BUSINESS`). PROFESSIONAL y BUSINESS son mutuamente excluyentes; los perfiles se activan, desactivan y reactivan desde `/profile` |
| Capacidades | ¿Qué infraestructura tiene? | `CapabilitiesService` (`HAS_COMMERCE`, `HAS_PROFESSIONAL_PROFILE`, `HAS_BUSINESS_PROFILE`) |
| Permisos | ¿Puede hacer esta acción? | Matriz RBAC en DB por rol/perfil (`permission-defaults.js`), caché Redis, `@RequirePermission` |
| Módulos | ¿Su plan y rubro incluyen este módulo? | `PlanLimitsService.getPlanLimits()` → `effectiveModules = plan ∩ categoría (UserCategory.allowedModules)`, aplicado en backend con `@RequireModule` + `ModuleAccessGuard` y en frontend con `useModules()` |
| Catálogo por rubro | ¿Esta categoría de servicio/empleo aplica a su rubro? | `CategoryScopeService` (`userCategoryIds` vacío = visible para todos) + `CategoryScopeGuard` |

El sidebar (`GET /navigation`), los widgets del dashboard y el middleware de rutas consumen esas mismas fuentes; no duplican reglas.

## Módulos principales

| Área | Módulos |
|------|---------|
| Catálogo | Menú/productos (búsqueda, acciones masivas, reordenamiento drag-and-drop, bundles), servicios por categoría/modalidad, catálogo público `/loja/[slug]` |
| Ventas y operaciones | Pedidos y POS, clientes, delivery y repartidores, caja, gastos, compras, proveedores, cuentas por cobrar/pagar, reservas |
| Personas | Perfiles múltiples, solicitudes de servicio, empleos y postulaciones, empleados, sucursales |
| Dinero | Planes y límites, wallets, Pago Protegido (escrow) con disputas, tasas de cambio con sincronización BCV automática, comisiones de plataforma, BNPL |
| Red | Matching por precio/distancia/reputación, WorkPlace Score, compra agrupada B2B |
| Plataforma | Notificaciones (REST + Socket.io), analytics y reportes, i18n, administración de categorías/planes/módulos |

## Tech stack

| Capa        | Tecnología |
|-------------|------------|
| Frontend    | Nuxt 3 (SPA), Vue 3, Tailwind CSS, Pinia, `@vite-pwa/nuxt`, Capacitor 8 |
| Backend     | NestJS 10, Passport (JWT, Google OAuth), Socket.io, `@nestjs/schedule` |
| Datos       | PostgreSQL 16, Prisma 5, Redis 7 |
| Auth        | Access token 15 min + refresh 7 días, 2FA, blacklist de tokens en Redis |
| Infra       | Docker Compose, Traefik, PgBouncer, Grafana + Prometheus + Loki, Sentry |
| CI/CD       | GitHub Actions (`pr-validation`, `dev`, `deploy`) |

## Calidad y CI

En cada PR a `main`/`develop` (`.github/workflows/pr-validation.yml`) se validan el schema Prisma, typecheck, lint, límites de dominio, formato, tests unitarios con cobertura y build del backend; el typecheck del frontend (trinquete) y el build Docker. `develop` despliega a desarrollo y `main` a producción.

## App móvil (Capacitor)

```bash
pnpm --filter frontend build
npx --prefix frontend cap sync android
npx --prefix frontend cap open android
```

Detalles en [`CAPACITOR_MOBILE_APP.md`](./CAPACITOR_MOBILE_APP.md), [`frontend/docs/CAPACITOR_APK_BUILD.md`](./frontend/docs/CAPACITOR_APK_BUILD.md) y [`frontend/docs/PUSH_NOTIFICATIONS.md`](./frontend/docs/PUSH_NOTIFICATIONS.md).

## Documentación

| Documento | Contenido |
|-----------|-----------|
| [`WORKPLACE_VISION.md`](./WORKPLACE_VISION.md) | Visión del ecosistema y roadmap |
| [`IDENTITY_ARCHITECTURE_PLAN.md`](./IDENTITY_ARCHITECTURE_PLAN.md) | Arquitectura de identidad y perfiles |
| [`WORKPLACE_STATUS_FEEDBACK.md`](./WORKPLACE_STATUS_FEEDBACK.md) | Estado actual del producto |
| [`V1_LAUNCH_READINESS.md`](./V1_LAUNCH_READINESS.md) | Checklist de lanzamiento |
| [`AUTH_FLOW_AUDIT.md`](./AUTH_FLOW_AUDIT.md) · [`FRONTEND_AUDIT.md`](./FRONTEND_AUDIT.md) | Auditorías |
| [`docs/DEPLOY.md`](./docs/DEPLOY.md) · [`docs/DEPLOYMENT_GUIDE.md`](./docs/DEPLOYMENT_GUIDE.md) | Despliegue |
| [`.github/workflows/README.md`](./.github/workflows/README.md) | Pipelines de CI/CD |
