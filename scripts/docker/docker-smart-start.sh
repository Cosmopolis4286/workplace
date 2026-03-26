#!/bin/bash
# =========================
# Smart Docker Start
# =========================
# Inicia automáticamente con SSL dinámico

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
    set -a
    source .env
    set +a
fi

# Detectar configuración
ENVIRONMENT=${ENVIRONMENT:-development}
DOMAIN=${DOMAIN:-localhost}

echo -e "${YELLOW}📋 Configuration:${NC}"
echo -e "   Environment: ${ENVIRONMENT}"
echo -e "   Domain: ${DOMAIN}"

# Decidir comando
if [ "$ENVIRONMENT" = "development" ]; then
    echo -e "${GREEN}🔧 Development mode${NC}"
    docker compose -f docker-compose.dev.yml up -d
else
    echo -e "${GREEN}� Production mode con SSL automático${NC}"
    docker compose up -d --build
fi

# Mostrar URLs
echo -e "${BLUE}🌐 Access URLs:${NC}"
if [ "$ENVIRONMENT" = "development" ]; then
    echo -e "${YELLOW}🌐 http://localhost:${FRONTEND_PORT:-3000}${NC}"
else
    if [ "$DOMAIN" != "localhost" ]; then
        echo -e "${GREEN}🔒 https://$DOMAIN${NC}"
        echo -e "${YELLOW}🌐 http://$DOMAIN (redirige a HTTPS)${NC}"
    else
        echo -e "${YELLOW}🌐 http://localhost${NC}"
    fi
fi

echo -e "${GREEN}✅ Services started successfully!${NC}"

# Status
echo -e "${BLUE}📊 Service Status:${NC}"
docker compose ps
