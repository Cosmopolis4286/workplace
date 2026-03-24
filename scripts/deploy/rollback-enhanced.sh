#!/bin/bash
set -euo pipefail

# Enhanced Rollback Script - Enterprise-Grade
# Features: Pre-rollback validation, backup verification, health checks, logging

# Variables
export DOCKER_USERNAME=${DOCKER_USERNAME}
export LOG_DIR="/opt/workplace/logs/deploy"
export BACKUP_DIR="/opt/workplace/backups"
export ROLLBACK_ID="rollback-$(date +%s)"
export MAX_RETRIES=30
export HEALTH_CHECK_TIMEOUT=60

# Logging function
function log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_DIR/rollback_$ROLLBACK_ID.log"
}

# Error handling
function handle_error() {
    local exit_code=$?
    local line_number=$1
    log "❌ ERROR: Script failed at line $line_number with exit code $exit_code"
    log "🔍 Check logs: $LOG_DIR/rollback_$ROLLBACK_ID.log"
    
    # Attempt emergency recovery
    log "🚨 Attempting emergency recovery..."
    emergency_recovery
    exit $exit_code
}

# Set up error handling
trap 'handle_error $LINENO' ERR

# Pre-rollback validation
function pre_rollback_validation() {
    log "🔍 Pre-rollback validation started..."
    
    # Check Docker daemon
    if ! docker info >/dev/null 2>&1; then
        log "❌ Docker daemon is not running"
        return 1
    fi
    
    # Check docker-compose
    if ! docker compose version >/dev/null 2>&1; then
        log "❌ docker-compose is not available"
        return 1
    fi
    
    # Check required directories
    mkdir -p "$LOG_DIR" "$BACKUP_DIR"
    
    # Check disk space (minimum 1GB required)
    local available_space=$(df /opt/workplace | awk 'NR==2 {print $4}')
    if [ "$available_space" -lt 1048576 ]; then  # 1GB in KB
        log "❌ Insufficient disk space: ${available_space}KB available, 1GB required"
        return 1
    fi
    
    # Check current services state
    log "📊 Current services state:"
    docker compose ps --format "table {{.Name}}\t{{.Status}}\t{{.Ports}}" | tee -a "$LOG_DIR/rollback_$ROLLBACK_ID.log"
    
    log "✅ Pre-rollback validation completed"
    return 0
}

# Enhanced backup discovery
function find_robust_backup() {
    log "🔍 Searching for robust backups..."
    
    local backup_candidates=()
    local rollback_candidates=()
    
    # Search for backup images with priority
    while IFS= read -r line; do
        if [[ $line =~ workplace-backend:backup-[0-9]+ ]]; then
            backup_candidates+=("$line")
        elif [[ $line =~ workplace-backend:rollback-[0-9]+ ]]; then
            rollback_candidates+=("$line")
        fi
    done < <(docker images --format "{{.Repository}}:{{.Tag}}\t{{.CreatedAt}}" | grep -E "(backup|rollback)" | sort -k2 -r)
    
    # Priority: Latest rollback > Latest backup > Latest stable
    local backend_image=""
    local frontend_image=""
    
    # Try rollback candidates first
    if [ ${#rollback_candidates[@]} -gt 0 ]; then
        backend_image=$(echo "${rollback_candidates[0]}" | awk '{print $1}')
        log "🔄 Found rollback candidate: $backend_image"
    fi
    
    # Try backup candidates
    if [ -z "$backend_image" ] && [ ${#backup_candidates[@]} -gt 0 ]; then
        backend_image=$(echo "${backup_candidates[0]}" | awk '{print $1}')
        log "📦 Found backup candidate: $backend_image"
    fi
    
    # Try latest stable tag
    if [ -z "$backend_image" ]; then
        if docker pull "$DOCKER_USERNAME/workplace-backend:latest" 2>/dev/null; then
            backend_image="$DOCKER_USERNAME/workplace-backend:latest"
            log "⬇️ Using latest stable from Docker Hub: $backend_image"
        fi
    fi
    
    # Same logic for frontend
    local frontend_candidates=($(docker images --format "{{.Repository}}:{{.Tag}}" | grep "workplace-frontend:" | grep -E "(backup|rollback|latest)" | sort -r))
    
    for candidate in "${frontend_candidates[@]}"; do
        if [[ $candidate =~ workplace-frontend:(backup|rollback|latest) ]]; then
            frontend_image="$candidate"
            log "📦 Found frontend candidate: $frontend_image"
            break
        fi
    done
    
    if [ -z "$frontend_image" ]; then
        if docker pull "$DOCKER_USERNAME/workplace-frontend:latest" 2>/dev/null; then
            frontend_image="$DOCKER_USERNAME/workplace-frontend:latest"
            log "⬇️ Using latest stable frontend from Docker Hub: $frontend_image"
        fi
    fi
    
    if [ -z "$backend_image" ] || [ -z "$frontend_image" ]; then
        log "❌ No suitable images found for rollback"
        log "Available images:"
        docker images --format "{{.Repository}}:{{.Tag}}" | grep workplace || echo "No workplace images"
        return 1
    fi
    
    # Validate images
    if ! docker inspect "$backend_image" >/dev/null 2>&1; then
        log "❌ Backend image validation failed: $backend_image"
        return 1
    fi
    
    if ! docker inspect "$frontend_image" >/dev/null 2>&1; then
        log "❌ Frontend image validation failed: $frontend_image"
        return 1
    fi
    
    echo "$backend_image $frontend_image"
    return 0
}

# Create rollback snapshot
function create_rollback_snapshot() {
    local current_backend_image="$1"
    local current_frontend_image="$2"
    
    log "📸 Creating rollback snapshot..."
    
    # Save current state
    docker compose ps > "$LOG_DIR/pre_rollback_state_$ROLLBACK_ID.log"
    
    # Create backup of current images if they're not already backed up
    local current_backend_tag=$(docker compose ps --format "{{.Image}}" | grep backend | head -1 || echo "")
    local current_frontend_tag=$(docker compose ps --format "{{.Image}}" | grep frontend | head -1 || echo "")
    
    if [ -n "$current_backend_tag" ] && [[ ! $current_backend_tag =~ (backup|rollback) ]]; then
        docker tag "$current_backend_tag" "$DOCKER_USERNAME/workplace-backend:backup-$ROLLBACK_ID" || true
        log "📦 Created backup of current backend: $DOCKER_USERNAME/workplace-backend:backup-$ROLLBACK_ID"
    fi
    
    if [ -n "$current_frontend_tag" ] && [[ ! $current_frontend_tag =~ (backup|rollback) ]]; then
        docker tag "$current_frontend_tag" "$DOCKER_USERNAME/workplace-frontend:backup-$ROLLBACK_ID" || true
        log "📦 Created backup of current frontend: $DOCKER_USERNAME/workplace-frontend:backup-$ROLLBACK_ID"
    fi
    
    # Save rollback metadata
    cat > "$BACKUP_DIR/rollback_$ROLLBACK_ID.json" << EOF
{
  "rollback_id": "$ROLLBACK_ID",
  "timestamp": "$(date -Iseconds)",
  "reason": "automatic_rollback",
  "previous_backend": "$current_backend_tag",
  "previous_frontend": "$current_frontend_tag",
  "rollback_backend": "$current_backend_image",
  "rollback_frontend": "$current_frontend_image",
  "pre_rollback_state": "$LOG_DIR/pre_rollback_state_$ROLLBACK_ID.log"
}
EOF
    
    log "✅ Rollback snapshot created: $ROLLBACK_ID"
}

# Enhanced service stop with grace period
function stop_services_gracefully() {
    log "🔄 Gracefully stopping services..."
    
    # Stop with timeout
    if timeout 30 docker compose down; then
        log "✅ Services stopped gracefully"
    else
        log "⚠️ Graceful stop timed out, forcing stop..."
        docker compose down --force-remove-orphans --timeout 10 || true
        log "✅ Services force stopped"
    fi
    
    # Clean up any orphaned containers
    docker container prune -f >/dev/null 2>&1 || true
    
    log "✅ All services stopped"
}

# Enhanced service start with health monitoring
function start_rollback_services() {
    local backend_image="$1"
    local frontend_image="$2"
    
    log "🚀 Starting rollback services..."
    
    # Update docker-compose with rollback images
    export BACKEND_IMAGE="$backend_image"
    export FRONTEND_IMAGE="$frontend_image"
    
    # Start core services first
    log "📊 Starting core services (postgres, redis)..."
    docker compose up -d postgres redis
    
    # Wait for databases
    log "⏳ Waiting for databases to be ready..."
    local db_ready=false
    for i in $(seq 1 $MAX_RETRIES); do
        if docker compose exec -T postgres pg_isready -U "${POSTGRES_USER:-workplace}" >/dev/null 2>&1; then
            log "✅ PostgreSQL ready ($i/$MAX_RETRIES)"
            db_ready=true
            break
        fi
        sleep 2
    done
    
    if [ "$db_ready" = false ]; then
        log "❌ PostgreSQL failed to become ready"
        return 1
    fi
    
    # Check Redis
    local redis_ready=false
    for i in $(seq 1 $MAX_RETRIES); do
        if docker compose exec -T redis redis-cli ping >/dev/null 2>&1; then
            log "✅ Redis ready ($i/$MAX_RETRIES)"
            redis_ready=true
            break
        fi
        sleep 1
    done
    
    if [ "$redis_ready" = false ]; then
        log "❌ Redis failed to become ready"
        return 1
    fi
    
    # Start application services
    log "🚀 Starting application services..."
    docker compose up -d backend frontend nginx
    
    # Wait for services to be healthy
    log "🏥 Waiting for services to be healthy..."
    
    # Backend health check
    local backend_healthy=false
    for i in $(seq 1 $MAX_RETRIES); do
        if docker compose exec -T backend curl -f http://localhost:3001/api/health >/dev/null 2>&1; then
            log "✅ Backend healthy ($i/$MAX_RETRIES)"
            backend_healthy=true
            break
        fi
        sleep 3
    done
    
    if [ "$backend_healthy" = false ]; then
        log "❌ Backend failed health check"
        return 1
    fi
    
    # Frontend health check
    local frontend_healthy=false
    for i in $(seq 1 $MAX_RETRIES); do
        if docker compose exec -T frontend curl -f http://localhost:3000 >/dev/null 2>&1; then
            log "✅ Frontend healthy ($i/$MAX_RETRIES)"
            frontend_healthy=true
            break
        fi
        sleep 2
    done
    
    if [ "$frontend_healthy" = false ]; then
        log "❌ Frontend failed health check"
        return 1
    fi
    
    log "✅ All rollback services started and healthy"
    return 0
}

# Post-rollback verification
function post_rollback_verification() {
    log "🔍 Post-rollback verification..."
    
    # Check all services are running
    local running_services=$(docker compose ps --format "{{.Service}}:{{.Status}}" | grep -c "running" || echo "0")
    local total_services=$(docker compose config --services | wc -l)
    
    log "📊 Services running: $running_services/$total_services"
    
    if [ "$running_services" -lt "$total_services" ]; then
        log "❌ Not all services are running"
        docker compose ps --format "table {{.Service}}\t{{.Status}}" | tee -a "$LOG_DIR/rollback_$ROLLBACK_ID.log"
        return 1
    fi
    
    # Final health check
    if ! docker compose exec -T backend curl -f http://localhost:3001/api/health >/dev/null 2>&1; then
        log "❌ Final backend health check failed"
        return 1
    fi
    
    if ! docker compose exec -T frontend curl -f http://localhost:3000 >/dev/null 2>&1; then
        log "❌ Final frontend health check failed"
        return 1
    fi
    
    log "✅ Post-rollback verification completed successfully"
    return 0
}

# Emergency recovery function
function emergency_recovery() {
    log "🚨 Emergency recovery initiated..."
    
    # Try to start with latest stable images
    if docker pull "$DOCKER_USERNAME/workplace-backend:latest" 2>/dev/null && \
       docker pull "$DOCKER_USERNAME/workplace-frontend:latest" 2>/dev/null; then
        
        log "🔄 Attempting emergency recovery with latest stable images..."
        docker compose down --force-remove-orphans 2>/dev/null || true
        docker compose up -d
        
        log "🏥 Waiting for emergency recovery health check..."
        sleep 30
        
        if docker compose exec -T backend curl -f http://localhost:3001/api/health >/dev/null 2>&1; then
            log "✅ Emergency recovery successful"
            return 0
        fi
    fi
    
    log "❌ Emergency recovery failed - manual intervention required"
    return 1
}

# Main rollback function
function main_rollback() {
    log "🚀 Enhanced rollback started with ID: $ROLLBACK_ID"
    
    # Pre-rollback validation
    pre_rollback_validation
    
    # Find robust backup images
    local images_result=$(find_robust_backup)
    if [ $? -ne 0 ]; then
        log "❌ Failed to find suitable backup images"
        return 1
    fi
    
    local backend_image=$(echo "$images_result" | awk '{print $1}')
    local frontend_image=$(echo "$images_result" | awk '{print $2}')
    
    log "📦 Using rollback images:"
    log "  Backend: $backend_image"
    log "  Frontend: $frontend_image"
    
    # Create rollback snapshot
    create_rollback_snapshot "$backend_image" "$frontend_image"
    
    # Stop services gracefully
    stop_services_gracefully
    
    # Start rollback services
    if ! start_rollback_services "$backend_image" "$frontend_image"; then
        log "❌ Failed to start rollback services"
        emergency_recovery
        return 1
    fi
    
    # Post-rollback verification
    if ! post_rollback_verification; then
        log "❌ Post-rollback verification failed"
        emergency_recovery
        return 1
    fi
    
    log "🎉 Enhanced rollback completed successfully!"
    log "📋 Rollback summary:"
    log "  Rollback ID: $ROLLBACK_ID"
    log "  Backend: $backend_image"
    log "  Frontend: $frontend_image"
    log "  Logs: $LOG_DIR/rollback_$ROLLBACK_ID.log"
    log "  Metadata: $BACKUP_DIR/rollback_$ROLLBACK_ID.json"
    
    return 0
}

# Execute main rollback
main_rollback
