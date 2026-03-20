#!/bin/bash

# Script de Producción - WorkPlace Manager
# Despliega stack optimizado sin seed automático

set -e  # Exit on error

echo "🚀 Modo Producción - WorkPlace Manager"
echo "===================================="

# Verificar que Docker está corriendo
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker no está corriendo. Por favor inicia Docker primero."
    exit 1
fi

# Levantar todo el stack (sin seed automático)
echo "🏗️  Desplegando stack de producción..."
docker compose up -d

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

# Ejecutar migraciones automáticamente
echo "🔄 Ejecutando migraciones Prisma..."
if ! docker compose run --rm backend pnpm prisma migrate deploy; then
    echo "❌ Fallaron las migraciones"
    exit 1
fi

echo "✅ Migraciones aplicadas"

# Esperar a que las aplicaciones estén listas
echo "⏳ Esperando a que las aplicaciones estén listas..."
sleep 15

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
echo "🎉 Stack de producción desplegado con éxito!"
echo ""
echo "📋 Servicios disponibles:"
echo "   - Frontend: http://localhost:3000"
echo "   - Backend:  http://localhost:3001"
echo "   - API Docs: http://localhost:3001/docs"
echo ""
echo "⚠️  IMPORTANTE: El seed NO se ejecutó automáticamente"
echo "   Para ejecutar el seed manualmente:"
echo "   ./scripts/seed-external.sh"
echo ""
echo "💡 Comandos útiles:"
echo "   - Ver logs: docker compose logs -f"
echo "   - Detener: docker compose down"
echo "   - Reiniciar: docker compose restart"
echo "   - Migraciones manuales: ./scripts/migrate-external.sh"
echo "   - Seed manual: ./scripts/seed-external.sh"
echo ""
echo "🔒 Checklist de producción:"
echo "   - [ ] Verificar salud de servicios"
echo "   - [ ] Ejecutar seed (solo primera vez)"
echo "   - [ ] Configurar backups"
echo "   - [ ] Monitorear logs"
echo "   - [ ] Configurar monitoreo externo"
