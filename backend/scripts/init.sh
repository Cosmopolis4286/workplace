#!/bin/bash

# Script de inicialización para el backend
# Ejecuta el seed solo si la base de datos está vacía

set -euo pipefail

echo "🔍 Verificando si la base de datos necesita seed..."

# Esperar a que Postgres esté disponible
echo "⏳ Esperando a Postgres..."
RETRIES=30
until nc -z postgres 5432; do
    ((RETRIES--))
    if [ "$RETRIES" -le 0 ]; then
        echo "❌ Postgres no respondió a tiempo"
        exit 1
    fi
    echo "Postgres no está listo, esperando..."
    sleep 2
done

echo "✅ Postgres está listo"

# Ejecutar migraciones
echo "🔄 Ejecutando migraciones Prisma..."
./node_modules/.pnpm/node_modules/.bin/prisma migrate deploy

# Verificar si hay usuarios en la base de datos usando Prisma Client
echo "🔍 Verificando si existen usuarios..."

USER_COUNT=$(NODE_PATH=/app/node_modules/.pnpm/node_modules node <<'EOF'
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  try {
    const count = await prisma.user.count();
    console.log(count);
  } catch (error) {
    console.error("Error consultando usuarios:", error.message);
    console.log(0);
  } finally {
    await prisma.$disconnect();
  }
})();
EOF
)

USER_COUNT=$(echo "$USER_COUNT" | tail -n 1)

echo "👤 Usuarios encontrados: $USER_COUNT"

if [ "$USER_COUNT" = "0" ]; then
    echo "🌱 Base de datos vacía, ejecutando seed..."

    # Ejecutar el seed compilado (NO usar ts-node en producción)
    if [ -f "./dist-seed/prisma/seed.js" ]; then
        node ./dist-seed/prisma/seed.js
        echo "✅ Seed ejecutado correctamente"
    else
        echo "❌ No se encontró dist-seed/prisma/seed.js"
        exit 1
    fi
else
    echo "✅ Base de datos ya contiene datos ($USER_COUNT usuarios), omitiendo seed"
fi

echo "🚀 Iniciando aplicación..."
exec node dist/main.js