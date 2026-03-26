#!/bin/sh
# setup-certificates.sh - Configuración automática de certificados SSL

set -e

DOMAIN="${DOMAIN:-playrke.com}"
STAGING_MODE="${STAGING_MODE:-false}"
DEV_MODE="${DEV_MODE:-false}"

echo "🔧 Configurando certificados SSL para dominio: $DOMAIN"
echo "📋 Modo: $([ "$DEV_MODE" = "true" ] && echo "DESARROLLO (auto-firmado)" || echo "PRODUCCIÓN (Let's Encrypt)")"

# Crear directorios necesarios
mkdir -p /etc/letsencrypt/live/$DOMAIN
mkdir -p /var/www/certbot/.well-known/acme-challenge

# Función para generar certificado de desarrollo
generate_dev_certificate() {
    echo "🔧 Generando certificado auto-firmado para desarrollo..."
    
    if /usr/local/bin/generate-dev-cert.sh; then
        echo "✅ Certificado de desarrollo generado"
        return 0
    else
        echo "❌ Error generando certificado de desarrollo"
        return 1
    fi
}

# Función para verificar si se necesitan certificados
check_certificates() {
    if [ ! -f "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" ]; then
        echo "📦 No se encontraron certificados - se necesitan generar"
        return 0  # Necesita certificados
    elif [ "$DEV_MODE" = "true" ]; then
        echo "✅ Certificado de desarrollo encontrado"
        return 1  # No necesita certificados
    else
        # Verificar si existe certificado y obtener issuer
        CERT_ISSUER=$(openssl x509 -in "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" -noout -issuer 2>/dev/null | grep "O =" | sed 's/.*O = \(.*\)/\1/')
        
        if [ -z "$CERT_ISSUER" ]; then
            echo "🔄 No se pudo leer el issuer del certificado - regenerando"
            return 0  # Necesita certificados
        elif echo "$CERT_ISSUER" | grep -q "STAGING"; then
            echo "🔄 Certificado de staging detectado - regenerando para producción"
            return 0  # Necesita certificados
        elif echo "$CERT_ISSUER" | grep -q "Let's Encrypt"; then
            echo "✅ Certificado Let's Encrypt de producción encontrado"
            return 1  # No necesita certificados
        else
            echo "🔄 Certificado inválido o desconocido - regenerando"
            return 0  # Necesita certificados
        fi
    fi
}

# Función para solicitar certificados
request_certificates() {
    if [ "$DEV_MODE" = "true" ]; then
        generate_dev_certificate
        return $?
    fi
    
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
    if [ "$DEV_MODE" = "true" ]; then
        echo "🚧 Modo desarrollo - sin renovación automática"
        echo "📋 Para regenerar certificado: docker compose restart certbot"
        return 0
    fi
    
    echo "🚀 Iniciando renovación automática..."
    echo "0 */12 * * * /usr/local/bin/renew-ssl.sh >> /var/log/certbot/renew.log 2>&1" | crontab -
    echo "✅ Configuración completada - certbot listo"
}

# Flujo principal
if check_certificates; then
    if request_certificates; then
        setup_renewal
        if [ "$DEV_MODE" != "true" ]; then
            exec crond -f -l 2
        else
            echo "🚧 Modo desarrollo - manteniendo contenedor activo"
            tail -f /dev/null
        fi
    else
        echo "❌ Falló la obtención de certificados - saliendo"
        exit 1
    fi
else
    setup_renewal
    if [ "$DEV_MODE" != "true" ]; then
        exec crond -f -l 2
    else
        echo "🚧 Modo desarrollo - manteniendo contenedor activo"
        tail -f /dev/null
    fi
fi
