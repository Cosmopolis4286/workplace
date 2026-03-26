#!/bin/bash

# 🔄 SSL Auto-Renewal and NGINX Reload Script
# Handles certificate renewal and automatic NGINX reload

set -euo pipefail

# Configuration
DOMAIN="${DOMAIN:-$(grep DOMAIN .env | cut -d= -f2)}"
LOG_FILE="./logs/ssl/renewal.log"
SSL_DIR="./ssl/certificates"
RENEWAL_THRESHOLD_DAYS=30

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Logging
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')] RENEWAL:${NC} $1" | tee -a "$LOG_FILE"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR:${NC} $1" | tee -a "$LOG_FILE"
}

warn() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING:${NC} $1" | tee -a "$LOG_FILE"
}

success() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] SUCCESS:${NC} $1" | tee -a "$LOG_FILE"
}

# Create log directory
mkdir -p "$(dirname "$LOG_FILE")"

# Check if certificates need renewal
check_renewal_needed() {
    local cert_file="${SSL_DIR}/live/${DOMAIN}/fullchain.pem"
    
    if [[ ! -f "$cert_file" ]]; then
        log "No certificate found, renewal needed"
        return 0
    fi
    
    # Check if certificate expires within threshold
    if ! openssl x509 -checkend $((RENEWAL_THRESHOLD_DAYS * 86400)) -noout -in "$cert_file" 2>/dev/null; then
        log "Certificate expires within ${RENEWAL_THRESHOLD_DAYS} days, renewal needed"
        return 0
    else
        local expiry_date=$(openssl x509 -enddate -noout -in "$cert_file" | cut -d= -f2)
        local expiry_seconds=$(date -d "$expiry_date" +%s)
        local current_seconds=$(date +%s)
        local days_until_expiry=$(( (expiry_seconds - current_seconds) / 86400 ))
        
        log "Certificate valid for ${days_until_expiry} days, no renewal needed"
        return 1
    fi
}

# Backup current certificates
backup_current_certificates() {
    local backup_dir="${SSL_DIR}/backups"
    local backup_file="${backup_dir}/${DOMAIN}_$(date +%Y%m%d_%H%M%S).tar.gz"
    
    mkdir -p "$backup_dir"
    
    if [[ -d "${SSL_DIR}/live/${DOMAIN}" ]]; then
        tar -czf "$backup_file" -C "${SSL_DIR}" "live/${DOMAIN}" "archive/${DOMAIN}" "renewal/${DOMAIN}.conf" 2>/dev/null || true
        
        if [[ $? -eq 0 ]]; then
            success "Current certificates backed up: $backup_file"
            
            # Keep only last 10 backups
            find "$backup_dir" -name "${DOMAIN}_*.tar.gz" -type f | sort -r | tail -n +11 | xargs rm -f
        else
            warn "Failed to backup current certificates"
        fi
    fi
}

# Renew certificates using certbot
renew_certificates() {
    log "Starting certificate renewal process..."
    
    # Check if certbot is available
    if ! command -v certbot &> /dev/null; then
        error "certbot command not found"
        return 1
    fi
    
    # Backup current certificates
    backup_current_certificates
    
    # Attempt renewal
    local certbot_cmd="certbot renew --webroot -w ${SSL_DIR}/../www --non-interactive --quiet"
    
    log "Running: $certbot_cmd"
    
    if eval "$certbot_cmd"; then
        success "Certificate renewal completed successfully"
        return 0
    else
        local exit_code=$?
        
        # Check if certificates were actually renewed
        local cert_file="${SSL_DIR}/live/${DOMAIN}/fullchain.pem"
        if [[ -f "$cert_file" ]]; then
            local renewal_date=$(stat -c %Y "$cert_file" 2>/dev/null || stat -f %m "$cert_file" 2>/dev/null)
            local current_time=$(date +%s)
            local time_diff=$((current_time - renewal_date))
            
            # If certificate was modified in the last 5 minutes, consider it renewed
            if [[ $time_diff -lt 300 ]]; then
                success "Certificate was renewed (detected file modification)"
                return 0
            fi
        fi
        
        error "Certificate renewal failed (exit code: $exit_code)"
        return 1
    fi
}

# Test NGINX configuration
test_nginx_config() {
    log "Testing NGINX configuration..."
    
    # Test NGINX configuration
    if docker compose exec -T nginx nginx -t >/dev/null 2>&1; then
        success "NGINX configuration test passed"
        return 0
    else
        error "NGINX configuration test failed"
        return 1
    fi
}

# Reload NGINX gracefully
reload_nginx() {
    log "Reloading NGINX to apply new certificates..."
    
    # Check if NGINX is running
    if ! docker compose ps nginx | grep -q "Up"; then
        error "NGINX is not running"
        return 1
    fi
    
    # Test configuration first
    if ! test_nginx_config; then
        error "Cannot reload NGINX due to configuration errors"
        return 1
    fi
    
    # Reload NGINX
    if docker compose exec -T nginx nginx -s reload >/dev/null 2>&1; then
        success "NGINX reloaded successfully"
        return 0
    else
        error "Failed to reload NGINX"
        return 1
    fi
}

# Verify new certificates
verify_new_certificates() {
    log "Verifying renewed certificates..."
    
    local cert_file="${SSL_DIR}/live/${DOMAIN}/fullchain.pem"
    local key_file="${SSL_DIR}/live/${DOMAIN}/privkey.pem"
    
    if [[ ! -f "$cert_file" ]] || [[ ! -f "$key_file" ]]; then
        error "Certificate files not found after renewal"
        return 1
    fi
    
    # Check certificate validity
    if ! openssl x509 -in "$cert_file" -noout -checkend 86400 2>/dev/null; then
        error "Renewed certificate is invalid or expired"
        return 1
    fi
    
    # Check certificate-key match
    local cert_modulus=$(openssl x509 -noout -modulus -in "$cert_file" | openssl md5)
    local key_modulus=$(openssl rsa -noout -modulus -in "$key_file" | openssl md5)
    
    if [[ "$cert_modulus" != "$key_modulus" ]]; then
        error "Certificate and private key do not match after renewal"
        return 1
    fi
    
    # Get certificate info
    local expiry_date=$(openssl x509 -enddate -noout -in "$cert_file" | cut -d= -f2)
    local expiry_seconds=$(date -d "$expiry_date" +%s)
    local current_seconds=$(date +%s)
    local days_until_expiry=$(( (expiry_seconds - current_seconds) / 86400 ))
    
    success "Certificate verification passed"
    log "New certificate expires: $expiry_date (${days_until_expiry} days)"
    
    return 0
}

# Send renewal notification
send_renewal_notification() {
    local status="$1"
    local message="$2"
    
    local cert_file="${SSL_DIR}/live/${DOMAIN}/fullchain.pem"
    local expiry_date="Unknown"
    local days_until_expiry=0
    
    if [[ -f "$cert_file" ]]; then
        expiry_date=$(openssl x509 -enddate -noout -in "$cert_file" | cut -d= -f2)
        local expiry_seconds=$(date -d "$expiry_date" +%s)
        local current_seconds=$(date +%s)
        days_until_expiry=$(( (expiry_seconds - current_seconds) / 86400 ))
    fi
    
    local email_subject="🔒 SSL Certificate Renewal ${status^^} - ${DOMAIN}"
    local email_body="SSL Certificate Renewal Status: ${status^^}

Domain: ${DOMAIN}
Status: ${status}
Message: ${message}
Renewal Date: $(date)
Certificate Expiry: ${expiry_date}
Days Until Expiry: ${days_until_expiry}

---
Automated SSL Renewal System
"
    
    # Send email if configured
    local alert_email="${ALERT_EMAIL:-admin@${DOMAIN}}"
    if command -v mail &> /dev/null && [[ -n "$alert_email" ]]; then
        echo "$email_body" | mail -s "$email_subject" "$alert_email" || true
    fi
    
    # Send Slack notification if configured
    if [[ -n "${SLACK_WEBHOOK:-}" ]] && command -v curl &> /dev/null; then
        local color="good"
        [[ "$status" == "failed" ]] && color="danger"
        [[ "$status" == "warning" ]] && color="warning"
        
        curl -X POST -H 'Content-type: application/json' \
            --data "{\"text\":\"🔒 SSL Certificate Renewal ${status^^}\n\n*Domain:* ${DOMAIN}\n*Status:* ${status}\n*Message:* ${message}\n*Days Until Expiry:* ${days_until_expiry}\n*Timestamp:* $(date)\"}" \
            "$SLACK_WEBHOOK" 2>/dev/null || true
    fi
}

# Main renewal process
main() {
    log "🔄 Starting SSL renewal process for ${DOMAIN}"
    
    local exit_code=0
    
    # Check if renewal is needed
    if ! check_renewal_needed; then
        log "No renewal needed, exiting"
        exit 0
    fi
    
    log "Certificate renewal required, starting process..."
    
    # Renew certificates
    if ! renew_certificates; then
        error "Certificate renewal failed"
        send_renewal_notification "failed" "Certificate renewal process failed"
        exit 1
    fi
    
    # Verify new certificates
    if ! verify_new_certificates; then
        error "New certificate verification failed"
        send_renewal_notification "failed" "New certificate verification failed"
        exit 1
    fi
    
    # Reload NGINX
    if ! reload_nginx; then
        error "NGINX reload failed"
        send_renewal_notification "failed" "NGINX reload failed after certificate renewal"
        exit 1
    fi
    
    # Success
    success "SSL renewal and NGINX reload completed successfully"
    send_renewal_notification "success" "Certificate renewed and NGINX reloaded successfully"
    
    # Run SSL check to verify everything is working
    if [[ -f "./scripts/ssl/check-ssl-expiration.sh" ]]; then
        log "Running post-renewal SSL verification..."
        ./scripts/ssl/check-ssl-expiration.sh || true
    fi
    
    exit $exit_code
}

# Show help
show_help() {
    cat << EOF
🔄 SSL Auto-Renewal and NGINX Reload Script

Usage: $0 [options]

Environment Variables:
    DOMAIN                  Domain name (default: from .env)
    LOG_FILE               Log file path (default: ./logs/ssl/renewal.log)
    SSL_DIR                SSL certificates directory (default: ./ssl/certificates)
    RENEWAL_THRESHOLD_DAYS  Days before expiry to trigger renewal (default: 30)
    ALERT_EMAIL            Email address for notifications
    SLACK_WEBHOOK          Slack webhook URL for notifications

Examples:
    $0                                          # Run with defaults
    DOMAIN=example.com $0                      # Renew specific domain
    RENEWAL_THRESHOLD_DAYS=15 $0               # Renew 15 days before expiry
    
Cron Setup:
    # Daily renewal check at 3:30 AM
    30 3 * * * /path/to/scripts/ssl/auto-renew-and-reload.sh
    
    # Check every 12 hours
    0 */12 * * * /path/to/scripts/ssl/auto-renew-and-reload.sh

EOF
}

# Handle arguments
case "${1:-}" in
    "help"|"--help"|"-h")
        show_help
        exit 0
        ;;
    "check")
        check_renewal_needed
        exit $?
        ;;
    "renew")
        renew_certificates
        exit $?
        ;;
    "reload")
        reload_nginx
        exit $?
        ;;
    *)
        main
        ;;
esac
