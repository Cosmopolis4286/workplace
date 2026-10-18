#!/bin/sh
# prisma migrate deploy con una única recuperación automática conocida.
#
# 20260831004151_add_supplier se generó contra una base con drift y fallaba
# en toda base nueva (hacía DROP de columnas que crea una migración
# posterior). Ya está corregida, pero una base que intentó aplicar la versión
# vieja quedó con esa migración marcada como fallida, y migrate deploy
# responde P3009 para siempre. Ese intento no dejó nada aplicado (Postgres
# corre el script entero en una transacción implícita), así que marcarla
# como rolled-back y reintentar es seguro.
#
# Cualquier otro fallo sale con error: no se resuelven migraciones a ciegas.
#
# Uso: PRISMA="pnpm prisma" sh scripts/migrate-deploy.sh   (por defecto)
#      PRISMA="node_modules/.bin/prisma" sh .../migrate-deploy.sh

set -u

PRISMA="${PRISMA:-pnpm prisma}"
KNOWN_FAILED="20260831004151_add_supplier"

if out=$($PRISMA migrate deploy 2>&1); then
    echo "$out"
    exit 0
fi
echo "$out"

if echo "$out" | grep -q "P3009" && echo "$out" | grep -q "$KNOWN_FAILED"; then
    echo "♻️  $KNOWN_FAILED quedó marcada como fallida por la versión anterior; se marca rolled-back y se reintenta."
    $PRISMA migrate resolve --rolled-back "$KNOWN_FAILED" || exit 1
    exec $PRISMA migrate deploy
fi

exit 1
