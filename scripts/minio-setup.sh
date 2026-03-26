#!/bin/bash
# MinIO Setup Script - Enterprise Features
# Configures versioning, retention, and security

set -euo pipefail

LOG_FILE="/var/log/minio-setup.log"

log_info() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] INFO: $1" | tee -a "$LOG_FILE"
}

log_error() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] ERROR: $1" | tee -a "$LOG_FILE"
}

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

# Configure MinIO client and setup
setup_minio() {
  log_info "=== MinIO Enterprise Setup Started ==="
  
  # Install MinIO client if not present
  if ! command -v mc &> /dev/null; then
    log_info "Installing MinIO client..."
    wget -q https://dl.min.io/client/mc/release/linux-amd64/mc -O /usr/local/bin/mc
    chmod +x /usr/local/bin/mc
  fi
  
  # Wait for MinIO service
  wait_for_minio
  
  # Configure MinIO client alias
  log_info "Configuring MinIO client..."
  mc alias set local http://localhost:9000 "${MINIO_ROOT_USER:-minioadmin}" "${MINIO_ROOT_PASSWORD:-minioadmin123}" || {
    log_error "Failed to configure MinIO client"
    return 1
  }
  
  # Create backup bucket if not exists
  log_info "Creating backup bucket..."
  mc mb local/workplace-backups --ignore-existing || {
    log_error "Failed to create bucket"
    return 1
  }
  
  # Enable versioning (CRITICAL for backup safety)
  log_info "Enabling bucket versioning..."
  mc version enable local/workplace-backups || {
    log_error "Failed to enable versioning"
    return 1
  }
  
  # Set retention policy (7 days governance)
  log_info "Setting retention policy (7 days)..."
  mc retention set governance 7d local/workplace-backups || {
    log_error "Failed to set retention policy"
    return 1
  }
  
  # Set bucket policy for read/write access
  log_info "Setting bucket policy..."
  cat > /tmp/policy.json << 'EOF'
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "AWS": [
          "*"
        ]
      },
      "Action": [
        "s3:GetObject",
        "s3:PutObject",
        "s3:DeleteObject",
        "s3:ListBucket"
      ],
      "Resource": [
        "arn:aws:s3:::workplace-backups",
        "arn:aws:s3:::workplace-backups/*"
      ]
    }
  ]
}
EOF
  
  mc policy set local/workplace-backups /tmp/policy.json || {
    log_error "Failed to set bucket policy"
    return 1
  }
  
  # Verify setup
  log_info "Verifying MinIO setup..."
  mc version info local/workplace-backups
  mc retention info local/workplace-backups
  
  log_info "=== MinIO Enterprise Setup Completed Successfully ==="
  log_info "Bucket: workplace-backups"
  log_info "Versioning: ENABLED"
  log_info "Retention: 7 days governance"
  log_info "Policy: Read/Write access configured"
}

# Test backup and restore
test_backup_restore() {
  log_info "=== Testing Backup/Restore ==="
  
  # Create test file
  echo "Test backup $(date)" > /tmp/test-backup.txt
  
  # Upload to MinIO
  mc cp /tmp/test-backup.txt local/workplace-backups/test/ || {
    log_error "Failed to upload test file"
    return 1
  }
  
  # List versions
  log_info "Listing file versions..."
  mc ls --versions local/workplace-backups/test/
  
  # Download and verify
  mc cp local/workplace-backups/test/test-backup.txt /tmp/test-restore.txt || {
    log_error "Failed to download test file"
    return 1
  }
  
  if cmp -s /tmp/test-backup.txt /tmp/test-restore.txt; then
    log_info "Backup/Restore test PASSED"
  else
    log_error "Backup/Restore test FAILED"
    return 1
  fi
  
  # Cleanup test files
  rm -f /tmp/test-backup.txt /tmp/test-restore.txt
  mc rm local/workplace-backups/test/test-backup.txt
  
  log_info "=== Backup/Restore Test Completed ==="
}

# Main execution
main() {
  log_info "MinIO Enterprise Setup Started"
  
  setup_minio
  test_backup_restore
  
  log_info "MinIO is now ENTERPRISE READY with versioning and retention"
}

# Execute main function
main "$@"
