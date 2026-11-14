#!/usr/bin/env bash
# Levanta el entorno de desarrollo híbrido (backend, Postgres, Redis y
# herramientas en Docker; el frontend corre aparte con `pnpm dev`).
# Versión bash de scripts/dev/dev-hybrid.ps1 (Linux/macOS/WSL).
#
# Uso (desde cualquier carpeta):
#   ./scripts/dev/dev-hybrid.sh           # levantar
#   ./scripts/dev/dev-hybrid.sh --build   # reconstruir la imagen del backend
set -euo pipefail

cd "$(dirname "$0")/../.."
ENV_FILE=.env.dev
COMPOSE=(docker compose --env-file "$ENV_FILE" -f docker-compose.hybrid.yml)

fail() { echo "❌ $*" >&2; exit 1; }
warn() { echo "⚠️  $*"; }
ok()   { echo "✅ $*"; }

[ -f "$ENV_FILE" ] || fail "No existe $ENV_FILE. Cópialo desde .env.dev.example y complétalo."

# Valor de KEY en .env.dev, sin comillas que lo envuelvan.
get() {
  local v
  v=$(grep -E "^[[:space:]]*$1[[:space:]]*=" "$ENV_FILE" | tail -1 | cut -d= -f2- | sed -E 's/^[[:space:]]+|[[:space:]]+$//g')
  v=${v#\"}; v=${v%\"}; v=${v#\'}; v=${v%\'}
  printf '%s' "$v"
}

missing=()
for k in POSTGRES_USER POSTGRES_PASSWORD POSTGRES_DB REDIS_PASSWORD; do
  [ -n "$(get "$k")" ] || missing+=("$k")
done
[ ${#missing[@]} -eq 0 ] || fail "Faltan valores en $ENV_FILE: ${missing[*]}"

# La DATABASE_URL se arma en el compose con la contraseña tal cual: símbolos
# como @ : / # ? % & la cortan y el backend falla con P1000.
[[ "$(get POSTGRES_PASSWORD)" =~ ^[A-Za-z0-9._~-]+$ ]] ||
  fail "POSTGRES_PASSWORD tiene caracteres que rompen la DATABASE_URL. Usa solo letras, números y . _ ~ - (p. ej. openssl rand -hex 24)."

[ "$(get APP_ENV)" = "development" ] ||
  warn "APP_ENV no es 'development' en $ENV_FILE: probar desde el celular por la red local no funcionará (CORS)."
ok "$ENV_FILE revisado"

if [ "${1:-}" = "--build" ]; then
  "${COMPOSE[@]}" up -d --build
else
  "${COMPOSE[@]}" up -d
fi

echo "⏳ Esperando a que el backend esté listo (migraciones incluidas)..."
status=""
for _ in $(seq 1 80); do
  status=$(docker inspect -f '{{.State.Health.Status}}' backend-hybrid 2>/dev/null || true)
  running=$(docker inspect -f '{{.State.Running}}' backend-hybrid 2>/dev/null || true)
  [ "$status" = "healthy" ] && break
  [ "$running" = "false" ] && break
  sleep 3
done

if [ "$status" != "healthy" ]; then
  echo
  warn "El backend no quedó listo. Últimas líneas de Postgres y del backend:"
  docker logs postgres-hybrid --tail 15 || true
  echo "-----"
  docker logs backend-hybrid --tail 40 || true
  fail "Revisa los logs de arriba."
fi

echo
ok "Backend listo en http://localhost:3001"
echo "   Ahora el frontend:  cd frontend && pnpm dev   →  http://localhost:3000"
echo "   Logs:     ${COMPOSE[*]} logs -f backend"
echo "   Detener:  ${COMPOSE[*]} down"
