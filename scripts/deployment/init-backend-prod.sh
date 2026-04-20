#!/bin/sh

set -e  # Exit on error

echo "🚀 Backend Producción - WorkPlace Manager"
echo "======================================"

# Variables
DB_HOST="${DB_HOST:-postgres}"
DB_PORT="${DB_PORT:-5432}"
REDIS_HOST="${REDIS_HOST:-redis}"
REDIS_PORT="${REDIS_PORT:-6379}"
DB_RETRIES="${DB_RETRIES:-40}"
REDIS_RETRIES="${REDIS_RETRIES:-40}"
RETRY_INTERVAL="${DB_RETRY_INTERVAL:-3}"

wait_for_service() {
    host=$1
    port=$2
    retries=$3
    name=$4
    attempt=1
    printf "⏳ Esperando %s en %s:%s (máx %ss)...\n" "$name" "$host" "$port" "$((retries * RETRY_INTERVAL))"

    until nc -z "$host" "$port" 2>/dev/null; do
        if [ "$attempt" -ge "$retries" ]; then
            printf "❌ %s no disponible después de %s intentos (%ss)\n" "$name" "$retries" "$((retries * RETRY_INTERVAL))" >&2
            printf "   Verifica que el servicio '%s' esté corriendo y accesible desde este container.\n" "$host" >&2
            printf "   Posibles causas: container de DB no levantó, red Docker incorrecta, credenciales inválidas.\n" >&2
            exit 1
        fi
        if [ "$((attempt % 5))" -eq "0" ]; then
            printf "🔁 Intento %s/%s — aún esperando %s:%s...\n" "$attempt" "$retries" "$host" "$port"
        fi
        attempt=$((attempt + 1))
        sleep "$RETRY_INTERVAL"
    done
    printf "✅ %s disponible en %s:%s (intento %s/%s)\n" "$name" "$host" "$port" "$attempt" "$retries"
}

# Esperar servicios
wait_for_service "$DB_HOST" "$DB_PORT" "$DB_RETRIES" "Postgres"
wait_for_service "$REDIS_HOST" "$REDIS_PORT" "$REDIS_RETRIES" "Redis"

cd /app/backend

# Correr migraciones (idempotente - seguro en prod y test)
echo "🗄️  Aplicando migraciones de base de datos..."
node_modules/.bin/prisma migrate deploy

# Iniciar aplicación
echo "🚀 Iniciando aplicación backend..."
exec node dist/src/main.js