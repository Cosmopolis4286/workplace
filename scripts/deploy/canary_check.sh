#!/bin/bash
set -euo pipefail

# Variables
export BACKEND_IMAGE=${BACKEND_IMAGE}
export CURRENT_SHA=${CURRENT_SHA}
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

function setup_canary() {
  echo "🚀 Iniciando Canary Deploy real (paralelo)..."
  
  # Obtener nombre real de la red
  local NETWORK_NAME=$(docker compose ps -q backend | xargs docker inspect --format '{{range $k,$v := .NetworkSettings.Networks}}{{$k}}{{end}}' 2>/dev/null || echo "app_network")
  echo "🌐 Usando red: $NETWORK_NAME"
  
  # Crear directorio de logs
  mkdir -p $LOG_DIR
  
  # Levantar canary
  docker run -d \
    --name workplace_backend_canary \
    --network $NETWORK_NAME \
    --restart unless-stopped \
    --memory 512m \
    --cpus 0.5 \
    --log-driver json-file \
    --log-opt max-size=10m \
    --log-opt max-file=3 \
    --env-file /opt/workplace/.env \
    -e NODE_ENV=production \
    -e PORT=3001 \
    ${BACKEND_IMAGE}
}

function wait_canary_ready() {
  echo "⏳ Esperando health check del canary..."
  local CANARY_IP=$(docker inspect -f '{{range.NetworkSettings.Networks}}{{.IPAddress}}{{end}}' workplace_backend_canary)
  echo "🌐 Canary IP: $CANARY_IP"
  
  for i in {1..30}; do
    if curl -f --max-time 5 --connect-timeout 3 http://$CANARY_IP:3001/api/health >/dev/null 2>&1; then
      echo "✅ Canary health check OK (intento $i/30)"
      return 0
    else
      echo "⏳ Intento $i/30 - canary no responde"
      sleep 2
    fi
  done
  
  # Guardar logs del fallo
  docker logs workplace_backend_canary --tail=50 > $LOG_DIR/canary_failure_$(date +%s).log
  echo "❌ Canary health check falló después de 60s"
  echo "📋 Logs guardados en: $LOG_DIR/canary_failure_$(date +%s).log"
  docker rm -f workplace_backend_canary
  return 1
}

function run_metrics_check() {
  echo "📊 Verificando métricas del canary (60s)..."
  local CANARY_IP=$(docker inspect -f '{{range.NetworkSettings.Networks}}{{.IPAddress}}{{end}}' workplace_backend_canary)
  
  local CANARY_SUCCESS=true
  local ERROR_COUNT=0
  local TOTAL_LATENCY=0
  local ITERATIONS=0
  
  for i in {1..12}; do
    ITERATIONS=$i
    
    # Nivel 1: Health check básico
    if ! curl -f -s http://$CANARY_IP:3001/api/health > /dev/null; then
      echo "❌ Health check falló en iteración $i"
      ERROR_COUNT=$((ERROR_COUNT + 1))
      if [ $ERROR_COUNT -gt 2 ]; then
        CANARY_SUCCESS=false
        break
      fi
    fi
    
    # Nivel 2: Version endpoint
    if ! curl -f -s http://$CANARY_IP:3001/api/version > /dev/null 2>&1; then
      echo "⚠️ Version endpoint falló en iteración $i"
      ERROR_COUNT=$((ERROR_COUNT + 1))
    fi
    
    # Nivel 3: Readiness check
    if ! curl -f -s --max-time 5 http://$CANARY_IP:3001/api/ready > /dev/null 2>&1; then
      echo "⚠️ Readiness endpoint falló en iteración $i"
    fi
    
    # Medir latencia
    local START_TIME=$(date +%s%N)
    curl -f -s http://$CANARY_IP:3001/api/health > /dev/null
    local END_TIME=$(date +%s%N)
    local LATENCY=$(( (END_TIME - START_TIME) / 1000000 ))
    
    TOTAL_LATENCY=$((TOTAL_LATENCY + LATENCY))
    
    if [ "$LATENCY" -gt 1000 ]; then
      echo "⚠️ Alta latencia detectada: ${LATENCY}ms"
      CANARY_SUCCESS=false
      break
    fi
    
    local AVG_LATENCY=$((TOTAL_LATENCY / ITERATIONS))
    echo "✅ Métrica OK ($i/12) - Latencia: ${LATENCY}ms, Promedio: ${AVG_LATENCY}ms, Errores: $ERROR_COUNT"
    sleep 5
  done
  
  # Métricas finales
  local FINAL_AVG_LATENCY=$((TOTAL_LATENCY / ITERATIONS))
  local ERROR_RATE=$((ERROR_COUNT * 100 / ITERATIONS))
  
  echo "📊 Métricas Finales Canary:"
  echo "   Latencia Promedio: ${FINAL_AVG_LATENCY}ms"
  echo "   Error Rate: ${ERROR_RATE}%"
  echo "   Errores Totales: $ERROR_COUNT/$ITERATIONS"
  
  # Guardar métricas
  cat > $LOG_DIR/canary_metrics_$(date +%s).json << EOF
{
  "timestamp": "$(date -Iseconds)",
  "sha": "$CURRENT_SHA",
  "avg_latency_ms": $FINAL_AVG_LATENCY,
  "error_rate_percent": $ERROR_RATE,
  "total_errors": $ERROR_COUNT,
  "total_iterations": $ITERATIONS,
  "success": $CANARY_SUCCESS
}
EOF
  
  # Circuit breaker
  if [ "$ERROR_RATE" -gt 50 ]; then
    echo "🚨 Circuit breaker activado - Error rate demasiado alto: ${ERROR_RATE}%"
    CANARY_SUCCESS=false
  fi
  
  # Limpiar canary
  docker rm -f workplace_backend_canary
  
  # Validación final
  if [ "$CANARY_SUCCESS" = "true" ] && [ "$ERROR_RATE" -lt 25 ] && [ "$FINAL_AVG_LATENCY" -lt 800 ]; then
    echo "✅ Canary exitoso - Métricas dentro de umbrales"
    return 0
  else
    echo "❌ Canary falló - Métricas fuera de umbrales"
    echo "   Error Rate > 25% o Latencia > 800ms"
    return 1
  fi
}

function restore_backup() {
  echo "🔄 Restaurando backup más reciente..."
  
  if [ -f ".last_backend_backup" ]; then
    local LATEST_BACKUP=$(cat .last_backend_backup)
    echo "🔄 Restaurando desde .last_backend_backup: $LATEST_BACKUP"
    docker tag $LATEST_BACKUP ${BACKEND_IMAGE}
    docker compose up -d --no-deps backend
  else
    # Fallback a búsqueda por tag
    local LATEST_BACKUP=$(docker images --format "{{.Repository}}:{{.Tag}}" | grep "workplace-backend:backup" | sort -r | head -n 1)
    if [ -n "$LATEST_BACKUP" ]; then
      docker tag $LATEST_BACKUP ${BACKEND_IMAGE}
      docker compose up -d --no-deps backend
    fi
  fi
}

# Ejecución principal
cd /opt/workplace

setup_canary
if wait_canary_ready; then
  if run_metrics_check; then
    echo "✅ Canary validation passed"
    exit 0
  else
    echo "❌ Canary validation failed - restoring backup"
    restore_backup
    exit 1
  fi
else
  echo "❌ Canary failed to start"
  exit 1
fi
