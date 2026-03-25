#!/bin/bash
# generate-dev-certs.sh - Generate SSL certificates for development

set -e

DOMAIN=${1:-localhost}
CERT_DIR="./etc/letsencrypt/live/${DOMAIN}"

echo "🔧 Generating development SSL certificates for: ${DOMAIN}"

# Create directory structure
mkdir -p "${CERT_DIR}"

# Generate self-signed certificate
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
    -keyout "${CERT_DIR}/privkey.pem" \
    -out "${CERT_DIR}/fullchain.pem" \
    -subj "/CN=${DOMAIN}" \
    2>/dev/null

echo "✅ Certificates generated: ${CERT_DIR}"
echo "📁 Files:"
ls -la "${CERT_DIR}/"

echo "🚀 Ready for SSL testing with DOMAIN=${DOMAIN}"
