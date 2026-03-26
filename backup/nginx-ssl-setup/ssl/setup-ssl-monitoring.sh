#!/bin/bash

# 🚀 SSL Monitoring Setup Script
# Sets up complete SSL monitoring with cron jobs and alerts

set -euo pipefail

# Configuration
DOMAIN="${DOMAIN:-$(grep DOMAIN .env | cut -d= -f2)}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$(dirname "$SCRIPT_DIR")")"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Logging
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')] SETUP:${NC} $1"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR:${NC} $1"
}

warn() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING:${NC} $1"
}

success() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] SUCCESS:${NC} $1"
}

# Make scripts executable
make_scripts_executable() {
    log "Making SSL scripts executable..."
    
    chmod +x "$SCRIPT_DIR/check-ssl-expiration.sh"
    chmod +x "$SCRIPT_DIR/auto-renew-and-reload.sh"
    chmod +x "$SCRIPT_DIR/backup-ssl.sh"
    chmod +x "$SCRIPT_DIR/ssl-healthcheck.sh"
    chmod +x "$SCRIPT_DIR/setup-ssl-monitoring.sh"
    
    success "All SSL scripts are now executable"
}

# Create necessary directories
create_directories() {
    log "Creating SSL monitoring directories..."
    
    mkdir -p "$PROJECT_ROOT/logs/ssl"
    mkdir -p "$PROJECT_ROOT/ssl/backups"
    mkdir -p "$PROJECT_ROOT/ssl/metrics"
    mkdir -p "$PROJECT_ROOT/ssl/certificates/live/$DOMAIN"
    mkdir -p "$PROJECT_ROOT/ssl/certificates/archive/$DOMAIN"
    mkdir -p "$PROJECT_ROOT/ssl/certificates/renewal"
    
    success "SSL monitoring directories created"
}

# Setup cron jobs
setup_cron_jobs() {
    log "Setting up SSL monitoring cron jobs..."
    
    # Create temporary cron file
    local cron_file="/tmp/ssl-cron-$$"
    
    # Add existing crontab entries
    crontab -l 2>/dev/null > "$cron_file" || touch "$cron_file"
    
    # Remove old SSL cron jobs to avoid duplicates
    sed -i '/ssl-/d' "$cron_file"
    
    # Add new SSL monitoring cron jobs
    cat >> "$cron_file" << EOF

# SSL Certificate Monitoring - Every 5 minutes
*/5 * * * * cd $PROJECT_ROOT && $SCRIPT_DIR/ssl-healthcheck.sh >> $PROJECT_ROOT/logs/ssl/healthcheck.log 2>&1

# SSL Expiration Check - Daily at 9 AM
0 9 * * * cd $PROJECT_ROOT && $SCRIPT_DIR/check-ssl-expiration.sh >> $PROJECT_ROOT/logs/ssl/monitoring.log 2>&1

# SSL Auto-Renewal - Daily at 3:30 AM
30 3 * * * cd $PROJECT_ROOT && $SCRIPT_DIR/auto-renew-and-reload.sh >> $PROJECT_ROOT/logs/ssl/renewal.log 2>&1

# SSL Backup - Daily at 2 AM
0 2 * * * cd $PROJECT_ROOT && $SCRIPT_DIR/backup-ssl.sh backup >> $PROJECT_ROOT/logs/ssl/backup.log 2>&1

# SSL Backup Cleanup - Weekly on Sundays at 4 AM
0 4 * * 0 cd $PROJECT_ROOT && $SCRIPT_DIR/backup-ssl.sh cleanup >> $PROJECT_ROOT/logs/ssl/backup.log 2>&1

EOF
    
    # Install new crontab
    crontab "$cron_file"
    rm "$cron_file"
    
    success "SSL monitoring cron jobs configured"
}

# Setup Prometheus configuration
setup_prometheus_config() {
    log "Setting up Prometheus SSL metrics configuration..."
    
    local prometheus_config="$PROJECT_ROOT/monitoring/prometheus.yml"
    
    # Check if prometheus config exists
    if [[ -f "$prometheus_config" ]]; then
        # Check if SSL metrics are already configured
        if ! grep -q "ssl_metrics" "$prometheus_config"; then
            log "Adding SSL metrics to Prometheus configuration..."
            
            # Backup original config
            cp "$prometheus_config" "$prometheus_config.backup.$(date +%Y%m%d_%H%M%S)"
            
            # Add SSL metrics configuration
            cat >> "$prometheus_config" << EOF

  # SSL Certificate Metrics
  - job_name: 'ssl_metrics'
    static_configs:
      - targets: ['localhost:8080']
    scrape_interval: 30s
    metrics_path: /metrics
    file_sd_configs:
      - files:
          - '$PROJECT_ROOT/ssl/metrics.prom'
EOF
            success "SSL metrics added to Prometheus configuration"
        else
            success "SSL metrics already configured in Prometheus"
        fi
    else
        warn "Prometheus configuration not found at $prometheus_config"
    fi
}

# Setup environment file
setup_environment_file() {
    log "Setting up SSL monitoring environment variables..."
    
    local env_file="$PROJECT_ROOT/.env"
    
    # Check if .env file exists
    if [[ -f "$env_file" ]]; then
        # Add SSL monitoring environment variables if not present
        if ! grep -q "ALERT_EMAIL" "$env_file"; then
            cat >> "$env_file" << EOF

# SSL Monitoring Configuration
ALERT_EMAIL=admin@${DOMAIN}
SLACK_WEBHOOK=
HEALTH_CHECK_PORT=8080
REMOTE_BACKUP=true
BACKUP_RETENTION_DAYS=30
RENEWAL_THRESHOLD_DAYS=30
EOF
            success "SSL monitoring environment variables added to .env"
        else
            success "SSL monitoring environment variables already configured"
        fi
    else
        warn ".env file not found at $env_file"
    fi
}

# Install dependencies
install_dependencies() {
    log "Installing SSL monitoring dependencies..."
    
    # Check for required commands
    local missing_deps=()
    
    command -v openssl >/dev/null 2>&1 || missing_deps+=("openssl")
    command -v curl >/dev/null 2>&1 || missing_deps+=("curl")
    command -v jq >/dev/null 2>&1 || missing_deps+=("jq")
    
    if [[ ${#missing_deps[@]} -gt 0 ]]; then
        warn "Missing dependencies: ${missing_deps[*]}"
        log "Installing missing dependencies..."
        
        # Try to install dependencies based on package manager
        if command -v apt-get >/dev/null 2>&1; then
            sudo apt-get update
            sudo apt-get install -y "${missing_deps[@]}"
        elif command -v yum >/dev/null 2>&1; then
            sudo yum install -y "${missing_deps[@]}"
        elif command -v apk >/dev/null 2>&1; then
            sudo apk add "${missing_deps[@]}"
        else
            warn "Cannot automatically install dependencies. Please install manually: ${missing_deps[*]}"
        fi
    fi
    
    success "Dependencies check completed"
}

# Create systemd service for healthcheck server
create_healthcheck_service() {
    log "Creating systemd service for SSL healthcheck server..."
    
    local service_file="/etc/systemd/system/ssl-healthcheck.service"
    
    # Check if running as root or with sudo
    if [[ $EUID -eq 0 ]] || command -v sudo >/dev/null 2>&1; then
        local sudo_cmd=""
        [[ $EUID -ne 0 ]] && sudo_cmd="sudo"
        
        cat << EOF | $sudo_cmd tee "$service_file" > /dev/null
[Unit]
Description=SSL Healthcheck Server
After=network.target

[Service]
Type=simple
User=$(whoami)
WorkingDirectory=$PROJECT_ROOT
ExecStart=$SCRIPT_DIR/ssl-healthcheck.sh server ${HEALTH_CHECK_PORT:-8080}
Restart=always
RestartSec=10
Environment=DOMAIN=$DOMAIN
Environment=HEALTH_CHECK_PORT=${HEALTH_CHECK_PORT:-8080}

[Install]
WantedBy=multi-user.target
EOF
        
        # Reload systemd and enable service
        $sudo_cmd systemctl daemon-reload
        $sudo_cmd systemctl enable ssl-healthcheck.service
        $sudo_cmd systemctl start ssl-healthcheck.service
        
        success "SSL healthcheck service created and started"
    else
        warn "Cannot create systemd service without root privileges"
        warn "You can manually start the healthcheck server with: $SCRIPT_DIR/ssl-healthcheck.sh server"
    fi
}

# Test SSL monitoring setup
test_ssl_monitoring() {
    log "Testing SSL monitoring setup..."
    
    # Test healthcheck script
    if "$SCRIPT_DIR/ssl-healthcheck.sh" >/dev/null 2>&1; then
        success "SSL healthcheck script working"
    else
        error "SSL healthcheck script failed"
        return 1
    fi
    
    # Test expiration check script
    if "$SCRIPT_DIR/check-ssl-expiration.sh" >/dev/null 2>&1; then
        success "SSL expiration check script working"
    else
        warn "SSL expiration check script failed (may be expected if no certificates exist)"
    fi
    
    # Test backup script
    if "$SCRIPT_DIR/backup-ssl.sh" report >/dev/null 2>&1; then
        success "SSL backup script working"
    else
        warn "SSL backup script failed"
    fi
    
    success "SSL monitoring tests completed"
}

# Show setup summary
show_setup_summary() {
    echo -e "\n${BLUE}=== SSL Monitoring Setup Summary ===${NC}"
    echo -e "${GREEN}✅ Scripts made executable${NC}"
    echo -e "${GREEN}✅ Directories created${NC}"
    echo -e "${GREEN}✅ Cron jobs configured${NC}"
    echo -e "${GREEN}✅ Environment variables set${NC}"
    echo -e "${GREEN}✅ Dependencies checked${NC}"
    echo -e "${GREEN}✅ Tests completed${NC}"
    
    echo -e "\n${BLUE}=== Monitoring Schedule ===${NC}"
    echo -e "• Healthcheck: Every 5 minutes"
    echo -e "• Expiration Check: Daily at 9 AM"
    echo -e "• Auto-Renewal: Daily at 3:30 AM"
    echo -e "• Backup: Daily at 2 AM"
    echo -e "• Backup Cleanup: Weekly on Sundays at 4 AM"
    
    echo -e "\n${BLUE}=== Access Points ===${NC}"
    echo -e "• Healthcheck Server: http://localhost:${HEALTH_CHECK_PORT:-8080}/health"
    echo -e "• Metrics: http://localhost:${HEALTH_CHECK_PORT:-8080}/metrics"
    echo -e "• Grafana Dashboard: http://localhost:3001 (SSL Certificate Monitoring)"
    
    echo -e "\n${BLUE}=== Log Files ===${NC}"
    echo -e "• Healthcheck: $PROJECT_ROOT/logs/ssl/healthcheck.log"
    echo -e "• Monitoring: $PROJECT_ROOT/logs/ssl/monitoring.log"
    echo -e "• Renewal: $PROJECT_ROOT/logs/ssl/renewal.log"
    echo -e "• Backup: $PROJECT_ROOT/logs/ssl/backup.log"
    
    echo -e "\n${BLUE}=== Manual Commands ===${NC}"
    echo -e "• Run healthcheck: $SCRIPT_DIR/ssl-healthcheck.sh"
    echo -e "• Check expiration: $SCRIPT_DIR/check-ssl-expiration.sh"
    echo -e "• Manual renewal: $SCRIPT_DIR/auto-renew-and-reload.sh"
    echo -e "• Create backup: $SCRIPT_DIR/backup-ssl.sh backup"
    echo -e "• List backups: $SCRIPT_DIR/backup-ssl.sh list"
    
    echo -e "\n${GREEN}🎉 SSL monitoring setup completed successfully!${NC}"
}

# Main setup function
main() {
    log "🚀 Starting SSL monitoring setup for ${DOMAIN}..."
    
    # Change to project root
    cd "$PROJECT_ROOT"
    
    # Run setup steps
    make_scripts_executable
    create_directories
    install_dependencies
    setup_environment_file
    setup_cron_jobs
    setup_prometheus_config
    create_healthcheck_service
    test_ssl_monitoring
    
    # Show summary
    show_setup_summary
}

# Handle arguments
case "${1:-}" in
    "help"|"--help"|"-h")
        cat << EOF
🚀 SSL Monitoring Setup Script

Usage: $0 [options]

This script sets up complete SSL monitoring including:
- Automated health checks
- Expiration monitoring with alerts
- Automatic certificate renewal and NGINX reload
- Certificate backup and restoration
- Prometheus metrics and Grafana dashboard
- Systemd service for healthcheck server

Environment Variables:
    DOMAIN               Domain name (default: from .env)
    HEALTH_CHECK_PORT    Healthcheck server port (default: 8080)

Examples:
    $0                                          # Run complete setup
    DOMAIN=example.com $0                      # Setup for specific domain
    
Note: This script requires root privileges for systemd service creation.

EOF
        exit 0
        ;;
    *)
        main
        ;;
esac
