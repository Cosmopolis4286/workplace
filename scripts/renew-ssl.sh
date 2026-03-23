#!/bin/bash
# SSL renewal script - ejecutado por cron en contenedor certbot
# Uso: /usr/local/bin/renew-ssl.sh

set -euo pipefail

DOMAIN=${DOMAIN:-playrke.com}
echo "🔒 Iniciando renovación SSL para $DOMAIN..."
echo "📅 Fecha: $(date)"

# Verificar que certbot esté disponible
if ! command -v certbot &> /dev/null; then
    echo "❌ Certbot no encontrado"
    exit 1
fi

# Verificar configuración actual
echo "📋 Estado actual de certificados:"
certbot certificates --quiet || true

# Renovar certificados con deploy hook
echo "🔄 Ejecutando renovación..."
if certbot renew --quiet --deploy-hook "/usr/local/bin/nginx-reload.sh"; then
    echo "✅ Renovación SSL completada"
    
    # Verificar estado post-renovación
    echo "📋 Estado post-renovación:"
    certbot certificates --quiet || true
    
    # Verificar expiración
    if [ -f "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" ]; then
        EXPIRY=$(openssl x509 -in "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" -noout -enddate | cut -d= -f2)
        DAYS_LEFT=$(( ($(date -d "$EXPIRY" +%s) - $(date +%s)) / 86400 ))
        echo "📅 Certificado válido por $DAYS_LEFT días"
    fi
    
else
    echo "❌ Error durante renovación SSL"
    echo "📋 Últimas líneas de log:"
    tail -n 10 /var/log/letsencrypt/letsencrypt.log || echo "No se encontraron logs"
    exit 1
fi
