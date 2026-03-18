# WorkPlace Manager

Panel de gestión para restaurantes integrado con WorkPlace. Monorepo con frontend Nuxt 3 y backend NestJS.

## Estructura del proyecto

```
workplace-manager/
├── frontend/          # Nuxt 3 (Vue 3, Tailwind CSS)
├── backend/           # NestJS (Prisma, PostgreSQL, Redis)
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

# 4. Aplicar migraciones de base de datos
cd backend && pnpm prisma:migrate && cd ..

# 5. Levantar frontend (:3000) y backend (:3001) en paralelo
pnpm run dev
```

## Docker (producción)

```bash
cp .env.example .env
docker compose up --build
```

- Frontend → http://localhost:3000
- Backend API → http://localhost:3001

## Scripts disponibles

| Comando               | Descripción                                    |
|-----------------------|------------------------------------------------|
| `pnpm run dev`        | Levanta frontend y backend en paralelo         |
| `pnpm run dev:frontend` | Solo el frontend Nuxt                        |
| `pnpm run dev:backend`  | Solo el backend NestJS                       |
| `pnpm run build`      | Build de producción de ambos                  |
| `pnpm run docker:up`  | `docker compose up --build`                   |
| `pnpm run docker:down`| `docker compose down`                         |

## Tech stack

| Capa       | Tecnología                        |
|------------|-----------------------------------|
| Frontend   | Nuxt 3, Vue 3, Tailwind CSS       |
| Backend    | NestJS, Passport, JWT             |
| ORM        | Prisma                            |
| Base datos | PostgreSQL 16                     |
| Cache      | Redis 7                           |
| Auth       | JWT (access 15m) + Refresh (7d)  |
| Deploy     | Docker Compose                    |
