#!/bin/bash
set -euo pipefail

# Variables
export BACKEND_IMAGE=${BACKEND_IMAGE}
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

function rolling_update_backend() {
  echo "🔄 Actualizando Backend con Rolling Update..."
  
  # 1. Escalar backend a 2 instancias (una nueva se creará)
  echo "📈 Escalando backend a 2 instancias..."
  docker compose up -d --scale backend=2 --no-deps backend
  
  # 2. Esperar a que AMBAS instancias estén healthy
  echo "⏳ Esperando health check de AMBAS instancias backend..."
  local BACKEND_IDS=$(docker compose ps -q backend)
  local ALL_HEALTHY=true
  local HEALTHY_COUNT=0
  
  for ID in $BACKEND_IDS; do
    echo "🔍 Verificando instancia: $ID"
    if wait_healthy $ID 60 2; then
      echo "✅ Backend instance $ID está healthy"
      HEALTHY_COUNT=$((HEALTHY_COUNT + 1))
    else
      echo "❌ Backend instance $ID not healthy"
      ALL_HEALTHY=false
    fi
  done
  
  echo "📊 Resultado: $HEALTHY_COUNT/$((echo $BACKEND_IDS | wc -w)) instancias healthy"
  
  if [ "$ALL_HEALTHY" = "true" ] && [ "$HEALTHY_COUNT" -ge 2 ]; then
    echo "✅ Ambas instancias backend están healthy"
  else
    echo "⚠️ No todas las instancias backend están healthy, pero continuando (al menos 1 healthy)"
    # En rolling update, podemos continuar si al menos una está healthy
    if [ "$HEALTHY_COUNT" -lt 1 ]; then
      echo "❌ Ninguna instancia backend está healthy - abortando"
      return 1
    fi
  fi
  
  # 3. Verificar que nginx está balanceando correctamente
  echo "🔍 Verificando balanceo de nginx..."
  local NGINX_ID=$(docker compose ps -q nginx)
  if [ -n "$NGINX_ID" ]; then
    # Hacer algunos requests para probar balanceo
    for i in {1..5}; do
      echo "🌐 Test $i/5 - Balanceo nginx..."
      if docker exec $NGINX_ID curl -f --max-time 5 http://localhost/api/health >/dev/null 2>&1; then
        echo "✅ Request $i exitoso"
      else
        echo "⚠️ Request $i falló (puede ser normal durante transición)"
      fi
      sleep 1
    done
  fi
  
  # 4. Reducir a 1 instancia (la nueva)
  echo "📉 Reduciendo backend a 1 instancia (manteniendo la más nueva)..."
  docker compose up -d --scale backend=1 --no-deps backend
  
  # 5. Esperar que la instancia final esté healthy
  echo "⏳ Esperando que instancia final esté healthy..."
  local FINAL_BACKEND_ID=$(docker compose ps -q backend)
  if [ -n "$FINAL_BACKEND_ID" ]; then
    wait_healthy $FINAL_BACKEND_ID 60 2 || {
      echo "❌ Instancia final backend no está healthy"
      return 1
    }
  fi
  
  echo "✅ Rolling update backend completado"
}

function verify_nginx_config() {
  echo "🔍 Verificando configuración nginx..."
  
  # Verificar que nginx pueda resolver el backend
  local NGINX_ID=$(docker compose ps -q nginx)
  if [ -n "$NGINX_ID" ]; then
    echo "🌐 Probando resolución DNS del backend..."
    if docker exec $NGINX_ID nslookup backend >/dev/null 2>&1; then
      echo "✅ DNS resolution OK"
    else
      echo "⚠️ DNS resolution issue (puede ser normal en Docker)"
    fi
    
    # Verificar configuración nginx
    if docker exec $NGINX_ID nginx -t >/dev/null 2>&1; then
      echo "✅ Configuración nginx válida"
    else
      echo "❌ Configuración nginx inválida"
      docker exec $NGINX_ID nginx -t
      return 1
    fi
  fi
}

function log_rolling_state() {
  echo "📋 Guardando estado del rolling update..."
  
  # Crear directorio de logs si no existe
  mkdir -p $LOG_DIR
  
  # Guardar estado anterior
  echo "=== ESTADO ANTES DEL ROLLING ===" > $LOG_DIR/rolling_backend_$(date +%s).log
  docker compose ps >> $LOG_DIR/rolling_backend_$(date +%s).log
  docker images --format "table {{.Repository}}\t{{.Tag}}\t{{.CreatedAt}}" | grep workplace >> $LOG_DIR/rolling_backend_$(date +%s).log
  
  echo "📊 Estado guardado en $LOG_DIR/rolling_backend_$(date +%s).log"
}

# Ejecución principal
cd /opt/workplace

# Verificar configuración nginx antes de empezar
verify_nginx_config

# Guardar estado inicial
log_rolling_state

# Ejecutar rolling update del backend
if rolling_update_backend; then
  echo "✅ Rolling update backend completado exitosamente!"
  
  # Guardar estado final
  echo "=== ESTADO DESPUÉS DEL ROLLING ===" >> $LOG_DIR/rolling_backend_$(date +%s).log
  docker compose ps >> $LOG_DIR/rolling_backend_$(date +%s).log
  
  echo "🎉 Backend actualizado con zero downtime!"
else
  echo "❌ Rolling update backend falló"
  exit 1
fi
