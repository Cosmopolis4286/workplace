#!/bin/sh
# generate-dev-cert.sh - Generar certificado auto-firmado para desarrollo

set -e

DOMAIN="${DOMAIN:-localhost}"
CERT_DIR="/etc/letsencrypt/live/$DOMAIN"

echo "🔧 Generando certificado auto-firmado para: $DOMAIN"

# Crear directorios
mkdir -p "$CERT_DIR"

# Generar clave privada y certificado auto-firmado
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
    -keyout "$CERT_DIR/privkey.pem" \
    -out "$CERT_DIR/fullchain.pem" \
    -subj "/C=US/ST=State/L=City/O=Development/CN=$DOMAIN" \
    -addext "subjectAltName=DNS:$DOMAIN,DNS:localhost,DNS:*.localhost"

echo "✅ Certificado auto-firmado generado exitosamente"
echo "📁 Ubicación: $CERT_DIR"
echo "⚠️  Válido por 365 días - SOLO para desarrollo"

# Establecer permisos correctos
chmod 600 "$CERT_DIR/privkey.pem"
chmod 644 "$CERT_DIR/fullchain.pem"

echo "🔒 Certificado listo para usar con nginx"
