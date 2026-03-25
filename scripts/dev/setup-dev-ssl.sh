#!/bin/bash
# setup-dev-ssl.sh - Complete SSL setup for development

set -e

DOMAIN=${1:-playrke.com}

echo "🔧 Setting up development SSL for: ${DOMAIN}"

# 1. Generate certificates
./scripts/dev/generate-dev-certs.sh "${DOMAIN}"

# 2. Set environment
if grep -q "DOMAIN=" .env; then
    sed -i.bak "s/DOMAIN=.*/DOMAIN=${DOMAIN}/" .env
    echo "✅ Updated DOMAIN in .env"
else
    echo "DOMAIN=${DOMAIN}" >> .env
    echo "✅ Added DOMAIN to .env"
fi

# 3. Ensure SSL is enabled
if grep -q "SSL_ENABLED=" .env; then
    sed -i.bak "s/SSL_ENABLED=.*/SSL_ENABLED=true/" .env
    echo "✅ Updated SSL_ENABLED=true in .env"
else
    echo "SSL_ENABLED=true" >> .env
    echo "✅ Added SSL_ENABLED=true to .env"
fi

# 4. Set development environment
if grep -q "ENVIRONMENT=" .env; then
    sed -i.bak "s/ENVIRONMENT=.*/ENVIRONMENT=development/" .env
    echo "✅ Updated ENVIRONMENT=development in .env"
else
    echo "ENVIRONMENT=development" >> .env
    echo "✅ Added ENVIRONMENT=development to .env"
fi

echo "🚀 Development SSL setup complete!"
echo "📋 Next steps:"
echo "   docker compose --profile ssl up -d nginx"
