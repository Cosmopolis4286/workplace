#!/bin/sh
set -e

DB_HOST="${DB_HOST:-postgres}"
DB_PORT="${DB_PORT:-5432}"
DB_USER="${POSTGRES_USER}"
DB_NAME="${POSTGRES_DB}"

DB_RETRIES="${DB_RETRIES:-20}"
DB_RETRY_INTERVAL="${DB_RETRY_INTERVAL:-2}"

echo "⏳ Esperando a Postgres en $DB_HOST:$DB_PORT..."

attempt=1
until pg_isready -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" >/dev/null 2>&1; do
    if [ "$attempt" -ge "$DB_RETRIES" ]; then
        echo "❌ Postgres no disponible después de $DB_RETRIES intentos"
        exit 1
    fi

    echo "🔁 Intento $attempt/$DB_RETRIES..."
    attempt=$((attempt + 1))
    sleep "$DB_RETRY_INTERVAL"
done

echo "✅ Postgres listo"

# =========================
# Nota migraciones
# =========================
echo "📝 Ejecuta migraciones manualmente si es necesario:"
echo "   docker compose run --rm backend pnpm prisma migrate deploy"

# =========================
# Start app
# =========================
echo "🚀 Iniciando aplicación..."
exec node dist/main.js