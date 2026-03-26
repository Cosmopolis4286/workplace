#!/bin/sh
# setup-certificates.sh - Configuración automática de certificados SSL

set -e

DOMAIN="${DOMAIN:-playrke.com}"
STAGING_MODE="${STAGING_MODE:-false}"

echo "🔧 Configurando certificados SSL para dominio: $DOMAIN"

# Crear directorios necesarios
mkdir -p /etc/letsencrypt/live/$DOMAIN
mkdir -p /var/www/certbot/.well-known/acme-challenge

# Función para verificar si se necesitan certificados
check_certificates() {
    if [ ! -f "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" ]; then
        echo "📦 No se encontraron certificados - solicitando a Let's Encrypt..."
        return 0  # Necesita certificados
    elif openssl x509 -in "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" -noout -issuer 2>/dev/null | grep -q "Let's Encrypt"; then
        echo "✅ Certificado Let's Encrypt válido encontrado"
        return 1  # No necesita certificados
    else
        echo "🔄 Certificado inválido detectado - solicitando nuevo..."
        return 0  # Necesita certificados
    fi
}

# Función para solicitar certificados
request_certificates() {
    echo "🚀 Solicitando certificados a Let's Encrypt via webroot..."
    
    if certbot certonly --webroot -w /var/www/certbot \
        --email admin@$DOMAIN \
        --agree-tos \
        --no-eff-email \
        -d $DOMAIN \
        ${STAGING_MODE:+--staging}; then
        echo "✅ Certificado obtenido exitosamente"
        return 0
    else
        echo "❌ Error obteniendo certificado"
        echo "🔍 Posibles causas:"
        echo "   - DNS no apunta a este servidor"
        echo "   - Puerto 80 bloqueado"
        echo "   - Rate limit de Let's Encrypt"
        echo "   - Dominio inválido"
        return 1
    fi
}

# Función para configurar renovación automática
setup_renewal() {
    echo "🚀 Iniciando renovación automática..."
    echo "0 */12 * * * /usr/local/bin/renew-ssl.sh >> /var/log/certbot/renew.log 2>&1" | crontab -
    echo "✅ Configuración completada - certbot listo"
}

# Flujo principal
if check_certificates; then
    if request_certificates; then
        setup_renewal
        exec crond -f -l 2
    else
        echo "❌ Falló la obtención de certificados - saliendo"
        exit 1
    fi
else
    setup_renewal
    exec crond -f -l 2
fi
