#!/bin/bash

# setup-dev-env.sh - Configuración de variables de entorno para desarrollo local

set -euo pipefail

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

log() {
    echo -e "${GREEN}[$(date '+%H:%M:%S')]${NC} $1"
}

warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
    exit 1
}

# Verificar si existe .env
if [ -f ".env" ]; then
    warn "Archivo .env ya existe. Creando backup..."
    cp .env .env.backup.$(date +%Y%m%d_%H%M%S)
fi

# Crear .env para desarrollo local
log "📝 Creando .env para desarrollo local..."

cat > .env << 'EOF'
# 🚀 Environment Variables - Development Local
# Para testing sin dominio real

# Dominio de desarrollo (localhost)
DOMAIN=localhost
EMAIL=admin@localhost

# Configuración de la app
APP_ENV=development
STAGING_MODE=true
SSL_ENABLED=false

# Puertos
NODE_PORT=3001
NITRO_PORT=3000

# Base de datos
POSTGRES_USER=workplace
POSTGRES_DB=workplace_db
POSTGRES_PASSWORD=dev_password_123

# Redis
REDIS_PASSWORD=dev_redis_123

# URLs de desarrollo
FRONTEND_URL=http://localhost:3000
BACKEND_URL=http://localhost:3001
API_URL=http://api.localhost:3001
EOF

log "✅ .env creado para desarrollo local"
log "🔧 Variables configuradas:"
echo "  DOMAIN: $DOMAIN"
echo "  EMAIL: $EMAIL"
echo "  APP_ENV: $APP_ENV"
echo "  SSL_ENABLED: $SSL_ENABLED"
echo ""

log "🚀 Para iniciar el stack:"
echo "  docker-compose -f docker-compose.lite.yml up -d --build"
echo ""
log "🌐 Para acceder:"
echo "  Frontend: http://localhost:3000"
echo "  Backend:  http://localhost:3001"
echo "  Traefik:  http://localhost (redirige a frontend)"

log "📝 Para producción real:"
echo "  1. Configurar dominio real en .env"
echo "  2. Configurar DNS A records"
echo "  3. Cambiar SSL_ENABLED=true"
echo "  4. Reiniciar stack"
