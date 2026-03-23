#!/bin/bash
# Script para actualizar referencias de scripts después de reorganización
# Uso: ./scripts/utils/update-script-references.sh

set -euo pipefail

echo "🔍 Buscando referencias a scripts antiguos..."

# Archivos a verificar
FILES=(
    ".github/workflows/deploy.yml"
    "docker-compose.prod.yml"
    "docker-compose.dev.yml"
    "*.md"
)

# Mapeo de rutas antiguas a nuevas
declare -A SCRIPT_MAP=(
    ["scripts/setup-ssl-v2.sh"]="scripts/ssl/setup-ssl-v2.sh"
    ["scripts/backup-postgres.sh"]="scripts/database/backup-postgres.sh"
    ["scripts/production-monitor.sh"]="scripts/monitoring/production-monitor.sh"
    ["scripts/nginx-reload.sh"]="scripts/nginx/nginx-reload.sh"
    ["scripts/migrate-external.sh"]="scripts/database/migrate-external.sh"
    ["scripts/seed-external.sh"]="scripts/database/seed-external.sh"
    ["scripts/init-dev.sh"]="scripts/deployment/init-dev.sh"
    ["scripts/init-backend-prod.sh"]="scripts/deployment/init-backend-prod.sh"
    ["scripts/docker-monitor.sh"]="scripts/monitoring/docker-monitor.sh"
    ["scripts/create-env.sh"]="scripts/utils/create-env.sh"
    ["scripts/update-cloudflare-ips.sh"]="scripts/utils/update-cloudflare-ips.sh"
    ["scripts/renew-ssl.sh"]="scripts/ssl/renew-ssl.sh"
)

echo "📝 Actualizando referencias..."

# Actualizar referencias en archivos
for file in "${FILES[@]}"; do
    if [ -f "$file" ] || [[ "$file" == *"*"* ]]; then
        echo "🔧 Procesando: $file"
        
        for old_path in "${!SCRIPT_MAP[@]}"; do
            new_path="${SCRIPT_MAP[$old_path]}"
            
            if [[ "$file" == *"*"* ]]; then
                # Para archivos con wildcards
                find . -name "$file" -type f -exec sed -i "s|$old_path|$new_path|g" {} \; 2>/dev/null || true
            else
                # Para archivos específicos
                if [ -f "$file" ]; then
                    sed -i "s|$old_path|$new_path|g" "$file" 2>/dev/null || true
                fi
            fi
        done
    fi
done

echo "✅ Referencias actualizadas"

# Verificar si quedan referencias antiguas
echo ""
echo "🔍 Verificando referencias no actualizadas..."

found_old_refs=false
for old_path in "${!SCRIPT_MAP[@]}"; do
    if grep -r "$old_path" . --include="*.yml" --include="*.yaml" --include="*.sh" --include="*.md" 2>/dev/null | grep -v "update-script-references.sh" | grep -v ".git/" | head -5; then
        echo "⚠️ Referencias antiguas encontradas para: $old_path"
        found_old_refs=true
    fi
done

if [ "$found_old_refs" = false ]; then
    echo "✅ No se encontraron referencias antiguas"
else
    echo "📋 Revisa manualmente las referencias antiguas encontradas"
fi

echo ""
echo "🎉 Actualización completada"
echo ""
echo "💡 Recuerda verificar:"
echo "   - Permisos de ejecución: chmod +x scripts/**/*.sh"
echo "   - Funcionalidad de los scripts actualizados"
echo "   - Integraciones con CI/CD"
