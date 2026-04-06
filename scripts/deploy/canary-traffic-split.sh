#!/bin/bash
# Deploy con rolling update: reemplaza backend y frontend uno a uno,
# verifica que cada uno este healthy antes de continuar.
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
  return 1
}

cd /opt/workplace

log "=== Iniciando deploy SHA: ${CURRENT_SHA:-unknown} ==="
log "  Backend:  ${BACKEND_IMAGE:-?}"
log "  Frontend: ${FRONTEND_IMAGE:-?}"

# Servicios base: solo arrancar si no estan corriendo
if ! $COMPOSE ps postgres 2>/dev/null | grep -qE "running|Up"; then
  log "Arrancando servicios base (primer deploy)..."
  $COMPOSE up -d postgres redis traefik
  log "Esperando postgres..."
  for i in $(seq 1 30); do
    $COMPOSE exec -T postgres pg_isready -U "${POSTGRES_USER:-app}" >/dev/null 2>&1 && break || true
    sleep 3
  done
fi

# Migraciones
log "Ejecutando migraciones..."
$COMPOSE run --rm --no-deps \
  -e DATABASE_URL="postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@postgres:5432/${POSTGRES_DB}" \
  backend npx prisma migrate deploy \
  && log "Migraciones OK" \
  || log "Migraciones fallaron -- continuando"

# Rolling update backend
log "Actualizando backend..."
$COMPOSE up -d --no-deps --force-recreate backend

if ! wait_healthy "backend" "$NODE_PORT" "/api/ready" 30; then
  log "Backend no llego a estar healthy -- abortando"
  $COMPOSE logs --tail 50 backend
  exit 1
fi

# Rolling update frontend
log "Actualizando frontend..."
$COMPOSE up -d --no-deps --force-recreate frontend

if ! wait_healthy "frontend" "$FRONTEND_PORT" "/" 20; then
  log "Frontend no llego a estar healthy -- abortando"
  $COMPOSE logs --tail 50 frontend
  exit 1
fi

log "=== Deploy completado exitosamente ==="
