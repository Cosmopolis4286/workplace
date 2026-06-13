# Deploy - Workplace

El deploy se hace automáticamente via GitHub Actions al hacer push a `main`.

## Secrets requeridos en GitHub

Ve a **Settings → Secrets and variables → Actions** y agrega:

| Secret | Descripción |
|--------|-------------|
| `DOCKER_USERNAME` | Usuario de Docker Hub |
| `DOCKER_PASSWORD` | Password de Docker Hub |
| `SSH_PRIVATE_KEY` | Clave SSH privada para acceder al servidor |
| `PRODUCTION_HOST` | IP o hostname del servidor |
| `PRODUCTION_USER` | Usuario SSH (ej: `root`) |
| `PRODUCTION_DOMAIN` | Dominio (ej: `playrke.com`) |
| `ACME_EMAIL` | Email para certificados Let's Encrypt |

## Preparar el servidor (primera vez)

```bash
# 1. Crear estructura
mkdir -p /opt/workplace/{traefik/dynamic,scripts/deploy,versions,backups/versions,logs}

# 2. Crear .env con los valores reales
nano /opt/workplace/.env
```

**Variables mínimas requeridas en `.env`:**
```bash
APP_NAME=WorkPlace
APP_ENV=production

NODE_PORT=3001
FRONTEND_PORT=3000
NITRO_HOST=0.0.0.0
NODE_OPTIONS=--max-old-space-size=512

POSTGRES_USER=workplace
POSTGRES_PASSWORD=<password-seguro>
POSTGRES_DB=workplace_db
DATABASE_URL=postgresql://workplace:<password-seguro>@postgres:5432/workplace_db

REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=<password-seguro>

JWT_SECRET=<secret-seguro>
JWT_EXPIRES_IN=15m
JWT_REFRESH_SECRET=<secret-seguro>
JWT_REFRESH_EXPIRES_IN=7d

DOMAIN=tudominio.com
FRONTEND_URL=https://tudominio.com
API_URL=https://tudominio.com/api
```

## Flujo del pipeline

```
push main
  → tests
  → build backend + frontend (Docker Hub)
  → deploy al servidor (scp + SSH)
      → migraciones Prisma
      → rolling update backend → health check
      → rolling update frontend → health check
  → health check externo
  → smoke test desde internet
  → notificación
```

## Comandos útiles en el servidor

```bash
cd /opt/workplace
COMPOSE="docker compose -f docker-compose.lite.yml"

# Estado de servicios
$COMPOSE ps

# Logs en tiempo real
$COMPOSE logs -f backend
$COMPOSE logs -f frontend
$COMPOSE logs -f traefik

# Reiniciar un servicio
export BACKEND_IMAGE=$(docker inspect workplace-backend-1 --format='{{.Config.Image}}')
export FRONTEND_IMAGE=$(docker inspect workplace-frontend-1 --format='{{.Config.Image}}')
$COMPOSE restart traefik

# Health check manual
$COMPOSE exec -T backend curl -sf http://localhost:3001/api/ready
$COMPOSE exec -T frontend curl -sf http://localhost:3000/
```

## Troubleshooting

### Certificado SSL no emite
```bash
# Verificar email en traefik.yml
grep email /opt/workplace/traefik/traefik.yml

# Ver logs de Traefik
docker logs traefik --tail 20

# Borrar acme.json y reiniciar para solicitar certificado nuevo
docker exec traefik rm -f /letsencrypt/acme.json
docker compose -f docker-compose.lite.yml restart traefik
```

### Backend no arranca
```bash
docker logs workplace-backend-1 --tail 30
```

### Rollback manual
```bash
cat /opt/workplace/versions/current.env
# Editar BACKEND_IMAGE y FRONTEND_IMAGE con la version anterior, luego:
source /opt/workplace/versions/current.env
export BACKEND_IMAGE=$BACKEND_CURRENT_IMAGE
export FRONTEND_IMAGE=$FRONTEND_CURRENT_IMAGE
docker compose -f docker-compose.lite.yml up -d --no-deps --force-recreate backend frontend
```

## Rotación de credenciales (Postgres / Redis / JWT)

> Los archivos `.env.dev` y `.env.local.prod` del repo estuvieron versionados con
> los mismos secretos que el `.env` real de producción (`POSTGRES_PASSWORD`,
> `REDIS_PASSWORD`, `JWT_SECRET`, `JWT_REFRESH_SECRET`). Ya se generaron valores
> nuevos para el `.env` local de este proyecto y se limpiaron los archivos
> versionados (ahora son plantillas con `CHANGE_ME_*`). **Falta aplicar los
> nuevos valores en el servidor de producción** (`/opt/workplace/.env`), que es
> independiente del repo.

Pasos en el servidor (`/opt/workplace`):

```bash
cd /opt/workplace
COMPOSE="docker compose -f docker-compose.lite.yml"

# 1. Backup del .env actual
cp .env .env.bak.$(date +%Y%m%d)

# 2. Editar .env con los nuevos valores de POSTGRES_PASSWORD, REDIS_PASSWORD,
#    JWT_SECRET y JWT_REFRESH_SECRET (los mismos que se pusieron en el .env
#    local del proyecto tras la rotación)
nano .env

# 3. Actualizar la contraseña del usuario en Postgres para que coincida
#    (si se cambia POSTGRES_PASSWORD, el usuario existente sigue teniendo la
#    contraseña vieja hasta que se actualice explícitamente)
$COMPOSE exec -T postgres psql -U workplace -d workplace_db \
  -c "ALTER USER workplace WITH PASSWORD '<NUEVO_POSTGRES_PASSWORD>';"

# 4. Si se usa pgbouncer, actualizar pgbouncer/userlist.txt con el mismo
#    password nuevo y reiniciar el contenedor
$COMPOSE restart pgbouncer   # si aplica

# 5. Reiniciar backend y redis para tomar las nuevas variables
$COMPOSE up -d --force-recreate redis backend

# 6. Verificar
$COMPOSE exec -T backend curl -sf http://localhost:3001/api/ready
$COMPOSE logs --tail 30 backend
```

**Efecto esperado**: al rotar `JWT_SECRET`/`JWT_REFRESH_SECRET`, todos los
tokens emitidos previamente quedan inválidos — todos los usuarios deberán
volver a iniciar sesión. Esto es intencional y deseable tras una exposición de
secretos.

## ENCRYPTION_KEY (2FA - cifrado de secretos TOTP en reposo)

El backend requiere una variable `ENCRYPTION_KEY`: una clave hex de 64
caracteres (32 bytes) usada con AES-256-GCM para cifrar el
`twoFactorSecret` de cada usuario antes de guardarlo en la base de datos.

```bash
# Generar una clave nueva
openssl rand -hex 32
```

- En `.env.dev` ya hay un valor de desarrollo.
- En `.env.local.prod` (plantilla) el valor es `CHANGE_ME_ENCRYPTION_KEY` —
  reemplazar con un valor generado antes de desplegar, igual que el resto de
  secretos `CHANGE_ME_*`.
- En el `.env` real del servidor de producción (`/opt/workplace/.env`),
  añadir `ENCRYPTION_KEY=<valor-generado>` (no reutilizar el valor de dev).
- **Importante**: si `ENCRYPTION_KEY` se rota después de que existan usuarios
  con 2FA activado, sus `twoFactorSecret` cifrados con la clave anterior ya
  no podrán descifrarse — esos usuarios deberán desactivar y volver a
  configurar 2FA.

## Estructura en el servidor

```
/opt/workplace/
├── docker-compose.lite.yml    # Copiado por el pipeline en cada deploy
├── .env                       # Variables de entorno (NO se sobreescribe)
├── traefik/
│   ├── traefik.yml            # Config estática (copiada por pipeline)
│   └── dynamic/               # Middlewares y TLS (copiados por pipeline)
├── scripts/deploy/
│   └── canary-traffic-split.sh  # Script de deploy (copiado por pipeline)
├── versions/
│   └── current.env            # Ultima version estable desplegada
├── backups/versions/
│   └── version_history.txt    # Historial de deploys
└── logs/
    └── deploy/                # Logs de cada deploy
```
