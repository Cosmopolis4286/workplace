# WorkPlace Manager

Panel de gestión completo para COMERCIOS Y SERVICIOS integrado con WorkPlace. Monorepo con frontend Nuxt 3 y backend NestJS.

## Estructura del proyecto

```
workplace-manager/
├── frontend/              # Nuxt 3 SPA (Vue 3, Tailwind CSS)
│   ├── pages/             # Rutas de la app
│   ├── composables/       # Lógica reactiva (useMenu, useOrders, etc.)
│   ├── components/        # Componentes reutilizables y modales
│   └── middleware/        # Auth + control de acceso por rol
├── backend/               # NestJS API REST + WebSocket
│   ├── src/
│   │   ├── auth/          # JWT, refresh tokens, Google OAuth
│   │   ├── users/         # CRUD usuarios + roles
│   │   ├── menu/          # Categorías y productos
│   │   ├── customers/     # Clientes + segmentación
│   │   ├── orders/        # Pedidos + transiciones de estado
│   │   ├── delivery/      # Repartidores y envíos
│   │   ├── appointments/  # Agendamientos / reservas
│   │   ├── analytics/     # KPIs y métricas por período
│   │   ├── expenses/      # Gastos + categorías + presupuesto
│   │   ├── notifications/ # REST + Socket.io gateway
│   │   ├── employees/     # Empleados + roles operativos
│   │   ├── branches/      # Sucursales
│   │   ├── permissions/   # RBAC DB-driven + cache Redis
│   │   ├── plans/         # Planes de suscripción + límites
│   │   └── settings/      # Configuración del restaurante
│   └── prisma/
│       ├── schema.prisma  # Modelos y enums
│       └── seed.ts        # Seed de planes y permisos (46 permisos)
├── config/                # Configuración PostgreSQL y monitoreo
├── monitoring/            # Grafana, Prometheus, Loki
├── scripts/               # Scripts de utilidad
├── docker-compose.yml
├── pnpm-workspace.yaml
└── .env
```

## Requisitos

- [Node.js 20+](https://nodejs.org/)
- [pnpm](https://pnpm.io/) — `npm install -g pnpm`
- [Docker](https://www.docker.com/) y Docker Compose

## Desarrollo local

```bash
# 1. Instalar dependencias
pnpm install

# 2. Copiar variables de entorno
cp .env.example .env

# 3. Levantar infraestructura (PostgreSQL + Redis)
docker compose up postgres redis -d

# 4. Aplicar migraciones y seed
cd backend && pnpm prisma:migrate && pnpm prisma:seed && cd ..

# 5. Levantar frontend (:3000) y backend (:3001) en paralelo
pnpm run dev
```

## Docker (producción)

```bash
cp .env.example .env
docker compose up --build
```

- Frontend → http://localhost:3000
- Backend API → http://localhost:3001/api
- Swagger → http://localhost:3001/api/docs

## Scripts disponibles

| Comando                   | Descripción                                    |
|---------------------------|------------------------------------------------|
| `pnpm run dev`            | Levanta frontend y backend en paralelo         |
| `pnpm run dev:frontend`   | Solo el frontend Nuxt                          |
| `pnpm run dev:backend`    | Solo el backend NestJS                         |
| `pnpm run build`          | Build de producción de ambos                   |
| `pnpm run migrate`        | Aplica migraciones de Prisma                   |
| `pnpm run seed`           | Ejecuta el seed (planes + permisos)            |
| `pnpm run docker:up`      | `docker compose up --build`                    |
| `pnpm run docker:down`    | `docker compose down`                          |

## Tech stack

| Capa         | Tecnología                                         |
|--------------|----------------------------------------------------|
| Frontend     | Nuxt 3 (SPA), Vue 3, Tailwind CSS, Pinia           |
| Backend      | NestJS 10, Passport.js, JWT, Socket.io             |
| ORM          | Prisma 5                                           |
| Base datos   | PostgreSQL 16                                      |
| Cache        | Redis 7                                            |
| Auth         | JWT (access 15m) + Refresh (7d) + Google OAuth     |
| Tiempo real  | Socket.io (notificaciones en vivo)                 |
| Monitoreo    | Grafana + Prometheus + Loki                        |
| Deploy       | Docker + Docker Compose                            |

## Módulos principales

| Módulo          | Descripción                                                       |
|-----------------|-------------------------------------------------------------------|
| Auth            | Login/register, JWT refresh, Google OAuth, blacklist Redis        |
| Menú            | Categorías y productos con stock, estados y preparación           |
| Pedidos         | Flujo completo de estados, tipos (inmediato/programado/etc.)      |
| Clientes        | Segmentación (VIP/PREMIUM/REGULAR/NUEVO), historial               |
| Delivery        | Repartidores, asignación, tracking de estado                      |
| Agendamientos   | Reservas con vista calendario y lista, filtros por estado/fecha   |
| Gastos          | Presupuesto por categoría, estados (pendiente/pagado/vencido)     |
| Empleados       | Roles operativos, estados, paginación                             |
| Sucursales      | Multi-sucursal con estado y color                                 |
| Analytics       | KPIs, tendencia de ingresos, top productos, segmentos             |
| Notificaciones  | REST + WebSocket, eventos de pedidos/delivery/stock bajo          |
| Permisos (RBAC) | Matriz DB-driven por rol, cache Redis 300s, 46 permisos           |
| Planes          | Suscripciones, límites por plan, panel admin + vista usuario      |
| Dashboard       | KPIs en tiempo real, pedidos activos, auto-refresh 60s            |

## Roles de usuario

| Rol         | Acceso                                                   |
|-------------|----------------------------------------------------------|
| SUPERADMIN  | Todo, incluye permisos y planes (bypassa guards)         |
| ADMIN       | Gestión de usuarios, planes, vistas de comercio          |
| COMMERCE    | Panel completo del restaurante                           |
| FREELANCER  | Acceso limitado según plan                               |
| NORMAL      | Bloqueado de rutas de comercio                           |
