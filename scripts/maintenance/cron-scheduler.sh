#!/bin/bash
# Cron Scheduler Service - Enterprise Grade
# External scheduler for backup jobs

set -euo pipefail

LOG_FILE="/var/log/cron-scheduler.log"

log_info() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] INFO: $1" | tee -a "$LOG_FILE"
}

log_error() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] ERROR: $1" | tee -a "$LOG_FILE"
}

# PostgreSQL backup job
run_postgres_backup() {
  log_info "=== Starting PostgreSQL Backup Job ==="
  
  # Check if postgres is healthy
  if ! docker compose exec -T postgres pg_isready -U "$POSTGRES_USER" > /dev/null 2>&1; then
    log_error "PostgreSQL is not ready, skipping backup"
    return 1
  fi
  
  # Run backup script
  if docker compose exec -T postgres_backup /opt/workplace/scripts/database/backup-postgres.sh >> /var/log/postgres-backup.log 2>&1; then
    log_info "PostgreSQL backup completed successfully"
  else
    log_error "PostgreSQL backup failed"
    return 1
  fi
  
  log_info "=== PostgreSQL Backup Job Completed ==="
}

# Redis backup job
run_redis_backup() {
  log_info "=== Starting Redis Backup Job ==="
  
  # Check if redis is healthy
  if ! docker compose exec -T redis redis-cli -a "$REDIS_PASSWORD" ping > /dev/null 2>&1; then
    log_error "Redis is not ready, skipping backup"
    return 1
  fi
  
  # Run backup script
  if docker compose exec -T redis_backup /opt/workplace/scripts/database/backup-redis.sh >> /var/log/redis-backup.log 2>&1; then
    log_info "Redis backup completed successfully"
  else
    log_error "Redis backup failed"
    return 1
  fi
  
  log_info "=== Redis Backup Job Completed ==="
}

# Backup validation job
run_backup_validation() {
  log_info "=== Starting Backup Validation Job ==="
  
  # Run validation script
  if docker compose exec -T postgres_backup /opt/workplace/scripts/database/validate-backups.sh >> /var/log/backup-validation.log 2>&1; then
    log_info "Backup validation completed successfully"
  else
    log_error "Backup validation failed"
    return 1
  fi
  
  log_info "=== Backup Validation Job Completed ==="
}

# Main execution based on arguments
case "${1:-}" in
  "postgres-backup")
    run_postgres_backup
    ;;
  "redis-backup")
    run_redis_backup
    ;;
  "validate-backups")
    run_backup_validation
    ;;
  *)
    echo "Usage: $0 {postgres-backup|redis-backup|validate-backups}"
    exit 1
    ;;
esac
