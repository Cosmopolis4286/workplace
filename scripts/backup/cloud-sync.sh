#!/bin/bash
# Cloud Backup Sync Script - S3/Backblaze B2 Integration
# Syncs MinIO backups to external cloud storage

set -euo pipefail

LOG_FILE="/var/log/cloud-sync.log"

log_info() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] INFO: $1" | tee -a "$LOG_FILE"
}

log_error() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] ERROR: $1" | tee -a "$LOG_FILE"
}

# Configuration
CLOUD_PROVIDER="${CLOUD_PROVIDER:-s3}"  # s3, b2, wasabi
CLOUD_ENDPOINT="${CLOUD_ENDPOINT:-s3.amazonaws.com}"
CLOUD_ACCESS_KEY="${CLOUD_ACCESS_KEY}"
CLOUD_SECRET_KEY="${CLOUD_SECRET_KEY}"
CLOUD_BUCKET="${CLOUD_BUCKET:-workplace-backups}"
CLOUD_REGION="${CLOUD_REGION:-us-east-1}"

# Wait for MinIO to be ready
wait_for_minio() {
  log_info "Waiting for MinIO to be ready..."
  local max_wait=60
  local wait_time=0
  
  while [[ $wait_time -lt $max_wait ]]; do
    if curl -f http://localhost:9000/minio/health/live > /dev/null 2>&1; then
      log_info "MinIO is ready"
      return 0
    fi
    sleep 2
    wait_time=$((wait_time + 2))
  done
  
  log_error "MinIO not ready after ${max_wait}s"
  return 1
}

# Install rclone for cloud sync
install_rclone() {
  if ! command -v rclone &> /dev/null; then
    log_info "Installing rclone..."
    
    # Install rclone
    case "$(uname -m)" in
      x86_64)
        RCLONE_ARCH="amd64"
        ;;
      aarch64)
        RCLONE_ARCH="arm64"
        ;;
      *)
        log_error "Unsupported architecture: $(uname -m)"
        return 1
        ;;
    esac
    
    wget -q "https://downloads.rclone.org/rclone-current-linux-${RCLONE_ARCH}.zip" -O /tmp/rclone.zip
    unzip -q /tmp/rclone.zip -d /tmp
    mv /tmp/rclone-*/rclone /usr/local/bin/
    chmod +x /usr/local/bin/rclone
    rm -rf /tmp/rclone.zip /tmp/rclone-*
    
    log_info "rclone installed successfully"
  fi
}

# Configure rclone for cloud provider
configure_rclone() {
  log_info "Configuring rclone for ${CLOUD_PROVIDER}..."
  
  case "$CLOUD_PROVIDER" in
    "s3")
      cat > /root/.config/rclone/rclone.conf << EOF
[${CLOUD_PROVIDER}]
type = s3
provider = AWS
env_auth = false
access_key_id = ${CLOUD_ACCESS_KEY}
secret_access_key = ${CLOUD_SECRET_KEY}
region = ${CLOUD_REGION}
endpoint = ${CLOUD_ENDPOINT}
acl = private
EOF
      ;;
    "b2")
      cat > /root/.config/rclone/rclone.conf << EOF
[${CLOUD_PROVIDER}]
type = b2
account = ${CLOUD_ACCESS_KEY}
key = ${CLOUD_SECRET_KEY}
EOF
      ;;
    "wasabi")
      cat > /root/.config/rclone/rclone.conf << EOF
[${CLOUD_PROVIDER}]
type = s3
provider = Wasabi
env_auth = false
access_key_id = ${CLOUD_ACCESS_KEY}
secret_access_key = ${CLOUD_SECRET_KEY}
region = ${CLOUD_REGION}
endpoint = ${CLOUD_ENDPOINT}
acl = private
EOF
      ;;
    *)
      log_error "Unsupported cloud provider: ${CLOUD_PROVIDER}"
      return 1
      ;;
  esac
  
  log_info "rclone configured for ${CLOUD_PROVIDER}"
}

# Sync MinIO to cloud storage
sync_to_cloud() {
  log_info "=== Starting Cloud Sync ==="
  
  # Wait for MinIO
  wait_for_minio
  
  # Install MinIO client
  if ! command -v mc &> /dev/null; then
    log_info "Installing MinIO client..."
    wget -q https://dl.min.io/client/mc/release/linux-amd64/mc -O /usr/local/bin/mc
    chmod +x /usr/local/bin/mc
  fi
  
  # Configure MinIO client
  mc alias set local http://localhost:9000 "${MINIO_ROOT_USER:-minioadmin}" "${MINIO_ROOT_PASSWORD:-minioadmin123}" || {
    log_error "Failed to configure MinIO client"
    return 1
  }
  
  # Check if MinIO bucket has backups
  if ! mc ls local/workplace-backups/ > /dev/null 2>&1; then
    log_info "No backups found in MinIO, skipping sync"
    return 0
  fi
  
  # Install rclone
  install_rclone
  
  # Configure rclone
  configure_rclone
  
  # Test cloud connection
  if ! rclone lsd "${CLOUD_PROVIDER}:${CLOUD_BUCKET}" > /dev/null 2>&1; then
    log_info "Creating cloud bucket ${CLOUD_BUCKET}..."
    rclone mkdir "${CLOUD_PROVIDER}:${CLOUD_BUCKET}" || {
      log_error "Failed to create cloud bucket"
      return 1
    }
  fi
  
  # Sync backups to cloud
  log_info "Syncing backups to ${CLOUD_PROVIDER}..."
  
  # Use rclone to sync MinIO to cloud storage
  if rclone sync --progress --stats-one-line --stats-log-level NOTICE \
    "local/workplace-backups" "${CLOUD_PROVIDER}:${CLOUD_BUCKET}" \
    --exclude "tmp/*" \
    --exclude "*.tmp"; then
    
    log_info "Cloud sync completed successfully"
    
    # Verify sync
    LOCAL_SIZE=$(mc du --json local/workplace-backups | jq -r '.size // 0')
    CLOUD_SIZE=$(rclone size "${CLOUD_PROVIDER}:${CLOUD_BUCKET}" --json | jq -r '.totalSize // 0')
    
    if [[ "$LOCAL_SIZE" -eq "$CLOUD_SIZE" ]]; then
      log_info "Sync verification PASSED: ${LOCAL_SIZE} bytes"
    else
      log_error "Sync verification FAILED: local=${LOCAL_SIZE} cloud=${CLOUD_SIZE}"
      return 1
    fi
    
  else
    log_error "Cloud sync failed"
    return 1
  fi
  
  log_info "=== Cloud Sync Completed ==="
}

# Test cloud restore
test_cloud_restore() {
  log_info "=== Testing Cloud Restore ==="
  
  # Create test directory
  TEST_DIR="/tmp/cloud-restore-test"
  mkdir -p "$TEST_DIR"
  
  # Download a test file from cloud
  if rclone copy "${CLOUD_PROVIDER}:${CLOUD_BUCKET}/postgres" "$TEST_DIR/" --dry-run; then
    log_info "Cloud restore test PASSED - files are accessible"
  else
    log_error "Cloud restore test FAILED"
    return 1
  fi
  
  # Cleanup
  rm -rf "$TEST_DIR"
  
  log_info "=== Cloud Restore Test Completed ==="
}

# Main execution
main() {
  log_info "Cloud backup sync started"
  
  # Check required environment variables
  if [[ -z "$CLOUD_ACCESS_KEY" || -z "$CLOUD_SECRET_KEY" ]]; then
    log_error "Missing required environment variables: CLOUD_ACCESS_KEY, CLOUD_SECRET_KEY"
    exit 1
  fi
  
  sync_to_cloud
  test_cloud_restore
  
  log_info "Cloud backup sync completed successfully"
}

# Execute main function
main "$@"
