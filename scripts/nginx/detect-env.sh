#!/bin/bash
set -euo pipefail

# Environment Detection Script for Nginx
# Generates appropriate configuration based on environment

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')] ENV-DETECT:${NC} $1"
}

log_success() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] ENV-DETECT:${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] ENV-DETECT:${NC} $1"
}

log_error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ENV-DETECT:${NC} $1"
}

# Detect if running in development or production
detect_environment() {
    local environment="${ENVIRONMENT:-}"
    local ssl_enabled="${SSL_ENABLED:-true}"
    local domain="${DOMAIN:-playrke.com}"
    
    # Auto-detect if not specified
    if [ -z "$environment" ]; then
        if [ "$domain" = "localhost" ] || [ "$ssl_enabled" = "false" ]; then
            environment="development"
        else
            environment="production"
        fi
    fi
    
    echo "$environment"
}

# Generate nginx configuration based on environment
generate_nginx_config() {
    local environment=$(detect_environment)
    local ssl_enabled="${SSL_ENABLED:-true}"
    local domain="${DOMAIN:-playrke.com}"
    
    log "Detected environment: $environment"
    log "SSL enabled: $ssl_enabled"
    log "Domain: $domain"
    
    if [ "$environment" = "development" ]; then
        generate_dev_config
    else
        generate_prod_config
    fi
}

# Generate development configuration
generate_dev_config() {
    log "Generating development nginx configuration..."
    
    cat > /etc/nginx/conf.d/default.conf << 'EOF'
# Development Nginx Configuration
# Optimized for local development with hot reload

server {
    listen 80;
    server_name localhost;

    # Relaxed security headers for development
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    
    # Permissive CSP for development
    add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https: http:; font-src 'self' data:; connect-src 'self' ws: wss:; frame-ancestors 'none';" always;
    
    # No HSTS in development
    # No rate limiting in development
    # No SSL in development
    
    client_max_body_size 50M;
    
    # Frontend
    location / {
        proxy_pass http://frontend:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # No caching in development
        proxy_cache off;
        proxy_no_cache 1;
        proxy_cache_bypass 1;
        add_header Cache-Control "no-cache, no-store, must-revalidate";
        add_header Pragma "no-cache";
        add_header Expires "0";
    }

    # API
    location /api/ {
        proxy_pass http://backend:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # No caching in development
        proxy_cache off;
        proxy_no_cache 1;
        proxy_cache_bypass 1;
    }

    # Uploads
    location /uploads/ {
        alias /var/www/uploads/;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
EOF
    
    log_success "Development configuration generated"
}

# Generate production configuration
generate_prod_config() {
    local domain="${DOMAIN:-playrke.com}"
    local ssl_enabled="${SSL_ENABLED:-true}"
    
    log "Generating production nginx configuration..."
    
    cat > /etc/nginx/conf.d/default.conf << EOF
# Production Nginx Configuration
# Enterprise-grade security and performance

# HTTP to HTTPS redirect with ACME challenge
server {
    listen 80;
    server_name $domain www.$domain;
    
    # ACME Challenge
    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
        try_files \$uri \$uri/ =404;
    }
    
    # Redirect to HTTPS
    location / {
        return 301 https://\$host\$request_uri;
    }
}

# HTTPS main server
server {
    listen 443 ssl http2;
    server_name $domain www.$domain;

    # SSL Configuration
    ssl_certificate /etc/letsencrypt/live/$domain/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/$domain/privkey.pem;
    ssl_trusted_certificate /etc/letsencrypt/live/$domain/chain.pem;
    
    # SSL Hardening
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers on;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-ECDSA-CHACHA20-POLY1305:ECDHE-RSA-CHACHA20-POLY1305:DHE-RSA-AES128-GCM-SHA256:DHE-RSA-AES256-GCM-SHA384;
    ssl_conf_command Ciphersuites TLS_AES_128_GCM_SHA256:TLS_AES_256_GCM_SHA384:TLS_CHACHA20_POLY1305_SHA256;
    ssl_conf_command Options PrioritizeChaCha;
    
    # SSL Session Cache
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;
    ssl_session_tickets off;
    
    # OCSP Stapling
    ssl_stapling on;
    ssl_stapling_verify on;
    resolver 8.8.8.8 8.8.4.4 valid=300s;
    resolver_timeout 5s;
    
    # HSTS
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;
    
    # CSP stricto para producción
    add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'nonce-\$request_id'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; object-src 'none'; base-uri 'self'; form-action 'self'; upgrade-insecure-requests;" always;
    
    # Cloudflare IP filtering
    set \$allowed 0;
    if (\$cloudflare_ip = 1) { set \$allowed 1; }
    if (\$remote_addr = 127.0.0.1) { set \$allowed 1; }
    
    if (\$allowed = 0) {
        return 403;
    }
    
    client_max_body_size 50M;
    
    # Frontend
    location / {
        limit_req zone=general_limit burst=50 nodelay;
        limit_conn conn_limit_per_ip 20;
        
        proxy_pass http://frontend_cluster;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;

        # SSR caching
        proxy_cache ssr_cache;
        proxy_cache_valid 200 5m;
        proxy_cache_valid 404 1m;
        proxy_cache_use_stale error timeout updating;
        add_header X-Cache-Status \$upstream_cache_status;

        proxy_next_upstream error timeout invalid_header http_502 http_503 http_504;
        proxy_next_upstream_tries 3;
        proxy_next_upstream_timeout 30s;
        
        error_page 502 503 504 = @frontend_fallback;
    }

    location @frontend_fallback {
        root /var/www/fallback;
        index fallback.html;
        try_files /fallback.html =503;
    }

    # API
    location /api/ {
        limit_req zone=api_limit burst=30 nodelay;
        limit_conn conn_limit_per_ip 10;

        proxy_pass http://backend_cluster;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;

        # API caching
        proxy_cache api_cache;
        proxy_cache_valid 200 10m;
        proxy_cache_valid 404 1m;
        proxy_cache_use_stale error timeout updating;
        add_header X-Cache-Status \$upstream_cache_status;

        proxy_next_upstream error timeout invalid_header http_502 http_503 http_504;
        proxy_next_upstream_tries 3;
        proxy_next_upstream_timeout 30s;
        
        error_page 502 503 504 = @api_fallback;
    }

    location @api_fallback {
        return 503 '{"error": "Service temporarily unavailable"}';
        add_header Content-Type application/json;
    }

    # Uploads
    location /uploads/ {
        alias /var/www/uploads/;
        expires 1y;
        add_header Cache-Control "public, immutable";
        
        location ~* \.(php|jsp|asp|sh|py|pl|rb|bat|cmd)\$ {
            deny all;
        }
    }
}
EOF
    
    log_success "Production configuration generated"
}

# Test nginx configuration
test_config() {
    log "Testing nginx configuration..."
    
    if nginx -t; then
        log_success "Nginx configuration test passed"
        return 0
    else
        log_error "Nginx configuration test failed"
        return 1
    fi
}

# Reload nginx
reload_nginx() {
    log "Reloading nginx..."
    
    if nginx -s reload; then
        log_success "Nginx reloaded successfully"
    else
        log_error "Failed to reload nginx"
        return 1
    fi
}

# Main function
main() {
    log "Starting environment detection and configuration..."
    
    generate_nginx_config
    
    if test_config; then
        reload_nginx
        log_success "Environment configuration completed successfully"
    else
        log_error "Environment configuration failed"
        exit 1
    fi
}

# Handle signals gracefully
trap 'log "Received signal, exiting..."; exit 0' SIGTERM SIGINT

# Run main function
main "$@"
