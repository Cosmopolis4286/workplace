#!/bin/sh
# nginx-entrypoint.sh - Punto de entrada optimizado para nginx
# Resuelve problemas de DNS entre contenedores Docker

set -e

# Variables de entorno
DOMAIN="${DOMAIN:-playrke.com}"
HTTP_PORT="${HTTP_PORT:-80}"
HTTPS_PORT="${HTTPS_PORT:-443}"

echo "🔧 Iniciando nginx para dominio: $DOMAIN"

# Función para esperar certificados SSL (opcional)
wait_for_certificates() {
    echo "⏳ Esperando certificados SSL (timeout 60s)..."
    
    cert_wait=60
    cert_time=0
    
    while [ $cert_time -lt $cert_wait ]; do
        if [ -f "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" ] && [ -f "/etc/letsencrypt/live/$DOMAIN/privkey.pem" ]; then
            # Verificar que el certificado sea válido por más de 1 día
            if openssl x509 -checkend 86400 -noout -in "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" 2>/dev/null; then
                echo "✅ Certificados SSL válidos encontrados"
                return 0
            else
                echo "⚠️ Certificado encontrado pero expirado o inválido"
            fi
        fi
        
        sleep 2
        cert_time=$((cert_time + 2))
        echo "   Esperando certificados... (${cert_time}s)"
    done
    
    echo "⚠️ Timeout esperando certificados - iniciando en modo HTTP"
    return 1
}

# Función para detectar certificados SSL
detect_ssl_certificates() {
    if [ -f "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" ] && [ -f "/etc/letsencrypt/live/$DOMAIN/privkey.pem" ]; then
        # Verificar validez del certificado
        if openssl x509 -checkend 86400 -noout -in "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" 2>/dev/null; then
            echo "🔒 Certificados SSL válidos encontrados - iniciando modo HTTPS"
            return 0  # HTTPS
        else
            echo "🚫 Certificados SSL encontrados pero inválidos/expirados - iniciando modo HTTP"
            return 1  # HTTP
        fi
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
    echo "⏳ Verificando conexión con backend (no bloqueante)..."
    
    # Intento rápido de verificación, pero no bloquear si falla
    if curl -f --connect-timeout 2 --max-time 3 http://backend:3001/api/ready >/dev/null 2>&1; then
        echo "✅ Backend está accesible"
    else
        echo "⚠️ Backend no accesible aún, nginx continuará iniciando..."
    fi
    
    return 0  # Siempre continuar
}

# Flujo principal
echo "🔍 Esperando certificados SSL (opcional)..."
if wait_for_certificates; then
    ssl_mode=0  # HTTPS
else
    ssl_mode=1  # HTTP
fi

echo "📝 Generando configuración de nginx..."
generate_nginx_config $ssl_mode

echo "⏳ Esperando a que backend esté listo..."
wait_for_backend

echo "⏳ Esperando resolución DNS para backend..."
dns_wait=30
dns_time=0
dns_resolved=false

while [ $dns_time -lt $dns_wait ]; do
    if nslookup backend >/dev/null 2>&1 || getent hosts backend >/dev/null 2>&1; then
        echo "✅ DNS resuelto correctamente"
        dns_resolved=true
        break
    fi
    sleep 1
    dns_time=$((dns_time + 1))
done

if [ "$dns_resolved" = false ]; then
    echo "⚠️ DNS no resuelto después de 30s, continuando sin validación..."
    # Omitir validación de nginx si DNS no funciona
    echo "🚀 Iniciando nginx sin validación de configuración..."
    exec nginx -g daemon off;
fi

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
