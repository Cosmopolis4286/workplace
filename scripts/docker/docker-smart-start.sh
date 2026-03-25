#!/bin/bash
# =========================
# Smart Docker Start
# =========================
# Detecta automáticamente SSL y levanta servicios apropiados

set -euo pipefail

# Colores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}🚀 Smart Docker Start${NC}"
echo "========================="

# Leer variables del .env
if [ -f .env ]; then
    source .env
    echo -e "${GREEN}✅ .env loaded${NC}"
else
    echo -e "${RED}❌ .env not found${NC}"
    exit 1
fi

# Detectar configuración
SSL_ENABLED=${SSL_ENABLED:-false}
ENVIRONMENT=${ENVIRONMENT:-development}
DOMAIN=${DOMAIN:-localhost}

echo -e "${YELLOW}📋 Configuration:${NC}"
echo -e "   Environment: ${ENVIRONMENT}"
echo -e "   Domain: ${DOMAIN}"
echo -e "   SSL Enabled: ${SSL_ENABLED}"

# Decidir comando
if [ "$ENVIRONMENT" = "development" ]; then
    echo -e "${GREEN}🔧 Development mode${NC}"
    docker compose -f docker-compose.dev.yml up -d
    
elif [ "$SSL_ENABLED" = "true" ]; then
    echo -e "${GREEN}🔒 SSL enabled - Starting with certbot${NC}"
    docker compose --profile ssl up -d
    
else
    echo -e "${GREEN}🚀 Production without SSL${NC}"
    docker compose up -d
fi

echo -e "${GREEN}✅ Services started!${NC}"
echo "========================="

# Mostrar URLs
echo -e "${BLUE}🌐 Access URLs:${NC}"
if [ "$SSL_ENABLED" = "true" ] && [ "$DOMAIN" != "localhost" ]; then
    echo -e "${GREEN}🔒 https://$DOMAIN${NC}"
else
    echo -e "${YELLOW}🌐 http://localhost:$FRONTEND_PORT${NC}"
    echo -e "${YELLOW}🔧 Backend: http://localhost:$NODE_PORT/api${NC}"
fi

# Status
echo -e "${BLUE}📊 Service Status:${NC}"
docker compose ps
