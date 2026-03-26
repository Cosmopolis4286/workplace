#!/bin/sh
# nginx-entrypoint.sh - Detección dinámica SSL y cambio automático HTTP/HTTPS

set -e

# Verificar si existen certificados SSL válidos
if [ -f "/etc/letsencrypt/live/${DOMAIN}/fullchain.pem" ] && [ -f "/etc/letsencrypt/live/${DOMAIN}/privkey.pem" ]; then
    echo "🔒 Certificados SSL encontrados - iniciando modo HTTPS"
    
    # Usar template SSL
    envsubst '${DOMAIN}' < /nginx-ssl.conf.template > /etc/nginx/conf.d/default.conf
    
    # Verificar configuración SSL antes de iniciar
    nginx -t
    
    if [ "${ENVIRONMENT}" = "development" ]; then
        echo "🔧 Modo desarrollo: HTTPS activado, logs en stdout/stderr"
        exec nginx -g 'daemon off; access_log /dev/stdout json_combined; error_log /dev/stderr warn;'
    else
        echo "🚀 Modo producción: HTTPS activado, logs en /var/log/nginx/"
        exec nginx -g 'daemon off;'
    fi
else
    echo "🚫 No se encontraron certificados SSL - iniciando solo HTTP"
    
    # Usar template HTTP
    envsubst '${DOMAIN}' < /nginx-http.conf.template > /etc/nginx/conf.d/default.conf
    
    # Verificar configuración HTTP antes de iniciar
    nginx -t
    
    if [ "${ENVIRONMENT}" = "development" ]; then
        echo "🔧 Modo desarrollo: Solo HTTP, logs en stdout/stderr"
        exec nginx -g 'daemon off; access_log /dev/stdout json_combined; error_log /dev/stderr warn;'
    else
        echo "🚀 Modo producción: Solo HTTP, logs en /var/log/nginx/"
        exec nginx -g 'daemon off;'
    fi
fi
