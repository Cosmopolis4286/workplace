#!/bin/sh
# nginx-entrypoint.sh - Punto de entrada optimizado para nginx
# Resuelve problemas de DNS entre contenedores Docker

set -e

# Variables de entorno
DOMAIN="${DOMAIN:-playrke.com}"
HTTP_PORT="${HTTP_PORT:-80}"
HTTPS_PORT="${HTTPS_PORT:-443}"

echo "🔧 Iniciando nginx para dominio: $DOMAIN"

# Función para detectar certificados SSL (rápida)
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
}

# Función para validar configuración de nginx
validate_and_start_nginx() {
    echo " Validando configuración de nginx..."
    
    if nginx -t; then
        echo " Configuración de nginx válida"
    echo " Iniciando nginx..."
    exec nginx -g "daemon off;"
    else
        echo " Error en configuración de nginx - intentando configuración de emergencia"
        
        # Configuración de emergencia sin upstreams
        cat > /etc/nginx/conf.d/default.conf << 'EOF'
server {
    listen 80;
    server_name _;
    
    location / {
        return 200 "Servicio en mantenimiento - nginx iniciado correctamente\n";
        add_header Content-Type text/plain;
    }
    
    location /health {
        access_log off;
        return 200 "healthy\n";
        add_header Content-Type text/plain;
    }
    
    # Proxy directo sin upstreams (intenta conectar si backend está disponible)
    location /api/ {
        proxy_pass http://backend:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_connect_timeout 2s;
        proxy_send_timeout 5s;
        proxy_read_timeout 5s;
        # No fallar si backend no está disponible
        proxy_next_upstream off;
    }
    
    location / {
        proxy_pass http://frontend:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_connect_timeout 2s;
        proxy_send_timeout 5s;
        proxy_read_timeout 5s;
        # No fallar si frontend no está disponible
        proxy_next_upstream off;
    }
}
EOF
        
        echo " Iniciando nginx con configuración de emergencia..."
        exec nginx -g "daemon off;"
    fi
}

# Función para verificar backend en background (no bloqueante)
check_backend_quick() {
    # Esperar un momento a que la red esté estable
    sleep 2
    
    # Intento rápido de verificación, pero no bloquear si falla
    if nslookup backend >/dev/null 2>&1; then
        if curl -f --connect-timeout 2 --max-time 3 http://backend:3001/api/ready >/dev/null 2>&1; then
            echo "✅ Backend está accesible"
        else
            echo "⚠️ Backend resuelve DNS pero no responde aún, nginx continuará iniciando..."
        fi
    else
        echo "⚠️ Backend DNS no resuelto aún, nginx continuará iniciando..."
    fi
}

# Flujo principal optimizado
echo "🔍 Detectando modo SSL..."
if detect_ssl_certificates; then
    ssl_mode=0  # HTTPS
else
    ssl_mode=1  # HTTP
fi

echo "📝 Generando configuración de nginx..."
generate_nginx_config $ssl_mode

echo "⏳ Verificación rápida de backend..."
check_backend_quick

echo "🚀 Iniciando nginx..."
validate_and_start_nginx
