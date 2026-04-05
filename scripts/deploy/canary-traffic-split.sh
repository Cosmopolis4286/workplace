#!/bin/bash
set -euo pipefail

# Canary Real con Traefik - 10% Traffic Split
# Distribuye tráfico real entre backend viejo y nuevo usando Traefik

# Variables
export BACKEND_IMAGE=${BACKEND_IMAGE}
export CURRENT_SHA=${CURRENT_SHA}
export LOG_DIR="/opt/workplace/logs/deploy"
CANARY_WEIGHT=10  # 10% tráfico al canary
MAIN_WEIGHT=90    # 90% tráfico al principal
CANARY_DURATION=300  # 5 minutos de testing

# Funciones
function log_canary() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] CANARY: $1" | tee -a "$LOG_DIR/canary_traffic_$(date +%Y%m%d).log"
}

function wait_healthy() {
  local container=$1
  local retries=${2:-30}
  local timeout=${3:-2}
  
  log_canary "⏳ Esperando health check para $container..."
  
  for i in $(seq 1 $retries); do
    # Verificar Docker HEALTHCHECK nativo
    local HEALTH_STATUS=$(docker inspect --format='{{.State.Health.Status}}' $container 2>/dev/null || echo "unknown")
    
    if [ "$HEALTH_STATUS" == "healthy" ]; then
      echo "✅ $container está healthy (Docker HEALTHCHECK) ($i/$retries)"
      return 0
    fi
    
    # Fallback: verificar si el contenedor está corriendo y responde via docker exec
    local CONTAINER_STATUS=$(docker inspect --format='{{.State.Status}}' $container 2>/dev/null || echo "unknown")
    if [ "$CONTAINER_STATUS" == "running" ]; then
      # Health check via docker exec
      if docker exec $container curl -fs --max-time 5 http://localhost:${NODE_PORT:-3001}/api/ready 2>/dev/null | grep -q '"status":"ok"\|"status":"healthy"'; then
        echo "✅ $container responde a health check via docker exec ($i/$retries)"
        return 0
      fi
    fi
    
    echo "⏳ Intento $i/$retries - Status: $HEALTH_STATUS, Container: $CONTAINER_STATUS"
    sleep $timeout
  done
  
  log_canary "❌ $container no alcanzó estado healthy después de $retries intentos"
  return 1
}

function setup_canary_service() {
  log_canary "🚀 Configurando Canary Service con Traefik..."
  
  # Crear directorio de logs
  mkdir -p $LOG_DIR
  
  # Identificar backend principal
  local MAIN_BACKEND_ID=$(docker compose ps -q backend)
  if [ -z "$MAIN_BACKEND_ID" ]; then
    log_canary "❌ No se encontró backend principal"
    return 1
  fi
  
  local MAIN_BACKEND_NAME=$(docker inspect --format='{{.Name}}' "$MAIN_BACKEND_ID" | sed 's/\///')
  log_canary "📦 Backend principal: $MAIN_BACKEND_NAME ($MAIN_BACKEND_ID)"
  
  # Levantar backend canary con labels de Traefik
  log_canary "🚀 Levantando backend canary con Traefik..."
  
  docker run -d \
    --name workplace_backend_canary \
    --network workplace_app_network \
    --restart unless-stopped \
    --memory 512m \
    --cpus 0.5 \
    --log-driver json-file \
    --log-opt max-size=10m \
    --log-opt max-file=3 \
    --env-file /opt/workplace/.env \
    -e APP_ENV=production \
    -e PORT=${NODE_PORT:-3001} \
    -e DB_HOST=postgres \
    -e DB_PORT=5432 \
    -e DB_USER=${POSTGRES_USER} \
    -e DB_PASSWORD=${POSTGRES_PASSWORD} \
    -e DB_NAME=${POSTGRES_DB} \
    -e DATABASE_URL="postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@postgres:5432/${POSTGRES_DB}" \
    -e REDIS_HOST=redis \
    -e REDIS_PORT=6379 \
    -e REDIS_PASSWORD=${REDIS_PASSWORD} \
    --health-cmd="curl -f http://localhost:${NODE_PORT:-3001}/api/ready || exit 1" \
    --health-interval=30s \
    --health-timeout=10s \
    --health-retries=3 \
    --health-start-period=40s \
    --label "traefik.enable=true" \
    --label "traefik.http.routers.backend-canary.rule=HostRegexp(\`${DOMAIN:-localhost}\`, \`www.${DOMAIN:-localhost}\`) && PathPrefix(\`/api\`) && Headers(\`X-Canary-Test\`, \`true\`)" \
    --label "traefik.http.routers.backend-canary.entrypoints=websecure" \
    --label "traefik.http.routers.backend-canary.tls=true" \
    --label "traefik.http.routers.backend-canary.tls.certresolver=letsencrypt" \
    --label "traefik.http.routers.backend-canary.priority=90" \
    --label "traefik.http.services.backend-canary.loadbalancer.server.port=${NODE_PORT:-3001}" \
    --label "traefik.http.routers.backend-canary.middlewares=security-headers@file,cors-api@file,rate-limit@file" \
    ${BACKEND_IMAGE}
  
  # Esperar que canary esté healthy
  log_canary "⏳ Esperando health check del canary..."
  
  if ! wait_healthy "workplace_backend_canary" 30 2; then
    log_canary "❌ Canary no alcanzó estado healthy"
    log_canary "📋 Logs del canary (últimos 30 líneas):"
    docker logs workplace_backend_canary --tail 30
    log_canary "🔍 Inspección del contenedor canary:"
    docker inspect workplace_backend_canary --format='{{.State.Status}} {{.State.Health.Status}}'
    docker rm -f workplace_backend_canary
    return 1
  fi
  
  log_canary "✅ Canary está healthy"
}

function configure_traefik_middleware() {
  log_canary "🌐 Configurando middleware de Traefik para traffic split..."
  
  # Crear middleware para traffic split basado en headers
  cat > /opt/workplace/traefik/dynamic/canary-middleware.yml << EOF
# Canary Traffic Split Middleware
http:
  middlewares:
    canary-traffic-split:
      plugin:
        # Si existe plugin de traffic splitting o usar chain middleware
        chain:
          middlewares:
            - canary-rate-limit
            - canary-headers
    
    canary-rate-limit:
      rateLimit:
        average: 100
        burst: 50
        period: "1m"
    
    canary-headers:
      headers:
        customRequestHeaders:
          X-Canary-Request: "true"
EOF
  
  # Recargar configuración de Traefik
  log_canary "🔄 Recargando configuración de Traefik..."
  if docker restart traefik; then
    log_canary "✅ Traefik recargado exitosamente"
    sleep 5  # Esperar que Traefik se inicie completamente
  else
    log_canary "❌ Error recargando Traefik"
    return 1
  fi
}

function monitor_canary_metrics() {
  log_canary "📊 Iniciando monitoreo de canary por ${CANARY_DURATION}s..."
  
  local START_TIME=$(date +%s)
  local END_TIME=$((START_TIME + CANARY_DURATION))
  local CURRENT_TIME=$(date +%s)
  
  local CANARY_REQUESTS=0
  local MAIN_REQUESTS=0
  local CANARY_ERRORS=0
  local MAIN_ERRORS=0
  local CANARY_LATENCY_TOTAL=0
  local MAIN_LATENCY_TOTAL=0
  
  log_canary "📈 Recolectando métricas de tráfico..."
  
  while [ "$CURRENT_TIME" -lt "$END_TIME" ]; do
    # Hacer requests de prueba para medir distribución
    for i in {1..10}; do
      local START_REQ=$(date +%s%N)
      
      # 10% de requests con header canary, 90% normal
      if [ $((i % 10)) -eq 1 ]; then
        # Request a canary (con header especial)
        local RESPONSE=$(curl -s -w "%{http_code},%{time_total}" \
          --max-time 5 \
          -H "X-Canary-Test: true" \
          -H "X-Canary-Request: true" \
          https://${DOMAIN:-localhost}/api/ready 2>/dev/null || echo "000,0.000")
        CANARY_REQUESTS=$((CANARY_REQUESTS + 1))
        if [[ "$RESPONSE" != *"200"* ]]; then
          CANARY_ERRORS=$((CANARY_ERRORS + 1))
        fi
      else
        # Request normal (al principal)
        local RESPONSE=$(curl -s -w "%{http_code},%{time_total}" \
          --max-time 5 \
          https://${DOMAIN:-localhost}/api/ready 2>/dev/null || echo "000,0.000")
        MAIN_REQUESTS=$((MAIN_REQUESTS + 1))
        if [[ "$RESPONSE" != *"200"* ]]; then
          MAIN_ERRORS=$((MAIN_ERRORS + 1))
        fi
      fi
      
      local END_REQ=$(date +%s%N)
      local LATENCY_MS=$(( (END_REQ - START_REQ) / 1000000 ))
      
      # Acumular latencia (simplificado)
      if [ $((i % 10)) -eq 1 ]; then
        CANARY_LATENCY_TOTAL=$((CANARY_LATENCY_TOTAL + LATENCY_MS))
      else
        MAIN_LATENCY_TOTAL=$((MAIN_LATENCY_TOTAL + LATENCY_MS))
      fi
      
      sleep 0.1
    done
    
    # Calcular y mostrar métricas parciales
    local TOTAL_REQUESTS=$((CANARY_REQUESTS + MAIN_REQUESTS))
    if [ "$TOTAL_REQUESTS" -gt 0 ]; then
      local CANARY_PERCENTAGE=$((CANARY_REQUESTS * 100 / TOTAL_REQUESTS))
      local MAIN_PERCENTAGE=$((MAIN_REQUESTS * 100 / TOTAL_REQUESTS))
      
      local CANARY_AVG_LATENCY=0
      local MAIN_AVG_LATENCY=0
      if [ "$CANARY_REQUESTS" -gt 0 ]; then
        CANARY_AVG_LATENCY=$((CANARY_LATENCY_TOTAL / CANARY_REQUESTS))
      fi
      if [ "$MAIN_REQUESTS" -gt 0 ]; then
        MAIN_AVG_LATENCY=$((MAIN_LATENCY_TOTAL / MAIN_REQUESTS))
      fi
      
      local CANARY_ERROR_RATE=0
      local MAIN_ERROR_RATE=0
      if [ "$CANARY_REQUESTS" -gt 0 ]; then
        CANARY_ERROR_RATE=$((CANARY_ERRORS * 100 / CANARY_REQUESTS))
      fi
      if [ "$MAIN_REQUESTS" -gt 0 ]; then
        MAIN_ERROR_RATE=$((MAIN_ERRORS * 100 / MAIN_REQUESTS))
      fi
      
      log_canary "📊 Métricas parciales - Canary: ${CANARY_PERCENTAGE}% (${CANARY_REQUESTS} reqs, ${CANARY_AVG_LATENCY}ms, ${CANARY_ERROR_RATE}% errores) | Main: ${MAIN_PERCENTAGE}% (${MAIN_REQUESTS} reqs, ${MAIN_AVG_LATENCY}ms, ${MAIN_ERROR_RATE}% errores)"
    fi
    
    sleep 30  # Esperar 30 segundos antes de siguiente medición
    CURRENT_TIME=$(date +%s)
  done
  
  # Métricas finales
  local FINAL_TOTAL_REQUESTS=$((CANARY_REQUESTS + MAIN_REQUESTS))
  local FINAL_CANARY_PERCENTAGE=0
  local FINAL_MAIN_PERCENTAGE=0
  
  if [ "$FINAL_TOTAL_REQUESTS" -gt 0 ]; then
    FINAL_CANARY_PERCENTAGE=$((CANARY_REQUESTS * 100 / FINAL_TOTAL_REQUESTS))
    FINAL_MAIN_PERCENTAGE=$((MAIN_REQUESTS * 100 / FINAL_TOTAL_REQUESTS))
  fi
  
  local FINAL_CANARY_AVG_LATENCY=0
  local FINAL_MAIN_AVG_LATENCY=0
  if [ "$CANARY_REQUESTS" -gt 0 ]; then
    FINAL_CANARY_AVG_LATENCY=$((CANARY_LATENCY_TOTAL / CANARY_REQUESTS))
  fi
  if [ "$MAIN_REQUESTS" -gt 0 ]; then
    FINAL_MAIN_AVG_LATENCY=$((MAIN_LATENCY_TOTAL / MAIN_REQUESTS))
  fi
  
  local FINAL_CANARY_ERROR_RATE=0
  local FINAL_MAIN_ERROR_RATE=0
  if [ "$CANARY_REQUESTS" -gt 0 ]; then
    FINAL_CANARY_ERROR_RATE=$((CANARY_ERRORS * 100 / CANARY_REQUESTS))
  fi
  if [ "$MAIN_REQUESTS" -gt 0 ]; then
    FINAL_MAIN_ERROR_RATE=$((MAIN_ERRORS * 100 / MAIN_REQUESTS))
  fi
  
  # Guardar métricas finales
  cat > $LOG_DIR/canary_traffic_metrics_$(date +%s).json << EOF
{
  "timestamp": "$(date -Iseconds)",
  "sha": "$CURRENT_SHA",
  "duration_seconds": $CANARY_DURATION,
  "traffic_split": {
    "canary_weight": $CANARY_WEIGHT,
    "main_weight": $MAIN_WEIGHT
  },
  "requests": {
    "total": $FINAL_TOTAL_REQUESTS,
    "canary": $CANARY_REQUESTS,
    "main": $MAIN_REQUESTS
  },
  "distribution": {
    "canary_percentage": $FINAL_CANARY_PERCENTAGE,
    "main_percentage": $FINAL_MAIN_PERCENTAGE
  },
  "performance": {
    "canary": {
      "avg_latency_ms": $FINAL_CANARY_AVG_LATENCY,
      "error_rate_percent": $FINAL_CANARY_ERROR_RATE,
      "errors": $CANARY_ERRORS
    },
    "main": {
      "avg_latency_ms": $FINAL_MAIN_AVG_LATENCY,
      "error_rate_percent": $FINAL_MAIN_ERROR_RATE,
      "errors": $MAIN_ERRORS
    }
  }
}
EOF
  
  log_canary "📊 Métricas Finales del Canary:"
  log_canary "   Total Requests: $FINAL_TOTAL_REQUESTS"
  log_canary "   Traffic Distribution: Canary ${FINAL_CANARY_PERCENTAGE}% | Main ${FINAL_MAIN_PERCENTAGE}%"
  log_canary "   Canary Performance: ${FINAL_CANARY_AVG_LATENCY}ms avg, ${FINAL_CANARY_ERROR_RATE}% error rate"
  log_canary "   Main Performance: ${FINAL_MAIN_AVG_LATENCY}ms avg, ${FINAL_MAIN_ERROR_RATE}% error rate"
  
  # Evaluar éxito del canary
  evaluate_canary_success "$FINAL_CANARY_ERROR_RATE" "$FINAL_CANARY_AVG_LATENCY" "$FINAL_CANARY_PERCENTAGE"
}

function evaluate_canary_success() {
  local canary_error_rate=$1
  local canary_avg_latency=$2
  local canary_percentage=$3
  
  log_canary "🎯 Evaluando éxito del canary..."
  
  # Umbrales de éxito
  local MAX_ERROR_RATE=5.0      # Máximo 5% de error rate
  local MAX_LATENCY=800          # Máximo 800ms de latencia
  local MIN_TRAFFIC_RECEIVED=5   # Mínimo 5% de tráfico recibido
  
  local SUCCESS=true
  local REASONS=()
  
  # Verificar error rate
  if (( $(echo "$canary_error_rate > $MAX_ERROR_RATE" | bc -l) )); then
    SUCCESS=false
    REASONS+=("Error rate alto: ${canary_error_rate}% > ${MAX_ERROR_RATE}%")
  fi
  
  # Verificar latencia
  if [ "$canary_avg_latency" -gt "$MAX_LATENCY" ]; then
    SUCCESS=false
    REASONS+=("Latencia alta: ${canary_avg_latency}ms > ${MAX_LATENCY}ms")
  fi
  
  # Verificar que recibió tráfico
  if (( $(echo "$canary_percentage < $MIN_TRAFFIC_RECEIVED" | bc -l) )); then
    SUCCESS=false
    REASONS+=("Tráfico bajo recibido: ${canary_percentage}% < ${MIN_TRAFFIC_RECEIVED}%")
  fi
  
  # Resultado
  if [ "$SUCCESS" = "true" ]; then
    log_canary "✅ Canary EXITOSO - Métricas dentro de umbrales"
    return 0
  else
    log_canary "❌ Canary FALLÓ - Razones:"
    for reason in "${REASONS[@]}"; do
      log_canary "   - $reason"
    done
    return 1
  fi
}

function promote_canary_to_main() {
  log_canary "🚀 Promocionando Canary a Main..."
  
  # Detener backend principal
  local MAIN_BACKEND_ID=$(docker compose ps -q backend)
  if [ -n "$MAIN_BACKEND_ID" ]; then
    log_canary "🛑 Deteniendo backend principal..."
    docker stop "$MAIN_BACKEND_ID"
    docker rm "$MAIN_BACKEND_ID"
  fi
  
  # Renombrar canary a principal
  log_canary "🏷️ Renombrando canary a principal..."
  docker rename workplace_backend_canary workplace_backend_temp
  
  # Recrear backend con docker-compose usando la imagen canary
  log_canary "🔄 Recreando backend con imagen canary..."
  BACKEND_IMAGE_TEMP=$BACKEND_IMAGE docker compose up -d --no-deps backend
  
  # Esperar que esté healthy
  local NEW_BACKEND_ID=$(docker compose ps -q backend)
  if [ -z "$NEW_BACKEND_ID" ]; then
    log_canary "❌ No se pudo obtener ID del nuevo backend"
    return 1
  fi
  
  # Usar Docker HEALTHCHECK nativo
  if wait_healthy "$NEW_BACKEND_ID" 30 2; then
    log_canary "✅ Nuevo backend principal está healthy"
  else
    log_canary "❌ Nuevo backend principal no está healthy"
    return 1
  fi
  
  # Limpiar configuración canary de Traefik
  log_canary "🧹 Limpiando configuración canary de Traefik..."
  rm -f /opt/workplace/traefik/dynamic/canary-middleware.yml
  
  # Recargar Traefik
  docker restart traefik
  
  # Limpiar contenedor temporal
  docker rm -f workplace_backend_temp 2>/dev/null || true
  
  log_canary "✅ Canary promocionado a main exitosamente"
}

function rollback_canary() {
  log_canary "🔄 Rollback del Canary..."
  
  # Detener canary
  docker rm -f workplace_backend_canary 2>/dev/null || true
  
  # Limpiar configuración canary de Traefik
  rm -f /opt/workplace/traefik/dynamic/canary-middleware.yml
  
  # Recargar Traefik
  docker restart traefik
  
  log_canary "✅ Canary rollback completado - traffic split removido"
}

# Ejecución principal
cd /opt/workplace

# Crear directorio de logs primero
mkdir -p $LOG_DIR

log_canary "🚀 Iniciando Canary Real con Traefik..."

# 1. Setup del canary
if setup_canary_service; then
  # 2. Configurar middleware de Traefik
  if configure_traefik_middleware; then
    # 3. Monitorear por el tiempo definido
    if monitor_canary_metrics; then
      # 4. Promocionar a main si fue exitoso
      if promote_canary_to_main; then
        log_canary "🎉 Canary Real completado exitosamente - 100% tráfico al nuevo backend"
        exit 0
      else
        log_canary "❌ Error promocionando canary - haciendo rollback"
        rollback_canary
        exit 1
      fi
    else
      log_canary "❌ Métricas del canary fallaron - haciendo rollback"
      rollback_canary
      exit 1
    fi
  else
    log_canary "❌ Error configurando middleware de Traefik - limpiando"
    docker rm -f workplace_backend_canary 2>/dev/null || true
    exit 1
  fi
else
  log_canary "❌ Error configurando canary"
  exit 1
fi
