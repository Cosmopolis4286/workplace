#!/bin/bash

# Script de Migraciones Externas - WorkPlace Manager
# Ejecuta migraciones desde el host con control total

set -e  # Exit on error

echo "🔄 Migraciones Externas - WorkPlace Manager"
echo "========================================"

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

# Verificar estado actual de migraciones
echo "🔍 Verificando estado actual de migraciones..."
MIGRATION_STATUS=$(docker compose run --rm backend pnpm prisma migrate status 2>/dev/null || echo "No se pudo verificar el estado")

echo "📊 Estado actual:"
echo "$MIGRATION_STATUS"
echo ""

# Ejecutar migraciones
echo "🔄 Ejecutando migraciones Prisma..."
if ! docker compose run --rm backend pnpm prisma migrate deploy; then
    echo "❌ Fallaron las migraciones"
    exit 1
fi

echo "✅ Migraciones aplicadas correctamente"

# Verificar estado final
echo "🔍 Verificando estado final..."
FINAL_STATUS=$(docker compose run --rm backend pnpm prisma migrate status 2>/dev/null || echo "No se pudo verificar el estado")

echo "📊 Estado final:"
echo "$FINAL_STATUS"
echo ""

# Verificar tablas creadas
echo "🗂️  Verificando tablas en la base de datos..."
TABLES=$(docker compose exec -T postgres psql -U postgres -d workplace_db -t -c "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';" 2>/dev/null | tr -d ' ' | grep -v '^$' || echo "No se pudieron listar las tablas")

if [ -n "$TABLES" ]; then
    echo "📋 Tablas encontradas:"
    echo "$TABLES" | while read -r table; do
        echo "   - $table"
    done
else
    echo "⚠️  No se encontraron tablas o no se pudieron listar"
fi

echo ""
echo "🎉 Migraciones completadas con éxito!"
echo ""
echo "💡 Siguientes pasos:"
echo "   - Para ejecutar seed: ./scripts/seed-external.sh"
echo "   - Para iniciar backend: docker compose up backend -d"
echo "   - Para ver estado: docker compose ps"
echo ""
echo "🔧 Comandos útiles:"
echo "   - Ver migraciones pendientes: docker compose run --rm backend pnpm prisma migrate diff"
echo "   - Resetear migraciones: docker compose run --rm backend pnpm prisma migrate reset"
echo "   - Generar cliente: docker compose run --rm backend pnpm prisma generate"
