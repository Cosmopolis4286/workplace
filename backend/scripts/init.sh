#!/bin/bash

# Script de inicialización para el backend
# Ejecuta el seed solo si la base de datos está vacía

set -e

echo "🔍 Verificando si la base de datos necesita seed..."

# Esperar a que Postgres esté disponible
echo "⏳ Esperando a Postgres..."
until nc -z postgres 5432; do
    echo "Postgres no está listo, esperando..."
    sleep 2
done

echo "✅ Postgres está listo"

# Ejecutar migraciones
echo "🔄 Ejecutando migraciones Prisma..."
./node_modules/.pnpm/node_modules/.bin/prisma migrate deploy

# Verificar si hay usuarios en la base de datos usando Prisma Client
echo "🔍 Verificando si existen usuarios..."
USER_COUNT=$(node -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function checkUsers() {
  try {
    const count = await prisma.user.count();
    console.log(count);
    await prisma.\$disconnect();
  } catch (error) {
    console.log('0');
    await prisma.\$disconnect();
  }
}
checkUsers();
" 2>/dev/null || echo "0")

if [ "$USER_COUNT" = "0" ]; then
    echo "🌱 Base de datos vacía, ejecutando seed..."
    # Ejecutar el seed.ts exactamente como está en el package.json
    cd /app/backend && /app/node_modules/.pnpm/node_modules/.bin/ts-node -r tsconfig-paths/register --transpile-only prisma/seed.ts
    echo "✅ Seed ejecutado correctamente"
else
    echo "✅ Base de datos ya contiene datos ($USER_COUNT usuarios), omitiendo seed"
fi

echo "🚀 Iniciando aplicación..."
exec node dist/main.js
