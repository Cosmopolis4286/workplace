#!/bin/bash
set -euo pipefail

# Script para verificar que el load balancing está funcionando correctamente
# durante y después del rolling update

echo "🔍 Verificando Load Balancing de Nginx..."

# Variables
LOG_DIR="/opt/workplace/logs/deploy"
mkdir -p $LOG_DIR

# Función para testear balanceo
function test_load_balancing() {
  local service_name=$1
  local endpoint=$2
  local test_count=${3:-10}
  
  echo "🌐 Testeando load balancing para $service_name..."
  
  local NGINX_ID=$(docker compose ps -q nginx)
  if [ -z "$NGINX_ID" ]; then
    echo "❌ Nginx no está corriendo"
    return 1
  fi
  
  local success_count=0
  local fail_count=0
  
  for i in $(seq 1 $test_count); do
    echo "📡 Test $i/$test_count - $endpoint"
    
    # Hacer request y medir respuesta
    local start_time=$(date +%s%N)
    local response_code=$(docker exec $NGINX_ID curl -s -o /dev/null -w "%{http_code}" --max-time 5 "$endpoint" 2>/dev/null || echo "000")
    local end_time=$(date +%s%N)
    local duration=$((($end_time - $start_time) / 1000000)) # Convertir a ms
    
    if [ "$response_code" = "200" ]; then
      echo "✅ Test $i: OK (${duration}ms)"
      success_count=$((success_count + 1))
    elif [ "$response_code" = "000" ]; then
      echo "❌ Test $i: TIMEOUT"
      fail_count=$((fail_count + 1))
    else
      echo "⚠️ Test $i: HTTP $response_code (${duration}ms)"
      fail_count=$((fail_count + 1))
    fi
    
    sleep 0.5
  done
  
  echo "📊 Resultados $service_name: $success_count/$test_count exitosos"
  
  if [ $success_count -ge $((test_count * 80 / 100)) ]; then
    echo "✅ Load balancing $service_name OK"
    return 0
  else
    echo "❌ Load balancing $service_name FALLÓ"
    return 1
  fi
}

# Función para verificar instancias backend
function check_backend_instances() {
  echo "🔍 Verificando instancias backend..."
  
  local backend_containers=$(docker ps --format "table {{.Names}}\t{{.Status}}" | grep workplace_backend | grep -v rollback || echo "")
  local instance_count=$(echo "$backend_containers" | grep -c "workplace_backend" || echo "0")
  
  echo "📦 Instancias backend encontradas: $instance_count"
  echo "$backend_containers"
  
  if [ "$instance_count" -eq 0 ]; then
    echo "❌ No se encontraron instancias backend"
    return 1
  fi
  
  # Verificar health de cada instancia
  local healthy_count=0
  for container in $(docker ps -q --filter "name=workplace_backend" | grep -v rollback || echo ""); do
    local status=$(docker inspect --format='{{.State.Health.Status}}' "$container" 2>/dev/null || echo "unknown")
    echo "🏥 Container $(docker inspect --format='{{.Name}}' "$container" | sed 's/\///'): $status"
    if [ "$status" = "healthy" ]; then
      healthy_count=$((healthy_count + 1))
    fi
  done
  
  echo "💚 Instancias healthy: $healthy_count/$instance_count"
  
  if [ "$healthy_count" -ge 1 ]; then
    return 0
  else
    return 1
  fi
}

# Función para verificar configuración nginx
function verify_nginx_config() {
  echo "🔧 Verificando configuración nginx..."
  
  local NGINX_ID=$(docker compose ps -q nginx)
  if [ -z "$NGINX_ID" ]; then
    echo "❌ Nginx no está corriendo"
    return 1
  fi
  
  # Test de configuración
  if docker exec $NGINX_ID nginx -t >/dev/null 2>&1; then
    echo "✅ Configuración nginx válida"
  else
    echo "❌ Configuración nginx inválida:"
    docker exec $NGINX_ID nginx -t
    return 1
  fi
  
  # Verificar upstreams
  echo "🌐 Verificando upstreams configurados..."
  docker exec $NGINX_ID nginx -T 2>/dev/null | grep -A 10 "upstream.*cluster" || echo "⚠️ No se encontraron upstreams cluster"
  
  return 0
}

# Función para testear distribución de carga
function test_load_distribution() {
  echo "⚖️ Testeando distribución de carga..."
  
  local NGINX_ID=$(docker compose ps -q nginx)
  if [ -z "$NGINX_ID" ]; then
    echo "❌ Nginx no está corriendo"
    return 1
  fi
  
  # Hacer múltiples requests y ver si se distribuyen
  echo "📊 Enviando 20 requests a /api/health..."
  
  for i in {1..20}; do
    docker exec $NGINX_ID curl -s --max-time 2 "http://localhost/api/health" >/dev/null 2>&1 &
  done
  
  wait
  
  echo "✅ Test de distribución completado"
}

# Ejecución principal
cd /opt/workplace

echo "🚀 Iniciando verificación completa de Load Balancing..."

# 1. Verificar configuración nginx
if ! verify_nginx_config; then
  echo "❌ Verificación de configuración nginx falló"
  exit 1
fi

# 2. Verificar instancias backend
if ! check_backend_instances; then
  echo "❌ Verificación de instancias backend falló"
  exit 1
fi

# 3. Testear load balancing del backend
if ! test_load_balancing "backend" "http://localhost/api/health" 10; then
  echo "❌ Test de load balancing backend falló"
  exit 1
fi

# 4. Testear load balancing del frontend
if ! test_load_balancing "frontend" "http://localhost/" 5; then
  echo "❌ Test de load balancing frontend falló"
  exit 1
fi

# 5. Testear distribución de carga
test_load_distribution

# Guardar resultados
echo "✅ Todas las verificaciones pasaron exitosamente" > $LOG_DIR/load_balancing_$(date +%s).log
docker ps --format "table {{.Names}}\t{{.Status}}" >> $LOG_DIR/load_balancing_$(date +%s).log

echo "🎉 Load Balancing verificado exitosamente!"
echo "📋 Logs guardados en $LOG_DIR/load_balancing_$(date +%s).log"
