# Setup detallado

## Estructura del monorepo

```
workplace-manager/
├── frontend/                  # Nuxt 3
│   ├── assets/
│   ├── components/
│   ├── composables/
│   │   └── useAuth.js         # Comunicación con el backend
│   ├── layouts/
│   ├── middleware/
│   │   └── auth.js            # Protección de rutas con JWT
│   ├── pages/
│   │   ├── login.vue
│   │   └── register.vue
│   ├── plugins/
│   ├── public/
│   ├── nuxt.config.ts
│   ├── tailwind.config.js
│   └── Dockerfile
├── backend/                   # NestJS
│   ├── src/
│   │   ├── auth/              # Login, register, refresh, logout
│   │   │   ├── auth.controller.ts
│   │   │   ├── auth.service.ts
│   │   │   ├── dto/
│   │   │   └── strategies/    # JWT + JWT-Refresh (Passport)
│   │   ├── users/             # UsersService (CRUD básico)
│   │   ├── prisma/            # PrismaService (global)
│   │   ├── redis/             # RedisService (global)
│   │   ├── common/
│   │   │   ├── guards/        # JwtAuthGuard, JwtRefreshGuard
│   │   │   └── decorators/    # @CurrentUser()
│   │   └── main.ts
│   ├── prisma/
│   │   ├── schema.prisma      # User, Restaurant, RefreshToken
│   │   └── migrations/
│   └── Dockerfile
├── docker-compose.yml
├── pnpm-workspace.yaml
├── .env
└── .env.example
```

---

## Variables de entorno

Copiar `.env.example` a `.env` y ajustar según el entorno:

```bash
cp .env.example .env
```

| Variable                  | Valor por defecto                          | Descripción                         |
|---------------------------|--------------------------------------------|-------------------------------------|
| `POSTGRES_USER`           | `workplace`                                    | Usuario de PostgreSQL               |
| `POSTGRES_PASSWORD`       | `workplace_secret`                             | Contraseña de PostgreSQL            |
| `POSTGRES_DB`             | `workplace_db`                                 | Nombre de la base de datos          |
| `REDIS_PASSWORD`          | `redis_secret`                             | Contraseña de Redis                 |
| `JWT_SECRET`              | `super_secret_jwt_key_change_in_production`| Secreto del access token            |
| `JWT_EXPIRES_IN`          | `15m`                                      | Duración del access token           |
| `JWT_REFRESH_SECRET`      | `super_secret_refresh_key_change_in_prod`  | Secreto del refresh token           |
| `JWT_REFRESH_EXPIRES_IN`  | `7d`                                       | Duración del refresh token          |
| `FRONTEND_URL`            | `http://localhost:3000`                    | Origin permitido en CORS            |
| `NUXT_PUBLIC_API_URL`     | `http://localhost:3001`                    | URL del backend desde el frontend   |

---

## Arranque en desarrollo local

### 1. Instalar dependencias (raíz del monorepo)

```bash
pnpm install
```

Instala las dependencias de `frontend/` y `backend/` en un solo paso.

### 2. Levantar infraestructura

```bash
docker compose up postgres redis -d
```

### 3. Aplicar migraciones

```bash
cd backend
pnpm prisma:migrate
cd ..
```

### 4. Levantar frontend y backend

```bash
pnpm run dev
```

- Frontend → http://localhost:3000
- Backend → http://localhost:3001

---

## Arranque con Docker (producción)

```bash
docker compose up --build
```

El backend corre `prisma migrate deploy` automáticamente antes de arrancar.

---

## Endpoints de autenticación

| Método | Ruta                | Auth requerida | Descripción                                      |
|--------|---------------------|----------------|--------------------------------------------------|
| POST   | `/api/auth/register`| No             | Crea usuario + restaurante, devuelve tokens      |
| POST   | `/api/auth/login`   | No             | Verifica credenciales, devuelve tokens           |
| POST   | `/api/auth/refresh` | Refresh token  | Rota el refresh token, devuelve nuevos tokens    |
| POST   | `/api/auth/logout`  | Bearer JWT     | Invalida el access token (blacklist en Redis)    |
| GET    | `/api/auth/me`      | Bearer JWT     | Devuelve el perfil del usuario autenticado       |

### Registro

```json
POST /api/auth/register
{
  "firstName": "Juan",
  "lastName": "Pérez",
  "email": "juan@restaurante.com",
  "phone": "+52 55 1234 5678",
  "restaurantName": "El Sabor",
  "password": "Secret123"
}
```

### Login

```json
POST /api/auth/login
{
  "email": "juan@restaurante.com",
  "password": "Secret123"
}
```

### Respuesta (registro y login)

```json
{
  "user": {
    "id": "uuid",
    "email": "juan@restaurante.com",
    "firstName": "Juan",
    "lastName": "Pérez",
    "role": "ADMIN",
    "restaurant": { "id": "uuid", "name": "El Sabor" }
  },
  "accessToken": "eyJhbGci...",
  "refreshToken": "eyJhbGci..."
}
```

### Refresh

```json
POST /api/auth/refresh
Authorization: Bearer <refreshToken>
{
  "refreshToken": "eyJhbGci..."
}
```

---

## Arquitectura

```
┌─────────────────────────────────────────────────────┐
│                     Browser                         │
│           Nuxt 3 SPA (localhost:3000)               │
│                                                     │
│  useAuth.js  ──── $fetch ────►  /api/auth/*         │
│  localStorage (accessToken, refreshToken, user)     │
└──────────────────────┬──────────────────────────────┘
                       │ HTTP (JWT Bearer)
                       ▼
┌─────────────────────────────────────────────────────┐
│              NestJS API (localhost:3001)             │
│                                                     │
│  AuthController  →  AuthService                     │
│       │                   │                         │
│       │              UsersService                   │
│       │                   │                         │
│  JwtStrategy          PrismaService                 │
│  (valida blacklist)       │                         │
│       │             ┌─────┴──────┐                  │
│  RedisService    PostgreSQL    RefreshTokens         │
│  (blacklist,      (users,      (rotación)           │
│  rate limiting)   restaurants)                      │
└─────────────────────────────────────────────────────┘
```

---

## Seguridad implementada

| Mecanismo               | Detalle                                                   |
|-------------------------|-----------------------------------------------------------|
| Contraseñas             | bcrypt con cost factor 12                                 |
| Access token            | JWT firmado, expira en 15 minutos                         |
| Refresh token           | Rotación en cada uso (one-time), almacenado en PostgreSQL |
| Logout                  | JTI del access token en blacklist de Redis                |
| Rate limiting login     | Máximo 5 intentos fallidos por email, bloqueo 15 min      |
| CORS                    | Solo permite el origin del frontend                       |
| Validación de entrada   | `class-validator` en todos los DTOs                       |
| Throttling global       | 20 requests por minuto por IP                             |
