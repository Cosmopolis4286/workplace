#!/bin/sh
# nginx-entrypoint.sh - Punto de entrada optimizado para nginx
# Resuelve problemas de DNS entre contenedores Docker

set -e

# Variables de entorno
DOMAIN="${DOMAIN:-playrke.com}"
HTTP_PORT="${HTTP_PORT:-80}"
HTTPS_PORT="${HTTPS_PORT:-443}"

echo "🔧 Iniciando nginx para dominio: $DOMAIN"

# Función para detectar certificados SSL
detect_ssl_certificates() {
    if [ -f "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" ] && [ -f "/etc/letsencrypt/live/$DOMAIN/privkey.pem" ]; then
        echo "🔒 Certificados SSL encontrados - iniciando modo HTTPS"
        return 0  # HTTPS
    else
        echo "🚫 No se encontraron certificados SSL - iniciando modo HTTP"
        return 1  # HTTP
    fi
}

# Función para generar configuración de nginx
generate_nginx_config() {
    local ssl_mode=$1
    
    # Usar template HTTP
    envsubst '${DOMAIN}' < /nginx-http.conf.template > /etc/nginx/conf.d/default.conf
    
    # Verificar configuración HTTP antes de iniciar
    nginx -t
    
    if [ "${ENVIRONMENT}" = "development" ]; then
        echo " Modo desarrollo: Solo HTTP, logs en stdout/stderr"
        exec nginx -g 'daemon off; access_log /dev/stdout json_combined; error_log /dev/stderr warn;'
    else
        echo " Modo producción: Solo HTTP, logs en /var/log/nginx/"
        exec nginx -g 'daemon off;'
    fi
}

# Flujo principal
echo "🔍 Detectando modo SSL..."
if detect_ssl_certificates; then
    ssl_mode=0  # HTTPS
else
    ssl_mode=1  # HTTP
fi

echo "📝 Generando configuración de nginx..."
generate_nginx_config $ssl_mode

echo "🔍 Probando configuración de nginx..."
nginx -t

if [ $? -eq 0 ]; then
    echo "✅ Configuración de nginx válida"
    echo "🚀 Iniciando nginx..."
    exec nginx -g daemon off;
else
    echo "❌ Error en configuración de nginx"
    exit 1
fi
