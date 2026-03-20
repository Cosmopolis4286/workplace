#!/bin/sh
set -eu

# ---------- CONFIG ----------
DB_HOST="${DB_HOST:-postgres}"
DB_PORT="${DB_PORT:-5432}"
REDIS_HOST="${REDIS_HOST:-}"
REDIS_PORT="${REDIS_PORT:-6379}"
REDIS_PASSWORD="${REDIS_PASSWORD:-}"
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
    if [ -n "$REDIS_PASSWORD" ]; then
        attempt=1
        printf "⏳ Esperando Redis en %s:%s...\n" "$REDIS_HOST" "$REDIS_PORT"
        until redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" -a "$REDIS_PASSWORD" ping | grep -q PONG; do
            if [ "$attempt" -ge "$REDIS_RETRIES" ]; then
                printf "❌ Redis no disponible después de %s intentos\n" "$REDIS_RETRIES"
                exit 1
            fi
            printf "🔁 Intento %s/%s...\n" "$attempt" "$REDIS_RETRIES"
            attempt=$((attempt + 1))
            sleep "$RETRY_INTERVAL"
        done
    else
        wait_for_service "$REDIS_HOST" "$REDIS_PORT" "$REDIS_RETRIES" "Redis"
    fi
    printf "✅ Redis listo\n"
else
    printf "⚠️ Redis no configurado, se omite la comprobación\n"
fi

# ---------- INICIAR APP ----------
printf "🚀 Iniciando aplicación...\n"
exec node dist/main.js