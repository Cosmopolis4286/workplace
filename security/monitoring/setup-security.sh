#!/bin/bash
# Security Setup Script for Workplace
# Installs and configures Fail2Ban + Monitoring

set -euo pipefail

echo "🔒 Installing security components..."

# Update package list
apt-get update

# Install Fail2Ban and monitoring tools
apt-get install -y fail2ban logrotate rsyslog

# Copy Fail2Ban configuration
echo "📋 Configuring Fail2Ban..."
cp /workplace/security/fail2ban/jail.local /etc/fail2ban/jail.local
cp /workplace/security/fail2ban/filter.d/*.conf /etc/fail2ban/filter.d/

# Create custom action for Docker networks
cat > /etc/fail2ban/action.d/iptables-docker.conf << 'EOF'
[Definition]
actionstart = iptables -N f2b-<name>
              iptables -A f2b-<name> -j RETURN
              iptables -I INPUT -p <protocol> --dport <port> -j f2b-<name>

actionstop = iptables -D INPUT -p <protocol> --dport <port> -j f2b-<name>
             iptables -F f2b-<name>
             iptables -X f2b-<name>

actioncheck = iptables -n -L INPUT | grep -q 'f2b-<name>[ \t]'

actionban = iptables -I f2b-<name> 1 -s <ip> -j <blocktype>

actionunban = iptables -D f2b-<name> -s <ip> -j <blocktype>

[Init]
blocktype = REJECT
protocol = tcp
port = 80,443
EOF

# Setup log rotation for nginx logs
echo "📝 Configuring log rotation..."
cat > /etc/logrotate.d/workplace << 'EOF'
/var/log/nginx/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    create 640 nginx adm
    sharedscripts
    postrotate
        docker exec workplace_nginx nginx -s reload
    endscript
}

/var/log/certbot/*.log {
    daily
    missingok
    rotate 7
    compress
    delaycompress
    notifempty
    create 640 root root
}
EOF

# Setup monitoring script
cat > /usr/local/bin/workplace-monitor.sh << 'EOF'
#!/bin/bash
# Workplace Security Monitoring Script

LOG_FILE="/var/log/workplace-security.log"
ALERT_THRESHOLD=100
BAN_THRESHOLD=50

# Function to log events
log_event() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $1" >> "$LOG_FILE"
}

# Check Fail2Ban status
check_fail2ban() {
    local banned_count=$(fail2ban-client status | grep "Currently banned:" | awk '{print $3}')
    
    if [ "$banned_count" -gt "$BAN_THRESHOLD" ]; then
        log_event "ALERT: High number of banned IPs: $banned_count"
    fi
    
    log_event "INFO: Currently banned IPs: $banned_count"
}

# Check for unusual traffic patterns
check_traffic_patterns() {
    local http_requests=$(docker exec workplace_nginx cat /var/log/nginx/access.log 2>/dev/null | grep -c "HTTP/1\.[01]" || echo "0")
    local error_rate=$(docker exec workplace_nginx cat /var/log/nginx/error.log 2>/dev/null | grep -c "error" || echo "0")
    
    if [ "$http_requests" -gt "$ALERT_THRESHOLD" ]; then
        log_event "ALERT: High HTTP request rate: $http_requests requests"
    fi
    
    if [ "$error_rate" -gt 10 ]; then
        log_event "ALERT: High error rate: $error_rate errors"
    fi
    
    log_event "INFO: HTTP requests: $http_requests, Errors: $error_rate"
}

# Check SSL certificate status
check_ssl_certs() {
    if docker exec workplace_certbot test -f /etc/letsencrypt/live/playrke.com/fullchain.pem; then
        local cert_expiry=$(docker exec workplace_certbot openssl x509 -in /etc/letsencrypt/live/playrke.com/fullchain.pem -noout -enddate | cut -d= -f2)
        local expiry_timestamp=$(date -d "$cert_expiry" +%s)
        local current_timestamp=$(date +%s)
        local days_until_expiry=$(( (expiry_timestamp - current_timestamp) / 86400 ))
        
        if [ "$days_until_expiry" -lt 7 ]; then
            log_event "ALERT: SSL certificate expires in $days_until_expiry days"
        fi
        
        log_event "INFO: SSL certificate expires in $days_until_expiry days"
    fi
}

# Run all checks
check_fail2ban
check_traffic_patterns
check_ssl_certs

log_event "INFO: Security monitoring completed"
EOF

chmod +x /usr/local/bin/workplace-monitor.sh

# Setup cron job for monitoring
echo "⏰ Setting up monitoring cron job..."
echo "*/5 * * * * /usr/local/bin/workplace-monitor.sh" | crontab -

# Start Fail2Ban
echo "🚀 Starting Fail2Ban..."
systemctl enable fail2ban
systemctl restart fail2ban

# Log rotation
systemctl enable logrotate
systemctl restart rsyslog

echo "✅ Security setup completed!"
echo "📊 Monitor logs: tail -f /var/log/workplace-security.log"
echo "🔍 Fail2Ban status: fail2ban-client status"
echo "🛡️ Banned IPs: fail2ban-client status nginx-http-flood"
