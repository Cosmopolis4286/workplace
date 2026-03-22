#!/bin/sh

set -e  # Exit on error

echo "🚀 Backend Producción - WorkPlace Manager"
echo "======================================"

# Variables
DB_HOST="${DB_HOST:-postgres}"
DB_PORT="${DB_PORT:-5432}"
REDIS_HOST="${REDIS_HOST:-redis}"
REDIS_PORT="${REDIS_PORT:-6379}"
DB_RETRIES="${DB_RETRIES:-20}"
REDIS_RETRIES="${REDIS_RETRIES:-20}"
RETRY_INTERVAL="${DB_RETRY_INTERVAL:-2}"

wait_for_service() {
    host=$1
    port=$2
    retries=$3
    name=$4
    attempt=1
    printf "⏳ Esperando %s en %s:%s...\n" "$name" "$host" "$port"

    until nc -z "$host" "$port" 2>/dev/null; do
        if [ "$attempt" -ge "$retries" ]; then
            printf "❌ %s no disponible después de %s intentos\n" "$name" "$retries" >&2
            exit 1
        fi
        printf "🔁 Intento %s/%s...\n" "$attempt" "$retries"
        attempt=$((attempt + 1))
        sleep "$RETRY_INTERVAL"
    done
    printf "✅ %s listo en %s:%s\n" "$name" "$host" "$port"
}

# Esperar servicios
wait_for_service "$DB_HOST" "$DB_PORT" "$DB_RETRIES" "Postgres"
wait_for_service "$REDIS_HOST" "$REDIS_PORT" "$REDIS_RETRIES" "Redis"

cd /app/backend

# Aplicar migraciones
echo "🔧 Aplicando migraciones Prisma..."
npx prisma@5.22.0 migrate deploy || true
echo "✅ Migraciones aplicadas"

# Iniciar aplicación
echo "🚀 Iniciando aplicación backend..."
exec node dist/main.js