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
    
    if [ $ssl_mode -eq 0 ]; then
        echo "🔒 Modo HTTPS - Usando configuración SSL"
        envsubst '${DOMAIN}' < /nginx-ssl.conf.template > /etc/nginx/conf.d/default.conf
    else
        echo "🚫 Modo HTTP - Usando configuración HTTP"
        envsubst '${DOMAIN}' < /nginx-http.conf.template > /etc/nginx/conf.d/default.conf
    fi
    
    # NO hacer nginx -t aquí - esperar a backend primero
}

# Función para esperar a que backend esté listo
wait_for_backend() {
    echo "⏳ Esperando a que backend esté listo..."
    local max_wait=60
    local wait_time=0
    
    while [ $wait_time -lt $max_wait ]; do
        if ping -c 1 backend >/dev/null 2>&1; then
            echo "✅ Backend está accesible"
            return 0
        fi
        
        sleep 2
        wait_time=$((wait_time + 2))
        
        if [ $wait_time -eq $max_wait ]; then
            echo "⚠️ Tiempo de espera agotado, continuando..."
            return 1
        fi
    done
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

echo "⏳ Esperando a que backend esté listo..."
wait_for_backend

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
