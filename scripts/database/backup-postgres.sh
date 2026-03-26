#!/bin/bash
# Enhanced PostgreSQL Backup with Logging and Validation
# Configurar en cron: 0 2 * * * /opt/workplace/scripts/backup-postgres.sh

set -euo pipefail

# Enhanced logging
LOG_FILE="/opt/workplace/logs/backup-postgres.log"
exec > >(tee -a "$LOG_FILE")
exec 2>&1

# Cargar variables de entorno
if [ -f "/opt/workplace/.env" ]; then
  source /opt/workplace/.env
fi

# Configuration
BACKUP_DIR="/opt/workplace/backups/postgres"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="$BACKUP_DIR/workplace_backup_$TIMESTAMP.sql"
RETENTION_DAYS=30
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
  log_info "Validating backup environment..."
  
  # Check required variables
  if [[ -z "${POSTGRES_USER:-}" ]]; then
    log_error "POSTGRES_USER not set"
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

check_postgres_health() {
  log_info "Checking PostgreSQL health..."
  
  if ! docker compose -f /opt/workplace/docker-compose.yml ps postgres | grep -q "Up"; then
    log_error "PostgreSQL is not running"
    exit 1
  fi
  
  # Test database connection
  if ! docker compose -f /opt/workplace/docker-compose.yml exec -T postgres pg_isready -U "$POSTGRES_USER"; then
    log_error "PostgreSQL is not ready"
    exit 1
  fi
  
  log_success "PostgreSQL health check passed"
}

perform_backup() {
  log_info "Starting PostgreSQL backup process"
  log_info "Backup file: $BACKUP_FILE"
  
  # Create backup
  if docker compose -f /opt/workplace/docker-compose.yml exec -T postgres pg_dumpall -U "$POSTGRES_USER" > "$BACKUP_FILE"; then
    log_success "Backup created successfully"
  else
    log_error "Failed to create backup"
    exit 1
  fi
}

validate_backup() {
  log_info "Validating backup integrity..."
  
  # Check file exists and has content
  if [[ ! -f "$BACKUP_FILE" ]] || [[ ! -s "$BACKUP_FILE" ]]; then
    log_error "Backup file is empty or missing"
    exit 1
  fi
  
  # Compress backup
  log_info "Compressing backup..."
  gzip "$BACKUP_FILE"
  BACKUP_FILE_GZ="$BACKUP_FILE.gz"
  
  # Verify compressed file
  if [[ ! -f "$BACKUP_FILE_GZ" ]]; then
    log_error "Compressed backup file not found"
    exit 1
  fi
  
  # Test gzip integrity
  if ! gzip -t "$BACKUP_FILE_GZ" 2>/dev/null; then
    log_error "Backup integrity check failed"
    exit 1
  fi
  
  # Get backup size
  BACKUP_SIZE=$(stat -c%s "$BACKUP_FILE_GZ" 2>/dev/null || stat -f%z "$BACKUP_FILE_GZ" 2>/dev/null || echo "0")
  BACKUP_SIZE_MB=$((BACKUP_SIZE / 1024 / 1024))
  
  log_success "Backup validation completed"
  log_info "Backup size: ${BACKUP_SIZE_MB} MB"
}

cleanup_old_backups() {
  log_info "Cleaning up old backups (older than $RETENTION_DAYS days)..."
  
  # Count current backups
  BEFORE_COUNT=$(find "$BACKUP_DIR" -name "workplace_backup_*.sql.gz" | wc -l)
  
  # Remove old backups
  find "$BACKUP_DIR" -name "workplace_backup_*.sql.gz" -mtime +$RETENTION_DAYS -delete
  
  # Count remaining backups
  AFTER_COUNT=$(find "$BACKUP_DIR" -name "workplace_backup_*.sql.gz" | wc -l)
  DELETED_COUNT=$((BEFORE_COUNT - AFTER_COUNT))
  
  log_info "Deleted $DELETED_COUNT old backups"
  log_info "Remaining backups: $AFTER_COUNT"
}

create_symlink() {
  log_info "Creating latest backup symlink..."
  ln -sf "$BACKUP_FILE_GZ" "$BACKUP_DIR/latest_backup.sql.gz"
}

upload_to_remote() {
  # Remote upload to MinIO if configured
  if [[ "${REMOTE_BACKUP:-false}" == "true" ]] && command -v mc &> /dev/null; then
    log_info "Uploading backup to remote storage..."
    
    # Configure MinIO client
    mc alias set minio "http://${MINIO_ENDPOINT:-minio:9000}" "${MINIO_ACCESS_KEY:-}" "${MINIO_SECRET_KEY:-}" || {
      log_warn "Failed to configure MinIO client, skipping remote upload"
      return
    }
    
    # Upload to MinIO
    if mc cp "$BACKUP_FILE_GZ" "minio/${MINIO_BUCKET:-workplace-backups}/postgres/"; then
      log_success "Backup uploaded to remote storage"
    else
      log_warn "Failed to upload backup to remote storage"
    fi
  fi
}

log_metrics() {
  BACKUP_END_TIME=$(date +%s)
  BACKUP_DURATION=$((BACKUP_END_TIME - BACKUP_START_TIME))
  
  log_info "Backup metrics:"
  log_info "  Duration: ${BACKUP_DURATION} seconds"
  log_info "  Size: ${BACKUP_SIZE_MB} MB"
  log_info "  File: $(basename "$BACKUP_FILE_GZ")"
  log_info "  Status: SUCCESS"
  
  # Log to Grafana/Loki format
  echo "{\"level\":\"info\",\"service\":\"backup-postgres\",\"duration\":${BACKUP_DURATION},\"size_mb\":${BACKUP_SIZE_MB},\"status\":\"success\",\"timestamp\":\"$(date -Iseconds)\"}"
}

# Main execution
main() {
  log_info "=== PostgreSQL Backup Started ==="
  log_info "Timestamp: $(date)"
  log_info "Backup ID: ${TIMESTAMP}"
  
  validate_environment
  check_postgres_health
  perform_backup
  validate_backup
  cleanup_old_backups
  create_symlink
  upload_to_remote
  log_metrics
  
  log_success "=== PostgreSQL Backup Completed Successfully ==="
}

# Error handling
trap 'log_error "Backup failed with exit code $?"' ERR

# Execute main function
main "$@"
