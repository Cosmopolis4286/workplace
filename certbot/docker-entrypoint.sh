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

# Function to reload nginx (mejorado)
reload_nginx() {
    log "Recargando nginx para aplicar nuevos certificados..."
    
    # Intentar recargar nginx graceful usando señal directa
    if nginx -t >/dev/null 2>&1; then
        # Si nginx está corriendo en el mismo host, enviar señal de reload
        if pgrep nginx >/dev/null; then
            nginx -s reload >/dev/null 2>&1
            if [ $? -eq 0 ]; then
                log_success "Nginx recargado exitosamente"
                return 0
            else
                log_warning "Reload fallido, nginx continuará con configuración existente"
                return 0
            fi
        else
            log_success "Nginx no está corriendo, se iniciará con nuevos certificados"
            return 0
        fi
    else
        log_error "Configuración nginx inválida, no se puede recargar"
        return 1
    fi
}

# Function to check existing certificates
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
    # Check if certificates already exist and are valid
    if check_existing_certificates; then
        log_success "Configuración SSL ya está lista"
    else
        # Try to renew first, then generate new ones
        if ! renew_certificates; then
            # Wait for nginx to be ready (simplificado)
            if ! wait_for_nginx; then
                log_error "No se puede continuar sin nginx listo"
                exit 1
            fi
            
            # Generate new certificates
            if ! generate_certificates; then
                log_error "Falló la configuración SSL"
                exit 1
            fi
        fi
        
        # Reload nginx to apply certificates (mejorado)
        reload_nginx
    fi
    
    log_success "Configuración SSL completada exitosamente"
    
    # Start cron daemon for automatic renewals
    log "Iniciando cron daemon para renovaciones automáticas..."
    exec crond -f -l 2
}

# Handle signals gracefully
trap 'log "Recibida señal de terminación, limpiando..."; exit 0' SIGTERM SIGINT

# Run main function
main "$@"
