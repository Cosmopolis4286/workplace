#!/bin/bash

# deploy-lite.sh - Despliegue optimizado para recursos limitados
# Stack esencial para producción en 2CPU/4GB RAM

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to log with color
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

# Check system resources
check_resources() {
    log "🔍 Verificando recursos del sistema..."
    
    TOTAL_RAM=$(free -m | awk 'NR==2{print $2}')
    AVAILABLE_RAM=$(free -m | awk 'NR==2{print $7}')
    CPU_CORES=$(nproc)
    
    log "📊 Recursos disponibles:"
    log "   RAM Total: ${TOTAL_RAM}MB"
    log "   RAM Disponible: ${AVAILABLE_RAM}MB"
    log "   CPU Cores: ${CPU_CORES}"
    
    if [ "$TOTAL_RAM" -lt 3500 ]; then
        warn "RAM limitada (< 3.5GB). Usando stack LITE."
        COMPOSE_FILE="docker-compose.lite.yml"
    elif [ "$TOTAL_RAM" -lt 7500 ]; then
        warn "RAM moderada (3.5-7.5GB). Stack LITE recomendado."
        COMPOSE_FILE="docker-compose.lite.yml"
    else
        log "RAM suficiente (> 7.5GB). Stack completo disponible."
        COMPOSE_FILE="docker-compose.yml"
    fi
    
    if [ "$CPU_CORES" -lt 3 ]; then
        warn "CPU limitado (< 3 cores). Stack LITE forzado."
        COMPOSE_FILE="docker-compose.lite.yml"
    fi
    
    log "🚀 Usando: ${COMPOSE_FILE}"
}

# Check environment variables
check_env() {
    log "🔧 Verificando variables de entorno..."
    
    required_vars=("DOMAIN" "POSTGRES_USER" "POSTGRES_PASSWORD" "POSTGRES_DB")
    missing_vars=()
    
    for var in "${required_vars[@]}"; do
        if [ -z "${!var:-}" ]; then
            missing_vars+=("$var")
        fi
    done
    
    if [ ${#missing_vars[@]} -gt 0 ]; then
        error "Variables faltantes: ${missing_vars[*]}"
    fi
    
    log "✅ Variables de entorno OK"
}

# Backup current deployment
backup_current() {
    if [ -f "docker-compose.yml" ] && docker-compose ps -q | grep -q .; then
        log "💾 Haciendo backup del despliegue actual..."
        
        BACKUP_DIR="backups/deployments/$(date +%Y%m%d_%H%M%S)"
        mkdir -p "$BACKUP_DIR"
        
        # Backup configs
        cp docker-compose.yml "$BACKUP_DIR/" 2>/dev/null || true
        cp .env "$BACKUP_DIR/" 2>/dev/null || true
        cp -r traefik "$BACKUP_DIR/" 2>/dev/null || true
        
        # Backup volumes ( PostgreSQL only for lite)
        if [ "$COMPOSE_FILE" = "docker-compose.lite.yml" ]; then
            log "   Backup PostgreSQL..."
            docker exec postgres pg_dump -U "${POSTGRES_USER}" "${POSTGRES_DB}" > "$BACKUP_DIR/postgres_backup.sql" 2>/dev/null || true
        fi
        
        log "✅ Backup guardado en: $BACKUP_DIR"
    fi
}

# Deploy application
deploy() {
    log "🚀 Iniciando despliegue..."
    
    # Stop current services
    if docker-compose ps -q | grep -q .; then
        log "🛑 Deteniendo servicios actuales..."
        docker-compose down
    fi
    
    # Clean up unused resources
    log "🧹 Limpiando recursos no utilizados..."
    docker system prune -f --volumes
    
    # Pull latest images
    log "📦 Descargando imágenes actualizadas..."
    docker-compose -f "$COMPOSE_FILE" pull
    
    # Start services
    log "🔄 Iniciando servicios optimizados..."
    docker-compose -f "$COMPOSE_FILE" up -d
    
    # Wait for services to be healthy
    log "⏳ Esperando que servicios estén saludables..."
    sleep 30
    
    # Check service health
    check_health
}

# Check service health
check_health() {
    log "🏥 Verificando salud de servicios..."
    
    services=("traefik" "backend" "frontend" "postgres" "redis")
    unhealthy_services=()
    
    for service in "${services[@]}"; do
        if docker-compose -f "$COMPOSE_FILE" ps "$service" | grep -q "Up (healthy)"; then
            log "✅ $service - saludable"
        elif docker-compose -f "$COMPOSE_FILE" ps "$service" | grep -q "Up"; then
            warn "⚠️ $service - iniciando..."
            unhealthy_services+=("$service")
        else
            error "❌ $service - fallido"
        fi
    done
    
    if [ ${#unhealthy_services[@]} -gt 0 ]; then
        warn "Servicios iniciando: ${unhealthy_services[*]}"
        log "📋 Revisar logs:"
        for service in "${unhealthy_services[@]}"; do
            echo "   docker logs -f $service"
        done
    fi
}

# Show resource usage
show_resources() {
    log "📊 Consumo de recursos actual:"
    docker stats --no-stream --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.MemPerc}}"
}

# Main deployment flow
main() {
    log "🎯 Despliegue Optimizado - Stack Esencial"
    echo
    
    check_resources
    check_env
    backup_current
    deploy
    show_resources
    
    echo
    log "🎉 Despliegue completado!"
    log "🌐 Acceso a la aplicación:"
    log "   Frontend: https://${DOMAIN:-localhost}"
    log "   Backend:  https://api.${DOMAIN:-localhost}"
    echo
    
    if [ "$COMPOSE_FILE" = "docker-compose.lite.yml" ]; then
        log "💡 Stack LITE activado - Consumo optimizado para 2CPU/4GB RAM"
        log "📈 Para monitoreo: docker stats"
        log "📝 Logs: docker-compose -f docker-compose.lite.yml logs -f"
    else
        log "💡 Stack COMPLETO activado - Monitoreo completo disponible"
        log "📊 Grafana: https://grafana.${DOMAIN:-localhost}"
        log "📈 Prometheus: http://localhost:9090"
    fi
}

# Handle script arguments
case "${1:-}" in
    "health")
        check_health
        ;;
    "resources")
        show_resources
        ;;
    "backup")
        backup_current
        ;;
    *)
        main
        ;;
esac
