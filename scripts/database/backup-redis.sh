#!/bin/bash
# Enhanced Redis Backup with Logging and Validation
# Configurar en cron: 0 3 * * * /opt/workplace/scripts/backup-redis.sh

set -euo pipefail

# Enhanced logging
LOG_FILE="/opt/workplace/logs/backup-redis.log"
exec > >(tee -a "$LOG_FILE")
exec 2>&1

# Cargar variables de entorno
if [ -f "/opt/workplace/.env" ]; then
  source /opt/workplace/.env
fi

# Configuration
BACKUP_DIR="/opt/workplace/backups/redis"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="$BACKUP_DIR/redis_backup_$TIMESTAMP.rdb"
RETENTION_DAYS=7
BACKUP_START_TIME=$(date +%s)

# Enhanced logging functions
log_info() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] INFO: $1"
}

log_warn() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] WARN: $1"
}

log_error() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] ERROR: $1"
}

log_success() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] SUCCESS: $1"
}

# Validation functions
validate_environment() {
  log_info "Validating Redis backup environment..."
  
  # Check required variables
  if [[ -z "${REDIS_PASSWORD:-}" ]]; then
    log_error "REDIS_PASSWORD not set"
    exit 1
  fi
  
  # Check directories
  mkdir -p "$BACKUP_DIR"
  mkdir -p "$(dirname "$LOG_FILE")"
  
  # Check docker compose
  if ! command -v docker &> /dev/null; then
    log_error "Docker command not found"
    exit 1
  fi
  
  log_success "Environment validation completed"
}

check_redis_health() {
  log_info "Checking Redis health..."
  
  if ! docker compose -f /opt/workplace/docker-compose.yml ps redis | grep -q "Up"; then
    log_error "Redis is not running"
    exit 1
  fi
  
  # Test Redis connection
  if ! docker compose -f /opt/workplace/docker-compose.yml exec -T redis redis-cli -a "$REDIS_PASSWORD" ping | grep -q "PONG"; then
    log_error "Redis is not responding"
    exit 1
  fi
  
  log_success "Redis health check passed"
}

perform_backup() {
  log_info "Starting Redis backup process"
  log_info "Backup file: $BACKUP_FILE"
  
  # Trigger Redis BGSAVE
  if docker compose -f /opt/workplace/docker-compose.yml exec -T redis redis-cli -a "$REDIS_PASSWORD" BGSAVE; then
    log_info "Redis BGSAVE initiated"
  else
    log_error "Failed to initiate Redis BGSAVE"
    exit 1
  fi
  
  # Wait for BGSAVE to complete
  log_info "Waiting for BGSAVE to complete..."
  local max_wait=300  # 5 minutes max
  local wait_time=0
  
  while [[ $wait_time -lt $max_wait ]]; do
    local lastsave=$(docker compose -f /opt/workplace/docker-compose.yml exec -T redis redis-cli -a "$REDIS_PASSWORD" LASTSAVE | tr -d '\r')
    local current_time=$(date +%s)
    
    # Check if BGSAVE completed (lastsave timestamp updated)
    if [[ $lastsave -gt $((current_time - 300)) ]]; then
      log_success "BGSAVE completed"
      break
    fi
    
    sleep 5
    wait_time=$((wait_time + 5))
    log_info "Waiting for BGSAVE... (${wait_time}s/${max_wait}s)"
  done
  
  if [[ $wait_time -ge $max_wait ]]; then
    log_error "BGSAVE timeout after ${max_wait} seconds"
    exit 1
  fi
  
  # Copy RDB file from container
  if docker cp $(docker compose -f /opt/workplace/docker-compose.yml ps -q redis):/data/dump.rdb "$BACKUP_FILE"; then
    log_success "RDB file copied successfully"
  else
    log_error "Failed to copy RDB file"
    exit 1
  fi
}

validate_backup() {
  log_info "Validating Redis backup..."
  
  # Check file exists and has content
  if [[ ! -f "$BACKUP_FILE" ]] || [[ ! -s "$BACKUP_FILE" ]]; then
    log_error "Backup file is empty or missing"
    exit 1
  fi
  
  # Verify RDB file format (basic check)
  if ! head -c 9 "$BACKUP_FILE" | grep -q "REDIS"; then
    log_error "Invalid RDB file format"
    exit 1
  fi
  
  # Get backup size
  BACKUP_SIZE=$(stat -c%s "$BACKUP_FILE" 2>/dev/null || stat -f%z "$BACKUP_FILE" 2>/dev/null || echo "0")
  BACKUP_SIZE_MB=$((BACKUP_SIZE / 1024 / 1024))
  
  log_success "Backup validation completed"
  log_info "Backup size: ${BACKUP_SIZE_MB} MB"
}

cleanup_old_backups() {
  log_info "Cleaning up old Redis backups (older than $RETENTION_DAYS days)..."
  
  # Count current backups
  BEFORE_COUNT=$(find "$BACKUP_DIR" -name "redis_backup_*.rdb" | wc -l)
  
  # Remove old backups
  find "$BACKUP_DIR" -name "redis_backup_*.rdb" -mtime +$RETENTION_DAYS -delete
  
  # Count remaining backups
  AFTER_COUNT=$(find "$BACKUP_DIR" -name "redis_backup_*.rdb" | wc -l)
  DELETED_COUNT=$((BEFORE_COUNT - AFTER_COUNT))
  
  log_info "Deleted $DELETED_COUNT old backups"
  log_info "Remaining backups: $AFTER_COUNT"
}

create_symlink() {
  log_info "Creating latest Redis backup symlink..."
  ln -sf "$BACKUP_FILE" "$BACKUP_DIR/latest_backup.rdb"
}

upload_to_remote() {
  # Remote upload to MinIO if configured
  if [[ "${REMOTE_BACKUP:-false}" == "true" ]] && command -v mc &> /dev/null; then
    log_info "Uploading Redis backup to remote storage..."
    
    # Configure MinIO client
    mc alias set minio "http://${MINIO_ENDPOINT:-minio:9000}" "${MINIO_ACCESS_KEY:-}" "${MINIO_SECRET_KEY:-}" || {
      log_warn "Failed to configure MinIO client, skipping remote upload"
      return
    }
    
    # Upload to MinIO
    if mc cp "$BACKUP_FILE" "minio/${MINIO_BUCKET:-workplace-backups}/redis/"; then
      log_success "Redis backup uploaded to remote storage"
    else
      log_warn "Failed to upload Redis backup to remote storage"
    fi
  fi
}

log_metrics() {
  BACKUP_END_TIME=$(date +%s)
  BACKUP_DURATION=$((BACKUP_END_TIME - BACKUP_START_TIME))
  
  log_info "Redis backup metrics:"
  log_info "  Duration: ${BACKUP_DURATION} seconds"
  log_info "  Size: ${BACKUP_SIZE_MB} MB"
  log_info "  File: $(basename "$BACKUP_FILE")"
  log_info "  Status: SUCCESS"
  
  # Log to Grafana/Loki format
  echo "{\"level\":\"info\",\"service\":\"backup-redis\",\"duration\":${BACKUP_DURATION},\"size_mb\":${BACKUP_SIZE_MB},\"status\":\"success\",\"timestamp\":\"$(date -Iseconds)\"}"
}

# Main execution
main() {
  log_info "=== Redis Backup Started ==="
  log_info "Timestamp: $(date)"
  log_info "Backup ID: ${TIMESTAMP}"
  
  validate_environment
  check_redis_health
  perform_backup
  validate_backup
  cleanup_old_backups
  create_symlink
  upload_to_remote
  log_metrics
  
  log_success "=== Redis Backup Completed Successfully ==="
}

# Error handling
trap 'log_error "Redis backup failed with exit code $?"' ERR

# Execute main function
main "$@"
