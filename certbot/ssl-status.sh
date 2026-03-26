#!/bin/sh
# ssl-status.sh - Gestiona estado SSL compartido

DOMAIN="${DOMAIN:-playrke.com}"
STATUS_FILE="/var/www/certbot/.ssl-status"

# Crear directorio si no existe
mkdir -p "$(dirname "$STATUS_FILE")"

# Crear archivo de estado inicial
echo "pending" > "$STATUS_FILE"
echo "🔧 Estado SSL inicial: pending"

check_and_update_status() {
    if [ -f "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" ] && [ -f "/etc/letsencrypt/live/$DOMAIN/privkey.pem" ]; then
        # Verificar validez del certificado
        if openssl x509 -checkend 86400 -noout -in "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" 2>/dev/null; then
            echo "ready" > "$STATUS_FILE"
            echo "✅ Estado SSL actualizado: ready"
        else
            echo "invalid" > "$STATUS_FILE"
            echo "⚠️ Estado SSL actualizado: invalid"
        fi
    else
        echo "missing" > "$STATUS_FILE"
        echo "🚫 Estado SSL actualizado: missing"
    fi
}

# Actualizar estado periódicamente
while true; do
    check_and_update_status
    sleep 30
done
