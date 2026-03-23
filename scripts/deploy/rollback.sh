#!/bin/bash
set -euo pipefail

# Variables
export DOCKER_USERNAME=${DOCKER_USERNAME}
export LOG_DIR="/opt/workplace/logs/deploy"
export BACKUP_DIR="/opt/workplace/backups"

# Funciones
function wait_healthy() {
  local container=$1
  local retries=${2:-30}
  local timeout=${3:-2}
  
  for i in $(seq 1 $retries); do
    STATUS=$(docker inspect --format='{{.State.Health.Status}}' $container 2>/dev/null || echo "unknown")
    if [ "$STATUS" == "healthy" ]; then
      echo "✅ $container está healthy ($i/$retries)"
      return 0
    fi
    echo "⏳ Intento $i/$retries - $container status: $STATUS"
    sleep $timeout
  done
  return 1
}

function find_latest_backup() {
  echo "🔍 Buscando backup más reciente..."
  
  # Crear directorio de backups si no existe
  mkdir -p $BACKUP_DIR
  
  # Buscar backend backup
  if [ -f ".last_backend_backup" ]; then
    BACKUP_BACKEND=$(cat .last_backend_backup)
    echo "📦 Backend backup desde .last_backend_backup: $BACKUP_BACKEND"
  else
    BACKUP_BACKEND=$(docker images --format "{{.Repository}}:{{.Tag}}" | grep "workplace-backend:backup" | sort -r | head -n 1)
    echo "📦 Backend backup por búsqueda: $BACKUP_BACKEND"
  fi
  
  # Buscar frontend backup
  if [ -f ".last_frontend_backup" ]; then
    BACKUP_FRONTEND=$(cat .last_frontend_backup)
    echo "📦 Frontend backup desde .last_frontend_backup: $BACKUP_FRONTEND"
  else
    BACKUP_FRONTEND=$(docker images --format "{{.Repository}}:{{.Tag}}" | grep "workplace-frontend:backup" | sort -r | head -n 1)
    echo "📦 Frontend backup por búsqueda: $BACKUP_FRONTEND"
  fi
  
  if [ -z "$BACKUP_BACKEND" ] || [ -z "$BACKUP_FRONTEND" ]; then
    echo "❌ No se encontraron backups para rollback"
    echo "Backups disponibles:"
    docker images --format "{{.Repository}}:{{.Tag}}" | grep backup || echo "No hay backups"
    return 1
  fi
  
  echo "📦 Usando backups:"
  echo "Backend: $BACKUP_BACKEND"
  echo "Frontend: $BACKUP_FRONTEND"
  
  return 0
}

function stop_services() {
  echo "🔄 Deteniendo servicios actuales..."
  
  # Guardar estado actual antes de detener
  docker compose ps > $LOG_DIR/pre_rollback_state_$(date +%s).log
  
  # Detener todos los servicios
  docker compose down
  
  echo "✅ Servicios detenidos"
}

function create_rollback_images() {
  echo "🔄 Creando imágenes de rollback..."
  
  local ROLLBACK_TIMESTAMP=$(date +%s)
  
  # Crear tags de rollback con timestamp
  docker tag $BACKUP_BACKEND $DOCKER_USERNAME/workplace-backend:rollback-$ROLLBACK_TIMESTAMP
  docker tag $BACKUP_FRONTEND $DOCKER_USERNAME/workplace-frontend:rollback-$ROLLBACK_TIMESTAMP
  
  # Guardar información del rollback
  cat > $BACKUP_DIR/rollback_$ROLLBACK_TIMESTAMP.json << EOF
{
  "timestamp": "$(date -Iseconds)",
  "rollback_timestamp": $ROLLBACK_TIMESTAMP,
  "backend_backup": "$BACKUP_BACKEND",
  "frontend_backup": "$BACKUP_FRONTEND",
  "backend_rollback_tag": "$DOCKER_USERNAME/workplace-backend:rollback-$ROLLBACK_TIMESTAMP",
  "frontend_rollback_tag": "$DOCKER_USERNAME/workplace-frontend:rollback-$ROLLBACK_TIMESTAMP"
}
EOF
  
  echo "✅ Imágenes de rollback creadas con timestamp: $ROLLBACK_TIMESTAMP"
}

function start_rollback_services() {
  echo "🚀 Iniciando servicios con rollback..."
  
  # Iniciar servicios básicos primero (sin migrate)
  docker compose up -d postgres redis
  
  # Esperar que las bases de datos estén ready
  echo "⏳ Esperando bases de datos..."
  sleep 10
  
  # Iniciar backend y frontend (omitir migrate)
  docker compose up -d backend frontend nginx
  
  echo "⏳ Esperando que los servicios inicien..."
  sleep 30
  
  echo "✅ Servicios iniciados con rollback (migraciones omitidas)"
}

function verify_rollback() {
  echo "🔍 Verificando estado post-rollback..."
  
  # Obtener IDs de contenedores
  local POSTGRES_ID=$(docker compose ps -q postgres)
  local REDIS_ID=$(docker compose ps -q redis)
  local BACKEND_ID=$(docker compose ps -q backend)
  local NGINX_ID=$(docker compose ps -q nginx)
  local FRONTEND_ID=$(docker compose ps -q frontend)
  
  # Verificar servicios críticos
  [ -n "$POSTGRES_ID" ] && wait_healthy $POSTGRES_ID 30 2 || { echo "❌ Postgres no está healthy después de rollback"; return 1; }
  [ -n "$REDIS_ID" ] && wait_healthy $REDIS_ID 30 2 || { echo "❌ Redis no está healthy después de rollback"; return 1; }
  [ -n "$BACKEND_ID" ] && wait_healthy $BACKEND_ID 60 2 || { echo "❌ Backend no está healthy después de rollback"; return 1; }
  [ -n "$NGINX_ID" ] && wait_healthy $NGINX_ID 30 2 || { echo "❌ Nginx no está Up después de rollback"; return 1; }
  
  # Frontend es opcional
  if [ -n "$FRONTEND_ID" ]; then
    if docker compose ps frontend | grep -q "Up" && ! docker compose ps frontend | grep -q "healthy"; then
      echo "⚠️ Frontend Up pero no healthy después de rollback (nginx puede servir fallback)"
    else
      wait_healthy $FRONTEND_ID 60 2 || echo "⚠️ Frontend no está healthy después de rollback"
    fi
  fi
  
  # Guardar estado post-rollback
  docker compose ps > $LOG_DIR/post_rollback_state_$(date +%s).log
  
  echo "✅ Rollback verificado exitosamente!"
  return 0
}

function cleanup_failed_images() {
  echo "🧹 Limpiando imágenes fallidas..."
  
  # Limpiar imágenes dangling
  docker image prune -f
  
  # Guardar estado final de imágenes
  docker images --format "table {{.Repository}}\t{{.Tag}}\t{{.Size}}\t{{.CreatedAt}}" > $LOG_DIR/images_post_rollback_$(date +%s).log
  
  echo "✅ Cleanup completado"
}

# Ejecución principal
cd /opt/workplace

# Crear directorios necesarios
mkdir -p $LOG_DIR $BACKUP_DIR

# Ejecutar fases del rollback
if find_latest_backup; then
  stop_services
  create_rollback_images
  start_rollback_services
  
  if verify_rollback; then
    echo "✅ Rollback completado exitosamente!"
    echo "🎉 Servicios restaurados a versión anterior"
    cleanup_failed_images
  else
    echo "❌ Falló verificación del rollback"
    exit 1
  fi
else
  echo "❌ No se pudo completar el rollback - no se encontraron backups"
  exit 1
fi
