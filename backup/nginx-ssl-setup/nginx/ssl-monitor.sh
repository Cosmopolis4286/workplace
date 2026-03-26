#!/bin/sh
# ssl-monitor.sh - Monitorea certificados SSL y recarga nginx automáticamente

DOMAIN="${DOMAIN:-playrke.com}"
CHECK_INTERVAL=30

echo "🔍 Iniciando monitor SSL para $DOMAIN (intervalo: ${CHECK_INTERVAL}s)"

# Esperar que nginx esté disponible antes de monitorear
echo "⏳ Esperando que nginx esté disponible..."
while ! pgrep nginx >/dev/null 2>&1; do
    sleep 2
done
echo "✅ nginx detectado, iniciando monitoreo SSL"

while true; do
    # Verificar si existen certificados válidos
    if [ -f "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" ] && [ -f "/etc/letsencrypt/live/$DOMAIN/privkey.pem" ]; then
        if openssl x509 -checkend 86400 -noout -in "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" 2>/dev/null; then
            echo "✅ Certificados SSL válidos detectados"
            
            # Verificar configuración actual
            if ! grep -q "listen 443 ssl" /etc/nginx/conf.d/default.conf 2>/dev/null; then
                echo "🔄 Recargando configuración HTTPS..."
                envsubst '${DOMAIN}' < /nginx-ssl.conf.template > /etc/nginx/conf.d/default.conf
                
                # Validar y recargar
                if nginx -t; then
                    echo "✅ Configuración válida - recargando nginx"
                    nginx -s reload
                else
                    echo "❌ Error en configuración SSL"
                fi
            fi
        else
            echo "⚠️ Certificados SSL expirados o inválidos"
            
            # Cambiar a modo HTTP si está en HTTPS
            if grep -q "listen 443 ssl" /etc/nginx/conf.d/default.conf 2>/dev/null; then
                echo "🔄 Cambiando a modo HTTP..."
                envsubst '${DOMAIN}' < /nginx-http.conf.template > /etc/nginx/conf.d/default.conf
                
                if nginx -t; then
                    nginx -s reload
                fi
            fi
        fi
    else
        echo "🚫 No hay certificados SSL disponibles"
        
        # Asegurar modo HTTP
        if grep -q "listen 443 ssl" /etc/nginx/conf.d/default.conf 2>/dev/null; then
            echo "🔄 Cambiando a modo HTTP..."
            envsubst '${DOMAIN}' < /nginx-http.conf.template > /etc/nginx/conf.d/default.conf
            
            if nginx -t; then
                nginx -s reload
            fi
        fi
    fi
    
    sleep $CHECK_INTERVAL
done
