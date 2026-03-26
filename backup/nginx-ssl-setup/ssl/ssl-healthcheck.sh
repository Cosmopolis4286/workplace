#!/bin/bash

# 🏥 SSL Healthcheck Script
# Comprehensive SSL certificate health monitoring

set -euo pipefail

# Configuration
DOMAIN="${DOMAIN:-$(grep DOMAIN .env | cut -d= -f2)}"
SSL_DIR="./ssl/certificates"
LOG_FILE="./logs/ssl/healthcheck.log"
METRICS_FILE="./ssl/metrics.prom"
HEALTH_CHECK_PORT="${HEALTH_CHECK_PORT:-8080}"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Health status levels
STATUS_HEALTHY=0
STATUS_WARNING=1
STATUS_CRITICAL=2
STATUS_UNKNOWN=3

# Logging
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')] HEALTHCHECK:${NC} $1" | tee -a "$LOG_FILE"
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

# Create directories
setup_directories() {
    mkdir -p "$(dirname "$LOG_FILE")"
    mkdir -p "$(dirname "$METRICS_FILE")"
    mkdir -p "$SSL_DIR"
}

# Check certificate existence
check_certificate_existence() {
    local cert_file="${SSL_DIR}/live/${DOMAIN}/fullchain.pem"
    local key_file="${SSL_DIR}/live/${DOMAIN}/privkey.pem"
    
    log "Checking certificate existence..."
    
    if [[ ! -f "$cert_file" ]]; then
        error "Certificate file not found: $cert_file"
        return $STATUS_CRITICAL
    fi
    
    if [[ ! -f "$key_file" ]]; then
        error "Private key file not found: $key_file"
        return $STATUS_CRITICAL
    fi
    
    success "Certificate files found"
    return $STATUS_HEALTHY
}

# Check certificate validity
check_certificate_validity() {
    local cert_file="${SSL_DIR}/live/${DOMAIN}/fullchain.pem"
    
    log "Checking certificate validity..."
    
    # Check if certificate is expired
    if ! openssl x509 -in "$cert_file" -noout -checkend 0 2>/dev/null; then
        error "Certificate has expired"
        return $STATUS_CRITICAL
    fi
    
    # Check certificate expiry thresholds
    local expiry_date=$(openssl x509 -enddate -noout -in "$cert_file" | cut -d= -f2)
    local expiry_seconds=$(date -d "$expiry_date" +%s)
    local current_seconds=$(date +%s)
    local days_until_expiry=$(( (expiry_seconds - current_seconds) / 86400 ))
    
    log "Certificate expires: $expiry_date (${days_until_expiry} days)"
    
    if [[ $days_until_expiry -le 3 ]]; then
        error "Certificate expires in ${days_until_expiry} days (CRITICAL)"
        return $STATUS_CRITICAL
    elif [[ $days_until_expiry -le 15 ]]; then
        warn "Certificate expires in ${days_until_expiry} days (WARNING)"
        return $STATUS_WARNING
    else
        success "Certificate valid for ${days_until_expiry} days"
        return $STATUS_HEALTHY
    fi
}

# Check certificate-key match
check_certificate_key_match() {
    local cert_file="${SSL_DIR}/live/${DOMAIN}/fullchain.pem"
    local key_file="${SSL_DIR}/live/${DOMAIN}/privkey.pem"
    
    log "Checking certificate-key match..."
    
    local cert_modulus=$(openssl x509 -noout -modulus -in "$cert_file" | openssl md5)
    local key_modulus=$(openssl rsa -noout -modulus -in "$key_file" | openssl md5)
    
    if [[ "$cert_modulus" != "$key_modulus" ]]; then
        error "Certificate and private key do not match"
        return $STATUS_CRITICAL
    fi
    
    success "Certificate and private key match"
    return $STATUS_HEALTHY
}

# Check certificate chain
check_certificate_chain() {
    local cert_file="${SSL_DIR}/live/${DOMAIN}/fullchain.pem"
    
    log "Checking certificate chain..."
    
    # Verify certificate chain
    if openssl verify -CAfile "$cert_file" "$cert_file" >/dev/null 2>&1; then
        success "Certificate chain verification passed"
        return $STATUS_HEALTHY
    else
        warn "Certificate chain verification failed (may be self-signed)"
        return $STATUS_WARNING
    fi
}

# Check certificate permissions
check_certificate_permissions() {
    local cert_file="${SSL_DIR}/live/${DOMAIN}/fullchain.pem"
    local key_file="${SSL_DIR}/live/${DOMAIN}/privkey.pem"
    
    log "Checking certificate permissions..."
    
    # Check file permissions
    local cert_perms=$(stat -c "%a" "$cert_file" 2>/dev/null || stat -f "%A" "$cert_file" 2>/dev/null)
    local key_perms=$(stat -c "%a" "$key_file" 2>/dev/null || stat -f "%A" "$key_file" 2>/dev/null)
    
    log "Certificate permissions: $cert_perms"
    log "Private key permissions: $key_perms"
    
    # Private key should not be world-readable
    if [[ "$key_perms" =~ [0-9][0-9][0-9] ]]; then
        local key_last_digit=${key_perms: -1}
        if [[ $key_last_digit -gt 0 ]]; then
            warn "Private key is world-readable (security risk)"
            return $STATUS_WARNING
        fi
    fi
    
    success "Certificate permissions are secure"
    return $STATUS_HEALTHY
}

# Check NGINX SSL configuration
check_nginx_ssl() {
    log "Checking NGINX SSL configuration..."
    
    # Check if NGINX is running
    if ! docker compose ps nginx | grep -q "Up"; then
        error "NGINX is not running"
        return $STATUS_CRITICAL
    fi
    
    # Test NGINX configuration
    if ! docker compose exec -T nginx nginx -t >/dev/null 2>&1; then
        error "NGINX configuration test failed"
        return $STATUS_CRITICAL
    fi
    
    # Check SSL ports
    if ! docker compose exec -T nginx netstat -tlnp 2>/dev/null | grep -q ":443"; then
        warn "NGINX is not listening on port 443"
        return $STATUS_WARNING
    fi
    
    success "NGINX SSL configuration is healthy"
    return $STATUS_HEALTHY
}

# Check SSL connectivity
check_ssl_connectivity() {
    log "Checking SSL connectivity..."
    
    # Check if domain resolves
    if ! nslookup "$DOMAIN" >/dev/null 2>&1; then
        warn "Domain $DOMAIN does not resolve"
        return $STATUS_WARNING
    fi
    
    # Check SSL connection
    local timeout=10
    if timeout $timeout openssl s_client -connect "$DOMAIN:443" -servername "$DOMAIN" </dev/null >/dev/null 2>&1; then
        success "SSL connection to $DOMAIN:443 successful"
        return $STATUS_HEALTHY
    else
        error "SSL connection to $DOMAIN:443 failed"
        return $STATUS_CRITICAL
    fi
}

# Check certificate details
check_certificate_details() {
    local cert_file="${SSL_DIR}/live/${DOMAIN}/fullchain.pem"
    
    log "Checking certificate details..."
    
    # Get certificate information
    local subject=$(openssl x509 -subject -noout -in "$cert_file" | cut -d= -f2-)
    local issuer=$(openssl x509 -issuer -noout -in "$cert_file" | cut -d= -f2-)
    local san=$(openssl x509 -text -noout -in "$cert_file" | grep -A1 "Subject Alternative Name" | tail -1 | sed 's/^[[:space:]]*//')
    
    log "Certificate Subject: $subject"
    log "Certificate Issuer: $issuer"
    log "Certificate SAN: $san"
    
    # Check if domain is in certificate
    if echo "$subject $san" | grep -q "$DOMAIN"; then
        success "Certificate contains domain $DOMAIN"
        return $STATUS_HEALTHY
    else
        error "Certificate does not contain domain $DOMAIN"
        return $STATUS_CRITICAL
    fi
}

# Generate Prometheus metrics
generate_metrics() {
    local overall_status="$1"
    local cert_status="$2"
    local nginx_status="$3"
    local connectivity_status="$4"
    local days_until_expiry="$5"
    
    log "Generating Prometheus metrics..."
    
    cat > "$METRICS_FILE" << EOF
# HELP ssl_certificate_health Overall SSL certificate health status
# TYPE ssl_certificate_health gauge
ssl_certificate_health{domain="${DOMAIN}"} ${overall_status}

# HELP ssl_certificate_validity Certificate validity status
# TYPE ssl_certificate_validity gauge
ssl_certificate_validity{domain="${DOMAIN}"} ${cert_status}

# HELP ssl_nginx_health NGINX SSL health status
# TYPE ssl_nginx_health gauge
ssl_nginx_health{domain="${DOMAIN}"} ${nginx_status}

# HELP ssl_connectivity SSL connectivity status
# TYPE ssl_connectivity gauge
ssl_connectivity{domain="${DOMAIN}"} ${connectivity_status}

# HELP ssl_certificate_days_remaining Days until certificate expiry
# TYPE ssl_certificate_days_remaining gauge
ssl_certificate_days_remaining{domain="${DOMAIN}"} ${days_until_expiry}

# HELP ssl_healthcheck_last_success_timestamp Last successful healthcheck timestamp
# TYPE ssl_healthcheck_last_success_timestamp gauge
ssl_healthcheck_last_success_timestamp{domain="${DOMAIN}"} $(date +%s)

# HELP ssl_healthcheck_last_run_timestamp Last healthcheck run timestamp
# TYPE ssl_healthcheck_last_run_timestamp gauge
ssl_healthcheck_last_run_timestamp{domain="${DOMAIN}"} $(date +%s)
EOF
    
    success "Prometheus metrics generated: $METRICS_FILE"
}

# Generate health report
generate_health_report() {
    local overall_status="$1"
    local report_file="./logs/ssl/health-report-$(date +%Y%m%d).json"
    
    mkdir -p "$(dirname "$report_file")"
    
    local cert_file="${SSL_DIR}/live/${DOMAIN}/fullchain.pem"
    local expiry_date="Unknown"
    local days_until_expiry=0
    local subject="Unknown"
    local issuer="Unknown"
    
    if [[ -f "$cert_file" ]]; then
        expiry_date=$(openssl x509 -enddate -noout -in "$cert_file" | cut -d= -f2)
        local expiry_seconds=$(date -d "$expiry_date" +%s)
        local current_seconds=$(date +%s)
        days_until_expiry=$(( (expiry_seconds - current_seconds) / 86400 ))
        subject=$(openssl x509 -subject -noout -in "$cert_file" | cut -d= -f2-)
        issuer=$(openssl x509 -issuer -noout -in "$cert_file" | cut -d= -f2-)
    fi
    
    cat > "$report_file" << EOF
{
  "timestamp": "$(date -Iseconds)",
  "domain": "${DOMAIN}",
  "overall_status": ${overall_status},
  "certificate_info": {
    "exists": $([[ -f "$cert_file" ]] && echo "true" || echo "false"),
    "expiry_date": "${expiry_date}",
    "days_until_expiry": ${days_until_expiry},
    "subject": "${subject}",
    "issuer": "${issuer}"
  },
  "health_checks": {
    "certificate_existence": $(check_certificate_existence >/dev/null 2>&1 && echo "true" || echo "false"),
    "certificate_validity": $(check_certificate_validity >/dev/null 2>&1 && echo "true" || echo "false"),
    "certificate_key_match": $(check_certificate_key_match >/dev/null 2>&1 && echo "true" || echo "false"),
    "certificate_chain": $(check_certificate_chain >/dev/null 2>&1 && echo "true" || echo "false"),
    "certificate_permissions": $(check_certificate_permissions >/dev/null 2>&1 && echo "true" || echo "false"),
    "nginx_ssl": $(check_nginx_ssl >/dev/null 2>&1 && echo "true" || echo "false"),
    "ssl_connectivity": $(check_ssl_connectivity >/dev/null 2>&1 && echo "true" || echo "false"),
    "certificate_details": $(check_certificate_details >/dev/null 2>&1 && echo "true" || echo "false")
  },
  "services": {
    "nginx_running": $(docker compose ps nginx | grep -q "Up" && echo "true" || echo "false")
  }
}
EOF
    
    log "Health report generated: $report_file"
}

# Start HTTP healthcheck server
start_healthcheck_server() {
    local port="${1:-$HEALTH_CHECK_PORT}"
    
    log "Starting healthcheck HTTP server on port $port..."
    
    # Simple HTTP server using nc (netcat) or python
    if command -v nc &> /dev/null; then
        while true; do
            {
                echo -e "HTTP/1.1 200 OK\r\nContent-Type: application/json\r\n\r\n"
                ./scripts/ssl/ssl-healthcheck.sh json
            } | nc -l -p "$port"
            sleep 1
        done &
    elif command -v python3 &> /dev/null; then
        python3 -c "
import http.server
import socketserver
import json
import subprocess
import os

class HealthHandler(http.server.SimpleHTTPRequestHandler):
    def do_GET(self):
        if self.path == '/health' or self.path == '/':
            try:
                result = subprocess.run(['./scripts/ssl/ssl-healthcheck.sh', 'json'], 
                                       capture_output=True, text=True, cwd=os.getcwd())
                if result.returncode == 0:
                    self.send_response(200)
                    self.send_header('Content-type', 'application/json')
                    self.end_headers()
                    self.wfile.write(result.stdout.encode())
                else:
                    self.send_response(503)
                    self.send_header('Content-type', 'application/json')
                    self.end_headers()
                    self.wfile.write(b'{\"status\": \"unhealthy\"}')
            except Exception as e:
                self.send_response(500)
                self.send_header('Content-type', 'application/json')
                self.end_headers()
                self.wfile.write(f'{{\"error\": \"{str(e)}\"}}'.encode())
        else:
            self.send_response(404)
            self.end_headers()

with socketserver.TCPServer(('', ${port}), HealthHandler) as httpd:
    httpd.serve_forever()
" &
    else
        error "Neither nc nor python3 available for HTTP server"
        return 1
    fi
    
    success "Healthcheck server started on port $port"
    return 0
}

# Output JSON format
output_json() {
    local overall_status=$STATUS_UNKNOWN
    local cert_status=$STATUS_UNKNOWN
    local nginx_status=$STATUS_UNKNOWN
    local connectivity_status=$STATUS_UNKNOWN
    local days_until_expiry=0
    
    # Run checks and capture status
    check_certificate_existence >/dev/null 2>&1 || cert_status=$STATUS_CRITICAL
    check_certificate_validity >/dev/null 2>&1 || cert_status=$STATUS_CRITICAL
    check_certificate_key_match >/dev/null 2>&1 || cert_status=$STATUS_CRITICAL
    check_nginx_ssl >/dev/null 2>&1 || nginx_status=$STATUS_CRITICAL
    check_ssl_connectivity >/dev/null 2>&1 || connectivity_status=$STATUS_CRITICAL
    
    # Calculate overall status
    if [[ $cert_status -eq $STATUS_CRITICAL || $nginx_status -eq $STATUS_CRITICAL || $connectivity_status -eq $STATUS_CRITICAL ]]; then
        overall_status=$STATUS_CRITICAL
    elif [[ $cert_status -eq $STATUS_WARNING || $nginx_status -eq $STATUS_WARNING || $connectivity_status -eq $STATUS_WARNING ]]; then
        overall_status=$STATUS_WARNING
    else
        overall_status=$STATUS_HEALTHY
    fi
    
    # Get days until expiry
    local cert_file="${SSL_DIR}/live/${DOMAIN}/fullchain.pem"
    if [[ -f "$cert_file" ]]; then
        local expiry_date=$(openssl x509 -enddate -noout -in "$cert_file" | cut -d= -f2)
        local expiry_seconds=$(date -d "$expiry_date" +%s)
        local current_seconds=$(date +%s)
        days_until_expiry=$(( (expiry_seconds - current_seconds) / 86400 ))
    fi
    
    cat << EOF
{
  "timestamp": "$(date -Iseconds)",
  "domain": "${DOMAIN}",
  "status": "$([[ $overall_status -eq $STATUS_HEALTHY ]] && echo "healthy" || [[ $overall_status -eq $STATUS_WARNING ]] && echo "warning" || echo "critical")",
  "overall_status_code": ${overall_status},
  "certificate_status_code": ${cert_status},
  "nginx_status_code": ${nginx_status},
  "connectivity_status_code": ${connectivity_status},
  "days_until_expiry": ${days_until_expiry},
  "checks": {
    "certificate_existence": $([[ $(check_certificate_existence >/dev/null 2>&1; echo $?) -eq $STATUS_HEALTHY ]] && echo "true" || echo "false"),
    "certificate_validity": $([[ $(check_certificate_validity >/dev/null 2>&1; echo $?) -eq $STATUS_HEALTHY ]] && echo "true" || echo "false"),
    "certificate_key_match": $([[ $(check_certificate_key_match >/dev/null 2>&1; echo $?) -eq $STATUS_HEALTHY ]] && echo "true" || echo "false"),
    "certificate_chain": $([[ $(check_certificate_chain >/dev/null 2>&1; echo $?) -eq $STATUS_HEALTHY ]] && echo "true" || echo "false"),
    "certificate_permissions": $([[ $(check_certificate_permissions >/dev/null 2>&1; echo $?) -eq $STATUS_HEALTHY ]] && echo "true" || echo "false"),
    "nginx_ssl": $([[ $(check_nginx_ssl >/dev/null 2>&1; echo $?) -eq $STATUS_HEALTHY ]] && echo "true" || echo "false"),
    "ssl_connectivity": $([[ $(check_ssl_connectivity >/dev/null 2>&1; echo $?) -eq $STATUS_HEALTHY ]] && echo "true" || echo "false"),
    "certificate_details": $([[ $(check_certificate_details >/dev/null 2>&1; echo $?) -eq $STATUS_HEALTHY ]] && echo "true" || echo "false")
  }
}
EOF
}

# Main healthcheck execution
main() {
    setup_directories
    
    log "🏥 Starting SSL healthcheck for ${DOMAIN}"
    
    local overall_status=$STATUS_HEALTHY
    local cert_status=$STATUS_HEALTHY
    local nginx_status=$STATUS_HEALTHY
    local connectivity_status=$STATUS_HEALTHY
    local days_until_expiry=0
    
    # Run all health checks
    check_certificate_existence || cert_status=$STATUS_CRITICAL
    check_certificate_validity || cert_status=$STATUS_CRITICAL
    check_certificate_key_match || cert_status=$STATUS_CRITICAL
    check_certificate_chain || cert_status=$STATUS_WARNING
    check_certificate_permissions || cert_status=$STATUS_WARNING
    check_nginx_ssl || nginx_status=$STATUS_CRITICAL
    check_ssl_connectivity || connectivity_status=$STATUS_CRITICAL
    check_certificate_details || cert_status=$STATUS_CRITICAL
    
    # Calculate overall status
    if [[ $cert_status -eq $STATUS_CRITICAL || $nginx_status -eq $STATUS_CRITICAL || $connectivity_status -eq $STATUS_CRITICAL ]]; then
        overall_status=$STATUS_CRITICAL
    elif [[ $cert_status -eq $STATUS_WARNING || $nginx_status -eq $STATUS_WARNING || $connectivity_status -eq $STATUS_WARNING ]]; then
        overall_status=$STATUS_WARNING
    else
        overall_status=$STATUS_HEALTHY
    fi
    
    # Get days until expiry
    local cert_file="${SSL_DIR}/live/${DOMAIN}/fullchain.pem"
    if [[ -f "$cert_file" ]]; then
        local expiry_date=$(openssl x509 -enddate -noout -in "$cert_file" | cut -d= -f2)
        local expiry_seconds=$(date -d "$expiry_date" +%s)
        local current_seconds=$(date +%s)
        days_until_expiry=$(( (expiry_seconds - current_seconds) / 86400 ))
    fi
    
    # Generate metrics and reports
    generate_metrics "$overall_status" "$cert_status" "$nginx_status" "$connectivity_status" "$days_until_expiry"
    generate_health_report "$overall_status"
    
    # Log final status
    case $overall_status in
        $STATUS_HEALTHY)
            success "✅ SSL healthcheck passed - All systems healthy"
            ;;
        $STATUS_WARNING)
            warn "⚠️ SSL healthcheck passed with warnings"
            ;;
        $STATUS_CRITICAL)
            error "❌ SSL healthcheck failed - Critical issues detected"
            ;;
        *)
            error "❓ SSL healthcheck status unknown"
            ;;
    esac
    
    exit $overall_status
}

# Show help
show_help() {
    cat << EOF
🏥 SSL Healthcheck Script

Usage: $0 [command] [options]

Commands:
    (none)               Run complete healthcheck
    json                 Output health status in JSON format
    server [port]        Start HTTP healthcheck server
    metrics              Generate Prometheus metrics only

Environment Variables:
    DOMAIN               Domain name (default: from .env)
    SSL_DIR              SSL certificates directory (default: ./ssl/certificates)
    LOG_FILE             Log file path (default: ./logs/ssl/healthcheck.log)
    METRICS_FILE         Metrics file path (default: ./ssl/metrics.prom)
    HEALTH_CHECK_PORT    HTTP server port (default: 8080)

Exit Codes:
    0                    Healthy
    1                    Warning
    2                    Critical
    3                    Unknown

Examples:
    $0                                          # Run healthcheck
    $0 json                                    # Output JSON
    $0 server 8080                            # Start HTTP server
    $0 metrics                                 # Generate metrics only
    
Cron Setup:
    # Healthcheck every 5 minutes
    */5 * * * * /path/to/scripts/ssl/ssl-healthcheck.sh
    
    # Healthcheck every hour with alerts
    0 * * * * /path/to/scripts/ssl/ssl-healthcheck.sh || echo "SSL healthcheck failed" | mail -s "SSL Alert" admin@example.com

EOF
}

# Handle arguments
case "${1:-}" in
    "help"|"--help"|"-h")
        show_help
        exit 0
        ;;
    "json")
        output_json
        exit 0
        ;;
    "server")
        start_healthcheck_server "${2:-}"
        exit 0
        ;;
    "metrics")
        setup_directories
        # Generate metrics only (simplified)
        echo "ssl_certificate_health{domain=\"${DOMAIN}\"} 0" > "$METRICS_FILE"
        exit 0
        ;;
    *)
        main
        ;;
esac
