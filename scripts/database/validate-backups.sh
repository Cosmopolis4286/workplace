#!/bin/bash
# Backup Validation Script - Enterprise Grade
# Validates backup integrity by performing restore test

set -euo pipefail

# Configuration
LOG_FILE="/opt/workplace/logs/backup-validation.log"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")

# Logging functions
log_info() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] INFO: $1" | tee -a "$LOG_FILE"
}

log_error() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] ERROR: $1" | tee -a "$LOG_FILE"
}

log_success() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] SUCCESS: $1" | tee -a "$LOG_FILE"
}

# PostgreSQL backup validation
validate_postgres_backup() {
  log_info "=== PostgreSQL Backup Validation Started ==="
  
  # Get latest backup
  LATEST_BACKUP=$(find /opt/workplace/backups/postgres -name "workplace_backup_*.sql.gz" -type f -exec ls -lt {} + | head -1 | awk '{print $9}')
  
  if [[ -z "$LATEST_BACKUP" ]]; then
    log_error "No PostgreSQL backup found"
    return 1
  fi
  
  log_info "Validating backup: $(basename "$LATEST_BACKUP")"
  
  # Test gzip integrity
  if ! gzip -t "$LATEST_BACKUP"; then
    log_error "Backup file is corrupted"
    return 1
  fi
  
  # Check file size (should be > 1MB for real data)
  BACKUP_SIZE=$(stat -c%s "$LATEST_BACKUP" 2>/dev/null || stat -f%z "$LATEST_BACKUP" 2>/dev/null || echo "0")
  if [[ $BACKUP_SIZE -lt 1048576 ]]; then
    log_error "Backup file too small: ${BACKUP_SIZE} bytes"
    return 1
  fi
  
  # Test restore to temporary database
  log_info "Testing restore to temporary database..."
  
  # Create temporary database
  if docker compose -f /opt/workplace/docker-compose.yml exec -T postgres psql -U "$POSTGRES_USER" -c "CREATE DATABASE test_restore_$TIMESTAMP;" 2>/dev/null; then
    # Restore backup
    if gunzip -c "$LATEST_BACKUP" | docker compose -f /opt/workplace/docker-compose.yml exec -T postgres psql -U "$POSTGRES_USER" -d "test_restore_$TIMESTAMP" 2>/dev/null; then
      log_success "Restore test successful"
      
      # Basic data validation
      TABLE_COUNT=$(docker compose -f /opt/workplace/docker-compose.yml exec -T postgres psql -U "$POSTGRES_USER" -d "test_restore_$TIMESTAMP" -tAc "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';" 2>/dev/null || echo "0")
      if [[ $TABLE_COUNT -gt 0 ]]; then
        log_success "Data validation passed: $TABLE_COUNT tables found"
      else
        log_error "No tables found in restored database"
      fi
    else
      log_error "Restore test failed"
    fi
    
    # Cleanup temporary database
    docker compose -f /opt/workplace/docker-compose.yml exec -T postgres psql -U "$POSTGRES_USER" -c "DROP DATABASE IF EXISTS test_restore_$TIMESTAMP;" 2>/dev/null || true
  else
    log_error "Failed to create test database"
  fi
  
  log_success "=== PostgreSQL Backup Validation Completed ==="
}

# Redis backup validation
validate_redis_backup() {
  log_info "=== Redis Backup Validation Started ==="
  
  # Get latest backup
  LATEST_BACKUP=$(find /opt/workplace/backups/redis -name "redis_backup_*.rdb" -type f -exec ls -lt {} + | head -1 | awk '{print $9}')
  
  if [[ -z "$LATEST_BACKUP" ]]; then
    log_error "No Redis backup found"
    return 1
  fi
  
  log_info "Validating backup: $(basename "$LATEST_BACKUP")"
  
  # Verify RDB file format
  if ! head -c 9 "$LATEST_BACKUP" | grep -q "REDIS"; then
    log_error "Invalid RDB file format"
    return 1
  fi
  
  # Check file size
  BACKUP_SIZE=$(stat -c%s "$LATEST_BACKUP" 2>/dev/null || stat -f%z "$LATEST_BACKUP" 2>/dev/null || echo "0")
  if [[ $BACKUP_SIZE -lt 1024 ]]; then
    log_error "Backup file too small: ${BACKUP_SIZE} bytes"
    return 1
  fi
  
  log_success "Redis backup validation passed: ${BACKUP_SIZE} bytes"
  log_success "=== Redis Backup Validation Completed ==="
}

# Main execution
main() {
  log_info "=== Backup Validation Started ==="
  log_info "Timestamp: $(date)"
  
  # Validate PostgreSQL backup
  if [[ "${POSTGRES_USER:-}" ]]; then
    validate_postgres_backup
  else
    log_info "Skipping PostgreSQL validation (POSTGRES_USER not set)"
  fi
  
  # Validate Redis backup
  if [[ "${REDIS_PASSWORD:-}" ]]; then
    validate_redis_backup
  else
    log_info "Skipping Redis validation (REDIS_PASSWORD not set)"
  fi
  
  log_success "=== Backup Validation Completed ==="
}

# Execute main function
main "$@"
