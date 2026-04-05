#!/bin/bash
set -euo pipefail

# Canary Real con 10% Traffic Split
# Distribuye tráfico real entre backend viejo y nuevo

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
    # Verificar Docker HEALTHCHECK nativo (más seguro, no expone puertos)
    local HEALTH_STATUS=$(docker inspect --format='{{.State.Health.Status}}' $container 2>/dev/null || echo "unknown")
    
    if [ "$HEALTH_STATUS" == "healthy" ]; then
      echo "✅ $container está healthy (Docker HEALTHCHECK) ($i/$retries)"
      return 0
    fi
    
    # Fallback: verificar si el contenedor está corriendo y responde via docker exec
    local CONTAINER_STATUS=$(docker inspect --format='{{.State.Status}}' $container 2>/dev/null || echo "unknown")
    if [ "$CONTAINER_STATUS" == "running" ]; then
      # Health check via docker exec (seguro, no expone puertos)
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

function setup_canary_traffic_split() {
  log_canary "🚀 Configurando Canary Traffic Split (10% canary, 90% main)..."
  
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
  
  # Levantar backend canary
  log_canary "🚀 Levantando backend canary..."
  
  # Crear red si no existe (docker-compose la nombra como proyecto_app_network)
  docker network inspect workplace_app_network >/dev/null 2>&1 || \
    docker network create workplace_app_network 2>/dev/null || \
    log_canary "⚠️ No se pudo crear red, intentando usar red existente..."
  
  # Obtener IPs para nginx (pero usar hostnames para conexión del canary)
  POSTGRES_IP=$(docker inspect -f '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' $(docker compose ps -q postgres) 2>/dev/null || echo "postgres")
  REDIS_IP=$(docker inspect -f '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' $(docker compose ps -q redis) 2>/dev/null || echo "redis")
  
  log_canary "📍 Postgres IP (para nginx): $POSTGRES_IP"
  log_canary "📍 Redis IP (para nginx): $REDIS_IP"
  
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
    ${BACKEND_IMAGE}
  
  # Esperar que canary esté healthy (usa Docker HEALTHCHECK nativo)
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

function configure_nginx_traffic_split() {
  log_canary "🌐 Configurando Nginx para Traffic Split..."
  
  # Obtener IPs de los contenedores
  local MAIN_BACKEND_IP=$(docker inspect -f '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' $(docker compose ps -q backend))
  local CANARY_BACKEND_IP=$(docker inspect -f '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' workplace_backend_canary)
  
  log_canary "📍 Main Backend IP: $MAIN_BACKEND_IP"
  log_canary "📍 Canary Backend IP: $CANARY_BACKEND_IP"
  
  # Crear configuración de upstream con pesos
  cat > /opt/workplace/nginx/conf.d/canary-upstream.conf << EOF
# Canary Traffic Split Configuration
upstream backend_canary_split {
    # 90% tráfico al backend principal
    server $MAIN_BACKEND_IP:${NODE_PORT:-3001} weight=$MAIN_WEIGHT max_fails=3 fail_timeout=30s;
    
    # 10% tráfico al backend canary
    server $CANARY_BACKEND_IP:${NODE_PORT:-3001} weight=$CANARY_WEIGHT max_fails=3 fail_timeout=30s;
    
    least_conn;
    keepalive 32;
}
EOF
  
  # Crear configuración de server que use el nuevo upstream
  cat > /opt/workplace/nginx/conf.d/canary-server.conf << EOF
# Canary Server Configuration
server {
    listen 80;
    server_name localhost;
    
    # API endpoints con traffic split
    location /api/ {
        limit_req zone=api_limit burst=30 nodelay;
        limit_conn conn_limit_per_ip 10;
        
        # Usar upstream con traffic split
        proxy_pass http://backend_canary_split;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        
        # Headers para identificar qué backend respondió
        proxy_set_header X-Backend-IP \$upstream_addr;
        proxy_set_header X-Canary-Weight \$upstream_weight;
        
        proxy_next_upstream error timeout invalid_header http_502 http_503 http_504;
        proxy_next_upstream_tries 3;
        proxy_next_upstream_timeout 30s;
    }
    
    # Otros endpoints sin traffic split (van al principal)
    location / {
        proxy_pass http://backend_cluster;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
EOF
  
  # Recargar nginx
  log_canary "🔄 Recargando configuración Nginx..."
  if docker exec workplace_nginx nginx -t >/dev/null 2>&1; then
    docker exec workplace_nginx nginx -s reload
    log_canary "✅ Nginx recargado exitosamente"
  else
    log_canary "❌ Error en configuración de Nginx"
    docker exec workplace_nginx nginx -t
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
      local RESPONSE=$(curl -s -w "%{http_code},%{time_total},%{remote_addr}" \
        --max-time 5 \
        -H "X-Test-Request: canary-monitor" \
        http://localhost/api/ready 2>/dev/null || echo "000,0.000,0.0.0.0")
      local END_REQ=$(date +%s%N)
      
      local HTTP_CODE=$(echo "$RESPONSE" | cut -d',' -f1)
      local RESPONSE_TIME=$(echo "$RESPONSE" | cut -d',' -f2)
      local BACKEND_IP=$(echo "$RESPONSE" | cut -d',' -f3)
      
      local LATENCY_MS=$(( (END_REQ - START_REQ) / 1000000 ))
      
      # Clasificar request por backend IP
      if [ "$BACKEND_IP" = "$(docker inspect -f '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' workplace_backend_canary)" ]; then
        CANARY_REQUESTS=$((CANARY_REQUESTS + 1))
        CANARY_LATENCY_TOTAL=$((CANARY_LATENCY_TOTAL + LATENCY_MS))
        if [ "$HTTP_CODE" != "200" ]; then
          CANARY_ERRORS=$((CANARY_ERRORS + 1))
        fi
      else
        MAIN_REQUESTS=$((MAIN_REQUESTS + 1))
        MAIN_LATENCY_TOTAL=$((MAIN_LATENCY_TOTAL + LATENCY_MS))
        if [ "$HTTP_CODE" != "200" ]; then
          MAIN_ERRORS=$((MAIN_ERRORS + 1))
        fi
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
  local NEW_BACKEND_IP=$(docker inspect -f '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' "$NEW_BACKEND_ID" 2>/dev/null || echo "")
  if [ -z "$NEW_BACKEND_IP" ]; then
    log_canary "❌ No se pudo obtener IP del nuevo backend"
    return 1
  fi
  
  # Usar Docker HEALTHCHECK nativo
  if wait_healthy "$NEW_BACKEND_ID" 30 2; then
    log_canary "✅ Nuevo backend principal está healthy"
  else
    log_canary "❌ Nuevo backend principal no está healthy"
    return 1
  fi
  
  # Limpiar configuración canary de nginx
  log_canary "🧹 Limpiando configuración canary de nginx..."
  rm -f /opt/workplace/nginx/conf.d/canary-upstream.conf
  rm -f /opt/workplace/nginx/conf.d/canary-server.conf
  
  # Recargar nginx
  docker exec workplace_nginx nginx -s reload
  
  # Limpiar contenedor temporal
  docker rm -f workplace_backend_temp 2>/dev/null || true
  
  log_canary "✅ Canary promocionado a main exitosamente"
}

function rollback_canary() {
  log_canary "🔄 Rollback del Canary..."
  
  # Detener canary
  docker rm -f workplace_backend_canary 2>/dev/null || true
  
  # Limpiar configuración canary de nginx
  rm -f /opt/workplace/nginx/conf.d/canary-upstream.conf
  rm -f /opt/workplace/nginx/conf.d/canary-server.conf
  
  # Recargar nginx
  docker exec workplace_nginx nginx -s reload
  
  log_canary "✅ Canary rollback completado - traffic split removido"
}

# Ejecución principal
cd /opt/workplace

# Crear directorio de logs primero
mkdir -p $LOG_DIR

log_canary "🚀 Iniciando Canary Real con 10% Traffic Split..."

# 1. Setup del canary
if setup_canary_traffic_split; then
  # 2. Configurar traffic split en nginx
  if configure_nginx_traffic_split; then
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
    log_canary "❌ Error configurando traffic split - limpiando"
    docker rm -f workplace_backend_canary 2>/dev/null || true
    exit 1
  fi
else
  log_canary "❌ Error configurando canary"
  exit 1
fi
