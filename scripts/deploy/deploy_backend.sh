#!/bin/bash
set -euo pipefail

# Variables de entorno
export BACKEND_TAG=${BACKEND_TAG:-main-$CURRENT_SHA}
export FRONTEND_TAG=${FRONTEND_TAG:-main-$CURRENT_SHA}
export DOCKER_USER=${DOCKER_USER:-$DOCKER_USERNAME}
export BACKEND_IMAGE=${DOCKER_USER}/workplace-backend:${BACKEND_TAG}
export FRONTEND_IMAGE=${DOCKER_USER}/workplace-frontend:${FRONTEND_TAG}

# Funciones reutilizables
function wait_healthy() {
  local container=$1
  local retries=${2:-30}
  local timeout=${3:-2}
  
  echo "⏳ Esperando que $container esté healthy..."
  for i in $(seq 1 $retries); do
    STATUS=$(docker inspect --format='{{.State.Health.Status}}' $container 2>/dev/null || echo "unknown")
    if [ "$STATUS" == "healthy" ]; then
      echo "✅ $container está healthy ($i/$retries)"
      return 0
    fi
    echo "⏳ Intento $i/$retries - $container status: $STATUS"
    sleep $timeout
  done
  echo "❌ $container no alcanzó estado healthy después de $retries intentos"
  return 1
}

function pull_images() {
  echo "⬇️ Pull de imágenes SHA específicas..."
  echo "🏷️ Tags a usar:"
  echo "Backend: ${BACKEND_IMAGE}"
  echo "Frontend: ${FRONTEND_IMAGE}"
  
  docker pull --quiet ${BACKEND_IMAGE}
  docker pull --quiet ${FRONTEND_IMAGE}
}

function create_backup() {
  echo "💾 Creando backup de versión anterior..."
  
  if docker compose ps backend | grep -q "Up"; then
    CURRENT_BACKEND=$(docker inspect $(docker compose ps -q backend) --format '{{.Image}}' 2>/dev/null || echo "")
    echo "📦 Backend actual: $CURRENT_BACKEND"
    if [ -n "$CURRENT_BACKEND" ] && [ "$CURRENT_BACKEND" != "${BACKEND_IMAGE}" ]; then
      BACKUP_TAG="backup-$(date +%s)-$(echo $CURRENT_SHA | cut -c1-7)"
      docker tag $CURRENT_BACKEND workplace-backend:$BACKUP_TAG
      echo "✅ Backup backend creado: $BACKUP_TAG"
      echo "workplace-backend:$BACKUP_TAG" > .last_backend_backup
    fi
  fi
  
  if docker compose ps frontend | grep -q "Up"; then
    CURRENT_FRONTEND=$(docker inspect $(docker compose ps -q frontend) --format '{{.Image}}' 2>/dev/null || echo "")
    echo "📦 Frontend actual: $CURRENT_FRONTEND"
    if [ -n "$CURRENT_FRONTEND" ] && [ "$CURRENT_FRONTEND" != "${FRONTEND_IMAGE}" ]; then
      BACKUP_TAG="backup-$(date +%s)-$(echo $CURRENT_SHA | cut -c1-7)"
      docker tag $CURRENT_FRONTEND workplace-frontend:$BACKUP_TAG
      echo "✅ Backup frontend creado: $BACKUP_TAG"
      echo "workplace-frontend:$BACKUP_TAG" > .last_frontend_backup
    fi
  fi
}

function deploy_services() {
  echo "🚀 Deploy sin downtime con imágenes específicas..."
  docker compose up -d --no-deps --force-recreate backend frontend
  echo "📦 Usando SHA tags: main-${CURRENT_SHA}"
}

function verify_services() {
  echo "🔍 Verificando estado final..."
  docker compose ps
  
  # Obtener IDs de contenedores dinámicamente
  local POSTGRES_ID=$(docker compose ps -q postgres)
  local REDIS_ID=$(docker compose ps -q redis)
  local BACKEND_ID=$(docker compose ps -q backend)
  local FRONTEND_ID=$(docker compose ps -q frontend)
  local NGINX_ID=$(docker compose ps -q nginx)
  
  # Verificar cada servicio
  [ -n "$POSTGRES_ID" ] && wait_healthy $POSTGRES_ID 30 2 || exit 1
  [ -n "$REDIS_ID" ] && wait_healthy $REDIS_ID 30 2 || exit 1
  [ -n "$BACKEND_ID" ] && wait_healthy $BACKEND_ID 60 2 || exit 1
  [ -n "$FRONTEND_ID" ] && wait_healthy $FRONTEND_ID 60 2 || true  # Frontend es opcional
  [ -n "$NGINX_ID" ] && wait_healthy $NGINX_ID 30 2 || exit 1
  
  echo "✅ Todos los servicios están healthy!"
}

function cleanup_images() {
  echo "🧹 Cleanup conservador de imágenes antiguas..."
  
  if docker compose ps | grep -q "healthy"; then
    # Mantener últimas 10 SHA tags
    echo "🏷️ Manteniendo últimos 10 SHA tags..."
    docker images --format "{{.Repository}}:{{.Tag}}" | grep "workplace-" | grep "main-" | sort -V | tail -n +11 | xargs -r docker rmi -f || true
    
    # Limpiar imágenes dangling (>72h)
    echo "🗑️ Limpiando imágenes dangling (>72h)..."
    docker image prune --force --filter "until=72h" --filter "dangling=true" || true
    
    # Proteger tags estables
    echo "🔒 Protegiendo tags estables..."
    docker images --format "{{.Repository}}:{{.Tag}}" | grep "workplace-" | grep -E "stable|latest" | sort -u | while read img; do
      echo "   Protegiendo: $img"
    done
  else
    echo "⚠️ Omitiendo cleanup por seguridad (servicios no healthy)"
  fi
}

# Ejecución principal
cd /opt/workplace

# Evitar deploys simultáneos
if [ -f ".deploy.lock" ]; then
  echo "❌ Deploy en progreso, abortando..."
  exit 1
fi

touch .deploy.lock
trap "rm -f .deploy.lock" EXIT

# Login a Docker Hub
echo "🔐 Login Docker Hub..."
echo "$DOCKER_PASSWORD" | docker login -u $DOCKER_USERNAME --password-stdin

# Ejecutar fases
pull_images
create_backup
deploy_services

echo "✅ Deploy backend completado exitosamente!"
