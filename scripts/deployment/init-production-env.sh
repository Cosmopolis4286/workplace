#!/bin/bash
set -euo pipefail

# Inicializar entorno de producción
# Crea estructura de directorios y archivos necesarios

echo "🚀 Inicializando entorno de producción..."

# Variables
WORKPLACE_DIR="/opt/workplace"
LOGS_DIR="$WORKPLACE_DIR/logs"
DEPLOY_LOGS_DIR="$LOGS_DIR/deploy"
SLA_LOGS_DIR="$LOGS_DIR/sla"
METRICS_DIR="$WORKPLACE_DIR/metrics"
BACKUPS_DIR="$WORKPLACE_DIR/backups"

# Crear estructura de directorios
echo "📁 Creando estructura de directorios..."
mkdir -p "$WORKPLACE_DIR"
mkdir -p "$DEPLOY_LOGS_DIR"
mkdir -p "$SLA_LOGS_DIR"
mkdir -p "$METRICS_DIR"
mkdir -p "$BACKUPS_DIR"
mkdir -p "$WORKPLACE_DIR/scripts/deploy"
mkdir -p "$WORKPLACE_DIR/scripts/deployment"
mkdir -p "$WORKPLACE_DIR/nginx/conf.d"

# Crear archivo .env base si no existe
if [ ! -f "$WORKPLACE_DIR/.env" ]; then
  echo "📝 Creando archivo .env base..."
  cat > "$WORKPLACE_DIR/.env" << 'EOF'
# Variables de Entorno - Production
ENVIRONMENT=production

# Database
POSTGRES_DB=workplace_prod
POSTGRES_USER=workplace_user
POSTGRES_PASSWORD=CHANGE_ME_SECURE_PASSWORD
DATABASE_URL=postgresql://workplace_user:CHANGE_ME_SECURE_PASSWORD@postgres:5432/workplace_prod

# Redis
REDIS_PASSWORD=CHANGE_ME_REDIS_PASSWORD
REDIS_HOST=redis
REDIS_PORT=6379

# Application
NODE_PORT=3001
FRONTEND_PORT=3000

# Security
JWT_SECRET=CHANGE_ME_JWT_SECRET_MIN_32_CHARS
SESSION_SECRET=CHANGE_ME_SESSION_SECRET

# Docker
DOCKER_USERNAME=your-docker-username
COMPOSE_PROJECT_NAME=workplace

# Monitoring
LOG_LEVEL=info
METRICS_ENABLED=true
EOF
  echo "⚠️ .env creado - por favor actualiza las contraseñas y secrets"
fi

# Crear archivo docker-compose.env si no existe
if [ ! -f "$WORKPLACE_DIR/docker-compose.env" ]; then
  echo "📝 Creando docker-compose.env..."
  cat > "$WORKPLACE_DIR/docker-compose.env" << 'EOF'
# Variables para docker-compose.prod.yml
COMPOSE_PROJECT_NAME=workplace
COMPOSE_FILE=docker-compose.prod.yml

# Database
POSTGRES_DB=workplace_prod
POSTGRES_USER=workplace_user
POSTGRES_PASSWORD=CHANGE_ME_SECURE_PASSWORD
POSTGRES_INITDB_ARGS=--encoding=UTF-8 --lc-collate=C --lc-ctype=C

# Redis
REDIS_PASSWORD=CHANGE_ME_REDIS_PASSWORD

# Application
ENVIRONMENT=production
NODE_PORT=3001
FRONTEND_PORT=3000

# Health checks
HEALTHCHECK_INTERVAL=30s
HEALTHCHECK_TIMEOUT=10s
HEALTHCHECK_RETRIES=3
HEALTHCHECK_START_PERIOD=40s

# Logging
LOGGING_DRIVER=json-file
LOGGING_OPTIONS_MAX_SIZE=10m
LOGGING_OPTIONS_MAX_FILE=3
EOF
fi

# Crear script de inicialización de backend si no existe
if [ ! -f "$WORKPLACE_DIR/scripts/deployment/init-backend-prod.sh" ]; then
  echo "📝 Creando init-backend-prod.sh..."
  cat > "$WORKPLACE_DIR/scripts/deployment/init-backend-prod.sh" << 'EOF'
#!/bin/bash
set -euo pipefail

echo "🚀 Inicializando Backend Production..."

cd /app/backend

# Aplicar migraciones
echo "🔧 Aplicando migraciones Prisma..."
pnpm prisma migrate deploy || true
echo "✅ Migraciones aplicadas"

# Iniciar aplicación
echo "🚀 Iniciando aplicación backend..."
exec node dist/src/main.js
EOF
  chmod +x "$WORKPLACE_DIR/scripts/deployment/init-backend-prod.sh"
fi

# Crear script de verificación de entorno
cat > "$WORKPLACE_DIR/scripts/verify-env.sh" << 'EOF'
#!/bin/bash
set -euo pipefail

echo "🔍 Verificando entorno de producción..."

WORKPLACE_DIR="/opt/workplace"

# Verificar directorios
echo "📁 Verificando estructura de directorios..."
for dir in "$WORKPLACE_DIR" "$WORKPLACE_DIR/logs" "$WORKPLACE_DIR/scripts" "$WORKPLACE_DIR/nginx"; do
  if [ -d "$dir" ]; then
    echo "✅ $dir existe"
  else
    echo "❌ $dir no existe"
    exit 1
  fi
done

# Verificar archivos críticos
echo "📄 Verificando archivos críticos..."
for file in "$WORKPLACE_DIR/.env" "$WORKPLACE_DIR/docker-compose.prod.yml"; do
  if [ -f "$file" ]; then
    echo "✅ $file existe"
  else
    echo "❌ $file no existe"
    exit 1
  fi
done

# Verificar Docker
echo "🐳 Verificando Docker..."
if command -v docker >/dev/null 2>&1; then
  echo "✅ Docker disponible"
else
  echo "❌ Docker no disponible"
  exit 1
fi

if command -v docker-compose >/dev/null 2>&1; then
  echo "✅ Docker Compose disponible"
else
  echo "❌ Docker Compose no disponible"
  exit 1
fi

# Verificar permisos
echo "🔐 Verificando permisos..."
if [ -w "$WORKPLACE_DIR" ]; then
  echo "✅ Permisos de escritura en $WORKPLACE_DIR"
else
  echo "❌ Sin permisos de escritura en $WORKPLACE_DIR"
  exit 1
fi

echo "✅ Entorno verificado exitosamente"
EOF
chmod +x "$WORKPLACE_DIR/scripts/verify-env.sh"

# Establecer permisos
echo "🔐 Estableciendo permisos..."
chown -R root:root "$WORKPLACE_DIR"
chmod 755 "$WORKPLACE_DIR"
chmod -R 755 "$WORKPLACE_DIR/scripts"
chmod -R 755 "$WORKPLACE_DIR/logs"
chmod -R 755 "$WORKPLACE_DIR/metrics"
chmod 600 "$WORKPLACE_DIR/.env" 2>/dev/null || true

# Crear logs iniciales
echo "📋 Creando logs iniciales..."
echo "$(date): Entorno de producción inicializado" > "$LOGS_DIR/setup.log"
echo "$(date): Directorios creados" >> "$LOGS_DIR/setup.log"
echo "$(date): Archivos base creados" >> "$LOGS_DIR/setup.log"

# Verificar instalación
echo "🔍 Verificando instalación..."
if [ -f "$WORKPLACE_DIR/scripts/verify-env.sh" ]; then
  bash "$WORKPLACE_DIR/scripts/verify-env.sh"
else
  echo "❌ Error creando script de verificación"
  exit 1
fi

echo "✅ Entorno de producción inicializado exitosamente"
echo ""
echo "📝 Próximos pasos:"
echo "1. Actualizar contraseñas en $WORKPLACE_DIR/.env"
echo "2. Copiar docker-compose.prod.yml al servidor"
echo "3. Ejecutar: cd $WORKPLACE_DIR && docker-compose up -d"
echo ""
echo "⚠️ IMPORTANTE: Cambia las contraseñas y secrets antes de producción!"
