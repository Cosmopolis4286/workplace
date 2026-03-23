#!/bin/bash

# Script profesional para ejecutar seed desde el host (fuera del contenedor)
# Esto mantiene el contenedor ligero, seguro y reproducible

set -e  # Exit on error

echo "🌱 Seed Externo - WorkPlace Manager"
echo "=================================="

# Verificar que Docker está corriendo
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker no está corriendo. Por favor inicia Docker primero."
    exit 1
fi

# Verificar que el contenedor de postgres está activo
if ! docker compose ps postgres | grep -q "Up"; then
    echo "❌ El contenedor postgres no está corriendo."
    echo "💡 Ejecuta: docker compose up postgres -d"
    exit 1
fi

# Esperar a que Postgres esté listo
echo "⏳ Esperando a Postgres..."
RETRIES=30
until docker compose exec -T postgres pg_isready -U postgres -d workplace_db; do
    ((RETRIES--))
    if [ "$RETRIES" -le 0 ]; then
        echo "❌ Timeout esperando a Postgres"
        exit 1
    fi
    sleep 2
done

echo "✅ Postgres está listo"

# Verificar si ya existen usuarios
echo "🔍 Verificando si existen usuarios..."
USER_COUNT=$(docker compose exec -T postgres psql -U postgres -d workplace_db -t -c "SELECT COUNT(*) FROM \"User\";" 2>/dev/null | tr -dc '0-9' || echo "0")

if [ "${USER_COUNT:-0}" -gt 0 ]; then
    echo "👥 Ya existen $USER_COUNT usuarios en la base de datos."
    echo "🔒 Omitiendo seed para evitar duplicación de datos."
    echo ""
    echo "💡 Si quieres forzar el seed, ejecuta:"
    echo "   docker compose exec -T postgres psql -U postgres -d workplace_db -c \"TRUNCATE TABLE \\\"User\\\" CASCADE;\""
    echo "   y luego vuelve a ejecutar este script."
    exit 0
fi

# Ejecutar migraciones primero (importante)
echo "🔄 Ejecutando migraciones Prisma..."
if ! docker compose run --rm backend pnpm prisma migrate deploy; then
    echo "❌ Fallaron las migraciones"
    exit 1
fi

echo "✅ Migraciones aplicadas"

# Ejecutar seed
echo "🌱 Ejecutando seed de datos..."
if ! docker compose run --rm backend pnpm seed; then
    echo "❌ Falló la ejecución del seed"
    exit 1
fi

echo "✅ Seed ejecutado correctamente"
echo "🎉 Base de datos inicializada con éxito!"

# Verificar resultado
echo "🔍 Verificando usuarios creados..."
USER_COUNT=$(docker compose exec -T postgres psql -U postgres -d workplace_db -t -c "SELECT COUNT(*) FROM \"User\";" 2>/dev/null | tr -dc '0-9' || echo "0")
echo "👥 Total de usuarios en base de datos: $USER_COUNT"

echo ""
echo "🚀 El sistema está listo para usar:"
echo "   - Base de datos: ✅ Inicializada"
echo "   - Migraciones: ✅ Aplicadas" 
echo "   - Seed: ✅ Ejecutado"
echo ""
echo "💡 Para iniciar la aplicación:"
echo "   docker compose up backend -d"
