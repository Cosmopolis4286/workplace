#!/bin/bash
# SSL renewal script - ejecutado por cron en contenedor certbot
# Uso: /usr/local/bin/renew-ssl.sh
# 
# Este script:
# 1. Verifica disponibilidad de certbot
# 2. Muestra estado actual de certificados
# 3. Ejecuta renovación con deploy hook
# 4. Verifica post-renovación
# 5. Calcula días restantes de validez
#
# Variables de entorno:
# - DOMAIN: dominio a gestionar (default: playrke.com)
#
# Salida:
# - 0: éxito (renovación completada o no necesaria)
# - 1: error (certbot no encontrado o renovación fallida)

set -euo pipefail

# Dominio configurable con fallback
DOMAIN=${DOMAIN:-playrke.com}

# Funciones de logging estructurado
log() { echo "[INFO] $(date '+%Y-%m-%d %H:%M:%S') $1"; }
err() { echo "[ERROR] $(date '+%Y-%m-%d %H:%M:%S') $1"; }

log "🔒 Iniciando renovación SSL para $DOMAIN"
log "📅 Fecha: $(date)"

# Verificar que certbot esté disponible
if ! command -v certbot &> /dev/null; then
    err "Certbot no encontrado en PATH"
    exit 1
fi

# Mostrar estado actual de certificados (sin --quiet para más info)
log "📋 Estado actual de certificados:"
certbot certificates || true

# Ejecutar renovación con timeout y deploy hook
log "🔄 Ejecutando renovación con timeout 300s..."

# timeout previene hangs por problemas de red o Let's Encrypt
if timeout 300 certbot renew --quiet --deploy-hook "/usr/local/bin/nginx-reload.sh"; then
    log "✅ Renovación SSL completada exitosamente"
    
    # Verificar estado post-renovación
    log "📋 Estado post-renovación:"
    certbot certificates || true
    
    # Verificar expiración del certificado
    CERT_PATH="/etc/letsencrypt/live/$DOMAIN/fullchain.pem"
    if [ -f "$CERT_PATH" ]; then
        # Extraer fecha de expiración y calcular días restantes
        EXPIRY=$(openssl x509 -in "$CERT_PATH" -noout -enddate | cut -d= -f2)
        DAYS_LEFT=$(( ($(date -d "$EXPIRY" +%s) - $(date +%s)) / 86400 ))
        
        log "📅 Certificado válido por $DAYS_LEFT días (expira: $EXPIRY)"
        
        # Alerta si expira pronto
        if [ $DAYS_LEFT -lt 30 ]; then
            log "⚠️ Advertencia: Certificado expira en menos de 30 días"
        fi
    else
        err "No se encontró certificado en $CERT_PATH"
        exit 1
    fi
    
    # Verificación post-reload de nginx
    if pgrep nginx > /dev/null; then
        log "🚀 Nginx está corriendo después del reload"
    else
        log "⚠️ Advertencia: Nginx no está corriendo después del reload"
    fi
    
else
    err "Error durante renovación SSL o timeout (300s)"
    err "📋 Últimas líneas de log de certbot:"
    tail -n 20 /var/log/letsencrypt/letsencrypt.log || true
    exit 1
fi