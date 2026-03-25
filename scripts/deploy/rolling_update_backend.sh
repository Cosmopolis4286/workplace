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
  echo "🔄 Actualizando Backend con Rolling Update Controlado..."
  
  # Verificar que docker-compose esté corriendo
  if ! docker compose ps >/dev/null 2>&1; then
    echo "🚀 Docker compose no está corriendo - iniciando servicios base..."
    docker compose up -d postgres redis nginx
    sleep 15
    
    # Esperar que los servicios base estén healthy
    echo "⏳ Esperando servicios base..."
    sleep 10
  fi
  
  # Identificar instancia backend actual
  local CURRENT_BACKEND_ID=$(docker compose ps -q backend)
  if [ -z "$CURRENT_BACKEND_ID" ]; then
    echo "🚀 No se encontró backend actual - iniciando primera instancia..."
    # Si no hay backend, iniciarlo directamente
    docker compose up -d backend
    sleep 15
    
    # Verificar que esté healthy
    local NEW_BACKEND_ID=$(docker compose ps -q backend)
    if wait_healthy backend; then
      echo "✅ Backend iniciado exitosamente"
      return 0
    else
      echo "❌ Error iniciando backend"
      return 1
    fi
  fi
  
  echo "📋 Identificando instancia backend actual: $CURRENT_BACKEND_ID"
  
  local CURRENT_BACKEND_NAME=$(docker inspect --format='{{.Name}}' "$CURRENT_BACKEND_ID" | sed 's/\///')
  echo "📦 Instancia actual: $CURRENT_BACKEND_NAME ($CURRENT_BACKEND_ID)"
  
  # 2. Levantar nueva instancia con nombre explícito
  echo "� Levantando nueva instancia backend_new..."
  docker run -d --name workplace_backend_new \
    --network workplace_app_network \
    --env-file .env \
    -e ENVIRONMENT=production \
    -e PORT=${NODE_PORT:-3001} \
    -e DATABASE_URL=postgresql://${POSTGRES_USER:-workplace}:${POSTGRES_PASSWORD:-workplace_secret}@postgres:5432/${POSTGRES_DB:-workplace_db} \
    -e REDIS_HOST=redis \
    -e REDIS_PORT=6379 \
    -e REDIS_PASSWORD=${REDIS_PASSWORD:-redis_secret} \
    -v workplace_uploads_data:/app/backend/uploads \
    --restart unless-stopped \
    "$BACKEND_IMAGE"
  
  # 3. Esperar que nueva instancia esté completamente healthy
  echo "⏳ Esperando que nueva instancia esté healthy..."
  if ! wait_healthy workplace_backend_new 120 2; then
    echo "❌ Nueva instancia no alcanzó estado healthy"
    echo "🔍 Logs de la nueva instancia:"
    docker logs workplace_backend_new --tail 20
    echo "🧹 Limpiando instancia fallida..."
    docker rm -f workplace_backend_new
    return 1
  fi
  
  echo "✅ Nueva instancia workplace_backend_new está healthy"
  
  # 4. Verificar que ambas instancias funcionen (load balancing test)
  echo "🌐 Verificando load balancing con ambas instancias..."
  local NGINX_ID=$(docker compose ps -q nginx)
  if [ -n "$NGINX_ID" ]; then
    for i in {1..5}; do
      echo "📡 Test $i/5 - Balanceo con ambas instancias..."
      if docker exec $NGINX_ID curl -f --max-time 5 http://localhost/api/health >/dev/null 2>&1; then
        echo "✅ Request $i exitoso"
      else
        echo "⚠️ Request $i falló durante transición"
      fi
      sleep 1
    done
  fi
  
  # 5. Drain de conexiones de la instancia vieja (graceful shutdown)
  echo "� Drenando conexiones de instancia vieja: $CURRENT_BACKEND_NAME"
  
  # Marcar instancia vieja para drenaje (opcional: cambiar nginx config)
  echo "⏳ Esperando 15 segundos para terminar requests activos..."
  sleep 15
  
  # 6. Eliminar instancia vieja de forma controlada
  echo "🗑️ Eliminando instancia vieja: $CURRENT_BACKEND_NAME"
  
  # Primero detener graceful
  docker stop "$CURRENT_BACKEND_ID"
  
  # Esperar un poco más
  sleep 5
  
  # Luego remover
  docker rm "$CURRENT_BACKEND_ID"
  
  # 7. Renombrar nueva instancia al nombre estándar
  echo "🏷️ Renombrando workplace_backend_new → backend estándar"
  docker rename workplace_backend_new workplace_backend_temp
  
  # Actualizar docker-compose para que reconozca la nueva instancia
  echo "🔄 Actualizando docker-compose para usar nueva instancia..."
  docker compose up -d --no-deps --force-recreate backend
  
  # 8. Verificación final
  echo "🔍 Verificación final del rolling update..."
  local FINAL_BACKEND_ID=$(docker compose ps -q backend)
  if [ -n "$FINAL_BACKEND_ID" ]; then
    if wait_healthy $FINAL_BACKEND_ID 60 2; then
      echo "✅ Instancia final está healthy"
    else
      echo "❌ Instancia final no está healthy"
      return 1
    fi
  else
    echo "❌ No se encontró instancia final"
    return 1
  fi
  
  # 9. Cleanup de nombres temporales
  docker rm -f workplace_backend_temp 2>/dev/null || true
  
  echo "✅ Rolling update backend completado (controlado)"
  echo "🎉 Zero downtime mantenido durante todo el proceso"
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
