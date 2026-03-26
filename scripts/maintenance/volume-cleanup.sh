#!/bin/bash
# Volume Cleanup and Maintenance Script
# Configurar en cron: 0 4 * * 0 /opt/workplace/scripts/maintenance/volume-cleanup.sh (domingos 4am)

set -euo pipefail

# Enhanced logging
LOG_FILE="/opt/workplace/logs/volume-cleanup.log"
exec > >(tee -a "$LOG_FILE")
exec 2>&1

# Configuration
PROMETHEUS_RETENTION_DAYS=30
LOKI_RETENTION_DAYS=14
GRAFANA_RETENTION_DAYS=30
POSTGRES_LOGS_RETENTION_DAYS=7
REDIS_LOGS_RETENTION_DAYS=7
BACKUP_RETENTION_DAYS=30
DOCKER_IMAGES_CLEANUP=true
DOCKER_VOLUMES_CLEANUP=false  # Be careful with this one

# Safety checks
DRY_RUN="${DRY_RUN:-false}"  # Set to true to test without actually deleting
MIN_DISK_SPACE_GB=10          # Minimum disk space to maintain

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

# Safety function to check disk space
check_disk_space() {
  local available_gb=$(df / | awk 'NR==2 {print int($4/1024/1024)}')
  
  if [[ $available_gb -lt $MIN_DISK_SPACE_GB ]]; then
    log_error "Insufficient disk space: ${available_gb}GB available, ${MIN_DISK_SPACE_GB}GB required"
    return 1
  fi
  
  log_info "Disk space check passed: ${available_gb}GB available"
  return 0
}

# Cleanup function with safety
safe_cleanup() {
  local description="$1"
  local cleanup_command="$2"
  
  log_info "Starting cleanup: $description"
  
  if [[ "$DRY_RUN" == "true" ]]; then
    log_info "DRY RUN: Would execute: $cleanup_command"
    return 0
  fi
  
  if eval "$cleanup_command"; then
    log_success "Cleanup completed: $description"
  else
    log_error "Cleanup failed: $description"
    return 1
  fi
}

# Cleanup Prometheus data
cleanup_prometheus() {
  log_info "Cleaning up Prometheus data older than ${PROMETHEUS_RETENTION_DAYS} days..."
  
  # Find and remove old Prometheus data files
  local prometheus_path=$(docker volume inspect prometheus_data --format '{{ .Mountpoint }}' 2>/dev/null || echo "")
  
  if [[ -n "$prometheus_path" && -d "$prometheus_path" ]]; then
    safe_cleanup "Prometheus old data" "find '$prometheus_path' -name '*.wal' -mtime +${PROMETHEUS_RETENTION_DAYS} -delete"
    safe_cleanup "Prometheus old chunks" "find '$prometheus_path' -path '*/chunks_head' -mtime +${PROMETHEUS_RETENTION_DAYS} -delete"
  fi
}

# Cleanup Loki data
cleanup_loki() {
  log_info "Cleaning up Loki data older than ${LOKI_RETENTION_DAYS} days..."
  
  local loki_path=$(docker volume inspect loki_data --format '{{ .Mountpoint }}' 2>/dev/null || echo "")
  
  if [[ -n "$loki_path" && -d "$loki_path" ]]; then
    safe_cleanup "Loki old chunks" "find '$loki_path' -name '*.gz' -mtime +${LOKI_RETENTION_DAYS} -delete"
    safe_cleanup "Loki old indexes" "find '$loki_path' -path '*/index' -mtime +${LOKI_RETENTION_DAYS} -delete"
  fi
}

# Cleanup Grafana data (sessions, temp files)
cleanup_grafana() {
  log_info "Cleaning up Grafana temporary data older than ${GRAFANA_RETENTION_DAYS} days..."
  
  local grafana_path=$(docker volume inspect grafana_data --format '{{ .Mountpoint }}' 2>/dev/null || echo "")
  
  if [[ -n "$grafana_path" && -d "$grafana_path" ]]; then
    safe_cleanup "Grafana sessions" "find '$grafana_path' -name 'session*' -mtime +${GRAFANA_RETENTION_DAYS} -delete"
    safe_cleanup "Grafana temp files" "find '$grafana_path' -name 'tmp*' -mtime +${GRAFANA_RETENTION_DAYS} -delete"
  fi
}

# Cleanup old backups (keep recent ones)
cleanup_backups() {
  log_info "Cleaning up backups older than ${BACKUP_RETENTION_DAYS} days..."
  
  local backup_dirs=(
    "/opt/workplace/backups/postgres"
    "/opt/workplace/backups/redis"
  )
  
  for backup_dir in "${backup_dirs[@]}"; do
    if [[ -d "$backup_dir" ]]; then
      local before_count=$(find "$backup_dir" -type f | wc -l)
      safe_cleanup "Old backups in $backup_dir" "find '$backup_dir' -type f -mtime +${BACKUP_RETENTION_DAYS} -delete"
      local after_count=$(find "$backup_dir" -type f | wc -l)
      local deleted_count=$((before_count - after_count))
      log_info "Deleted $deleted_count old backup files from $backup_dir"
    fi
  done
}

# Cleanup Docker images
cleanup_docker_images() {
  if [[ "$DOCKER_IMAGES_CLEANUP" == "true" ]]; then
    log_info "Cleaning up Docker images..."
    
    # Remove dangling images
    safe_cleanup "Docker dangling images" "docker image prune -f"
    
    # Remove unused images (older than 7 days)
    local unused_images=$(docker images --format "table {{.Repository}}:{{.Tag}}\t{{.CreatedAt}}" | grep -v "<none>" | tail -n +2 | while read line; do
      local image=$(echo "$line" | awk '{print $1}')
      local created=$(echo "$line" | awk '{print $2" "$3" "$4" "$5}')
      
      # Check if image is older than 7 days (simplified check)
      if [[ "$created" < "$(date -d '7 days ago' '+%Y-%m-%d')" ]]; then
        echo "$image"
      fi
    done)
    
    if [[ -n "$unused_images" ]]; then
      safe_cleanup "Old Docker images" "echo '$unused_images' | xargs -r docker rmi -f"
    fi
  fi
}

# Cleanup Docker volumes (unused)
cleanup_docker_volumes() {
  if [[ "$DOCKER_VOLUMES_CLEANUP" == "true" ]]; then
    log_info "Cleaning up unused Docker volumes..."
    
    # List unused volumes first for safety
    local unused_volumes=$(docker volume ls --filter dangling=true -q)
    
    if [[ -n "$unused_volumes" ]]; then
      log_warn "Found unused Docker volumes: $(echo "$unused_volumes" | wc -l) volumes"
      log_warn "Volume cleanup is disabled by default for safety. Enable manually if needed."
      
      if [[ "$DRY_RUN" == "true" ]]; then
        safe_cleanup "Unused Docker volumes" "echo '$unused_volumes' | xargs -r docker volume rm"
      fi
    fi
  fi
}

# Cleanup application logs
cleanup_application_logs() {
  log_info "Cleaning up application logs..."
  
  local log_dirs=(
    "/opt/workplace/logs"
    "/var/log/workplace"
  )
  
  for log_dir in "${log_dirs[@]}"; do
    if [[ -d "$log_dir" ]]; then
      # Compress logs older than 1 day
      safe_cleanup "Compress old logs in $log_dir" "find '$log_dir' -name '*.log' -mtime +1 -exec gzip {} \\;"
      
      # Remove compressed logs older than retention
      safe_cleanup "Remove old compressed logs in $log_dir" "find '$log_dir' -name '*.log.gz' -mtime +${POSTGRES_LOGS_RETENTION_DAYS} -delete"
    fi
  done
}

# Cleanup temporary files
cleanup_temp_files() {
  log_info "Cleaning up temporary files..."
  
  local temp_dirs=(
    "/tmp"
    "/var/tmp"
  )
  
  for temp_dir in "${temp_dirs[@]}"; do
    if [[ -d "$temp_dir" ]]; then
      # Remove files older than 1 day
      safe_cleanup "Temp files in $temp_dir" "find '$temp_dir' -type f -mtime +1 -delete"
    fi
  done
}

# Generate cleanup report
generate_report() {
  log_info "=== Cleanup Report ==="
  
  # Disk usage before and after
  local disk_usage=$(df / | awk 'NR==2 {print $5}')
  local available_gb=$(df / | awk 'NR==2 {print int($4/1024/1024)}')
  
  log_info "Current disk usage: ${disk_usage}"
  log_info "Available space: ${available_gb}GB"
  
  # Docker system usage
  if command -v docker &> /dev/null; then
    log_info "Docker system usage:"
    docker system df --format "table {{.Type}}\t{{.Size}}" | head -10
  fi
  
  # Volume sizes
  log_info "Docker volumes:"
  docker volume ls --format "table {{.Name}}\t{{.Driver}}" | head -10
  
  log_info "=== End Report ==="
}

# Main execution
main() {
  log_info "=== Volume Cleanup Started ==="
  log_info "Timestamp: $(date)"
  log_info "Hostname: $(hostname)"
  log_info "Dry Run: $DRY_RUN"
  
  # Safety checks
  if ! check_disk_space; then
    log_error "Skipping cleanup due to insufficient disk space"
    exit 1
  fi
  
  # Run cleanup operations
  cleanup_prometheus
  cleanup_loki
  cleanup_grafana
  cleanup_backups
  cleanup_docker_images
  cleanup_docker_volumes
  cleanup_application_logs
  cleanup_temp_files
  
  generate_report
  
  log_success "=== Volume Cleanup Completed Successfully ==="
}

# Error handling
trap 'log_error "Cleanup failed with exit code $?"' ERR

# Execute main function
main "$@"
