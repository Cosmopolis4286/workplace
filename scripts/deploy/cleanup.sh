#!/bin/bash
set -euo pipefail

# Variables
export LOG_DIR="/var/log/deploy"

# Funciones
function cleanup_images() {
  echo "🧹 Cleanup conservador de imágenes antiguas..."
  
  # Verificar que los servicios estén healthy antes de limpiar
  if ! docker compose ps | grep -q "healthy"; then
    echo "⚠️ Omitiendo cleanup por seguridad (servicios no healthy)"
    return 1
  fi
  
  # Crear directorio de logs
  mkdir -p $LOG_DIR
  
  # Guardar estado actual de imágenes
  docker images --format "table {{.Repository}}\t{{.Tag}}\t{{.Size}}\t{{.CreatedAt}}" > $LOG_DIR/pre_cleanup_images_$(date +%s).log
  
  # Contar imágenes antes del cleanup
  local IMAGES_BEFORE=$(docker images --format "{{.Repository}}:{{.Tag}}" | grep "workplace-" | wc -l)
  echo "📊 Imágenes workplace antes del cleanup: $IMAGES_BEFORE"
  
  # Mantener últimas 10 SHA tags (para rollback reciente)
  echo "🏷️ Manteniendo últimos 10 SHA tags..."
  local DELETED_SHA=$(docker images --format "{{.Repository}}:{{.Tag}}" | grep "workplace-" | grep "main-" | sort -V | tail -n +11 | xargs -r docker rmi -f 2>/dev/null || true)
  
  # Limpiar solo imágenes dangling (sin etiquetas) más antiguas de 72h
  echo "🗑️ Limpiando imágenes dangling (>72h)..."
  docker image prune --force --filter "until=72h" --filter "dangling=true" 2>/dev/null || true
  
  # Mantener última tag estable si existe
  echo "🔒 Protegiendo tags estables..."
  docker images --format "{{.Repository}}:{{.Tag}}" | grep "workplace-" | grep -E "stable|latest" | sort -u | while read img; do
    echo "   Protegiendo: $img"
  done
  
  # Contar imágenes después del cleanup
  local IMAGES_AFTER=$(docker images --format "{{.Repository}}:{{.Tag}}" | grep "workplace-" | wc -l)
  echo "📊 Imágenes workplace después del cleanup: $IMAGES_AFTER"
  echo "📉 Imágenes eliminadas: $((IMAGES_BEFORE - IMAGES_AFTER))"
  
  # Guardar estado final de imágenes
  docker images --format "table {{.Repository}}\t{{.Tag}}\t{{.Size}}\t{{.CreatedAt}}" > $LOG_DIR/post_cleanup_images_$(date +%s).log
  
  # Guardar reporte de cleanup
  cat > $LOG_DIR/cleanup_report_$(date +%s).json << EOF
{
  "timestamp": "$(date -Iseconds)",
  "images_before": $IMAGES_BEFORE,
  "images_after": $IMAGES_AFTER,
  "images_deleted": $((IMAGES_BEFORE - IMAGES_AFTER)),
  "deleted_sha_tags": "$DELETED_SHA",
  "protected_tags": [
    "stable",
    "latest"
  ]
}
EOF
  
  echo "✅ Cleanup completado - reporte guardado en $LOG_DIR/cleanup_report_$(date +%s).json"
}

function cleanup_logs() {
  echo "🗑️ Limpiando logs antiguos..."
  
  # Mantener logs de los últimos 7 días
  find $LOG_DIR -name "*.log" -type f -mtime +7 -delete 2>/dev/null || true
  find $LOG_DIR -name "*.json" -type f -mtime +7 -delete 2>/dev/null || true
  
  # Contar logs restantes
  local LOGS_COUNT=$(find $LOG_DIR -type f | wc -l)
  echo "📊 Logs mantenidos: $LOGS_COUNT"
  
  echo "✅ Cleanup de logs completado"
}

function cleanup_containers() {
  echo "🗑️ Limpiando contenedores huérfanos..."
  
  # Eliminar contenedores detenidos
  local STOPPED_CONTAINERS=$(docker ps -a --filter "status=exited" --filter "status=dead" -q | wc -l)
  if [ "$STOPPED_CONTAINERS" -gt 0 ]; then
    docker ps -a --filter "status=exited" --filter "status=dead" -q | xargs -r docker rm -f
    echo "🗑️ Eliminados $STOPPED_CONTAINERS contenedores detenidos"
  else
    echo "✅ No hay contenedores detenidos que limpiar"
  fi
  
  # Eliminar contenedores huérfanos (sin asociar a compose)
  local ORPHANED=$(docker ps -a --filter "label=com.docker.compose.project" -q | wc -l)
  echo "📊 Contenedores compose: $ORPHANED"
}

function cleanup_networks() {
  echo "🗑️ Limpiando redes no utilizadas..."
  
  # Eliminar redes no utilizadas
  docker network prune -f 2>/dev/null || true
  
  echo "✅ Cleanup de redes completado"
}

function cleanup_volumes() {
  echo "🗑️ Limpiando volúmenes no utilizados..."
  
  # Advertencia: esto puede eliminar datos, solo ejecutar si es seguro
  if [ "${1:-}" = "--force" ]; then
    docker volume prune -f 2>/dev/null || true
    echo "⚠️ Cleanup de volúmenes forzado completado"
  else
    echo "ℹ️ Use --force para limpiar volúmenes no utilizados"
  fi
}

# Ejecución principal
cd /opt/workplace

# Ejecutar cleanup en orden seguro
cleanup_containers
cleanup_networks
cleanup_images
cleanup_logs

# Cleanup de volúmenes solo si se especifica --force
if [ "${1:-}" = "--force" ]; then
  cleanup_volumes --force
fi

echo "✅ Todo el cleanup completado exitosamente!"
