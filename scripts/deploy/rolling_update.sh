#!/bin/bash
set -euo pipefail

# Variables
export FRONTEND_IMAGE=${FRONTEND_IMAGE}
export LOG_DIR="/opt/workplace/logs/deploy"

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

function rolling_update_frontend() {
  echo "🔄 Actualizando Frontend..."
  
  # Escalar frontend a 2 instancias
  docker compose up -d --scale frontend=2 --no-deps frontend
  
  # Esperar a que AMBAS instancias estén healthy
  echo "⏳ Esperando health check de AMBAS instancias frontend..."
  local FRONTEND_IDS=$(docker compose ps -q frontend)
  local ALL_HEALTHY=true
  
  for ID in $FRONTEND_IDS; do
    if ! wait_healthy $ID 60 2; then
      echo "❌ Frontend instance $ID not healthy"
      ALL_HEALTHY=false
    fi
  done
  
  if [ "$ALL_HEALTHY" = "true" ]; then
    echo "✅ Ambas instancias frontend están healthy"
  else
    echo "❌ No todas las instancias frontend están healthy"
    return 1
  fi
  
  # Detener instancia antigua
  docker compose up -d --scale frontend=1 --no-deps frontend
  echo "✅ Rolling update frontend completado"
}

function restart_nginx() {
  echo "🔄 Reiniciando Nginx..."
  docker compose restart nginx
  
  # Esperar que nginx esté healthy
  local NGINX_ID=$(docker compose ps -q nginx)
  if [ -n "$NGINX_ID" ]; then
    wait_healthy $NGINX_ID 30 2
  fi
  echo "✅ Nginx reiniciado"
}

function configure_ssl() {
  echo "🔧 Configurando SSL..."
  
  # Crear directorio de logs si no existe
  mkdir -p $LOG_DIR
  
  # Ejecutar script de SSL con logging
  if [ -f "/opt/workplace/scripts/ssl/setup-ssl-v2.sh" ]; then
    chmod +x /opt/workplace/scripts/ssl/setup-ssl-v2.sh
    
    # Ejecutar con log de salida
    /opt/workplace/scripts/ssl/setup-ssl-v2.sh 2>&1 | tee $LOG_DIR/ssl_setup_$(date +%s).log
    echo "✅ SSL configurado - logs guardados en $LOG_DIR/ssl_setup_$(date +%s).log"
  else
    echo "⚠️ Script SSL no encontrado en /opt/workplace/scripts/ssl/setup-ssl-v2.sh"
  fi
}

function verify_final_state() {
  echo "🔍 Verificando estado final..."
  
  # Obtener IDs de contenedores
  local POSTGRES_ID=$(docker compose ps -q postgres)
  local REDIS_ID=$(docker compose ps -q redis)
  local BACKEND_ID=$(docker compose ps -q backend)
  local FRONTEND_ID=$(docker compose ps -q frontend)
  local NGINX_ID=$(docker compose ps -q nginx)
  
  # Verificar servicios críticos
  [ -n "$POSTGRES_ID" ] && wait_healthy $POSTGRES_ID 30 2 || { echo "❌ Postgres no está healthy"; return 1; }
  [ -n "$REDIS_ID" ] && wait_healthy $REDIS_ID 30 2 || { echo "❌ Redis no está healthy"; return 1; }
  [ -n "$BACKEND_ID" ] && wait_healthy $BACKEND_ID 60 2 || { echo "❌ Backend no está healthy"; return 1; }
  [ -n "$NGINX_ID" ] && wait_healthy $NGINX_ID 30 2 || { echo "❌ Nginx no está healthy"; return 1; }
  
  # Frontend es opcional
  if [ -n "$FRONTEND_ID" ]; then
    if docker compose ps frontend | grep -q "Up" && ! docker compose ps frontend | grep -q "healthy"; then
      echo "⚠️ Frontend está Up pero no healthy (nginx puede servir fallback)"
    else
      wait_healthy $FRONTEND_ID 60 2 || echo "⚠️ Frontend no está healthy"
    fi
  fi
  
  echo "✅ Todos los servicios están healthy!"
  
  # Guardar estado final
  docker compose ps > $LOG_DIR/final_state_$(date +%s).log
  echo "📋 Estado final guardado en $LOG_DIR/final_state_$(date +%s).log"
}

# Ejecución principal
cd /opt/workplace

# Ejecutar fases del rolling update
rolling_update_frontend
restart_nginx
configure_ssl
verify_final_state

echo "✅ Rolling Update completado exitosamente!"
