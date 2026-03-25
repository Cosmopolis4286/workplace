#!/bin/sh
# Security Monitoring Script for Workplace

set -eu

LOG_FILE="/var/log/security/monitor.log"
ALERT_THRESHOLD=100
BAN_THRESHOLD=20
ERROR_THRESHOLD=50

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Logging function
log() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $1" >> "$LOG_FILE"
}

log_alert() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') - ALERT: $1" >> "$LOG_FILE"
    echo "${RED}ALERT: $1${NC}"
}

log_info() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') - INFO: $1" >> "$LOG_FILE"
    echo "${GREEN}INFO: $1${NC}"
}

log_warning() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') - WARNING: $1" >> "$LOG_FILE"
    echo "${YELLOW}WARNING: $1${NC}"
}

# Check for unusual traffic patterns
check_traffic_patterns() {
    if [ -f /var/log/nginx/security_access.log ]; then
        local total_requests=$(tail -1000 /var/log/nginx/security_access.log | wc -l)
        local error_requests=$(tail -1000 /var/log/nginx/security_access.log | grep -c " [45][0-9][0-9] " || echo "0")
        local unique_ips=$(tail -1000 /var/log/nginx/security_access.log | awk '{print $1}' | sort | uniq | wc -l)
        
        log_info "Traffic: $total_requests requests, $error_requests errors, $unique_ips unique IPs"
        
        if [ "$total_requests" -gt "$ALERT_THRESHOLD" ]; then
            log_alert "High request rate: $total_requests requests in last 1000 entries"
        fi
        
        if [ "$error_requests" -gt "$ERROR_THRESHOLD" ]; then
            log_alert "High error rate: $error_requests errors in last 1000 entries"
        fi
        
        # Check for suspicious IPs
        tail -1000 /var/log/nginx/security_access.log | awk '{print $1}' | sort | uniq -c | sort -nr | head -5 | while read count ip; do
            if [ "$count" -gt 50 ]; then
                log_warning "High activity from IP $ip: $count requests"
            fi
        done
    fi
}

# Check ACME challenge abuse
check_acme_abuse() {
    if [ -f /var/log/nginx/acme_access.log ]; then
        local acme_requests=$(tail -100 /var/log/nginx/acme_access.log | wc -l)
        local acme_errors=$(tail -100 /var/log/nginx/acme_access.log | grep -c " [45][0-9][0-9] " || echo "0")
        
        log_info "ACME: $acme_requests requests, $acme_errors errors"
        
        if [ "$acme_errors" -gt 10 ]; then
            log_alert "High ACME error rate: $acme_errors errors"
        fi
        
        # Check for repeated ACME requests from same IP
        tail -100 /var/log/nginx/acme_access.log | awk '{print $1}' | sort | uniq -c | sort -nr | head -3 | while read count ip; do
            if [ "$count" -gt 20 ]; then
                log_warning "Excessive ACME requests from IP $ip: $count requests"
            fi
        done
    fi
}

# Check authentication attempts
check_auth_attempts() {
    if [ -f /var/log/nginx/auth_access.log ]; then
        local auth_requests=$(tail -100 /var/log/nginx/auth_access.log | wc -l)
        local auth_failures=$(tail -100 /var/log/nginx/auth_access.log | grep -c " [45][0-9][0-9] " || echo "0")
        
        log_info "Auth: $auth_requests attempts, $auth_failures failures"
        
        if [ "$auth_failures" -gt 20 ]; then
            log_alert "High authentication failure rate: $auth_failures failures"
        fi
        
        # Check for brute force attempts
        tail -100 /var/log/nginx/auth_access.log | grep " [45][0-9][0-9] " | awk '{print $1}' | sort | uniq -c | sort -nr | head -3 | while read count ip; do
            if [ "$count" -gt 5 ]; then
                log_warning "Possible brute force from IP $ip: $count failures"
            fi
        done
    fi
}

# Check SSL certificate status
check_ssl_status() {
    if [ -f /var/log/certbot/letsencrypt.log ]; then
        local cert_errors=$(tail -50 /var/log/certbot/letsencrypt.log | grep -c "ERROR" || echo "0")
        
        if [ "$cert_errors" -gt 0 ]; then
            log_alert "SSL certificate errors detected: $cert_errors errors"
        fi
        
        # Check for recent certificate issuance
        local recent_certs=$(tail -50 /var/log/certbot/letsencrypt.log | grep -c "Certificate successfully received" || echo "0")
        if [ "$recent_certs" -gt 0 ]; then
            log_info "SSL certificate renewed successfully"
        fi
    fi
}

# Check for suspicious patterns in logs
check_suspicious_patterns() {
    local patterns="sql injection|cross site scripting|xss|union select|drop table|exec("
    
    for pattern in $patterns; do
        local matches=$(tail -1000 /var/log/nginx/security_access.log | grep -i "$pattern" | wc -l || echo "0")
        if [ "$matches" -gt 0 ]; then
            log_alert "Suspicious pattern detected: $pattern ($matches occurrences)"
            
            # Log the matching entries
            tail -1000 /var/log/nginx/security_access.log | grep -i "$pattern" | head -5 | while read line; do
                log_warning "Suspicious request: $line"
            done
        fi
    done
}

# Generate security summary
generate_summary() {
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    log_info "=== Security Monitoring Summary [$timestamp] ==="
    
    check_traffic_patterns
    check_acme_abuse
    check_auth_attempts
    check_ssl_status
    check_suspicious_patterns
    
    log_info "=== Security Monitoring Complete ==="
}

# Run monitoring
generate_summary

# Keep only last 1000 lines of log to prevent disk bloat
if [ -f "$LOG_FILE" ]; then
    tail -1000 "$LOG_FILE" > "$LOG_FILE.tmp" && mv "$LOG_FILE.tmp" "$LOG_FILE"
fi
