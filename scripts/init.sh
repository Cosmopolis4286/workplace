#!/bin/sh
set -eu

# ---------- CONFIG ----------
DB_HOST="${DB_HOST:-postgres}"
DB_PORT="${DB_PORT:-5432}"
REDIS_HOST="${REDIS_HOST:-}"
REDIS_PORT="${REDIS_PORT:-6379}"
DB_RETRIES="${DB_RETRIES:-20}"
REDIS_RETRIES="${REDIS_RETRIES:-20}"
RETRY_INTERVAL="${DB_RETRY_INTERVAL:-2}"

# ---------- FUNCIONES ----------
wait_for_service() {
    host=$1
    port=$2
    retries=$3
    name=$4
    attempt=1

    printf "⏳ Esperando %s en %s:%s...\n" "$name" "$host" "$port"

    until nc -z "$host" "$port" 2>/dev/null; do
        if [ "$attempt" -ge "$retries" ]; then
            printf "❌ %s no disponible después de %s intentos\n" "$name" "$retries"
            exit 1
        fi
        printf "🔁 Intento %s/%s...\n" "$attempt" "$retries"
        attempt=$((attempt + 1))
        sleep "$RETRY_INTERVAL"
    done

    printf "✅ %s listo en %s:%s\n" "$name" "$port"
}

# ---------- ESPERAR SERVICIOS ----------
wait_for_service "$DB_HOST" "$DB_PORT" "$DB_RETRIES" "Postgres"

if [ -n "$REDIS_HOST" ]; then
    wait_for_service "$REDIS_HOST" "$REDIS_PORT" "$REDIS_RETRIES" "Redis"
    printf "✅ Redis listo\n"
else
    printf "⚠️ Redis no configurado, se omite la comprobación\n"
fi

# ---------- MIGRACIONES ----------
printf "🔄 Generando Prisma Client...\n"
cd /app/backend && pnpm prisma generate

printf "🔍 Verificando estado de migraciones...\n"
if ! cd /app/backend && pnpm prisma migrate status > /dev/null 2>&1; then
    printf "❌ Las migraciones no están aplicadas. Ejecuta:\n"
    printf "   docker-compose run --rm migrate\n"
    exit 1
fi
printf "✅ Migraciones verificadas\n"

# ---------- INICIAR APP ----------
printf "🚀 Iniciando aplicación...\n"
cd /app/backend && exec node dist/main.js