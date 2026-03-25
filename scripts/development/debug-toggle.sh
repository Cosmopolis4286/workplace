#!/bin/bash
# =========================
# Debug Toggle Script
# =========================
# Habilita/deshabilita debug logs temporalmente para troubleshooting

set -euo pipefail

# Colores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}🔧 Debug Toggle Script${NC}"
echo "========================="

# Verificar argumento
if [ "${1:-}" != "enable" ] && [ "${1:-}" != "disable" ]; then
    echo -e "${RED}❌ Uso: $0 [enable|disable]${NC}"
    echo "  enable  - Activa debug logs temporalmente"
    echo "  disable - Restaura configuración de producción"
    exit 1
fi

ACTION=$1

case $ACTION in
    "enable")
        echo -e "${YELLOW}⚠️  Activando debug logs (SOLO para troubleshooting)${NC}"
        
        # Backend debug
        docker compose exec backend bash -c "
            export LOG_LEVEL=debug
            export DEBUG=true
            export VERBOSE=true
            echo '🔍 Backend debug enabled'
        "
        
        # Frontend debug  
        docker compose exec frontend bash -c "
            export LOG_LEVEL=debug
            export NUXT_DEBUG=true
            export NITRO_DEBUG=true
            echo '🔍 Frontend debug enabled'
        "
        
        echo -e "${GREEN}✅ Debug logs activados${NC}"
        echo -e "${YELLOW}⚠️  Recuerda desactivarlos después: $0 disable${NC}"
        ;;
        
    "disable")
        echo -e "${GREEN}🔒 Restaurando configuración de producción${NC}"
        
        # Backend production
        docker compose exec backend bash -c "
            export LOG_LEVEL=info
            export DEBUG=false
            export VERBOSE=false
            echo '🔒 Backend production restored'
        "
        
        # Frontend production
        docker compose exec frontend bash -c "
            export LOG_LEVEL=warn
            export NUXT_DEBUG=false
            export NITRO_DEBUG=false
            echo '🔒 Frontend production restored'
        "
        
        echo -e "${GREEN}✅ Configuración de producción restaurada${NC}"
        ;;
esac

echo "========================="
echo -e "${BLUE}📊 Estado actual:${NC}"
docker compose exec backend env | grep -E "(LOG_LEVEL|DEBUG|VERBOSE)" || echo "Backend no accesible"
docker compose exec frontend env | grep -E "(LOG_LEVEL|NUXT_DEBUG|NITRO_DEBUG)" || echo "Frontend no accesible"
