# Setup - Login & Register con NestJS + PostgreSQL + Redis

## Requisitos
- Docker y Docker Compose
- Node.js 20+ (para desarrollo local)

---

## Arranque rápido con Docker

```bash
# 1. Copiar variables de entorno
cp .env.example .env

# 2. Levantar todo (PostgreSQL + Redis + Backend + Frontend)
docker compose up --build
```

- Frontend: http://localhost:3000
- Backend API: http://localhost:3001
- Swagger/API: http://localhost:3001/api/auth

---

## Desarrollo local (sin Docker para frontend/backend)

### 1. Levantar solo la base de datos e infraestructura
```bash
docker compose up postgres redis -d
```

### 2. Backend
```bash
cd backend
npm install
npx prisma migrate dev --name init
npm run start:dev
```

### 3. Frontend
```bash
# En la raíz del proyecto
npm install
npm run dev
```

---

## Endpoints Auth (NestJS)

| Método | Ruta              | Descripción                          | Auth |
|--------|-------------------|--------------------------------------|------|
| POST   | /api/auth/register | Registrar nuevo usuario + restaurante | No  |
| POST   | /api/auth/login    | Login, devuelve JWT + refresh token  | No   |
| POST   | /api/auth/refresh  | Renovar access token                 | No   |
| POST   | /api/auth/logout   | Logout + blacklist token en Redis    | JWT  |
| GET    | /api/auth/me       | Perfil del usuario autenticado       | JWT  |

### Ejemplo registro
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

### Ejemplo login
```json
POST /api/auth/login
{
  "email": "juan@restaurante.com",
  "password": "Secret123"
}
```

### Respuesta
```json
{
  "user": { "id": "...", "email": "...", "firstName": "...", "restaurant": { ... } },
  "accessToken": "eyJ...",
  "refreshToken": "eyJ..."
}
```

---

## Arquitectura

```
Frontend (Nuxt 3) ──────► Backend (NestJS)
     :3000                      :3001
                                  │
                    ┌─────────────┴─────────────┐
                    │                           │
              PostgreSQL                      Redis
               :5432                          :6379
            (usuarios,                   (token blacklist,
            restaurantes,               rate limiting login)
            refresh tokens)
```

## Redis - Usos en Auth
- **Blacklist de JWT**: al hacer logout, el jti del access token se guarda en Redis por el TTL restante
- **Rate limiting de login**: máximo 5 intentos fallidos por email en 15 minutos
