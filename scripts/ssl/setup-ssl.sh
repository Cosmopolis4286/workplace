#!/bin/bash

# 🚀 SSL Setup Script - External SSL Management
# Este script maneja SSL fuera del stack principal

set -euo pipefail

# Configuración
DOMAIN="${DOMAIN:-localhost}"
EMAIL="${EMAIL:-admin@${DOMAIN}}"
SSL_DIR="./ssl/certificates"
LOG_DIR="./logs/ssl"

# Colores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Logging
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

warn() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING: $1${NC}"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR: $1${NC}"
    exit 1
}

# Crear directorios
setup_directories() {
    log "Creating SSL directories..."
    mkdir -p "${SSL_DIR}"
    mkdir -p "${LOG_DIR}"
    
    # Estructura de directorios para Let's Encrypt
    mkdir -p "${SSL_DIR}/live/${DOMAIN}"
    mkdir -p "${SSL_DIR}/archive/${DOMAIN}"
    mkdir -p "${SSL_DIR}/renewal"
}

# Opción 1: Certificados Auto-firmados (Desarrollo)
generate_self_signed() {
    log "Generating self-signed certificates for ${DOMAIN}..."
    
    # Generar key
    openssl genrsa -out "${SSL_DIR}/live/${DOMAIN}/privkey.pem" 2048
    
    # Generar CSR
    openssl req -new -key "${SSL_DIR}/live/${DOMAIN}/privkey.pem" \
        -out "${SSL_DIR}/live/${DOMAIN}/cert.csr" \
        -subj "/C=US/ST=State/L=City/O=Organization/CN=${DOMAIN}"
    
    # Generar certificado auto-firmado
    openssl x509 -req -in "${SSL_DIR}/live/${DOMAIN}/cert.csr" \
        -key "${SSL_DIR}/live/${DOMAIN}/privkey.pem" \
        -CAcreateserial -out "${SSL_DIR}/live/${DOMAIN}/fullchain.pem" \
        -days 365 \
        -extensions v3_req \
        -extfile <(cat <<EOF
[v3_req]
subjectAltName = @alt_names
[alt_names]
DNS.1 = ${DOMAIN}
DNS.2 = *.${DOMAIN}
DNS.3 = localhost
DNS.4 = *.localhost
EOF
    )
    
    # Crear chain.pem (igual a fullchain para self-signed)
    cp "${SSL_DIR}/live/${DOMAIN}/fullchain.pem" "${SSL_DIR}/live/${DOMAIN}/chain.pem"
    
    # Limpiar CSR
    rm "${SSL_DIR}/live/${DOMAIN}/cert.csr"
    
    log "Self-signed certificates generated successfully"
}

# Opción 2: Let's Encrypt (Producción)
setup_letsencrypt() {
    log "Setting up Let's Encrypt certificates for ${DOMAIN}..."
    
    # Verificar si certbot está instalado
    if ! command -v certbot &> /dev/null; then
        error "certbot is not installed. Please install certbot first."
    fi
    
    # Verificar que el dominio sea accesible
    if ! ping -c 1 "${DOMAIN}" &> /dev/null; then
        warn "Domain ${DOMAIN} is not accessible. Make sure DNS is configured."
    fi
    
    # Solicitar certificado
    certbot certonly \
        --standalone \
        --email "${EMAIL}" \
        --agree-tos \
        --no-eff-email \
        --domains "${DOMAIN}" \
        --domains "www.${DOMAIN}" \
        --cert-name "${DOMAIN}" \
        --staging \
        --logs-dir "${LOG_DIR}" \
        --config-dir "${SSL_DIR}" \
        --work-dir "${SSL_DIR}/work" || {
        error "Failed to obtain Let's Encrypt certificate"
    }
    
    log "Let's Encrypt certificates obtained successfully"
}

# Opción 3: Certificados Existentes (Importar)
import_existing_certificates() {
    local source_dir="${1:-}"
    
    if [[ -z "${source_dir}" ]]; then
        error "Source directory required for import. Usage: $0 import <source_directory>"
    fi
    
    log "Importing certificates from ${source_dir}..."
    
    # Verificar que los archivos existan
    if [[ ! -f "${source_dir}/fullchain.pem" ]] || [[ ! -f "${source_dir}/privkey.pem" ]]; then
        error "Certificate files not found in ${source_dir}"
    fi
    
    # Copiar certificados
    cp "${source_dir}/fullchain.pem" "${SSL_DIR}/live/${DOMAIN}/fullchain.pem"
    cp "${source_dir}/privkey.pem" "${SSL_DIR}/live/${DOMAIN}/privkey.pem"
    
    # Crear chain.pem si no existe
    if [[ -f "${source_dir}/chain.pem" ]]; then
        cp "${source_dir}/chain.pem" "${SSL_DIR}/live/${DOMAIN}/chain.pem"
    else
        cp "${SSL_DIR}/live/${DOMAIN}/fullchain.pem" "${SSL_DIR}/live/${DOMAIN}/chain.pem"
    fi
    
    log "Certificates imported successfully"
}

# Verificar certificados
verify_certificates() {
    log "Verifying SSL certificates..."
    
    local cert_file="${SSL_DIR}/live/${DOMAIN}/fullchain.pem"
    local key_file="${SSL_DIR}/live/${DOMAIN}/privkey.pem"
    
    # Verificar que los archivos existan
    if [[ ! -f "${cert_file}" ]] || [[ ! -f "${key_file}" ]]; then
        error "Certificate files not found"
    fi
    
    # Verificar validez del certificado
    if ! openssl x509 -in "${cert_file}" -noout -checkend 86400; then
        warn "Certificate will expire within 24 hours"
    fi
    
    # Verificar que la key coincida con el certificado
    local cert_modulus=$(openssl x509 -noout -modulus -in "${cert_file}" | openssl md5)
    local key_modulus=$(openssl rsa -noout -modulus -in "${key_file}" | openssl md5)
    
    if [[ "${cert_modulus}" != "${key_modulus}" ]]; then
        error "Certificate and private key do not match"
    fi
    
    log "SSL certificates verified successfully"
    
    # Mostrar información del certificado
    echo -e "${GREEN}Certificate Information:${NC}"
    openssl x509 -in "${cert_file}" -noout -dates -subject -issuer
}

# Renovar certificados Let's Encrypt
renew_certificates() {
    log "Renewing Let's Encrypt certificates..."
    
    if ! command -v certbot &> /dev/null; then
        error "certbot is not installed"
    fi
    
    certbot renew \
        --logs-dir "${LOG_DIR}" \
        --config-dir "${SSL_DIR}" \
        --work-dir "${SSL_DIR}/work" \
        --quiet || {
        warn "Certificate renewal failed or not needed"
    }
    
    log "Certificate renewal completed"
}

# Crear cron job para renovación automática
setup_renewal_cron() {
    log "Setting up automatic renewal cron job..."
    
    local cron_script="${PWD}/scripts/ssl/auto-renew.sh"
    
    # Crear script de renovación
    cat > "${cron_script}" << 'EOF'
#!/bin/bash
cd "$(dirname "$0")/../.."
./scripts/ssl/setup-ssl.sh renew
EOF
    chmod +x "${cron_script}"
    
    # Agregar cron job (renewal diario a las 3:30 AM)
    (crontab -l 2>/dev/null; echo "30 3 * * * ${cron_script} >> ${LOG_DIR}/renewal.log 2>&1") | crontab -
    
    log "Automatic renewal cron job configured"
}

# Limpiar certificados
clean_certificates() {
    log "Cleaning up SSL certificates..."
    
    if [[ -d "${SSL_DIR}" ]]; then
        rm -rf "${SSL_DIR}"
        log "SSL certificates cleaned up"
    else
        warn "SSL directory does not exist"
    fi
}

# Mostrar ayuda
show_help() {
    cat << EOF
🚀 SSL Management Script

Usage: $0 <command> [options]

Commands:
    setup              Setup SSL directories and structure
    self-signed        Generate self-signed certificates (development)
    letsencrypt         Obtain Let's Encrypt certificates (production)
    import <dir>       Import existing certificates from directory
    verify             Verify SSL certificates
    renew              Renew Let's Encrypt certificates
    cron               Setup automatic renewal cron job
    clean              Clean up all SSL certificates
    help               Show this help message

Environment Variables:
    DOMAIN             Domain name (default: localhost)
    EMAIL              Email for Let's Encrypt (default: admin@<DOMAIN>)

Examples:
    $0 setup
    $0 self-signed
    $0 letsencrypt
    $0 import /path/to/certs
    $0 verify
    $0 renew
    $0 cron

EOF
}

# Main
main() {
    local command="${1:-}"
    
    case "${command}" in
        "setup")
            setup_directories
            ;;
        "self-signed")
            setup_directories
            generate_self_signed
            verify_certificates
            ;;
        "letsencrypt")
            setup_directories
            setup_letsencrypt
            verify_certificates
            ;;
        "import")
            setup_directories
            import_existing_certificates "${2:-}"
            verify_certificates
            ;;
        "verify")
            verify_certificates
            ;;
        "renew")
            renew_certificates
            ;;
        "cron")
            setup_renewal_cron
            ;;
        "clean")
            clean_certificates
            ;;
        "help"|"--help"|"-h")
            show_help
            ;;
        *)
            error "Unknown command: ${command}. Use 'help' for usage information."
            ;;
    esac
}

# Ejecutar main
main "$@"
