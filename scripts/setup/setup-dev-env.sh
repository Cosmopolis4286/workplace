#!/bin/bash
set -euo pipefail

# Development Environment Setup Script
# Automatically configures environment for local development

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')] SETUP:${NC} $1"
}

log_success() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] SETUP:${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] SETUP:${NC} $1"
}

log_error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] SETUP:${NC} $1"
}

# Check if running in Windows (WSL) or Linux/macOS
detect_os() {
    if [[ "$OSTYPE" == "linux-gnu"* ]]; then
        echo "linux"
    elif [[ "$OSTYPE" == "darwin"* ]]; then
        echo "macos"
    elif [[ "$OSTYPE" == "msys" ]] || [[ "$OSTYPE" == "cygwin" ]]; then
        echo "windows"
    else
        echo "unknown"
    fi
}

# Check if port is available
check_port() {
    local port=$1
    if command -v netstat >/dev/null 2>&1; then
        if netstat -tuln 2>/dev/null | grep -q ":$port "; then
            return 1
        fi
    elif command -v ss >/dev/null 2>&1; then
        if ss -tuln 2>/dev/null | grep -q ":$port "; then
            return 1
        fi
    fi
    return 0
}

# Find available ports
find_available_ports() {
    local http_port=${HTTP_PORT:-80}
    local https_port=${HTTPS_PORT:-443}
    local node_port=${NODE_PORT:-3001}
    local frontend_port=${FRONTEND_PORT:-3000}
    
    # Find available HTTP port
    while ! check_port $http_port; do
        http_port=$((http_port + 1))
    done
    
    # Find available HTTPS port
    while ! check_port $https_port; do
        https_port=$((https_port + 1))
    done
    
    # Find available Node port
    while ! check_port $node_port; do
        node_port=$((node_port + 1))
    done
    
    # Find available Frontend port
    while ! check_port $frontend_port; do
        frontend_port=$((frontend_port + 1))
    done
    
    echo "$http_port:$https_port:$node_port:$frontend_port"
}

# Generate .env file for development
generate_env() {
    local ports=$(find_available_ports)
    local http_port=$(echo "$ports" | cut -d: -f1)
    local https_port=$(echo "$ports" | cut -d: -f2)
    local node_port=$(echo "$ports" | cut -d: -f3)
    local frontend_port=$(echo "$ports" | cut -d: -f4)
    
    log "Generating .env file for development..."
    
    cat > .env << EOF
# Auto-generated development environment
# Created: $(date)

# Environment Detection
APP_ENV=development

# Development Ports (auto-detected)
HTTP_PORT=$http_port
HTTPS_PORT=$https_port
NODE_PORT=$node_port
FRONTEND_PORT=$frontend_port

# Development Database
POSTGRES_USER=dev_user
POSTGRES_PASSWORD=dev_password_$(date +%s)
POSTGRES_DB=workplace_dev

# Development Redis
REDIS_PASSWORD=dev_redis_password_$(date +%s)

# Development Domain
DOMAIN=localhost

# Certbot Settings (disabled for local)
STAGING_MODE=true

# Development-specific Settings
DEBUG=true
LOG_LEVEL=debug

# Security (relaxed for development)
CORS_ORIGIN=http://localhost:$http_port
EOF
    
    log_success ".env file generated successfully"
    log "Ports configured: HTTP=$http_port, HTTPS=$https_port, API=$node_port, Frontend=$frontend_port"
}

# Check dependencies
check_dependencies() {
    log "Checking dependencies..."
    
    local missing_deps=()
    
    if ! command -v docker >/dev/null 2>&1; then
        missing_deps+=("docker")
    fi
    
    if ! command -v docker-compose >/dev/null 2>&1; then
        missing_deps+=("docker-compose")
    fi
    
    if [ ${#missing_deps[@]} -gt 0 ]; then
        log_error "Missing dependencies: ${missing_deps[*]}"
        log_error "Please install the missing dependencies and try again"
        exit 1
    fi
    
    log_success "All dependencies found"
}

# Setup development directories
setup_directories() {
    log "Setting up development directories..."
    
    local dirs=(
        "logs/nginx"
        "logs/backend" 
        "logs/frontend"
        "data/postgres"
        "data/redis"
        "uploads"
    )
    
    for dir in "${dirs[@]}"; do
        mkdir -p "$dir" 2>/dev/null || true
    done
    
    log_success "Development directories created"
}

# Create development docker-compose override
create_dev_override() {
    log "Creating development docker-compose override..."
    
    cat > docker-compose.override.yml << EOF

services:
  nginx:
    ports:
      - \${HTTP_PORT:-80}:80
      # HTTPS port disabled for development
    environment:
      - APP_ENV=development
      - DOMAIN=localhost
    volumes:
      # Additional development volumes
      - ./logs/nginx:/var/log/nginx:rw
      - ./nginx/dev.conf:/etc/nginx/conf.d/dev.conf:ro

  backend:
    environment:
      - APP_ENV=development
      - DEBUG=true
      - LOG_LEVEL=debug
    volumes:
      # Mount source code for development
      - ./backend/src:/app/src:rw
      - ./backend/prisma:/app/prisma:rw
      - ./logs/backend:/app/logs:rw

  frontend:
    environment:
      - APP_ENV=development
      - NUXT_DEBUG=true
    volumes:
      # Mount source code for development
      - ./frontend/components:/app/components:rw
      - ./frontend/pages:/app/pages:rw
      - ./frontend/assets:/app/assets:rw
      - ./frontend/composables:/app/composables:rw

  postgres:
    environment:
      - POSTGRES_USER=dev_user
      - POSTGRES_PASSWORD=dev_password_\${RANDOM}
      - POSTGRES_DB=workplace_dev
    volumes:
      - ./data/postgres:/var/lib/postgresql/data/pgdata

  redis:
    command: >
      redis-server
      --requirepass dev_redis_password_\${RANDOM}
      --appendonly yes
      --appendfsync everysec
      --maxmemory 256mb
      --maxmemory-policy allkeys-lru
    volumes:
      - ./data/redis:/data

  # Disable certbot for development
  certbot:
    profiles:
      - disabled
EOF
    
    log_success "Development override created"
}

# Create development nginx config
create_dev_nginx_config() {
    log "Creating development nginx configuration..."
    
    cat > nginx/dev.conf << 'EOF'
# Development Nginx Configuration
# Relaxed security and performance settings for local development

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
    
    log_success "Development nginx configuration created"
}

# Main setup function
main() {
    log "Starting development environment setup..."
    
    # Check if .env already exists
    if [ -f ".env" ]; then
        log_warning ".env file already exists"
        read -p "Do you want to overwrite it? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            log "Keeping existing .env file"
        else
            generate_env
        fi
    else
        generate_env
    fi
    
    check_dependencies
    setup_directories
    create_dev_override
    create_dev_nginx_config
    
    log_success "Development environment setup completed!"
    log ""
    log "Next steps:"
    log "1. Review the generated .env file"
    log "2. Run: docker-compose -f docker-compose.prod.yml -f docker-compose.override.yml up -d"
    log "3. Access your application at http://localhost:${HTTP_PORT:-80}"
    log ""
    log "Development features enabled:"
    log "- Hot reload for frontend and backend"
    log "- Relaxed security headers"
    log "- No SSL/HTTPS"
    log "- Debug logging"
    log "- Source code mounting"
}

# Handle signals gracefully
trap 'log "Setup interrupted"; exit 1' SIGINT SIGTERM

# Run main function
main "$@"
