#!/bin/bash
set -euo pipefail

# Security Monitoring Script for Production
# Monitors various security metrics and alerts on anomalies

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Logging function
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')] SECURITY:${NC} $1"
}

log_success() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] SECURITY:${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] SECURITY:${NC} $1"
}

log_error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] SECURITY:${NC} $1"
}

# Configuration
LOG_FILE="/var/log/security-monitor.log"
ALERT_THRESHOLD=50
BAN_THRESHOLD=100

# Check if running in container
if [ -f /.dockerenv ]; then
    LOG_FILE="/tmp/security-monitor.log"
fi

# Function to check for suspicious IP activity
check_suspicious_ips() {
    log "Checking for suspicious IP activity..."
    
    # Get top 10 IPs by request count from nginx logs
    if [ -f "/var/log/nginx/access.log" ]; then
        local suspicious_ips=$(grep -v "127.0.0.1" /var/log/nginx/access.log | \
            awk '{print $1}' | sort | uniq -c | sort -nr | \
            awk -v threshold="$ALERT_THRESHOLD" '$1 > threshold {print $2 ":" $1}')
        
        if [ -n "$suspicious_ips" ]; then
            log_warning "High activity detected from IPs:"
            echo "$suspicious_ips" | while IFS=':' read -r ip count; do
                if [ "$count" -gt "$BAN_THRESHOLD" ]; then
                    log_error "CRITICAL: IP $ip has $count requests (threshold: $BAN_THRESHOLD)"
                    # Here you could add IP banning logic
                else
                    log_warning "IP $ip has $count requests (threshold: $ALERT_THRESHOLD)"
                fi
            done
        else
            log_success "No suspicious IP activity detected"
        fi
    fi
}

# Function to check SSL certificate expiry
check_ssl_certificates() {
    log "Checking SSL certificate expiry..."
    
    local domain="${DOMAIN:-playrke.com}"
    local cert_path="/etc/letsencrypt/live/$domain/fullchain.pem"
    
    if [ -f "$cert_path" ]; then
        local expiry_days=$(openssl x509 -enddate -noout -in "$cert_path" | \
            cut -d= -f2 | awk '{print $1,$2,$4}' | \
            xargs -I {} date -d "{}" +%s | \
            awk -v now=$(date +%s) '{print int(($1 - now) / 86400)}')
        
        if [ "$expiry_days" -lt 7 ]; then
            log_error "CRITICAL: SSL certificate expires in $expiry_days days"
        elif [ "$expiry_days" -lt 30 ]; then
            log_warning "WARNING: SSL certificate expires in $expiry_days days"
        else
            log_success "SSL certificate is valid for $expiry_days days"
        fi
    else
        log_error "SSL certificate not found at $cert_path"
    fi
}

# Function to check for failed authentication attempts
check_failed_auth() {
    log "Checking for failed authentication attempts..."
    
    if [ -f "/var/log/nginx/error.log" ]; then
        local failed_attempts=$(grep -c "401\|403" /var/log/nginx/error.log 2>/dev/null || echo "0")
        
        if [ "$failed_attempts" -gt 20 ]; then
            log_warning "High number of failed authentication attempts: $failed_attempts"
        else
            log_success "Failed authentication attempts within normal range: $failed_attempts"
        fi
    fi
}

# Function to check container security
check_container_security() {
    log "Checking container security..."
    
    # Check if running as root (should be avoided)
    if [ "$(id -u)" = "0" ]; then
        log_warning "Container running as root user"
    else
        log_success "Container running as non-root user"
    fi
    
    # Check for capabilities
    if command -v capsh >/dev/null 2>&1; then
        local caps=$(capsh --print 2>/dev/null | grep "Current:" | cut -d: -f2 | tr -d ' ')
        if [ -n "$caps" ] && [ "$caps" != "=" ]; then
            log_warning "Container has capabilities: $caps"
        else
            log_success "Container has minimal capabilities"
        fi
    fi
}

# Function to check for security headers
check_security_headers() {
    log "Checking security headers implementation..."
    
    local domain="${DOMAIN:-playrke.com}"
    local url="https://$domain"
    
    if command -v curl >/dev/null 2>&1; then
        local headers=$(curl -s -I "$url" 2>/dev/null || echo "")
        
        local required_headers=(
            "strict-transport-security"
            "content-security-policy"
            "x-frame-options"
            "x-content-type-options"
            "x-xss-protection"
            "referrer-policy"
        )
        
        for header in "${required_headers[@]}"; do
            if echo "$headers" | grep -qi "$header"; then
                log_success "Security header present: $header"
            else
                log_error "Missing security header: $header"
            fi
        done
    else
        log_warning "curl not available, skipping security header check"
    fi
}

# Function to generate security report
generate_report() {
    log "Generating security report..."
    
    local report_file="/tmp/security-report-$(date +%Y%m%d-%H%M%S).txt"
    
    {
        echo "Security Monitoring Report"
        echo "Generated: $(date)"
        echo "================================"
        echo ""
        echo "System Information:"
        echo "- Hostname: $(hostname)"
        echo "- Kernel: $(uname -r)"
        echo "- Uptime: $(uptime)"
        echo ""
        echo "Container Status:"
        docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" 2>/dev/null || echo "Docker not available"
        echo ""
        echo "Recent Security Events:"
        if [ -f "$LOG_FILE" ]; then
            tail -20 "$LOG_FILE" 2>/dev/null || echo "No log entries found"
        else
            echo "No log file found"
        fi
    } > "$report_file"
    
    log_success "Security report generated: $report_file"
}

# Main execution
main() {
    log "Starting security monitoring..."
    
    # Create log file if it doesn't exist
    mkdir -p "$(dirname "$LOG_FILE")"
    touch "$LOG_FILE"
    
    # Run all security checks
    check_suspicious_ips
    check_ssl_certificates
    check_failed_auth
    check_container_security
    check_security_headers
    generate_report
    
    log_success "Security monitoring completed"
    
    # Exit with appropriate code based on findings
    if grep -q "CRITICAL\|ERROR" "$LOG_FILE" 2>/dev/null; then
        exit 1
    else
        exit 0
    fi
}

# Handle signals gracefully
trap 'log "Received signal, exiting..."; exit 0' SIGTERM SIGINT

# Run main function
main "$@"
