#!/bin/bash
set -euo pipefail

# Cargar variables de entorno
if [ -f /opt/workplace/.env ]; then
  source /opt/workplace/.env
fi

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

function pre_deploy_health_check() {
  echo "� Pre-deploy Health Check - Verificando estado actual..."
  
  # Crear directorio de logs
  mkdir -p $LOG_DIR
  
  # Verificar que docker-compose esté corriendo
  echo "📋 Verificando servicios actuales..."
  if ! docker compose ps >/dev/null 2>&1; then
    echo "❌ Docker compose no está corriendo - iniciando servicios base"
    docker compose up -d postgres redis
    sleep 10
  fi
  
  # Verificar estado de servicios críticos
  local POSTGRES_ID=$(docker compose ps -q postgres)
  local REDIS_ID=$(docker compose ps -q redis)
  local BACKEND_ID=$(docker compose ps -q backend)
  local NGINX_ID=$(docker compose ps -q nginx)
  
  local ALL_HEALTHY=true
  
  # Verificar PostgreSQL
  if [ -n "$POSTGRES_ID" ]; then
    echo "🗄️ Verificando PostgreSQL..."
    if wait_healthy $POSTGRES_ID 30 2; then
      echo "✅ PostgreSQL está healthy"
    else
      echo "❌ PostgreSQL no está healthy"
      ALL_HEALTHY=false
    fi
  else
    echo "❌ PostgreSQL no está corriendo"
    ALL_HEALTHY=false
  fi
  
  # Verificar Redis
  if [ -n "$REDIS_ID" ]; then
    echo "🔴 Verificando Redis..."
    if wait_healthy $REDIS_ID 30 2; then
      echo "✅ Redis está healthy"
    else
      echo "❌ Redis no está healthy"
      ALL_HEALTHY=false
    fi
  else
    echo "❌ Redis no está corriendo"
    ALL_HEALTHY=false
  fi
  
  # Verificar Backend
  if [ -n "$BACKEND_ID" ]; then
    echo "🚀 Verificando Backend actual..."
    if wait_healthy $BACKEND_ID 60 2; then
      echo "✅ Backend está healthy"
      
      # Verificar endpoints críticos
      echo "🌐 Verificando endpoints del backend..."
      local NGINX_IP=$(docker inspect -f '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' $NGINX_ID 2>/dev/null || echo "localhost")
      
      # Test via nginx si está disponible, sino directo al backend
      local TEST_TARGET="http://localhost"
      if [ -n "$NGINX_ID" ]; then
        TEST_TARGET="http://localhost/api/health"
      else
        TEST_TARGET="http://$(docker inspect -f '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' $BACKEND_ID):3001/api/health"
      fi
      
      # Hacer algunos tests
      local SUCCESS_COUNT=0
      for i in {1..5}; do
        if curl -f --max-time 5 --connect-timeout 3 "$TEST_TARGET" >/dev/null 2>&1; then
          SUCCESS_COUNT=$((SUCCESS_COUNT + 1))
        fi
        sleep 0.5
      done
      
      if [ "$SUCCESS_COUNT" -ge 4 ]; then
        echo "✅ Backend endpoints responden correctamente ($SUCCESS_COUNT/5)"
      else
        echo "⚠️ Backend endpoints con problemas ($SUCCESS_COUNT/5)"
        ALL_HEALTHY=false
      fi
    else
      echo "❌ Backend no está healthy"
      ALL_HEALTHY=false
    fi
  else
    echo "⚠️ Backend no está corriendo (puede ser normal antes de primer deploy)"
  fi
  
  # Verificar Nginx si existe
  if [ -n "$NGINX_ID" ]; then
    echo "🌐 Verificando Nginx..."
    local NGINX_STATUS=$(docker inspect --format='{{.State.Health.Status}}' $NGINX_ID 2>/dev/null || echo "unknown")
    if [ "$NGINX_STATUS" = "healthy" ] || [ "$NGINX_STATUS" = "starting" ]; then
      echo "✅ Nginx está $NGINX_STATUS"
    else
      echo "⚠️ Nginx status: $NGINX_STATUS"
    fi
  fi
  
  # Verificar que la imagen a desplegar exista
  echo "📦 Verificando imagen a desplegar: $BACKEND_IMAGE"
  if docker images --format "{{.Repository}}:{{.Tag}}" | grep -q "^${BACKEND_IMAGE}$"; then
    echo "✅ Imagen encontrada localmente"
  else
    echo "⬇️ Imagen no encontrada localmente, intentando descargar..."
    if docker pull "$BACKEND_IMAGE" >/dev/null 2>&1; then
      echo "✅ Imagen descargada exitosamente"
    else
      echo "❌ No se puede descargar la imagen: $BACKEND_IMAGE"
      ALL_HEALTHY=false
    fi
  fi
  
  # Resultado final
  if [ "$ALL_HEALTHY" = "true" ]; then
    echo "✅ Pre-deploy health check PASSED"
    echo "🎉 Sistema listo para deploy"
    return 0
  else
    echo "❌ Pre-deploy health check FAILED"
    echo "🔧 Sistema necesita reparación antes de deploy"
    
    # Guardar estado actual para diagnóstico
    echo "=== ESTADO DEL SISTEMA ===" > $LOG_DIR/pre_deploy_failure_$(date +%s).log
    docker compose ps >> $LOG_DIR/pre_deploy_failure_$(date +%s).log
    docker images --format "table {{.Repository}}\t{{.Tag}}\t{{.Size}}" >> $LOG_DIR/pre_deploy_failure_$(date +%s).log
    
    return 1
  fi
}

function setup_canary() {
  echo "🚀 Iniciando Canary Deploy real (paralelo)..."
  
  # Asegurarse que docker-compose esté corriendo
  if ! docker compose ps postgres redis >/dev/null 2>&1; then
    echo "🔄 Iniciando servicios base para canary..."
    docker compose up -d postgres redis
    sleep 15
  fi
  
  # Obtener nombre real de la red
  local NETWORK_NAME="workplace_app_network"
  echo "🌐 Usando red: $NETWORK_NAME"
  
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
    -e ENVIRONMENT=production \
    -e PORT=3001 \
    -e DATABASE_URL="postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@postgres:5432/${POSTGRES_DB}" \
    -e REDIS_HOST=redis \
    -e REDIS_PORT=6379 \
    -e REDIS_PASSWORD=${REDIS_PASSWORD} \
    ${BACKEND_IMAGE}
}

function wait_canary_ready() {
  echo "⏳ Esperando health check del canary..."
  local CANARY_IP=$(docker inspect -f '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' workplace_backend_canary)
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
  local CANARY_IP=$(docker inspect -f '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' workplace_backend_canary)
  
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

# Modo de operación: pre-deploy o canary completo
OPERATION_MODE=${1:-pre-deploy}

if [ "$OPERATION_MODE" = "pre-deploy" ]; then
  echo "🔍 Ejecutando Pre-Deploy Health Check..."
  pre_deploy_health_check
else
  echo "🚀 Ejecutando Canary Check Completo..."
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
fi
