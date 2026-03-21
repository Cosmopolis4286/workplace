# GitHub Actions Workflows

## Overview

Este repositorio utiliza GitHub Actions para CI/CD con los siguientes flujos:

## Workflows

### 1. `deploy.yml` - Producción
- **Trigger**: Push a `main`
- **Acciones**:
  - Tests completos
  - Build de imagen Docker
  - Deploy a producción
  - Migraciones automáticas
  - Health checks
  - Rollback automático si falla

### 2. `dev.yml` - Desarrollo
- **Trigger**: Push a `develop`
- **Acciones**:
  - Tests de desarrollo
  - Deploy a ambiente de desarrollo
  - Migraciones automáticas

### 3. `pr-validation.yml` - Validación de PRs
- **Trigger**: Pull Requests
- **Acciones**:
  - Type checking
  - Linting
  - Security audit
  - Validación de migraciones
  - Tests unitarios
  - Análisis de bundle size

## Setup de Secrets

### 1. Secrets de GitHub
Configura estos secrets en tu repositorio:

#### Producción
```
PRODUCTION_HOST        # Servidor de producción
PRODUCTION_USER        # Usuario SSH  
PRODUCTION_SSH_KEY     # Llave SSH privada
SLACK_WEBHOOK_URL      # Webhook para notificaciones (opcional)
```

#### Desarrollo
```
DEV_HOST              # Servidor de desarrollo
DEV_USER              # Usuario SSH
DEV_SSH_KEY           # Llave SSH privada
```

### 2. Variables de Entorno
Crea un archivo `.env` en el root del proyecto:

```bash
# Database
POSTGRES_USER=workplace
POSTGRES_PASSWORD=your_secure_password
POSTGRES_DB=workplace

# Redis
REDIS_PASSWORD=your_redis_password

# Backend
NODE_ENV=production
NODE_PORT=3001

# Frontend
FRONTEND_PORT=3000
BACKEND_API_URL=http://localhost:3001/api
NITRO_HOST=localhost
```

**Importante:**
- El archivo `.env` NO se sube al repositorio (está en .gitignore)
- Copia este archivo manualmente al servidor de producción
- Usa contraseñas seguras en producción

### 3. Configuración de Servidores

#### Docker Compose - Diferencia entre entornos

**docker-compose.yml** (Desarrollo):
```yaml
backend:
  build:                    # ← Construye desde código fuente
    context: .
    dockerfile: backend/Dockerfile
```
- ✅ Para desarrollo local
- ✅ Construye imágenes desde Dockerfiles
- ❌ Requiere todo el código fuente
- ❌ No funciona en producción

**docker-compose.prod.yml** (Producción):
```yaml
backend:
  image: workplace-backend:latest  # ← Usa imágenes pre-construidas
```
- ✅ Para producción y staging
- ✅ Solo descarga imágenes de Docker Hub
- ✅ No requiere código fuente
- ✅ Más rápido y ligero

#### Servidor de Producción
```bash
# Crear directorio
sudo mkdir -p /opt/workplace
cd /opt/workplace

# Copiar docker-compose de producción (NO el de desarrollo)
scp docker-compose.prod.yml user@server:/opt/workplace/docker-compose.yml
scp .env.example user@server:/opt/workplace/.env

# Instalar Docker y Docker Compose
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh
sudo usermod -aG docker $USER

# Iniciar servicios
docker-compose up -d
```

#### Servidor de Desarrollo  
```bash
# Similar setup pero en /opt/workplace-dev
sudo mkdir -p /opt/workplace-dev
cd /opt/workplace-dev

# Usar docker-compose.yml (desarrollo)
scp docker-compose.yml user@server:/opt/workplace-dev/
```

## Flujo de Deploy

### Producción
```bash
# 1. Hacer push a main
git push origin main

# GitHub Actions ejecutará:
# ✅ Tests
# ✅ Build imagen
# ✅ Deploy a producción
# ✅ Migraciones
# ✅ Health checks
```

### Desarrollo
```bash
# 1. Hacer push a develop
git push origin develop

# GitHub Actions ejecutará:
# ✅ Tests de desarrollo
# ✅ Deploy a dev
# ✅ Migraciones
```

## Estructura de Scripts

### Migraciones en CI/CD
Las migraciones se ejecutan automáticamente en el deploy:

```yaml
# En deploy.yml
- name: Run migrations
  run: docker-compose run --rm migrate
```

### Rollback Automático
Si el deploy falla, automáticamente se hace rollback:

```yaml
# Verificación de health checks
if docker-compose ps | grep -q "healthy"; then
  echo "✅ Deployment successful!"
else
  echo "❌ Deployment failed - rolling back..."
  # Código de rollback
fi
```

## Monitoreo

### Health Checks
- **PostgreSQL**: `pg_isready`
- **Redis**: `redis-cli ping`
- **Backend**: `/api/health`

### Notificaciones
- **Slack**: Notificaciones de deploy/rollback
- **GitHub**: Comments en PRs con status

## Seguridad

### Scans Automáticos
- **Trivy**: Vulnerability scanning
- **Dependency Review**: Análisis de dependencias
- **CodeQL**: Security code analysis

### Validaciones
- **Bundle size**: Límite de 50MB
- **Migration conflicts**: Validación de migraciones
- **Type checking**: TypeScript strict mode

## Troubleshooting

### Deploy fallido
1. Revisar logs del workflow
2. Verificar health checks
3. Checar migraciones pendientes
4. Validar variables de entorno

### Rollback manual
```bash
# En servidor de producción
cd /opt/workplace
docker-compose down

# Listar backups
docker images | grep backup

# Restaurar backup más reciente
docker tag workplace-backend:backup-YYYYMMDD-HHMMSS workplace-backend:latest
docker-compose up -d
```

### Migraciones manuales
```bash
# Ejecutar migraciones manualmente
cd /opt/workplace
docker-compose run --rm migrate

# Verificar estado
docker-compose run --rm backend pnpm prisma migrate status
```

## Troubleshooting

### Desarrollo Local

#### "dependency failed to start: container workplace_backend_dev is unhealthy"
```bash
# Verificar estado de los contenedores
docker-compose ps

# Revisar logs del backend
docker-compose logs backend

# Reiniciar servicios
docker-compose down
docker-compose up --build

# Si persiste el error:
# 1. Verificar archivo .env existe
# 2. Limpiar volúmenes: docker-compose down -v
# 3. Reconstruir: docker-compose build --no-cache
```

#### "no such file or directory" en producción
```bash
# Causa: Usando docker-compose.yml (desarrollo) en producción
# Solución: Usar docker-compose.prod.yml

# Verificar qué archivo se está usando
ssh user@server "cd /opt/workplace && ls -la docker-compose*"
```

#### Permisos denegados
```bash
# Si mkdir falla en /opt/workplace:
sudo mkdir -p /opt/workplace
sudo chown $USER:$USER /opt/workplace

# O usar /home/user/workplace (sin sudo)
```

## Best Practices

### Branch Strategy
- `main`: Producción
- `develop`: Desarrollo
- `feature/*`: Features nuevos

### PR Guidelines
1. Crear PR desde feature a develop
2. Esperar validación automática
3. Revisión de código
4. Merge a develop
5. Deploy automático a desarrollo

### Release Process
1. Merge develop → main
2. Deploy automático a producción
3. Tag del release
4. Notificaciones automáticas
