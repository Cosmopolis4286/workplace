#!/bin/sh
# Nginx reload script - ejecutado DENTRO del contenedor nginx
# Uso: /usr/local/bin/nginx-reload (llamado por certbot deploy-hook)
#
# Este script:
# 1. Valida configuración nginx
# 2. Recarga nginx sin downtime
# 3. Falla rápido si hay errores
#
# Salida:
# - 0: éxito (nginx recargado)
# - 1: error (config inválida o reload fallido)

set -e

echo "🔄 Recargando configuración Nginx..."

# Validar configuración antes de recargar (crítico para evitar downtime)
echo "🧪 Validando configuración Nginx..."
nginx -t

# Recargar nginx (graceful reload - no downtime)
echo "🔄 Ejecutando reload graceful..."
nginx -s reload

echo "✅ Nginx recargado exitosamente"
