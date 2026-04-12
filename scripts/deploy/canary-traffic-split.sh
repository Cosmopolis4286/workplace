#!/bin/bash
# Rolling update: recrea Traefik, backend y frontend en orden.
set -euo pipefail

COMPOSE="docker compose -f /opt/workplace/docker-compose.lite.yml"
LOG_DIR="/opt/workplace/logs/deploy"
NODE_PORT="${NODE_PORT:-3001}"
FRONTEND_PORT="${FRONTEND_PORT:-3000}"

mkdir -p "$LOG_DIR"

log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" | tee -a "$LOG_DIR/deploy_$(date +%Y%m%d).log"; }

wait_healthy() {
  local service=$1
  local port=$2
  local endpoint=$3
  local retries=${4:-30}

  log "Esperando que $service este healthy..."
  for i in $(seq 1 "$retries"); do
    if $COMPOSE exec -T "$service" \
        curl -sf --max-time 5 "http://localhost:${port}${endpoint}" >/dev/null 2>&1; then
      log "$service OK (intento $i/$retries)"
      return 0
    fi
    log "  Intento $i/$retries -- esperando..."
    sleep 5
  done
  log "ERROR: $service no respondio despues de $retries intentos"
  $COMPOSE logs --tail 30 "$service" || true
  return 1
}

sanitize_env() {
  # Eliminar comentarios inline de variables criticas del .env
  # Ejemplo: NODE_PORT=3001  # comentario  →  NODE_PORT=3001
  sed -i 's/^\([A-Z_]*=\)\([^#]*\)#.*/\1\2/' /opt/workplace/.env
  # Eliminar espacios al final
  sed -i 's/[[:space:]]*$//' /opt/workplace/.env
}

cd /opt/workplace

# Cargar vars del servidor si no vienen del entorno (compatibilidad)
if [ -z "${POSTGRES_USER:-}" ] && [ -f .env ]; then
  set -a; source .env; set +a
fi

log "=== Iniciando deploy SHA: ${CURRENT_SHA:-unknown} ==="
log "  Backend:  ${BACKEND_IMAGE:-?}"
log "  Frontend: ${FRONTEND_IMAGE:-?}"

# Sanitizar .env para evitar comentarios inline que rompan variables
log "Sanitizando .env..."
sanitize_env

# Servicios de datos: arrancar solo si no corren (primer deploy)
if ! $COMPOSE ps postgres 2>/dev/null | grep -qE "running|Up"; then
  log "Primer deploy — arrancando postgres y redis..."
  $COMPOSE up -d postgres redis
  log "Esperando postgres..."
  for i in $(seq 1 30); do
    $COMPOSE exec -T postgres pg_isready -U "${POSTGRES_USER:-app}" >/dev/null 2>&1 && break || true
    sleep 3
  done
fi

# === SMART TRAEFIK UPDATE (Zero SSL Downtime) ===
log "Verificando cambios en Traefik..."

TRAEFIK_CONFIG="/opt/workplace/traefik/traefik.yml"
TRAEFIK_BACKUP="/tmp/traefik.yml.backup"
DYNAMIC_CONFIG="/opt/workplace/traefik/dynamic"
DYNAMIC_BACKUP="/tmp/traefik_dynamic_backup"
NEEDS_RECREATE=false

# Función para calcular checksum de directorio
dir_checksum() {
  find "$1" -type f -name "*.yml" -exec md5sum {} \; 2>/dev/null | sort | md5sum | cut -d' ' -f1
}

# Verificar si traefik.yml cambió (config estática requiere recreate)
if [ -f "$TRAEFIK_CONFIG" ] && [ -f "$TRAEFIK_BACKUP" ]; then
  if ! diff -q "$TRAEFIK_CONFIG" "$TRAEFIK_BACKUP" >/dev/null 2>&1; then
    log "  ⚠️ traefik.yml modificado — requerirá recrear contenedor"
    NEEDS_RECREATE=true
  else
    log "  ✓ traefik.yml sin cambios"
  fi
else
  log "  ℹ️ Primer deploy o backup no existe"
  NEEDS_RECREATE=true
fi

# Verificar si dynamic config cambió (config dinámica = hot reload)
if [ -d "$DYNAMIC_CONFIG" ]; then
  CURRENT_DYNAMIC_CHECKSUM=$(dir_checksum "$DYNAMIC_CONFIG")
  PREVIOUS_DYNAMIC_CHECKSUM=$(cat /tmp/traefik_dynamic_checksum 2>/dev/null || echo "")
  
  if [ "$CURRENT_DYNAMIC_CHECKSUM" != "$PREVIOUS_DYNAMIC_CHECKSUM" ]; then
    log "  📝 Dynamic config cambiado — Traefik recargará automáticamente"
  else
    log "  ✓ Dynamic config sin cambios"
  fi
fi

# Traefik: recrear SOLO si es necesario (preserva SSL certificates en volumen)
if [ "$NEEDS_RECREATE" = true ]; then
  log "Actualizando Traefik (recreate necesario)..."
  $COMPOSE up -d --no-deps --force-recreate traefik
  sleep 8
  
  # Backup para próxima comparación
  cp "$TRAEFIK_CONFIG" "$TRAEFIK_BACKUP" 2>/dev/null || true
else
  log "Actualizando Traefik (sin recreate — SSL preservado)..."
  # Solo reiniciar si no está corriendo, o recargar config dinámica
  if ! $COMPOSE ps traefik 2>/dev/null | grep -qE "running|Up"; then
    $COMPOSE up -d --no-deps traefik
    sleep 5
  else
    # Forzar recarga de config dinámica via Traefik API (si está disponible)
    curl -sf http://localhost:8080/api/providers/file/reload 2>/dev/null || true
    # Pequeña pausa para asegurar que Traefik procesó cambios
    sleep 2
  fi
fi

# Guardar checksum de dynamic config para próxima vez
if [ -d "$DYNAMIC_CONFIG" ]; then
  dir_checksum "$DYNAMIC_CONFIG" > /tmp/traefik_dynamic_checksum
fi

# Verificar que Traefik arranco correctamente
if ! $COMPOSE ps traefik 2>/dev/null | grep -qE "running|Up"; then
  log "ERROR: Traefik no esta corriendo"
  $COMPOSE logs --tail 20 traefik || true
  exit 1
fi

# Limpiar acme.json si Traefik reporta error de email invalido en los ultimos logs
# (indica cuenta ACME corrupta que bloquea emision de certificados)
if $COMPOSE logs traefik --since 30s 2>/dev/null | grep -q "unable to parse email address"; then
  log "ACME: email invalido detectado — limpiando acme.json..."
  docker exec traefik rm -f /letsencrypt/acme.json || true
  $COMPOSE restart traefik
  sleep 8
fi

# Rolling update backend
log "Actualizando backend..."
$COMPOSE up -d --no-deps --force-recreate backend

if ! wait_healthy "backend" "$NODE_PORT" "/api/ready" 30; then
  log "Backend no llego a estar healthy -- abortando"
  exit 1
fi

# === MIGRACIONES (despues de backend healthy) ===
log "Ejecutando migraciones..."

# Backup opcional antes de migrar (si existe directorio de backups)
BACKUP_DIR="/opt/workplace/backups"
if [ -d "$BACKUP_DIR" ]; then
  BACKUP_FILE="$BACKUP_DIR/pre-deploy-$(date +%Y%m%d_%H%M%S).sql"
  log "Creando backup: $BACKUP_FILE"
  $COMPOSE exec -T postgres pg_dump -U "${POSTGRES_USER}" "${POSTGRES_DB}" > "$BACKUP_FILE" 2>/dev/null || log "WARN: Backup falló, continuando..."
fi

# Ejecutar migraciones usando el backend recien desplegado (tiene DATABASE_URL configurada)
if ! $COMPOSE exec -T backend npx prisma migrate deploy; then
  log "ERROR: Migraciones fallaron — abortando deploy"
  log "Rollback manual: docker compose -f /opt/workplace/docker-compose.lite.yml up -d --no-deps backend"
  exit 1
fi

log "Migraciones OK"

# Rolling update frontend
log "Actualizando frontend..."
$COMPOSE up -d --no-deps --force-recreate frontend

if ! wait_healthy "frontend" "$FRONTEND_PORT" "/" 20; then
  log "Frontend no llego a estar healthy -- abortando"
  exit 1
fi

log "=== Deploy completado exitosamente ==="
