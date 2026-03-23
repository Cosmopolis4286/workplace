#!/bin/bash
set -euo pipefail

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

# Function to check if nginx is ready for ACME challenges
wait_for_nginx() {
    local max_attempts=30
    local attempt=1
    
    log "Esperando que nginx esté listo para ACME challenges..."
    
    while [ $attempt -le $max_attempts ]; do
        if curl -f --max-time 3 "http://$DOMAIN/.well-known/acme-challenge/" >/dev/null 2>&1; then
            log_success "Nginx está listo para ACME challenges"
            return 0
        fi
        
        log_warning "Intento $attempt/$max_attempts: nginx aún no está listo"
        sleep 2
        ((attempt++))
    done
    
    log_error "Nginx no está listo después de $max_attempts intentos"
    return 1
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

# Function to reload nginx
reload_nginx() {
    log "Recargando nginx para aplicar nuevos certificados..."
    
    # Try to reload nginx using docker-compose if available
    if command -v docker-compose >/dev/null 2>&1; then
        if docker-compose ps nginx | grep -q "Up"; then
            docker-compose exec nginx nginx -s reload 2>/dev/null || {
                log_warning "No se pudo recargar nginx con docker-compose exec, intentando restart..."
                docker-compose restart nginx
            }
            log_success "Nginx recargado via docker-compose"
            return 0
        fi
    fi
    
    # Try direct docker command
    if docker ps | grep -q "nginx"; then
        docker exec $(docker ps -q --filter "name=nginx") nginx -s reload 2>/dev/null || {
            log_warning "No se pudo recargar nginx directamente, intentando restart..."
            docker restart $(docker ps -q --filter "name=nginx")
        }
        log_success "Nginx recargado via docker"
        return 0
    fi
    
    log_warning "No se encontró nginx corriendo para recargar"
    return 1
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
            # Wait for nginx to be ready
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
        
        # Reload nginx to apply certificates
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
