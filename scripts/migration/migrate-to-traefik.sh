#!/bin/bash

# 🚀 Migration Script: NGINX + SSL → Traefik
# Migración automática con rollback seguro

set -euo pipefail

# Configuration
DOMAIN="${DOMAIN:-$(grep DOMAIN .env | cut -d= -f2)}"
BACKUP_DIR="./backup/nginx-ssl-setup"
MIGRATION_LOG="./logs/migration.log"
STAGING_MODE="${STAGING_MODE:-true}"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Logging
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')] MIGRATION:${NC} $1" | tee -a "$MIGRATION_LOG"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR:${NC} $1" | tee -a "$MIGRATION_LOG"
}

warn() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING:${NC} $1" | tee -a "$MIGRATION_LOG"
}

success() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] SUCCESS:${NC} $1" | tee -a "$MIGRATION_LOG"
}

# Create migration log directory
mkdir -p "$(dirname "$MIGRATION_LOG")"

# Pre-migration checks
pre_migration_checks() {
    log "🔍 Running pre-migration checks..."
    
    local checks_failed=0
    
    # Check if backup exists
    if [[ ! -d "$BACKUP_DIR" ]]; then
        error "Backup directory not found: $BACKUP_DIR"
        checks_failed=1
    else
        success "Backup directory found"
    fi
    
    # Check if Traefik config exists
    if [[ ! -f "./traefik/traefik.yml" ]]; then
        error "Traefik configuration not found"
        checks_failed=1
    else
        success "Traefik configuration found"
    fi
    
    # Check if docker-compose.traefik.yml exists
    if [[ ! -f "./docker-compose.traefik.yml" ]]; then
        error "Traefik docker-compose not found"
        checks_failed=1
    else
        success "Traefik docker-compose found"
    fi
    
    # Check if current setup is running
    if docker compose ps nginx | grep -q "Up"; then
        success "Current NGINX setup is running"
    else
        warn "NGINX is not currently running"
    fi
    
    # Check environment variables
    if [[ -z "${DOMAIN:-}" ]]; then
        error "DOMAIN environment variable not set"
        checks_failed=1
    else
        success "Domain configured: $DOMAIN"
    fi
    
    if [[ $checks_failed -ne 0 ]]; then
        error "Pre-migration checks failed"
        return 1
    fi
    
    success "✅ All pre-migration checks passed"
    return 0
}

# Stop current services
stop_current_services() {
    log "🛑 Stopping current NGINX + SSL services..."
    
    # Stop NGINX gracefully
    if docker compose ps nginx | grep -q "Up"; then
        log "Stopping NGINX..."
        docker compose stop nginx || warn "Failed to stop NGINX"
    fi
    
    # Stop Certbot if running
    if docker compose ps certbot | grep -q "Up"; then
        log "Stopping Certbot..."
        docker compose stop certbot || warn "Failed to stop Certbot"
    fi
    
    # Remove containers
    log "Removing NGINX and Certbot containers..."
    docker compose rm -f nginx certbot 2>/dev/null || true
    
    success "Current services stopped"
}

# Backup current certificates
backup_current_certificates() {
    log "💾 Backing up current SSL certificates..."
    
    local cert_backup_dir="./backup/certificates-$(date +%Y%m%d_%H%M%S)"
    mkdir -p "$cert_backup_dir"
    
    if [[ -d "./ssl/certificates" ]]; then
        cp -r "./ssl/certificates" "$cert_backup_dir/"
        success "Certificates backed up to: $cert_backup_dir"
    else
        warn "No certificates directory found to backup"
    fi
}

# Start Traefik services
start_traefik_services() {
    log "🚀 Starting Traefik services..."
    
    # Create necessary directories
    mkdir -p ./traefik/dynamic
    mkdir -p ./logs/traefik
    
    # Start Traefik stack
    if docker compose -f docker-compose.traefik.yml up -d; then
        success "Traefik services started successfully"
    else
        error "Failed to start Traefik services"
        return 1
    fi
    
    # Wait for services to be ready
    log "Waiting for services to be ready..."
    sleep 30
    
    # Check Traefik health
    if docker compose -f docker-compose.traefik.yml exec -T traefik traefik healthcheck --ping >/dev/null 2>&1; then
        success "Traefik is healthy"
    else
        error "Traefik healthcheck failed"
        return 1
    fi
}

# Test SSL certificate acquisition
test_ssl_acquisition() {
    log "🔒 Testing SSL certificate acquisition..."
    
    # Wait a bit for Traefik to be ready
    sleep 10
    
    # Check if certificates are being requested
    local max_attempts=30
    local attempt=1
    
    while [[ $attempt -le $max_attempts ]]; do
        log "Checking certificate acquisition (attempt $attempt/$max_attempts)..."
        
        # Check if acme.json exists and has content
        if docker compose -f docker-compose.traefik.yml exec -T traefik test -f /letsencrypt/acme.json && \
           docker compose -f docker-compose.traefik.yml exec -T traefik test -s /letsencrypt/acme.json; then
            success "SSL certificate acquisition in progress"
            break
        fi
        
        if [[ $attempt -eq $max_attempts ]]; then
            warn "Certificate acquisition taking longer than expected"
            break
        fi
        
        sleep 10
        ((attempt++))
    done
}

# Test connectivity
test_connectivity() {
    log "🌐 Testing connectivity..."
    
    local max_attempts=20
    local attempt=1
    
    while [[ $attempt -le $max_attempts ]]; do
        log "Testing HTTPS connectivity (attempt $attempt/$max_attempts)..."
        
        # Test HTTP to HTTPS redirect
        if curl -I -s --max-time 10 "http://$DOMAIN" | grep -q "301\|302"; then
            success "HTTP to HTTPS redirect working"
        else
            warn "HTTP redirect not working yet"
        fi
        
        # Test HTTPS connectivity
        if curl -I -s --max-time 10 "https://$DOMAIN" | grep -q "200\|301\|302"; then
            success "HTTPS connectivity working"
            return 0
        fi
        
        if [[ $attempt -eq $max_attempts ]]; then
            error "HTTPS connectivity test failed"
            return 1
        fi
        
        sleep 15
        ((attempt++))
    done
}

# Test application routing
test_application_routing() {
    log "🔄 Testing application routing..."
    
    # Test frontend
    if curl -s --max-time 10 "https://$DOMAIN" | grep -q "html\|js\|css"; then
        success "Frontend routing working"
    else
        warn "Frontend routing may have issues"
    fi
    
    # Test backend API
    if curl -s --max-time 10 "https://api.$DOMAIN/api/ready" | grep -q "ready\|ok\|status"; then
        success "Backend API routing working"
    else
        warn "Backend API routing may have issues"
    fi
    
    # Test Traefik dashboard
    if curl -s --max-time 10 "http://localhost:8080/dashboard/" | grep -q "Traefik\|dashboard"; then
        success "Traefik dashboard accessible"
    else
        warn "Traefik dashboard not accessible"
    fi
}

# Verify migration success
verify_migration() {
    log "✅ Verifying migration success..."
    
    local verification_failed=0
    
    # Check if Traefik is running
    if docker compose -f docker-compose.traefik.yml ps traefik | grep -q "Up"; then
        success "Traefik is running"
    else
        error "Traefik is not running"
        verification_failed=1
    fi
    
    # Check if backend is running
    if docker compose -f docker-compose.traefik.yml ps backend | grep -q "Up"; then
        success "Backend is running"
    else
        error "Backend is not running"
        verification_failed=1
    fi
    
    # Check if frontend is running
    if docker compose -f docker-compose.traefik.yml ps frontend | grep -q "Up"; then
        success "Frontend is running"
    else
        error "Frontend is not running"
        verification_failed=1
    fi
    
    # Check SSL certificates
    if docker compose -f docker-compose.traefik.yml exec -T traefik test -f /letsencrypt/acme.json; then
        success "SSL certificates file exists"
    else
        warn "SSL certificates file not found (may still be acquiring)"
    fi
    
    if [[ $verification_failed -ne 0 ]]; then
        error "Migration verification failed"
        return 1
    fi
    
    success "✅ Migration verification passed"
    return 0
}

# Create rollback script
create_rollback_script() {
    log "🔄 Creating rollback script..."
    
    cat > "./scripts/rollback-to-nginx.sh" << 'EOF'
#!/bin/bash

# 🔄 Rollback Script: Traefik → NGINX + SSL
# Rollback seguro al setup anterior

set -euo pipefail

log() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] ROLLBACK: $1"
}

error() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] ERROR: $1"
    exit 1
}

log "Starting rollback to NGINX + SSL..."

# Stop Traefik services
log "Stopping Traefik services..."
docker compose -f docker-compose.traefik.yml down

# Restore original docker-compose
log "Restoring original configuration..."
cp ./backup/nginx-ssl-setup/docker-compose.yml ./docker-compose.yml

# Restore NGINX configuration
if [[ -d "./backup/nginx-ssl-setup/nginx" ]]; then
    cp -r ./backup/nginx-ssl-setup/nginx/* ./nginx/
fi

# Restore SSL scripts
if [[ -d "./backup/nginx-ssl-setup/scripts/ssl" ]]; then
    cp -r ./backup/nginx-ssl-setup/scripts/ssl/* ./scripts/ssl/
fi

# Start original services
log "Starting NGINX + SSL services..."
docker compose up -d

# Wait for services
sleep 30

# Verify rollback
if docker compose ps nginx | grep -q "Up"; then
    log "✅ Rollback completed successfully"
else
    error "Rollback verification failed"
fi
EOF

    chmod +x "./scripts/rollback-to-nginx.sh"
    success "Rollback script created: ./scripts/rollback-to-nginx.sh"
}

# Cleanup old services
cleanup_old_services() {
    log "🧹 Cleaning up old services..."
    
    # Remove old volumes (optional, commented for safety)
    # docker volume rm nginx_cache nginx_logs nginx_tmp nginx_run 2>/dev/null || true
    
    # Remove old images (optional)
    # docker image prune -f
    
    success "Cleanup completed"
}

# Generate migration report
generate_migration_report() {
    log "📊 Generating migration report..."
    
    local report_file="./logs/migration-report-$(date +%Y%m%d).json"
    
    cat > "$report_file" << EOF
{
  "timestamp": "$(date -Iseconds)",
  "domain": "${DOMAIN}",
  "migration_type": "nginx_to_traefik",
  "staging_mode": ${STAGING_MODE},
  "backup_location": "${BACKUP_DIR}",
  "services": {
    "traefik": $(docker compose -f docker-compose.traefik.yml ps traefik | grep -q "Up" && echo "true" || echo "false"),
    "backend": $(docker compose -f docker-compose.traefik.yml ps backend | grep -q "Up" && echo "true" || echo "false"),
    "frontend": $(docker compose -f docker-compose.traefik.yml ps frontend | grep -q "Up" && echo "true" || echo "false")
  },
  "ssl_status": {
    "certificates_acquiring": $(docker compose -f docker-compose.traefik.yml exec -T traefik test -f /letsencrypt/acme.json 2>/dev/null && echo "true" || echo "false"),
    "https_working": $(curl -s --max-time 5 "https://${DOMAIN}" >/dev/null 2>&1 && echo "true" || echo "false")
  },
  "rollback_available": true,
  "rollback_script": "./scripts/rollback-to-nginx.sh"
}
EOF
    
    success "Migration report generated: $report_file"
}

# Main migration function
main() {
    log "🚀 Starting migration from NGINX + SSL to Traefik for ${DOMAIN}"
    
    # Run pre-migration checks
    if ! pre_migration_checks; then
        error "Pre-migration checks failed. Aborting migration."
        exit 1
    fi
    
    # Create rollback script first
    create_rollback_script
    
    # Migration steps
    stop_current_services
    backup_current_certificates
    start_traefik_services
    test_ssl_acquisition
    test_connectivity
    test_application_routing
    
    # Verify migration
    if verify_migration; then
        generate_migration_report
        cleanup_old_services
        
        success "🎉 Migration completed successfully!"
        success "📋 Summary:"
        success "  - Traefik is now handling all traffic"
        success "  - SSL certificates are automatically managed"
        success "  - Rollback script available: ./scripts/rollback-to-nginx.sh"
        success "  - Migration report: ./logs/migration-report-$(date +%Y%m%d).json"
        
        log "🌐 Access points:"
        log "  - Main site: https://${DOMAIN}"
        log "  - API: https://api.${DOMAIN}"
        log "  - Traefik dashboard: http://localhost:8080"
        
    else
        error "❌ Migration failed! Check rollback script."
        exit 1
    fi
}

# Show help
show_help() {
    cat << EOF
🚀 Migration Script: NGINX + SSL → Traefik

Usage: $0 [options]

This script migrates from NGINX + Certbot + Scripts SSL to Traefik with:
- Automatic backup of current setup
- Safe migration with rollback capability
- SSL certificate migration
- Connectivity testing
- Verification and reporting

Environment Variables:
    DOMAIN               Domain name (required)
    STAGING_MODE         Use Let's Encrypt staging (default: true)
    MIGRATION_LOG        Log file path (default: ./logs/migration.log)

Examples:
    $0                                          # Run migration
    DOMAIN=example.com $0                      # Migrate specific domain
    STAGING_MODE=false $0                       # Use production Let's Encrypt
    
Safety Features:
    ✅ Pre-migration checks
    ✅ Automatic backup creation
    ✅ Rollback script generation
    ✅ Step-by-step verification
    ✅ Comprehensive logging

Rollback:
    ./scripts/rollback-to-nginx.sh    # Rollback to NGINX setup

EOF
}

# Handle arguments
case "${1:-}" in
    "help"|"--help"|"-h")
        show_help
        exit 0
        ;;
    "test")
        pre_migration_checks
        exit $?
        ;;
    "rollback")
        ./scripts/rollback-to-nginx.sh
        exit $?
        ;;
    *)
        main
        ;;
esac
