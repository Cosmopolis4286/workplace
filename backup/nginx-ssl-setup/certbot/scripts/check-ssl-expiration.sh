#!/bin/sh
# SSL Expiration Monitoring Script
# Checks SSL certificate expiration and sends alerts

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')] SSL-MONITOR:${NC} $1"
}

log_success() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] SSL-MONITOR:${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] SSL-MONITOR:${NC} $1"
}

log_error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] SSL-MONITOR:${NC} $1"
}

# Get domain from environment
DOMAIN="${DOMAIN:-playrke.com}"

# Check SSL expiration
check_ssl_expiration() {
    if [ -f "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" ]; then
        # Get expiration date in seconds
        local expiry_date=$(openssl x509 -enddate -noout -in "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" | cut -d= -f2)
        local expiry_seconds=$(date -d "$expiry_date" +%s)
        local current_seconds=$(date +%s)
        local days_until_expiry=$(( (expiry_seconds - current_seconds) / 86400 ))
        
        log "Certificado para $DOMAIN expira en: $expiry_date ($days_until_expiry días)"
        
        # Alert thresholds
        if [ $days_until_expiry -le 3 ]; then
            log_error "🚨 CRÍTICO: Certificado para $DOMAIN expira en $days_until_expiry días!"
            
            # Send alert (you can integrate with Slack, email, etc.)
            send_alert "CRITICAL" "$DOMAIN certificate expires in $days_until_expiry days!"
            
            return 2
        elif [ $days_until_expiry -le 15 ]; then
            log_warning "⚠️ ADVERTENCIA: Certificado para $DOMAIN expira en $days_until_expiry días"
            
            # Send warning alert
            send_alert "WARNING" "$DOMAIN certificate expires in $days_until_expiry days"
            
            return 1
        else
            log_success "✅ Certificado para $DOMAIN válido por $days_until_expiry días"
            return 0
        fi
    else
        log_error "No se encontró certificado para $DOMAIN"
        send_alert "ERROR" "No certificate found for $DOMAIN"
        return 3
    fi
}

# Send alert function (placeholder for integration)
send_alert() {
    local severity="$1"
    local message="$2"
    
    # Log alert
    log "ALERT [$severity]: $message"
    
    # You can integrate with:
    # - Slack webhook
    # - Email notification
    # - Discord webhook
    # - Prometheus alertmanager
    # - etc.
    
    # Example: Slack webhook (uncomment and configure)
    # curl -X POST -H 'Content-type: application/json' \
    #     --data "{\"text\":\"🚨 SSL Alert [$severity]: $message\"}" \
    #     YOUR_SLACK_WEBHOOK_URL
}

# Main execution
log "🔍 Iniciando monitoreo SSL para $DOMAIN"
check_ssl_expiration
log "✅ Monitoreo SSL completado"
