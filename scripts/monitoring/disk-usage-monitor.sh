#!/bin/bash
# Disk Usage Monitoring and Alerting Script
# Configurar en cron: */15 * * * * /opt/workplace/scripts/monitoring/disk-usage-monitor.sh

set -euo pipefail

# Enhanced logging
LOG_FILE="/opt/workplace/logs/disk-usage-monitor.log"
exec > >(tee -a "$LOG_FILE")
exec 2>&1

# Configuration
DISK_WARNING_THRESHOLD=80
DISK_CRITICAL_THRESHOLD=90
DISK_FULL_THRESHOLD=95
VOLUME_WARNING_THRESHOLD=70
VOLUME_CRITICAL_THRESHOLD=85
ALERT_WEBHOOK_URL="${DISK_ALERT_WEBHOOK:-}"  # Optional webhook for alerts
SLACK_WEBHOOK_URL="${SLACK_WEBHOOK:-}"        # Optional Slack webhook

# Docker volumes to monitor
MONITOR_VOLUMES=(
    "postgres_data:/var/lib/postgresql/data"
    "redis_data:/data"
    "minio_data:/data"
    "prometheus_data:/prometheus"
    "loki_data:/loki"
    "grafana_data:/var/lib/grafana"
    "nginx_cache:/var/cache/nginx"
    "nginx_logs:/var/log/nginx"
)

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

log_critical() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] CRITICAL: $1"
}

# Alert functions
send_alert() {
  local level="$1"
  local message="$2"
  local disk_usage="$3"
  
  log_critical "ALERT [$level]: $message"
  
  # Send to webhook if configured
  if [[ -n "${ALERT_WEBHOOK_URL:-}" ]]; then
    curl -X POST "$ALERT_WEBHOOK_URL" \
      -H "Content-Type: application/json" \
      -d "{\"level\":\"$level\",\"message\":\"$message\",\"disk_usage\":$disk_usage,\"timestamp\":\"$(date -Iseconds)\"}" \
      2>/dev/null || log_warn "Failed to send webhook alert"
  fi
  
  # Send to Slack if configured
  if [[ -n "${SLACK_WEBHOOK_URL:-}" ]]; then
    local color="warning"
    if [[ "$level" == "CRITICAL" ]]; then
      color="danger"
    elif [[ "$level" == "WARNING" ]]; then
      color="warning"
    fi
    
    curl -X POST "$SLACK_WEBHOOK_URL" \
      -H "Content-Type: application/json" \
      -d "{\"attachments\":[{\"color\":\"$color\",\"title\":\"Disk Usage Alert\",\"text\":\"$message\",\"fields\":[{\"title\":\"Disk Usage\",\"value\":\"$disk_usage\",\"short\":true},{\"title\":\"Server\",\"value\":\"$(hostname)\",\"short\":true},{\"title\":\"Timestamp\",\"value\":\"$(date)\",\"short\":true}]}]}" \
      2>/dev/null || log_warn "Failed to send Slack alert"
  fi
}

# Check system disk usage
check_system_disk() {
  log_info "Checking system disk usage..."
  
  # Get root filesystem usage
  local disk_usage=$(df / | awk 'NR==2 {print $5}' | sed 's/%//')
  local disk_available=$(df -h / | awk 'NR==2 {print $4}')
  local disk_total=$(df -h / | awk 'NR==2 {print $2}')
  local disk_used=$(df -h / | awk 'NR==2 {print $3}')
  
  log_info "System disk usage: ${disk_usage}% (${disk_used} used, ${disk_available} available of ${disk_total})"
  
  # Check thresholds and send alerts
  if [[ $disk_usage -ge $DISK_FULL_THRESHOLD ]]; then
    send_alert "CRITICAL" "System disk is almost full! Immediate action required to prevent system failure." "${disk_usage}%"
  elif [[ $disk_usage -ge $DISK_CRITICAL_THRESHOLD ]]; then
    send_alert "CRITICAL" "System disk usage is critically high. System may become unstable soon." "${disk_usage}%"
  elif [[ $disk_usage -ge $DISK_WARNING_THRESHOLD ]]; then
    send_alert "WARNING" "System disk usage is high. Consider cleanup or expansion." "${disk_usage}%"
  fi
  
  # Log to Grafana/Loki format
  echo "{\"level\":\"info\",\"service\":\"disk-monitor\",\"type\":\"system\",\"usage_percent\":${disk_usage},\"available_gb\":\"${disk_available}\",\"timestamp\":\"$(date -Iseconds)\"}"
  
  return $disk_usage
}

# Check Docker volume sizes
check_docker_volumes() {
  log_info "Checking Docker volume usage..."
  
  for volume_info in "${MONITOR_VOLUMES[@]}"; do
    local volume_name=$(echo "$volume_info" | cut -d: -f1)
    local mount_path=$(echo "$volume_info" | cut -d: -f2)
    
    # Get volume size (approximate)
    local volume_size=$(docker volume inspect "$volume_name" --format '{{ .Mountpoint }}' 2>/dev/null | xargs du -sb 2>/dev/null | cut -f1 || echo "0")
    local volume_size_mb=$((volume_size / 1024 / 1024))
    
    if [[ $volume_size_mb -gt 0 ]]; then
      log_info "Volume $volume_name: ${volume_size_mb} MB"
      
      # Check if volume is getting large (warning at 1GB, critical at 5GB)
      if [[ $volume_size_mb -gt 5120 ]]; then  # 5GB
        send_alert "CRITICAL" "Docker volume $volume_name is very large (${volume_size_mb} MB). Consider cleanup or data archiving." "${volume_size_mb} MB"
      elif [[ $volume_size_mb -gt 1024 ]]; then  # 1GB
        send_alert "WARNING" "Docker volume $volume_name is large (${volume_size_mb} MB). Monitor growth." "${volume_size_mb} MB"
      fi
      
      # Log to Grafana/Loki format
      echo "{\"level\":\"info\",\"service\":\"disk-monitor\",\"type\":\"volume\",\"volume_name\":\"$volume_name\",\"size_mb\":${volume_size_mb},\"timestamp\":\"$(date -Iseconds)\"}"
    fi
  done
}

# Check Docker image cache
check_docker_cache() {
  log_info "Checking Docker image cache..."
  
  # Get Docker system usage
  local docker_output=$(docker system df --format "table {{.Type}}\t{{.TotalCount}}\t{{.Size}}" 2>/dev/null || echo "")
  
  if [[ -n "$docker_output" ]]; then
    log_info "Docker system usage:"
    echo "$docker_output" | while IFS= read -r line; do
      log_info "  $line"
    done
    
    # Extract images size
    local images_size=$(echo "$docker_output" | grep "Images" | awk '{print $3}' | sed 's/[^0-9.]//g' || echo "0")
    
    # Alert if images cache is large (>5GB)
    if [[ ${images_size%.*} -gt 5 ]]; then
      send_alert "WARNING" "Docker image cache is large (${images_size}). Consider running 'docker system prune'." "${images_size}"
    fi
  fi
}

# Check log files
check_log_files() {
  log_info "Checking log file sizes..."
  
  # Check application logs
  local log_dirs=(
    "/opt/workplace/logs"
    "/var/log"
  )
  
  for log_dir in "${log_dirs[@]}"; do
    if [[ -d "$log_dir" ]]; then
      local log_size=$(du -sb "$log_dir" 2>/dev/null | cut -f1 || echo "0")
      local log_size_mb=$((log_size / 1024 / 1024))
      
      if [[ $log_size_mb -gt 0 ]]; then
        log_info "Log directory $log_dir: ${log_size_mb} MB"
        
        # Alert if logs are large (>1GB)
        if [[ $log_size_mb -gt 1024 ]]; then
          send_alert "WARNING" "Log directory $log_dir is large (${log_size_mb} MB). Consider log rotation." "${log_size_mb} MB"
        fi
      fi
    fi
  done
}

# Check backup directories
check_backup_directories() {
  log_info "Checking backup directory sizes..."
  
  local backup_dirs=(
    "/opt/workplace/backups"
  )
  
  for backup_dir in "${backup_dirs[@]}"; do
    if [[ -d "$backup_dir" ]]; then
      local backup_size=$(du -sb "$backup_dir" 2>/dev/null | cut -f1 || echo "0")
      local backup_size_mb=$((backup_size / 1024 / 1024))
      
      if [[ $backup_size_mb -gt 0 ]]; then
        log_info "Backup directory $backup_dir: ${backup_size_mb} MB"
        
        # Alert if backups are very large (>10GB)
        if [[ $backup_size_mb -gt 10240 ]]; then
          send_alert "WARNING" "Backup directory $backup_dir is very large (${backup_size_mb} MB). Review retention policy." "${backup_size_mb} MB"
        fi
      fi
    fi
  done
}

# Generate summary report
generate_summary() {
  local system_usage=$1
  
  log_info "=== Disk Usage Summary ==="
  log_info "System Usage: ${system_usage}%"
  log_info "Warning Threshold: ${DISK_WARNING_THRESHOLD}%"
  log_info "Critical Threshold: ${DISK_CRITICAL_THRESHOLD}%"
  log_info "Full Threshold: ${DISK_FULL_THRESHOLD}%"
  log_info "Timestamp: $(date)"
  log_info "Hostname: $(hostname)"
  
  # Overall status
  if [[ $system_usage -lt $DISK_WARNING_THRESHOLD ]]; then
    log_info "Overall Status: HEALTHY"
  elif [[ $system_usage -lt $DISK_CRITICAL_THRESHOLD ]]; then
    log_warn "Overall Status: WARNING"
  else
    log_critical "Overall Status: CRITICAL"
  fi
  
  log_info "=== End Summary ==="
}

# Main execution
main() {
  log_info "=== Disk Usage Monitor Started ==="
  log_info "Timestamp: $(date)"
  log_info "Hostname: $(hostname)"
  
  # Run all checks
  local system_usage
  system_usage=$(check_system_disk)
  
  check_docker_volumes
  check_docker_cache
  check_log_files
  check_backup_directories
  
  generate_summary $system_usage
  
  log_info "=== Disk Usage Monitor Completed ==="
}

# Error handling
trap 'log_error "Disk monitor failed with exit code $?"' ERR

# Execute main function
main "$@"
