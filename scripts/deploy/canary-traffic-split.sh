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

# Migraciones
log "Ejecutando migraciones..."
$COMPOSE run --rm --no-deps \
  -e DATABASE_URL="postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@postgres:5432/${POSTGRES_DB}" \
  backend npx prisma migrate deploy \
  && log "Migraciones OK" \
  || log "Migraciones fallaron -- continuando"

# Traefik: siempre recrear para aplicar traefik.yml copiado por el pipeline
log "Actualizando Traefik..."
$COMPOSE up -d --no-deps --force-recreate traefik
sleep 8

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

# Rolling update frontend
log "Actualizando frontend..."
$COMPOSE up -d --no-deps --force-recreate frontend

if ! wait_healthy "frontend" "$FRONTEND_PORT" "/" 20; then
  log "Frontend no llego a estar healthy -- abortando"
  exit 1
fi

log "=== Deploy completado exitosamente ==="
