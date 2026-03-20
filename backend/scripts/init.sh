#!/bin/bash
set -euo pipefail

DB_HOST="${DB_HOST:-postgres}"
DB_PORT="${DB_PORT:-5432}"
DB_RETRIES="${DB_RETRIES:-15}"
DB_RETRY_INTERVAL="${DB_RETRY_INTERVAL:-2}"

echo "⏳ Esperando a Postgres en $DB_HOST:$DB_PORT..."
attempt=1
until nc -z "$DB_HOST" "$DB_PORT"; do
    if [ "$attempt" -ge "$DB_RETRIES" ]; then
        echo "❌ No se pudo conectar a Postgres después de $DB_RETRIES intentos"
        exit 1
    fi
    echo "Postgres no listo, reintentando en $DB_RETRY_INTERVAL segundos... ($attempt/$DB_RETRIES)"
    attempt=$((attempt+1))
    sleep "$DB_RETRY_INTERVAL"
done
echo "✅ Postgres listo"

echo "📝 NOTA: Las migraciones deben ejecutarse manualmente con 'docker-compose run --rm backend pnpm prisma migrate deploy'"
echo "🚀 Iniciando aplicación..."
exec node dist/main.js