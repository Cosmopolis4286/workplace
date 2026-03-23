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
  
  # Función helper para obtener imagen (local o fallback a Docker Hub)
  function get_rollback_image() {
    local backup_image=$1
    local fallback_image=$2
    
    if docker images --format "{{.Repository}}:{{.Tag}}" | grep -q "^$backup_image$"; then
      echo "✅ Usando backup local: $backup_image"
      echo "$backup_image"
    else
      echo "⬇️ Backup local no encontrado, intentando Docker Hub: $fallback_image"
      if docker pull "$fallback_image" 2>/dev/null; then
        echo "✅ Descargado desde Docker Hub: $fallback_image"
        echo "$fallback_image"
      else
        echo "❌ Imagen no encontrada localmente ni en Docker Hub"
        echo "� Buscando imágenes disponibles:"
        docker images --format "{{.Repository}}:{{.Tag}}" | grep -E "(workplace|backup)" || echo "No hay imágenes workplace/backup"
        return 1
      fi
    fi
  }
  
  # Determinar imágenes a usar (local o Docker Hub)
  BACKEND_IMAGE_TO_USE=$(get_rollback_image "$BACKUP_BACKEND" "$DOCKER_USERNAME/workplace-backend:latest")
  FRONTEND_IMAGE_TO_USE=$(get_rollback_image "$BACKUP_FRONTEND" "$DOCKER_USERNAME/workplace-frontend:latest")
  
  if [ -z "$BACKEND_IMAGE_TO_USE" ] || [ -z "$FRONTEND_IMAGE_TO_USE" ]; then
    echo "❌ No se pudieron obtener imágenes para rollback"
    return 1
  fi
  
  # Iniciar backend con imagen determinada
  echo "🔄 Iniciando backend con: $BACKEND_IMAGE_TO_USE"
  docker run -d --name workplace_backend_rollback \
    --network workplace_app_network \
    --env-file .env \
    -e NODE_ENV=production \
    -e PORT=${NODE_PORT:-3001} \
    -e DATABASE_URL=postgresql://${POSTGRES_USER:-workplace}:${POSTGRES_PASSWORD:-workplace_secret}@postgres:5432/${POSTGRES_DB:-workplace_db} \
    -e REDIS_HOST=redis \
    -e REDIS_PORT=6379 \
    -e REDIS_PASSWORD=${REDIS_PASSWORD:-redis_secret} \
    -v workplace_uploads_data:/app/backend/uploads \
    --restart unless-stopped \
    $BACKEND_IMAGE_TO_USE
  
  # Iniciar frontend con imagen determinada
  echo "🔄 Iniciando frontend con: $FRONTEND_IMAGE_TO_USE"
  docker run -d --name workplace_frontend_rollback \
    --network workplace_app_network \
    -e BACKEND_API_URL=http://workplace_backend_rollback:3001/api \
    -e NITRO_HOST=0.0.0.0 \
    -e NITRO_PORT=${FRONTEND_PORT:-3000} \
    --restart unless-stopped \
    $FRONTEND_IMAGE_TO_USE
  
  # Iniciar nginx (usando configuración existente)
  echo "🔄 Iniciando nginx..."
  docker compose up -d --no-deps nginx
  
  # Actualizar nginx config para apuntar a los contenedores de rollback
  echo "🔄 Actualizando configuración nginx para rollback..."
  
  # Crear config temporal para nginx
  cat > nginx/conf.d/rollback.conf << 'EOF'
# Configuración de rollback - apunta a contenedores de backup
upstream backend_rollback {
    server workplace_backend_rollback:3001;
}

upstream frontend_rollback {
    server workplace_frontend_rollback:3000;
}

server {
    listen 80;
    server_name localhost;
    
    location / {
        proxy_pass http://frontend_rollback;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    location /api/ {
        proxy_pass http://backend_rollback;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
EOF
  
  # Reiniciar nginx para cargar nueva config
  docker compose restart nginx
  
  echo "⏳ Esperando que los servicios inicien..."
  sleep 30
  
  echo "✅ Servicios iniciados con rollback (estrategia híbrida: local + Docker Hub)"
}

function verify_rollback() {
  echo "🔍 Verificando estado post-rollback..."
  
  # Obtener IDs de contenedores (usando nombres de rollback)
  local POSTGRES_ID=$(docker compose ps -q postgres)
  local REDIS_ID=$(docker compose ps -q redis)
  local BACKEND_ID=$(docker ps -q --filter "name=workplace_backend_rollback")
  local NGINX_ID=$(docker compose ps -q nginx)
  local FRONTEND_ID=$(docker ps -q --filter "name=workplace_frontend_rollback")
  
  # Verificar servicios críticos
  [ -n "$POSTGRES_ID" ] && wait_healthy $POSTGRES_ID 30 2 || { echo "❌ Postgres no está healthy después de rollback"; return 1; }
  [ -n "$REDIS_ID" ] && wait_healthy $REDIS_ID 30 2 || { echo "❌ Redis no está healthy después de rollback"; return 1; }
  [ -n "$BACKEND_ID" ] && wait_healthy $BACKEND_ID 60 2 || { echo "❌ Backend no está healthy después de rollback"; return 1; }
  [ -n "$NGINX_ID" ] && wait_healthy $NGINX_ID 30 2 || { echo "❌ Nginx no está Up después de rollback"; return 1; }
  
  # Frontend es opcional
  if [ -n "$FRONTEND_ID" ]; then
    if docker ps --filter "name=workplace_frontend_rollback" --filter "status=running" | grep -q "healthy"; then
      echo "✅ Frontend está healthy después de rollback"
    else
      echo "⚠️ Frontend no está healthy después de rollback (nginx puede servir fallback)"
    fi
  fi
  
  # Guardar estado post-rollback
  docker compose ps > $LOG_DIR/post_rollback_state_$(date +%s).log
  docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Image}}" >> $LOG_DIR/post_rollback_state_$(date +%s).log
  
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
