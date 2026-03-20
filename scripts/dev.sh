#!/bin/bash

# Script de Desarrollo - WorkPlace Manager
# Levanta todo el stack con migraciones y seed automático

set -e  # Exit on error

echo "🛠️  Modo Desarrollo - WorkPlace Manager"
echo "====================================="

# Verificar que Docker está corriendo
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker no está corriendo. Por favor inicia Docker primero."
    exit 1
fi

# Levantar infraestructura (PostgreSQL + Redis)
echo "🏗️  Levantando infraestructura..."
docker compose up -d postgres redis

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

# Ejecutar migraciones
echo "🔄 Ejecutando migraciones Prisma..."
if ! docker compose run --rm backend pnpm prisma migrate deploy; then
    echo "❌ Fallaron las migraciones"
    exit 1
fi

echo "✅ Migraciones aplicadas"

# Verificar si hay usuarios y hacer seed si es necesario
echo "🔍 Verificando si existen usuarios..."
USER_COUNT=$(docker compose exec -T postgres psql -U postgres -d workplace_db -t -c "SELECT COUNT(*) FROM \"User\";" 2>/dev/null | tr -dc '0-9' || echo "0")

if [ "${USER_COUNT:-0}" -eq 0 ]; then
    echo "🌱 No hay usuarios. Ejecutando seed..."
    if ! docker compose run --rm backend pnpm seed; then
        echo "❌ Falló la ejecución del seed"
        exit 1
    fi
    echo "✅ Seed ejecutado correctamente"
else
    echo "👥 Ya existen $USER_COUNT usuarios. Omitiendo seed."
fi

# Levantar aplicaciones
echo "🚀 Levantando aplicaciones..."
docker compose up -d backend frontend

# Esperar a que las aplicaciones estén listas
echo "⏳ Esperando a que las aplicaciones estén listas..."
sleep 10

# Verificar estado
echo "🔍 Verificando estado del sistema..."
docker compose ps

# Health checks
echo "🏥 Verificando health checks..."
if curl -s http://localhost:3001/api/health > /dev/null; then
    echo "✅ Backend saludable"
else
    echo "⚠️  Backend no responde (puede estar iniciando)"
fi

if curl -s http://localhost:3000 > /dev/null; then
    echo "✅ Frontend saludable"
else
    echo "⚠️  Frontend no responde (puede estar iniciando)"
fi

echo ""
echo "🎉 Sistema de desarrollo iniciado con éxito!"
echo ""
echo "📋 Servicios disponibles:"
echo "   - Frontend: http://localhost:3000"
echo "   - Backend:  http://localhost:3001/api"
echo "   - API Docs: http://localhost:3001/api/docs"
echo "   - PostgreSQL: localhost:5432"
echo "   - Redis: localhost:6379"
echo ""
echo "💡 Comandos útiles:"
echo "   - Ver logs: docker compose logs -f"
echo "   - Detener: docker compose down"
echo "   - Reiniciar: docker compose restart"
echo "   - Seed manual: ./scripts/seed-external.sh"
echo ""
echo "🔧 Para desarrollo manual:"
echo "   - Migraciones: ./scripts/migrate-external.sh"
echo "   - Seed: ./scripts/seed-external.sh"
