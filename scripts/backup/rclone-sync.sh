#!/bin/bash

# rclone-sync.sh - MinIO to Google Drive synchronization script
# This script eliminates the SPOF by syncing MinIO backups to Google Drive

set -euo pipefail

# Configuration
MINIO_ENDPOINT="${MINIO_ENDPOINT:-minio:9000}"
MINIO_ACCESS_KEY="${MINIO_ACCESS_KEY:-minioadmin}"
MINIO_SECRET_KEY="${MINIO_SECRET_KEY:-minioadmin123}"
MINIO_BUCKET="${MINIO_BUCKET:-workplace-backups}"
GOOGLE_DRIVE_FOLDER="${GOOGLE_DRIVE_FOLDER:-workplace-backups}"
LOG_FILE="${LOG_FILE:-/var/log/rclone-sync.log}"

# Ensure log directory exists
mkdir -p "$(dirname "$LOG_FILE")"

# Function to log with timestamp
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

# Function to check if rclone is configured
check_rclone_config() {
    if ! rclone config show google-drive >/dev/null 2>&1; then
        log "ERROR: rclone Google Drive remote 'google-drive' not configured"
        log "Please run: rclone config create google-drive drive"
        exit 1
    fi
}

# Function to sync MinIO to Google Drive
sync_to_google_drive() {
    log "Starting MinIO to Google Drive sync..."
    
    # Use rclone to sync MinIO bucket to Google Drive
    rclone sync \
        --s3-provider=MinIO \
        --s3-env-auth=false \
        --s3-access-key-id="$MINIO_ACCESS_KEY" \
        --s3-secret-access-key="$MINIO_SECRET_KEY" \
        --s3-region=us-east-1 \
        --s3-endpoint="$MINIO_ENDPOINT" \
        --s3-force-path-style=true \
        "s3:$MINIO_BUCKET" \
        "google-drive:$GOOGLE_DRIVE_FOLDER" \
        --progress \
        --log-file="$LOG_FILE" \
        --log-level=INFO \
        --backup-dir="google-drive:$GOOGLE_DRIVE_FOLDER/.deleted" \
        --create-empty-src-dirs
    
    if [ $? -eq 0 ]; then
        log "✅ Sync completed successfully"
    else
        log "❌ Sync failed with exit code $?"
        exit 1
    fi
}

# Function to verify Google Drive sync
verify_sync() {
    log "Verifying Google Drive sync..."
    
    # Count files in MinIO
    MINIO_FILES=$(rclone lsf \
        --s3-provider=MinIO \
        --s3-env-auth=false \
        --s3-access-key-id="$MINIO_ACCESS_KEY" \
        --s3-secret-access-key="$MINIO_SECRET_KEY" \
        --s3-region=us-east-1 \
        --s3-endpoint="$MINIO_ENDPOINT" \
        --s3-force-path-style=true \
        "s3:$MINIO_BUCKET" | wc -l)
    
    # Count files in Google Drive
    GD_FILES=$(rclone lsf "google-drive:$GOOGLE_DRIVE_FOLDER" | wc -l)
    
    log "MinIO files: $MINIO_FILES"
    log "Google Drive files: $GD_FILES"
    
    if [ "$MINIO_FILES" -eq "$GD_FILES" ]; then
        log "✅ Verification successful: File counts match"
    else
        log "⚠️  Verification warning: File count mismatch"
    fi
}

# Function to test Google Drive connection
test_google_drive_connection() {
    log "Testing Google Drive connection..."
    
    if rclone lsd "google-drive:" >/dev/null 2>&1; then
        log "✅ Google Drive connection successful"
        return 0
    else
        log "❌ Google Drive connection failed"
        return 1
    fi
}

# Main execution
main() {
    log "=== MinIO to Google Drive Sync Started ==="
    
    # Check prerequisites
    check_rclone_config
    
    # Test Google Drive connection
    if ! test_google_drive_connection; then
        log "ERROR: Cannot connect to Google Drive. Check configuration."
        exit 1
    fi
    
    # Perform sync
    sync_to_google_drive
    
    # Verify sync
    verify_sync
    
    log "=== Sync completed successfully ==="
}

# Run main function
main "$@"
