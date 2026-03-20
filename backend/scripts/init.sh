#!/bin/bash
set -euo pipefail

echo "🚀 Iniciando aplicación..."

# Variables configurables
DB_HOST="${DB_HOST:-postgres}"
DB_PORT="${DB_PORT:-5432}"
DB_RETRIES="${DB_RETRIES:-15}"
DB_RETRY_INTERVAL="${DB_RETRY_INTERVAL:-2}"

# Función para esperar a Postgres
wait_for_postgres() {
    echo "⏳ Esperando a Postgres en $DB_HOST:$DB_PORT..."
    local attempt=1
    until nc -z "$DB_HOST" "$DB_PORT"; do
        if [ "$attempt" -ge "$DB_RETRIES" ]; then
            echo "❌ No se pudo conectar a Postgres después de $DB_RETRIES intentos"
            exit 1
        fi
        echo "Postgres no listo, reintentando en $DB_RETRY_INTERVAL segundos... ($attempt/$DB_RETRIES)"
        attempt=$((attempt+1))
        sleep "$DB_RETRY_INTERVAL"
    done
    echo "✅ Postgres está listo"
}

# Ejecutar función
wait_for_postgres

# Ejecutar migraciones Prisma
echo "🔄 Ejecutando migraciones Prisma..."
if ! pnpm prisma migrate deploy; then
    echo "❌ Fallaron las migraciones"
    exit 1
fi
echo "✅ Migraciones aplicadas"

# Nota sobre el seed
echo "📝 NOTA: El seed debe ejecutarse manualmente con: ./scripts/seed-external.sh"

# Arrancar la aplicación
echo "🚀 Iniciando servidor de producción..."
exec pnpm start