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
BACKEND_API_URL=http://localhost:3001
NITRO_HOST=localhost
```

### 3. Configuración de Servidores

#### Servidor de Producción
```bash
# Crear directorio
mkdir -p ~/workplace
cd ~/workplace

# Copiar docker-compose.yml y .env
scp docker-compose.yml .env production-user@production-server:~/workplace/

# Instalar Docker y Docker Compose
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh
sudo usermod -aG docker $USER

# Iniciar servicios
docker-compose up -d
```

#### Servidor de Desarrollo  
```bash
# Similar setup pero en ~/workplace-dev
mkdir -p ~/workplace-dev
cd ~/workplace-dev
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
cd ~/workplace
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
cd ~/workplace
docker-compose run --rm migrate

# Verificar estado
docker-compose run --rm backend pnpm prisma migrate status
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
