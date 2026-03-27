#!/bin/bash
# 🔐 Script de inicialización de permisos para Traefik Let's Encrypt
# Ejecutar ANTES del primer deploy: ./scripts/init-traefik-permissions.sh

set -e

VOLUME_PATH="${TRAEFIK_VOLUME_PATH:-./traefik_letsencrypt}"
ACME_FILE="$VOLUME_PATH/acme.json"

echo "🔐 Inicializando permisos para Let's Encrypt..."

# Crear directorio si no existe
mkdir -p "$VOLUME_PATH"

# Crear archivo acme.json si no existe
if [ ! -f "$ACME_FILE" ]; then
    echo "📄 Creando acme.json..."
    touch "$ACME_FILE"
fi

# Fijar permisos 600 (solo owner puede leer/escribir)
echo "🔒 Aplicando permisos 600 a acme.json..."
chmod 600 "$ACME_FILE"

# Verificar
echo "✅ Permisos actuales:"
ls -la "$ACME_FILE"

echo "🚀 Listo para deploy con Let's Encrypt seguro"
