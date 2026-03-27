#!/bin/bash
# Log Rotation Script - Enterprise Grade
# Rotates logs outside of Docker management

set -euo pipefail

LOG_DIR="/var/log/workplace"
RETENTION_DAYS=30
BACKUP_DIR="/var/log/workplace/archive"

log_info() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] INFO: $1"
}

log_error() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] ERROR: $1"
}

# Create directories
mkdir -p "$LOG_DIR" "$BACKUP_DIR"

# Rotate application logs
rotate_logs() {
  log_info "=== Starting Log Rotation ==="
  
  # List of log files to rotate
  log_files=(
    "$LOG_DIR/backup-postgres.log"
    "$LOG_DIR/backup-redis.log"
    "$LOG_DIR/backup-validation.log"
    "$LOG_DIR/cron-scheduler.log"
    "$LOG_DIR/traefik/traefik.log"
    "$LOG_DIR/traefik/access.log"
  )
  
  for log_file in "${log_files[@]}"; do
    if [[ -f "$log_file" ]]; then
      log_info "Rotating: $(basename "$log_file")"
      
      # Compress and archive
      timestamp=$(date +"%Y%m%d_%H%M%S")
      archive_file="$BACKUP_DIR/$(basename "$log_file")_${timestamp}.gz"
      
      if gzip -c "$log_file" > "$archive_file"; then
        # Clear original log file
        > "$log_file"
        log_info "Archived: $(basename "$archive_file")"
      else
        log_error "Failed to archive: $(basename "$log_file")"
      fi
    fi
  done
  
  # Clean old archives
  log_info "Cleaning archives older than $RETENTION_DAYS days..."
  find "$BACKUP_DIR" -name "*.gz" -mtime +$RETENTION_DAYS -delete
  
  # Show disk usage
  log_info "Disk usage:"
  du -sh "$LOG_DIR" "$BACKUP_DIR" | while read size path; do
    log_info "$path: $size"
  done
  
  log_info "=== Log Rotation Completed ==="
}

# Main execution
main() {
  log_info "Log rotation started"
  rotate_logs
  log_info "Log rotation completed successfully"
}

# Execute main function
main "$@"
