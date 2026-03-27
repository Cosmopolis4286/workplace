#!/bin/bash
# 🚀 Deploy Script - Docker Compose LITE (PROD)
# Ubicación: /opt/workplace/scripts/deploy.sh
# Uso: ./scripts/deploy.sh

set -euo pipefail

# Colores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

success() {
    echo -e "${GREEN}[✓]${NC} $1"
}

warn() {
    echo -e "${YELLOW}[⚠]${NC} $1"
}

error() {
    echo -e "${RED}[✗]${NC} $1"
}

# Detectar comando Docker Compose (v1 vs v2)
if command -v docker-compose &> /dev/null; then
    COMPOSE="docker-compose"
elif docker compose version &> /dev/null; then
    COMPOSE="docker compose"
else
    error "Docker Compose no está instalado"
    exit 1
fi

# Directorio base
WORKPLACE_DIR="/opt/workplace"
cd "$WORKPLACE_DIR"

log "🚀 Iniciando deploy de Workplace LITE..."

# 1. Verificar .env existe
if [[ ! -f ".env" ]]; then
    error "Archivo .env no encontrado"
    echo "Crea el archivo .env basado en .env.example"
    exit 1
fi
success "Archivo .env presente"

# 1.5 Limpiar BOM y CRLF
log "🧹 Limpiando formato de .env..."

# Remover BOM (UTF-8)
if [[ $(head -c 3 .env | od -An -tx1 | tr -d ' ') == "efbbbf" ]]; then
    log "  Detectado BOM, removiendo..."
    tail -c +4 .env > .env.tmp && mv .env.tmp .env
fi

# Remover CRLF
if grep -q $'\r' .env 2>/dev/null; then
    log "  Detectados caracteres CR, convirtiendo..."
    sed -i 's/\r$//' .env
fi

success ".env limpio"

# 2. Cargar variables
set -a
source .env
set +a

# 3. Validar variables críticas
if [[ -z "${DOMAIN:-}" ]]; then
    error "DOMAIN no está definido"
    exit 1
fi

if [[ -z "${EMAIL:-}" ]]; then
    error "EMAIL no está definido (Let's Encrypt)"
    exit 1
fi

success "Variables de entorno cargadas"

# 4. Crear directorios
log "📁 Creando estructura..."
mkdir -p backups logs traefik_letsencrypt traefik/ssl
success "Directorios creados"

# 5. Permisos acme.json
log "🔐 Configurando Let's Encrypt..."
if [[ ! -f "traefik_letsencrypt/acme.json" ]]; then
    touch traefik_letsencrypt/acme.json
fi
chmod 600 traefik_letsencrypt/acme.json
success "Permisos correctos"

# 6. Verificar Docker
log "🐳 Verificando Docker..."
if ! command -v docker &> /dev/null; then
    error "Docker no instalado"
    exit 1
fi
success "Docker disponible"

# 7. Detener servicios
log "🛑 Deteniendo servicios..."
$COMPOSE -f docker-compose.lite.yml down --remove-orphans 2>/dev/null || true
success "Servicios detenidos"

# 8. Limpiar Docker
log "🧹 Limpiando recursos..."
docker system prune -f --volumes 2>/dev/null || true
success "Limpieza completada"

# 9. Build
log "🔨 Construyendo imágenes..."
$COMPOSE -f docker-compose.lite.yml build --no-cache
success "Build completado"

# 10. Up
log "▶️ Iniciando servicios..."
$COMPOSE -f docker-compose.lite.yml up -d

# 11. Esperar PostgreSQL
log "⏳ Esperando PostgreSQL..."
for i in {1..30}; do
    if $COMPOSE -f docker-compose.lite.yml exec -T postgres pg_isready -U "$POSTGRES_USER" &>/dev/null; then
        success "PostgreSQL listo"
        break
    fi
    echo -n "."
    sleep 2
done

# 12. Migraciones
log "🔄 Ejecutando migraciones..."
$COMPOSE -f docker-compose.lite.yml exec -T backend npm run migrate:deploy || {
    warn "Migraciones fallaron"
}

# 13. Healthchecks
log "🏥 Verificando servicios..."
sleep 10

SERVICES=("traefik" "postgres" "redis" "backend" "frontend")
ALL_HEALTHY=true

for service in "${SERVICES[@]}"; do
    container=$($COMPOSE -f docker-compose.lite.yml ps -q "$service" 2>/dev/null || echo "")
    
    if [[ -n "$container" ]]; then
        health=$(docker inspect --format='{{.State.Health.Status}}' "$container" 2>/dev/null || echo "no healthcheck")
        
        if [[ "$health" == "healthy" ]] || [[ "$health" == "no healthcheck" ]]; then
            success "$service: $health"
        else
            error "$service: $health"
            ALL_HEALTHY=false
        fi
    else
        warn "$service: no encontrado"
    fi
done

# 14. Estado final
log "📊 Estado:"
$COMPOSE -f docker-compose.lite.yml ps

echo ""
log "🌐 URLs:"
echo "  Frontend: https://${DOMAIN}"
echo "  API:      https://${DOMAIN}/api"
echo ""

if [[ "$ALL_HEALTHY" == true ]]; then
    success "🎉 Deploy exitoso"
else
    warn "⚠️ Problemas detectados"
    log "$COMPOSE -f docker-compose.lite.yml logs -f"
    exit 1
fi