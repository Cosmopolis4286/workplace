#!/bin/bash
# Script de monitoreo y mantenimiento para producción
# Ejecutar diariamente: ./scripts/production-monitor.sh

set -euo pipefail

echo "🔍 Monitoreo de Producción - $(date)"
echo "=================================="

# 1. Verificar estado de contenedores
echo "📊 Estado de Contenedores:"
docker compose -f /opt/workplace/docker-compose.yml ps --format "table {{.Name}}\t{{.Status}}\t{{.Ports}}"

# 2. Verificar health checks
echo ""
echo "🏥 Health Checks:"
for service in backend frontend postgres redis nginx; do
    if docker compose -f /opt/workplace/docker-compose.yml ps "$service" | grep -q "Up"; then
        health=$(docker compose -f /opt/workplace/docker-compose.yml ps "$service" | grep -o "healthy\|unhealthy\|starting" || echo "unknown")
        echo "  $service: $health"
    else
        echo "  $service: down"
    fi
done

# 3. Verificar uso de recursos
echo ""
echo "💾 Uso de Recursos:"
docker stats --no-stream --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.MemPerc}}"

# 4. Verificar espacio en disco
echo ""
echo "💿 Espacio en Disco:"
df -h | grep -E "/$|/opt|/var"

# 5. Verificar certificados SSL
echo ""
echo "🔒 Certificados SSL:"
DOMAIN="${DOMAIN:-localhost}"
if [ -f "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" ]; then
    expiry=$(openssl x509 -enddate -noout -in "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" | cut -d= -f2)
    echo "  $DOMAIN: Expira $expiry"
    
    # Verificar si expira pronto
    if ! openssl x509 -checkend 2592000 -noout -in "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" 2>/dev/null; then
        echo "  ⚠️ Certificado expira en menos de 30 días!"
    fi
else
    echo "  ❌ No se encontraron certificados"
fi

# 6. Verificar backups
echo ""
echo "📦 Backups PostgreSQL:"
BACKUP_DIR="/opt/workplace/backups/postgres"
if [ -d "$BACKUP_DIR" ]; then
    backup_count=$(find "$BACKUP_DIR" -name "workplace_backup_*.sql.gz" | wc -l)
    latest_backup=$(find "$BACKUP_DIR" -name "workplace_backup_*.sql.gz" -type f -printf '%T@ %p\n' | sort -n | tail -1 | cut -d' ' -f2-)
    latest_date=$(find "$BACKUP_DIR" -name "workplace_backup_*.sql.gz" -type f -printf '%T@ %p\n' | sort -n | tail -1 | cut -d' ' -f1 | xargs -I{} date -d @{} '+%Y-%m-%d %H:%M')
    
    echo "  Cantidad de backups: $backup_count"
    echo "  Backup más reciente: $(basename "$latest_backup")"
    echo "  Fecha: $latest_date"
    
    # Verificar si hay backups recientes (últimas 48 horas)
    if ! find "$BACKUP_DIR" -name "workplace_backup_*.sql.gz" -mtime -2 | grep -q .; then
        echo "  ⚠️ No hay backups recientes (últimas 48 horas)"
    fi
else
    echo "  ❌ Directorio de backups no encontrado"
fi

# 7. Verificar logs de errores recientes
echo ""
echo "📋 Logs de Errores Recientes (últimas 2 horas):"
if docker compose -f /opt/workplace/docker-compose.yml logs --since=2h --tail=10 | grep -i error; then
    echo "  ⚠️ Se encontraron errores en los logs"
else
    echo "  ✅ Sin errores recientes"
fi

# 8. Verificar rate limiting de nginx
echo ""
echo "🚦 Rate Limiting Nginx:"
if [ -f "/var/log/nginx/access.log" ]; then
    # Contar requests en la última hora
    recent_requests=$(tail -1000 /var/log/nginx/access.log | grep "$(date '+%d/%b/%Y:%H:')" | wc -l)
    # Contar 429 responses
    rate_limited=$(tail -1000 /var/log/nginx/access.log | grep "$(date '+%d/%b/%Y:%H:')" | grep " 429 " | wc -l)
    
    echo "  Requests última hora: $recent_requests"
    echo "  Rate limited (429): $rate_limited"
    
    if [ "$rate_limited" -gt 10 ]; then
        echo "  ⚠️ Alto número de rate limits"
    fi
else
    echo "  ❌ No se encontraron logs de nginx"
fi

# 9. Verificar servicios de logging
echo ""
echo "📊 Servicios de Logging:"
for service in loki promtail grafana; do
    if docker compose -f /opt/workplace/docker-compose.logging.yml ps "$service" 2>/dev/null | grep -q "Up"; then
        echo "  $service: ✅ activo"
    else
        echo "  $service: ❌ inactivo"
    fi
done

echo ""
echo "✅ Monitoreo completado - $(date)"
echo "=================================="
