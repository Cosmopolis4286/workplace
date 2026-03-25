#!/bin/bash
set -euo pipefail

DOMAIN="${DOMAIN:-playrke.com}"
STAGING_MODE="${STAGING_MODE:-false}"

echo "🔄 Renovando certificados SSL para $DOMAIN..."

# Build certbot command with staging support
CERTBOT_CMD="certbot renew --webroot -w /var/www/certbot --non-interactive"

if [ "$STAGING_MODE" = "true" ]; then
    CERTBOT_CMD="$CERTBOT_CMD --staging"
    echo "🧪 Usando servidor staging de Let's Encrypt"
fi

# Attempt renewal
if eval "$CERTBOT_CMD"; then
    echo "✅ Certificados renovados exitosamente"
    
    # Check if certificates were actually renewed (certbot returns 0 even if no renewal needed)
    if [ "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" -nt "/etc/letsencrypt/renewal/$DOMAIN.conf" ] 2>/dev/null; then
        echo "🔄 Recargando nginx para aplicar nuevos certificados..."
        
        # Try to reload nginx
        if command -v docker-compose >/dev/null 2>&1; then
            docker-compose exec workplace_nginx nginx -s reload 2>/dev/null || docker-compose restart workplace_nginx
        elif docker ps | grep -q "workplace_nginx"; then
            docker exec workplace_nginx nginx -s reload 2>/dev/null || docker restart workplace_nginx
        fi
        
        echo "✅ Nginx recargado"
    else
        echo "ℹ️ No se necesitó renovar (certificados aún válidos)"
    fi
else
    echo "❌ Falló la renovación de certificados"
    exit 1
fi
