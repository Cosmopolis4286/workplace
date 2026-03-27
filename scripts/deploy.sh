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

# 2. Cargar variables esenciales
set -a
source .env
set +a

# 3. Verificar variables críticas
if [[ -z "${DOMAIN:-}" ]]; then
    error "DOMAIN no está definido en .env"
    exit 1
fi

if [[ -z "${EMAIL:-}" ]]; then
    error "EMAIL no está definido en .env (necesario para Let's Encrypt)"
    exit 1
fi

success "Variables de entorno cargadas"

# 4. Crear estructura de directorios
log "📁 Creando estructura de directorios..."
mkdir -p backups
mkdir -p logs
mkdir -p traefik_letsencrypt
mkdir -p traefik/ssl
success "Directorios creados"

# 5. Fijar permisos de acme.json (CRÍTICO para Let's Encrypt)
log "🔐 Configurando permisos de Let's Encrypt..."
if [[ ! -f "traefik_letsencrypt/acme.json" ]]; then
    touch traefik_letsencrypt/acme.json
fi
chmod 600 traefik_letsencrypt/acme.json
success "Permisos acme.json: 600"

# 6. Verificar Docker y Docker Compose
log "🐳 Verificando Docker..."
if ! command -v docker &> /dev/null; then
    error "Docker no está instalado"
    exit 1
fi

if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
    error "Docker Compose no está instalado"
    exit 1
fi
success "Docker disponible"

# 7. Detener servicios existentes (si hay)
log "🛑 Deteniendo servicios existentes..."
docker-compose -f docker-compose.lite.yml down --remove-orphans 2>/dev/null || true
docker compose -f docker-compose.lite.yml down --remove-orphans 2>/dev/null || true
success "Servicios detenidos"

# 8. Limpiar imágenes antiguas (opcional pero recomendado)
log "🧹 Limpiando recursos Docker antiguos..."
docker system prune -f --volumes 2>/dev/null || true
success "Limpieza completada"

# 9. Build de imágenes
log "🔨 Construyendo imágenes..."
docker-compose -f docker-compose.lite.yml build --no-cache
success "Imágenes construidas"

# 10. Iniciar servicios en orden
log "▶️ Iniciando servicios..."
docker-compose -f docker-compose.lite.yml up -d

# 11. Esperar a que PostgreSQL esté listo
log "⏳ Esperando PostgreSQL..."
for i in {1..30}; do
    if docker-compose -f docker-compose.lite.yml exec -T postgres pg_isready -U "$POSTGRES_USER" &>/dev/null; then
        success "PostgreSQL listo"
        break
    fi
    echo -n "."
    sleep 2
done

# 12. Ejecutar migraciones
log "🔄 Ejecutando migraciones..."
docker-compose -f docker-compose.lite.yml exec -T backend npm run migrate:deploy || {
    warn "No se pudieron ejecutar migraciones automáticamente"
    warn "Ejecuta manualmente: docker-compose -f docker-compose.lite.yml exec backend npm run migrate:deploy"
}

# 13. Esperar healthchecks
log "🏥 Verificando healthchecks..."
sleep 10

SERVICES=("traefik" "postgres" "redis" "backend" "frontend")
ALL_HEALTHY=true

for service in "${SERVICES[@]}"; do
    status=$(docker-compose -f docker-compose.lite.yml ps -q "$service" 2>/dev/null || echo "")
    if [[ -n "$status" ]]; then
        health=$(docker inspect --format='{{.State.Health.Status}}' "$status" 2>/dev/null || echo "no healthcheck")
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

# 14. Mostrar estado final
log "📊 Estado del deploy:"
echo ""
docker-compose -f docker-compose.lite.yml ps

echo ""
log "🌐 URLs de acceso:"
echo "  Frontend: https://${DOMAIN}"
echo "  API:      https://api.${DOMAIN}"
echo ""

if [[ "$ALL_HEALTHY" == true ]]; then
    success "🎉 Deploy completado exitosamente!"
    log "Backups automáticos: 2:00 AM diarios"
    log "Logs: docker-compose -f docker-compose.lite.yml logs -f"
else
    warn "⚠️ Algunos servicios no están healthy. Revisa los logs:"
    log "docker-compose -f docker-compose.lite.yml logs -f"
    exit 1
fi
