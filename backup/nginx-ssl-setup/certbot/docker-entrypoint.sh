#!/bin/sh
set -eu

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')] CERTBOT:${NC} $1"
}

log_success() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] CERTBOT:${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] CERTBOT:${NC} $1"
}

log_error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] CERTBOT:${NC} $1"
}

# Get domain from environment or use default
DOMAIN="${DOMAIN:-playrke.com}"
STAGING_MODE="${STAGING_MODE:-false}"

log "Iniciando Certbot para dominio: $DOMAIN"

# Function to check if nginx is ready for ACME challenges (simplificado)
wait_for_nginx() {
    log "Verificando que nginx esté corriendo..."
    
    # Esperar un poco y verificar con curl simple
    sleep 5
    
    if curl -f --max-time 3 "http://nginx/.well-known/acme-challenge/" >/dev/null 2>&1; then
        log_success "Nginx está listo para ACME challenges"
        return 0
    else
        log_warning "Nginx no está listo, pero continuando..."
        return 0  # No fallar en desarrollo
    fi
}

# Function to generate certificates
generate_certificates() {
    log "Generando certificados SSL para $DOMAIN..."
    
    # Build certbot command
    local certbot_cmd="certbot certonly --webroot -w /var/www/certbot -d $DOMAIN -d www.$DOMAIN --email admin@$DOMAIN --agree-tos --non-interactive --preferred-challenges http-01"
    
    if [ "$STAGING_MODE" = "true" ]; then
        certbot_cmd="$certbot_cmd --staging"
        log_warning "Usando servidor staging de Let's Encrypt"
    fi
    
    if eval "$certbot_cmd"; then
        log_success "Certificados generados exitosamente"
        
        # Verify certificates exist
        if [ -f "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" ] && [ -f "/etc/letsencrypt/live/$DOMAIN/privkey.pem" ]; then
            log_success "Archivos de certificado verificados"
            return 0
        else
            log_error "Archivos de certificado no encontrados después de generar"
            return 1
        fi
    else
        log_error "Falló la generación de certificados"
        return 1
    fi
}

# Function to reload nginx (mejorado con auto-detección)
reload_nginx() {
    log "Recargando nginx para aplicar nuevos certificados..."
    
    # Intentar recargar nginx graceful usando múltiples métodos
    if nginx -t >/dev/null 2>&1; then
        # Método 1: Direct reload si nginx está corriendo
        if pgrep nginx >/dev/null; then
            nginx -s reload >/dev/null 2>&1
            if [ $? -eq 0 ]; then
                log_success "Nginx recargado exitosamente (método directo)"
                return 0
            fi
        fi
        
        # Método 2: Docker exec si estamos en Docker
        if command -v docker >/dev/null 2>&1; then
            if docker exec workplace_nginx nginx -s reload >/dev/null 2>&1; then
                log_success "Nginx recargado exitosamente (método Docker)"
                return 0
            fi
        fi
        
        # Método 3: Señal SIGHUP al proceso nginx
        if pkill -HUP nginx >/dev/null 2>&1; then
            log_success "Nginx recargado exitosamente (método señal)"
            return 0
        fi
        
        log_warning "Todos los métodos de reload fallaron, nginx continuará con configuración existente"
        return 0
    else
        log_error "Configuración nginx inválida, no se puede recargar"
        return 1
    fi
}

# Function to check SSL expiration with alerts
check_ssl_expiration() {
    if [ -f "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" ]; then
        # Get expiration date in seconds
        local expiry_date=$(openssl x509 -enddate -noout -in "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" | cut -d= -f2)
        local expiry_seconds=$(date -d "$expiry_date" +%s)
        local current_seconds=$(date +%s)
        local days_until_expiry=$(( (expiry_seconds - current_seconds) / 86400 ))
        
        log "Certificado expira en: $expiry_date ($days_until_expiry días)"
        
        # Alert thresholds
        if [ $days_until_expiry -le 3 ]; then
            log_error "🚨 CRÍTICO: Certificado expira en $days_until_expiry días!"
            return 2
        elif [ $days_until_expiry -le 15 ]; then
            log_warning "⚠️ ADVERTENCIA: Certificado expira en $days_until_expiry días"
            return 1
        else
            log_success "✅ Certificado válido por $days_until_expiry días"
            return 0
        fi
    else
        log_error "No se encontró certificado para verificar expiración"
        return 3
    fi
}

# Function to backup SSL certificates
backup_ssl_certificates() {
    if [ -f "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" ]; then
        local backup_dir="/letsencrypt/backups"
        local backup_file="$backup_dir/${DOMAIN}_$(date +%Y%m%d_%H%M%S).tar.gz"
        
        mkdir -p "$backup_dir"
        
        # Backup certificates
        tar -czf "$backup_file" -C /etc/letsencrypt live/ "$DOMAIN" 2>/dev/null
        
        if [ $? -eq 0 ]; then
            log_success "Backup SSL creado: $backup_file"
            
            # Clean old backups (keep last 10)
            find "$backup_dir" -name "${DOMAIN}_*.tar.gz" -type f | sort -r | tail -n +11 | xargs rm -f
            
            return 0
        else
            log_error "Falló la creación del backup SSL"
            return 1
        fi
    else
        log_warning "No hay certificados para hacer backup"
        return 1
    fi
}
check_existing_certificates() {
    if [ -f "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" ] && [ -f "/etc/letsencrypt/live/$DOMAIN/privkey.pem" ]; then
        log "Certificados existentes encontrados, verificando validez..."
        
        # Check if certificates are valid for more than 1 day
        if openssl x509 -checkend 86400 -noout -in "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" 2>/dev/null; then
            log_success "Certificados existentes válidos"
            return 0
        else
            log_warning "Certificados existentes expirados o por expirar, intentando renovar..."
            return 1
        fi
    else
        log "No se encontraron certificados existentes"
        return 1
    fi
}

# Function to renew certificates
renew_certificates() {
    log "Intentando renovar certificados..."
    
    if certbot renew --webroot -w /var/www/certbot --non-interactive; then
        log_success "Certificados renovados exitosamente"
        return 0
    else
        log_warning "No se pudo renovar, se generarán nuevos certificados"
        return 1
    fi
}

# Main execution
main() {
    log "🚀 Iniciando sistema SSL mejorado para $DOMAIN"
    
    # Check if certificates already exist and are valid
    if check_existing_certificates; then
        log_success "✅ Configuración SSL ya está lista"
        
        # Check expiration and create backup
        check_ssl_expiration
        backup_ssl_certificates
        
    else
        log "🔄 Iniciando flujo de generación de certificados..."
        
        # Try to renew first, then generate new ones
        if ! renew_certificates; then
            # Wait for nginx to be ready (simplificado)
            if ! wait_for_nginx; then
                log_error "❌ No se puede continuar sin nginx listo"
                exit 1
            fi
            
            # Generate new certificates
            if ! generate_certificates; then
                log_error "❌ Falló la configuración SSL"
                exit 1
            fi
        fi
        
        # Backup new certificates
        backup_ssl_certificates
        
        # Reload nginx to apply certificates (mejorado)
        reload_nginx
    fi
    
    log_success "🎉 Configuración SSL completada exitosamente"
    
    # Setup monitoring cron job
    setup_monitoring_cron
    
    # Start cron daemon for automatic renewals
    log "⏰ Iniciando cron daemon para renovaciones automáticas..."
    exec crond -f -l 2
}

# Function to setup monitoring cron job
setup_monitoring_cron() {
    local cron_file="/etc/cron.d/ssl-monitoring"
    
    # Create cron job for daily SSL check
    cat > "$cron_file" << EOF
# SSL Monitoring - Daily check at 9 AM
0 9 * * * root /usr/local/bin/check-ssl-expiration.sh >> /var/log/certbot/monitoring.log 2>&1

# SSL Backup - Weekly backup on Sundays at 2 AM
0 2 * * 0 root /usr/local/bin/backup-ssl.sh >> /var/log/certbot/backup.log 2>&1
EOF
    
    chmod 644 "$cron_file"
    log "✅ Cron jobs de monitoreo configurados"
}

# Handle signals gracefully
trap 'log "Recibida señal de terminación, limpiando..."; exit 0' SIGTERM SIGINT

# Run main function
main "$@"
