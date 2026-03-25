#!/bin/bash
set -euo pipefail

# Test script para flujo Certbot-Nginx en producción
echo "🧪 Testing Certbot-Nginx Production Flow..."

# Variables de prueba
DOMAIN="${DOMAIN:-playrke.com}"
ENVIRONMENT="${ENVIRONMENT:-production}"
SSL_ENABLED="${SSL_ENABLED:-true}"

echo "📋 Configuration:"
echo "  DOMAIN: $DOMAIN"
echo "  ENVIRONMENT: $ENVIRONMENT"
echo "  SSL_ENABLED: $SSL_ENABLED"

# Test 1: Verificar template nginx
echo "🔍 Test 1: Checking nginx template..."
if [ -f "nginx/conf.d/prod.conf.template" ]; then
    echo "✅ Template exists"
    
    # Test envsubst
    if command -v envsubst >/dev/null 2>&1; then
        echo "✅ envsubst available"
        
        # Generar config de prueba
        export DOMAIN="$DOMAIN"
        envsubst '${DOMAIN}' < nginx/conf.d/prod.conf.template > /tmp/test-prod.conf
        
        # Verificar variables reemplazadas
        if grep -q "${DOMAIN}" /tmp/test-prod.conf; then
            echo "✅ Variables substituted correctly"
        else
            echo "❌ Variable substitution failed"
            exit 1
        fi
        
        # Limpiar
        rm -f /tmp/test-prod.conf
    else
        echo "❌ envsubst not available"
        exit 1
    fi
else
    echo "❌ Template not found"
    exit 1
fi

# Test 2: Verificar configuración certbot
echo "🔍 Test 2: Checking certbot configuration..."
if [ -f "certbot/docker-entrypoint.sh" ]; then
    echo "✅ Certbot entrypoint exists"
    
    # Verificar función reload_nginx
    if grep -q "reload_nginx" certbot/docker-entrypoint.sh; then
        echo "✅ reload_nginx function found"
    else
        echo "❌ reload_nginx function missing"
        exit 1
    fi
else
    echo "❌ Certbot entrypoint not found"
    exit 1
fi

# Test 3: Verificar docker-compose ssl
echo "🔍 Test 3: Checking docker-compose.ssl.yml..."
if [ -f "docker-compose.ssl.yml" ]; then
    echo "✅ SSL compose file exists"
    
    # Verificar comando envsubst
    if grep -q "envsubst" docker-compose.ssl.yml; then
        echo "✅ envsubst command found"
    else
        echo "❌ envsubst command missing"
        exit 1
    fi
    
    # Verificar template montado
    if grep -q "prod.conf.template" docker-compose.ssl.yml; then
        echo "✅ Template volume correct"
    else
        echo "❌ Template volume incorrect"
        exit 1
    fi
else
    echo "❌ SSL compose file not found"
    exit 1
fi

# Test 4: Verificar volúmenes SSL
echo "🔍 Test 4: Checking SSL volumes..."
if grep -q "/etc/letsencrypt:/etc/letsencrypt:ro" docker-compose.ssl.yml; then
    echo "✅ SSL certificates volume mounted"
else
    echo "❌ SSL certificates volume missing"
    exit 1
fi

if grep -q "./certbot/www:/var/www/certbot:rw" docker-compose.ssl.yml; then
    echo "✅ ACME challenge volume mounted"
else
    echo "❌ ACME challenge volume missing"
    exit 1
fi

echo "🎉 All tests passed! Production flow is ready."
echo ""
echo "📝 Next steps:"
echo "  1. Set DOMAIN in .env file"
echo "  2. Run: docker compose -f docker-compose.yml -f docker-compose.ssl.yml up -d"
echo "  3. Monitor certbot logs: docker logs workplace_certbot"
echo "  4. Verify SSL: curl -I https://$DOMAIN"
