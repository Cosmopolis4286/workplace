#!/bin/sh
set -eu

# ---------- CONFIG ----------
DB_HOST="${DB_HOST:-postgres}"
DB_PORT="${DB_PORT:-5432}"
DB_RETRIES="${DB_RETRIES:-20}"
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

# ---------- ESPERAR POSTGRES ----------
wait_for_service "$DB_HOST" "$DB_PORT" "$DB_RETRIES" "Postgres"

# ---------- MIGRACIONES ----------
printf "🔄 Generando Prisma Client...\n"
pnpm prisma generate

printf "🔄 Ejecutando migraciones de Prisma...\n"
pnpm prisma migrate deploy
printf "✅ Migraciones completadas\n"
