#!/bin/bash
# Nginx reload script - ejecutado desde host (no desde contenedor)
# Uso: ./nginx-reload.sh

set -euo pipefail

echo "🔄 Recargando configuración Nginx..."

# Verificar que nginx esté corriendo
if ! docker ps --filter "name=workplace_nginx" --filter "status=running" | grep -q "workplace_nginx"; then
    echo "❌ Nginx no está corriendo"
    exit 1
fi

# Test configuración antes de recargar
echo "🧪 Testeando configuración Nginx..."
if ! docker exec workplace_nginx nginx -t; then
    echo "❌ Configuración Nginx inválida"
    exit 1
fi

# Recargar nginx
echo "🔄 Recargando Nginx..."
if docker exec workplace_nginx nginx -s reload; then
    echo "✅ Nginx recargado exitosamente"
else
    echo "❌ Falló recarga de Nginx"
    exit 1
fi
