#!/bin/bash

# 🔍 SSL Expiration Monitoring Script
# Monitors SSL certificates and sends alerts

set -euo pipefail

# Configuration
DOMAIN="${DOMAIN:-$(grep DOMAIN .env | cut -d= -f2)}"
LOG_FILE="./logs/ssl/monitoring.log"
ALERT_EMAIL="${ALERT_EMAIL:-admin@${DOMAIN}}"
SLACK_WEBHOOK="${SLACK_WEBHOOK:-}"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Logging
log() {
    echo -e "[$(date +'%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR: $1${NC}" | tee -a "$LOG_FILE"
}

warn() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING: $1${NC}" | tee -a "$LOG_FILE"
}

success() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] SUCCESS: $1${NC}" | tee -a "$LOG_FILE"
}

# Create log directory
mkdir -p "$(dirname "$LOG_FILE")"

# Send alert function
send_alert() {
    local level="$1"
    local message="$2"
    local days="$3"
    
    # Email alert
    if command -v mail &> /dev/null && [[ -n "$ALERT_EMAIL" ]]; then
        echo "$message" | mail -s "🚨 SSL Alert [$level] - ${DOMAIN}" "$ALERT_EMAIL"
    fi
    
    # Slack alert
    if [[ -n "$SLACK_WEBHOOK" ]] && command -v curl &> /dev/null; then
        local color="warning"
        [[ "$level" == "CRITICAL" ]] && color="danger"
        [[ "$level" == "INFO" ]] && color="good"
        
        curl -X POST -H 'Content-type: application/json' \
            --data "{\"text\":\"🔒 SSL Certificate Alert\n\n*Domain:* ${DOMAIN}\n*Level:* ${level}\n*Days until expiry:* ${days}\n*Message:* ${message}\n*Timestamp:* $(date)\"}" \
            "$SLACK_WEBHOOK" 2>/dev/null || true
    fi
    
    # Prometheus metrics
    if [[ -f "./ssl/metrics.prom" ]]; then
        echo "ssl_certificate_days_remaining{domain=\"${DOMAIN}\"} ${days}" > "./ssl/metrics.prom.tmp"
        mv "./ssl/metrics.prom.tmp" "./ssl/metrics.prom"
    fi
}

# Check SSL certificate
check_ssl_certificate() {
    local cert_path="./ssl/certificates/live/${DOMAIN}/fullchain.pem"
    
    if [[ ! -f "$cert_path" ]]; then
        error "Certificate file not found: $cert_path"
        send_alert "CRITICAL" "Certificate file not found!" "0"
        return 3
    fi
    
    # Get expiration date
    local expiry_date
    expiry_date=$(openssl x509 -enddate -noout -in "$cert_path" | cut -d= -f2)
    local expiry_seconds
    expiry_seconds=$(date -d "$expiry_date" +%s)
    local current_seconds
    current_seconds=$(date +%s)
    local days_until_expiry
    days_until_expiry=$(( (expiry_seconds - current_seconds) / 86400 ))
    
    # Get certificate info
    local issuer
    issuer=$(openssl x509 -issuer -noout -in "$cert_path" | cut -d= -f2-)
    local subject
    subject=$(openssl x509 -subject -noout -in "$cert_path" | cut -d= -f2-)
    
    log "Certificate Info:"
    log "  Domain: ${DOMAIN}"
    log "  Subject: ${subject}"
    log "  Issuer: ${issuer}"
    log "  Expires: ${expiry_date} (${days_until_expiry} days)"
    
    # Alert thresholds
    if [[ $days_until_expiry -le 3 ]]; then
        error "🚨 CRITICAL: Certificate expires in ${days_until_expiry} days!"
        send_alert "CRITICAL" "Certificate expires in ${days_until_expiry} days!" "$days_until_expiry"
        return 2
    elif [[ $days_until_expiry -le 15 ]]; then
        warn "⚠️ WARNING: Certificate expires in ${days_until_expiry} days"
        send_alert "WARNING" "Certificate expires in ${days_until_expiry} days" "$days_until_expiry"
        return 1
    elif [[ $days_until_expiry -le 30 ]]; then
        log "ℹ️ INFO: Certificate expires in ${days_until_expiry} days (monitoring)"
        send_alert "INFO" "Certificate expires in ${days_until_expiry} days" "$days_until_expiry"
        return 0
    else
        success "✅ Certificate valid for ${days_until_expiry} days"
        return 0
    fi
}

# Verify certificate chain
verify_certificate_chain() {
    local cert_path="./ssl/certificates/live/${DOMAIN}/fullchain.pem"
    local key_path="./ssl/certificates/live/${DOMAIN}/privkey.pem"
    
    if [[ ! -f "$cert_path" ]] || [[ ! -f "$key_path" ]]; then
        error "Certificate or key file missing"
        return 1
    fi
    
    # Check if certificate and key match
    local cert_modulus
    cert_modulus=$(openssl x509 -noout -modulus -in "$cert_path" | openssl md5)
    local key_modulus
    key_modulus=$(openssl rsa -noout -modulus -in "$key_path" | openssl md5)
    
    if [[ "$cert_modulus" != "$key_modulus" ]]; then
        error "Certificate and private key do not match!"
        return 1
    fi
    
    # Verify certificate chain
    if ! openssl verify -CAfile "$cert_path" "$cert_path" >/dev/null 2>&1; then
        warn "Certificate chain verification failed (may be self-signed)"
    fi
    
    success "Certificate verification passed"
    return 0
}

# Check nginx SSL configuration
check_nginx_ssl() {
    if docker compose ps nginx | grep -q "Up"; then
        # Test nginx configuration
        if docker compose exec -T nginx nginx -t >/dev/null 2>&1; then
            success "NGINX SSL configuration is valid"
            return 0
        else
            error "NGINX SSL configuration is invalid"
            return 1
        fi
    else
        warn "NGINX is not running"
        return 1
    fi
}

# Generate monitoring report
generate_report() {
    local report_file="./logs/ssl/ssl-report-$(date +%Y%m%d).json"
    
    mkdir -p "$(dirname "$report_file")"
    
    local cert_path="./ssl/certificates/live/${DOMAIN}/fullchain.pem"
    local status="unknown"
    local days_remaining=0
    local expiry_date=""
    
    if [[ -f "$cert_path" ]]; then
        expiry_date=$(openssl x509 -enddate -noout -in "$cert_path" | cut -d= -f2)
        local expiry_seconds=$(date -d "$expiry_date" +%s)
        local current_seconds=$(date +%s)
        days_remaining=$(( (expiry_seconds - current_seconds) / 86400 ))
        
        if [[ $days_remaining -le 3 ]]; then
            status="critical"
        elif [[ $days_remaining -le 15 ]]; then
            status="warning"
        else
            status="ok"
        fi
    fi
    
    cat > "$report_file" << EOF
{
  "timestamp": "$(date -Iseconds)",
  "domain": "${DOMAIN}",
  "status": "${status}",
  "days_remaining": ${days_remaining},
  "expiry_date": "${expiry_date}",
  "nginx_running": $(docker compose ps nginx | grep -q "Up" && echo "true" || echo "false"),
  "checks": {
    "certificate_exists": $([[ -f "$cert_path" ]] && echo "true" || echo "false"),
    "certificate_valid": $([[ $days_remaining -gt 0 ]] && echo "true" || echo "false"),
    "nginx_config_valid": $(docker compose exec -T nginx nginx -t >/dev/null 2>&1 && echo "true" || echo "false")
  }
}
EOF
    
    log "SSL report generated: $report_file"
}

# Main execution
main() {
    log "🔍 Starting SSL monitoring for ${DOMAIN}"
    
    local exit_code=0
    
    # Check SSL certificate
    if ! check_ssl_certificate; then
        exit_code=1
    fi
    
    # Verify certificate chain
    if ! verify_certificate_chain; then
        exit_code=1
    fi
    
    # Check NGINX SSL configuration
    if ! check_nginx_ssl; then
        exit_code=1
    fi
    
    # Generate report
    generate_report
    
    if [[ $exit_code -eq 0 ]]; then
        success "✅ SSL monitoring completed successfully"
    else
        error "❌ SSL monitoring completed with issues"
    fi
    
    exit $exit_code
}

# Show help
show_help() {
    cat << EOF
🔍 SSL Expiration Monitoring Script

Usage: $0 [options]

Environment Variables:
    DOMAIN              Domain name to check (default: from .env)
    ALERT_EMAIL         Email address for alerts
    SLACK_WEBHOOK       Slack webhook URL for alerts
    LOG_FILE            Log file path (default: ./logs/ssl/monitoring.log)

Examples:
    $0                                          # Run with defaults
    DOMAIN=example.com $0                      # Check specific domain
    ALERT_EMAIL=admin@example.com $0            # Set alert email
    
Cron Setup:
    # Daily SSL check at 9 AM
    0 9 * * * /path/to/scripts/ssl/check-ssl-expiration.sh
    
    # Check every 6 hours
    0 */6 * * * /path/to/scripts/ssl/check-ssl-expiration.sh

EOF
}

# Handle arguments
case "${1:-}" in
    "help"|"--help"|"-h")
        show_help
        exit 0
        ;;
    *)
        main
        ;;
esac
