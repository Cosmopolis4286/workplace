#!/bin/bash

# 💾 SSL Certificate Backup Script
# Automated backup and restoration of SSL certificates

set -euo pipefail

# Configuration
DOMAIN="${DOMAIN:-$(grep DOMAIN .env | cut -d= -f2)}"
SSL_DIR="./ssl/certificates"
BACKUP_DIR="./ssl/backups"
REMOTE_BACKUP="${REMOTE_BACKUP:-false}"
MINIO_ENDPOINT="${MINIO_ENDPOINT:-localhost:9000}"
MINIO_ACCESS_KEY="${MINIO_ACCESS_KEY:-minioadmin}"
MINIO_SECRET_KEY="${MINIO_SECRET_KEY:-minioadmin123}"
MINIO_BUCKET="ssl-backups"
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-30}"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Logging
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')] BACKUP:${NC} $1" | tee -a "${BACKUP_DIR}/backup.log"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR:${NC} $1" | tee -a "${BACKUP_DIR}/backup.log"
}

warn() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING:${NC} $1" | tee -a "${BACKUP_DIR}/backup.log"
}

success() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] SUCCESS:${NC} $1" | tee -a "${BACKUP_DIR}/backup.log"
}

# Create directories
setup_directories() {
    mkdir -p "$BACKUP_DIR"
    mkdir -p "${SSL_DIR}/live"
    mkdir -p "${SSL_DIR}/archive"
    mkdir -p "${SSL_DIR}/renewal"
}

# Backup SSL certificates
backup_certificates() {
    log "Starting SSL certificate backup for ${DOMAIN}..."
    
    local timestamp=$(date +%Y%m%d_%H%M%S)
    local backup_file="${BACKUP_DIR}/${DOMAIN}_${timestamp}.tar.gz"
    local temp_dir="/tmp/ssl_backup_${timestamp}"
    
    # Check if certificates exist
    if [[ ! -d "${SSL_DIR}/live/${DOMAIN}" ]]; then
        error "No certificates found for domain ${DOMAIN}"
        return 1
    fi
    
    # Create temporary directory for backup
    mkdir -p "$temp_dir"
    
    # Copy certificate files
    cp -r "${SSL_DIR}/live/${DOMAIN}" "$temp_dir/"
    cp -r "${SSL_DIR}/archive/${DOMAIN}" "$temp_dir/" 2>/dev/null || true
    cp "${SSL_DIR}/renewal/${DOMAIN}.conf" "$temp_dir/" 2>/dev/null || true
    
    # Create backup metadata
    cat > "$temp_dir/backup_info.json" << EOF
{
  "timestamp": "$(date -Iseconds)",
  "domain": "${DOMAIN}",
  "backup_version": "1.0",
  "certificate_files": {
    "live": "$(ls -la "${SSL_DIR}/live/${DOMAIN}" 2>/dev/null || echo 'N/A')",
    "archive": "$(ls -la "${SSL_DIR}/archive/${DOMAIN}" 2>/dev/null || echo 'N/A')",
    "renewal": "$(ls -la "${SSL_DIR}/renewal/${DOMAIN}.conf" 2>/dev/null || echo 'N/A')"
  },
  "certificate_info": {
    "expiry_date": "$(openssl x509 -enddate -noout -in "${SSL_DIR}/live/${DOMAIN}/fullchain.pem" 2>/dev/null | cut -d= -f2 || echo 'Unknown')",
    "issuer": "$(openssl x509 -issuer -noout -in "${SSL_DIR}/live/${DOMAIN}/fullchain.pem" 2>/dev/null | cut -d= -f2- || echo 'Unknown')",
    "subject": "$(openssl x509 -subject -noout -in "${SSL_DIR}/live/${DOMAIN}/fullchain.pem" 2>/dev/null | cut -d= -f2- || echo 'Unknown')"
  }
}
EOF
    
    # Create backup archive
    tar -czf "$backup_file" -C "$temp_dir" .
    
    # Cleanup temporary directory
    rm -rf "$temp_dir"
    
    # Verify backup
    if [[ -f "$backup_file" ]] && [[ -s "$backup_file" ]]; then
        local backup_size=$(du -h "$backup_file" | cut -f1)
        success "Local backup created: ${backup_file} (${backup_size})"
        
        # Upload to remote storage if enabled
        if [[ "$REMOTE_BACKUP" == "true" ]]; then
            upload_to_remote "$backup_file" "$timestamp"
        fi
        
        # Cleanup old backups
        cleanup_old_backups
        
        return 0
    else
        error "Failed to create backup file"
        return 1
    fi
}

# Upload backup to remote storage (MinIO/S3)
upload_to_remote() {
    local backup_file="$1"
    local timestamp="$2"
    local remote_file="${DOMAIN}_${timestamp}.tar.gz"
    
    log "Uploading backup to remote storage..."
    
    # Check if mc (MinIO client) is available
    if ! command -v mc &> /dev/null; then
        warn "MinIO client (mc) not found, skipping remote upload"
        return 1
    fi
    
    # Configure MinIO client
    mc alias set minio "http://${MINIO_ENDPOINT}" "$MINIO_ACCESS_KEY" "$MINIO_SECRET_KEY" >/dev/null 2>&1 || {
        error "Failed to configure MinIO client"
        return 1
    }
    
    # Create bucket if it doesn't exist
    mc mb "minio/${MINIO_BUCKET}" >/dev/null 2>&1 || true
    
    # Upload backup
    if mc cp "$backup_file" "minio/${MINIO_BUCKET}/${remote_file}"; then
        success "Backup uploaded to remote storage: ${remote_file}"
        
        # Set retention policy
        mc policy set download "minio/${MINIO_BUCKET}" >/dev/null 2>&1 || true
        
        return 0
    else
        error "Failed to upload backup to remote storage"
        return 1
    fi
}

# List available backups
list_backups() {
    log "Listing available backups for ${DOMAIN}..."
    
    echo -e "\n${BLUE}=== Local Backups ===${NC}"
    if [[ -d "$BACKUP_DIR" ]]; then
        find "$BACKUP_DIR" -name "${DOMAIN}_*.tar.gz" -type f -exec ls -lh {} \; | sort -k9 -r
    else
        echo "No local backup directory found"
    fi
    
    if [[ "$REMOTE_BACKUP" == "true" ]] && command -v mc &> /dev/null; then
        echo -e "\n${BLUE}=== Remote Backups ===${NC}"
        mc alias set minio "http://${MINIO_ENDPOINT}" "$MINIO_ACCESS_KEY" "$MINIO_SECRET_KEY" >/dev/null 2>&1 || true
        mc ls "minio/${MINIO_BUCKET}" | grep "${DOMAIN}" || echo "No remote backups found"
    fi
}

# Restore SSL certificates from backup
restore_certificates() {
    local backup_file="$1"
    
    if [[ -z "$backup_file" ]]; then
        error "Backup file required for restore"
        return 1
    fi
    
    log "Restoring SSL certificates from ${backup_file}..."
    
    local temp_dir="/tmp/ssl_restore_$(date +%s)"
    
    # Create temporary directory
    mkdir -p "$temp_dir"
    
    # Extract backup
    if [[ "$backup_file" =~ ^minio:// ]]; then
        # Remote backup
        if ! command -v mc &> /dev/null; then
            error "MinIO client required for remote restore"
            return 1
        fi
        
        mc alias set minio "http://${MINIO_ENDPOINT}" "$MINIO_ACCESS_KEY" "$MINIO_SECRET_KEY" >/dev/null 2>&1 || {
            error "Failed to configure MinIO client"
            return 1
        }
        
        if ! mc cp "$backup_file" "$temp_dir/backup.tar.gz"; then
            error "Failed to download remote backup"
            return 1
        fi
        
        tar -xzf "$temp_dir/backup.tar.gz" -C "$temp_dir"
    else
        # Local backup
        if [[ ! -f "$backup_file" ]]; then
            error "Backup file not found: $backup_file"
            return 1
        fi
        
        tar -xzf "$backup_file" -C "$temp_dir"
    fi
    
    # Verify backup integrity
    if [[ ! -f "$temp_dir/backup_info.json" ]]; then
        error "Invalid backup file: missing metadata"
        rm -rf "$temp_dir"
        return 1
    fi
    
    # Backup current certificates before restore
    if [[ -d "${SSL_DIR}/live/${DOMAIN}" ]]; then
        backup_certificates
    fi
    
    # Restore certificates
    if [[ -d "$temp_dir/${DOMAIN}" ]]; then
        rm -rf "${SSL_DIR}/live/${DOMAIN}"
        cp -r "$temp_dir/${DOMAIN}" "${SSL_DIR}/live/"
    fi
    
    if [[ -d "$temp_dir/archive" ]]; then
        rm -rf "${SSL_DIR}/archive/${DOMAIN}"
        cp -r "$temp_dir/archive/${DOMAIN}" "${SSL_DIR}/archive/" 2>/dev/null || true
    fi
    
    if [[ -f "$temp_dir/${DOMAIN}.conf" ]]; then
        cp "$temp_dir/${DOMAIN}.conf" "${SSL_DIR}/renewal/"
    fi
    
    # Verify restored certificates
    if verify_restored_certificates; then
        success "SSL certificates restored successfully"
        
        # Show backup info
        if [[ -f "$temp_dir/backup_info.json" ]]; then
            log "Backup information:"
            cat "$temp_dir/backup_info.json" | jq . 2>/dev/null || cat "$temp_dir/backup_info.json"
        fi
        
        # Cleanup
        rm -rf "$temp_dir"
        return 0
    else
        error "Restored certificates verification failed"
        rm -rf "$temp_dir"
        return 1
    fi
}

# Verify restored certificates
verify_restored_certificates() {
    local cert_file="${SSL_DIR}/live/${DOMAIN}/fullchain.pem"
    local key_file="${SSL_DIR}/live/${DOMAIN}/privkey.pem"
    
    if [[ ! -f "$cert_file" ]] || [[ ! -f "$key_file" ]]; then
        error "Certificate files not found after restore"
        return 1
    fi
    
    # Check certificate validity
    if ! openssl x509 -in "$cert_file" -noout -checkend 86400 2>/dev/null; then
        error "Restored certificate is invalid or expired"
        return 1
    fi
    
    # Check certificate-key match
    local cert_modulus=$(openssl x509 -noout -modulus -in "$cert_file" | openssl md5)
    local key_modulus=$(openssl rsa -noout -modulus -in "$key_file" | openssl md5)
    
    if [[ "$cert_modulus" != "$key_modulus" ]]; then
        error "Certificate and private key do not match after restore"
        return 1
    fi
    
    success "Restored certificates verification passed"
    return 0
}

# Cleanup old backups
cleanup_old_backups() {
    log "Cleaning up old backups (retention: ${RETENTION_DAYS} days)..."
    
    # Cleanup local backups
    if [[ -d "$BACKUP_DIR" ]]; then
        find "$BACKUP_DIR" -name "${DOMAIN}_*.tar.gz" -type f -mtime +${RETENTION_DAYS} -delete
        local local_count=$(find "$BACKUP_DIR" -name "${DOMAIN}_*.tar.gz" -type f | wc -l)
        log "Local backups remaining: $local_count"
    fi
    
    # Cleanup remote backups
    if [[ "$REMOTE_BACKUP" == "true" ]] && command -v mc &> /dev/null; then
        mc alias set minio "http://${MINIO_ENDPOINT}" "$MINIO_ACCESS_KEY" "$MINIO_SECRET_KEY" >/dev/null 2>&1 || true
        
        # Delete files older than retention period
        local cutoff_date=$(date -d "${RETENTION_DAYS} days ago" +%Y%m%d)
        mc rm --recursive --force "minio/${MINIO_BUCKET}" --older-than "${RETENTION_DAYS}d" 2>/dev/null || true
        
        local remote_count=$(mc ls "minio/${MINIO_BUCKET}" | grep "${DOMAIN}" | wc -l)
        log "Remote backups remaining: $remote_count"
    fi
}

# Generate backup report
generate_backup_report() {
    local report_file="${BACKUP_DIR}/backup-report-$(date +%Y%m%d).json"
    
    mkdir -p "$BACKUP_DIR"
    
    local local_count=0
    local remote_count=0
    local latest_backup="none"
    local backup_size="0"
    
    # Local backup stats
    if [[ -d "$BACKUP_DIR" ]]; then
        local_count=$(find "$BACKUP_DIR" -name "${DOMAIN}_*.tar.gz" -type f | wc -l)
        local latest_backup_file=$(find "$BACKUP_DIR" -name "${DOMAIN}_*.tar.gz" -type f -exec ls -t {} + | head -1)
        if [[ -n "$latest_backup_file" ]]; then
            latest_backup=$(basename "$latest_backup_file")
            backup_size=$(du -h "$latest_backup_file" | cut -f1)
        fi
    fi
    
    # Remote backup stats
    if [[ "$REMOTE_BACKUP" == "true" ]] && command -v mc &> /dev/null; then
        mc alias set minio "http://${MINIO_ENDPOINT}" "$MINIO_ACCESS_KEY" "$MINIO_SECRET_KEY" >/dev/null 2>&1 || true
        remote_count=$(mc ls "minio/${MINIO_BUCKET}" | grep "${DOMAIN}" | wc -l)
    fi
    
    cat > "$report_file" << EOF
{
  "timestamp": "$(date -Iseconds)",
  "domain": "${DOMAIN}",
  "backup_statistics": {
    "local_backups": ${local_count},
    "remote_backups": ${remote_count},
    "latest_backup": "${latest_backup}",
    "latest_backup_size": "${backup_size}",
    "retention_days": ${RETENTION_DAYS}
  },
  "configuration": {
    "backup_directory": "${BACKUP_DIR}",
    "remote_backup_enabled": ${REMOTE_BACKUP},
    "remote_endpoint": "${MINIO_ENDPOINT}",
    "remote_bucket": "${MINIO_BUCKET}"
  }
}
EOF
    
    log "Backup report generated: $report_file"
}

# Main execution
main() {
    setup_directories
    
    case "${1:-backup}" in
        "backup")
            backup_certificates
            generate_backup_report
            ;;
        "restore")
            restore_certificates "${2:-}"
            ;;
        "list")
            list_backups
            ;;
        "cleanup")
            cleanup_old_backups
            ;;
        "report")
            generate_backup_report
            ;;
        *)
            error "Unknown command: ${1:-}"
            echo "Available commands: backup, restore <backup_file>, list, cleanup, report"
            exit 1
            ;;
    esac
}

# Show help
show_help() {
    cat << EOF
💾 SSL Certificate Backup Script

Usage: $0 <command> [options]

Commands:
    backup               Create backup of SSL certificates
    restore <backup>     Restore certificates from backup
    list                 List available backups
    cleanup              Remove old backups
    report               Generate backup report

Environment Variables:
    DOMAIN               Domain name (default: from .env)
    SSL_DIR              SSL certificates directory (default: ./ssl/certificates)
    BACKUP_DIR           Backup directory (default: ./ssl/backups)
    REMOTE_BACKUP        Enable remote backup (default: false)
    MINIO_ENDPOINT       MinIO endpoint (default: localhost:9000)
    MINIO_ACCESS_KEY     MinIO access key (default: minioadmin)
    MINIO_SECRET_KEY     MinIO secret key (default: minioadmin123)
    MINIO_BUCKET         MinIO bucket name (default: ssl-backups)
    BACKUP_RETENTION_DAYS Backup retention period (default: 30)

Examples:
    $0 backup                                    # Create backup
    $0 restore /path/to/backup.tar.gz           # Restore from local backup
    $0 restore minio://bucket/backup.tar.gz      # Restore from remote backup
    $0 list                                      # List all backups
    $0 cleanup                                   # Clean old backups

Cron Setup:
    # Daily backup at 2 AM
    0 2 * * * /path/to/scripts/ssl/backup-ssl.sh backup
    
    # Weekly backup on Sundays at 3 AM
    0 3 * * 0 /path/to/scripts/ssl/backup-ssl.sh backup

EOF
}

# Handle arguments
case "${1:-}" in
    "help"|"--help"|"-h")
        show_help
        exit 0
        ;;
    *)
        main "$@"
        ;;
esac
