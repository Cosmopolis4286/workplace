#!/bin/bash

# test-google-drive.sh - Test Google Drive connection and sync
# This script tests the Google Drive integration

set -euo pipefail

echo "🧪 Testing Google Drive integration..."

# Check if container is running
if ! docker ps | grep -q rclone_sync; then
    echo "❌ rclone_sync container is not running"
    exit 1
fi

# Check if rclone is configured
echo "🔍 Checking rclone configuration..."
if docker exec rclone_sync rclone config show google-drive >/dev/null 2>&1; then
    echo "✅ Google Drive configured"
else
    echo "❌ Google Drive not configured"
    echo "Run: ./scripts/setup/setup-google-drive.sh"
    exit 1
fi

# Test Google Drive connection
echo "🌐 Testing Google Drive connection..."
if docker exec rclone_sync rclone lsd "google-drive:" >/dev/null 2>&1; then
    echo "✅ Google Drive connection successful"
else
    echo "❌ Google Drive connection failed"
    exit 1
fi

# Test MinIO connection
echo "🗄️  Testing MinIO connection..."
if docker exec rclone_sync nc -z minio 9000; then
    echo "✅ MinIO connection successful"
else
    echo "❌ MinIO connection failed"
    exit 1
fi

# List files in both locations
echo ""
echo "📊 Current file counts:"
MINIO_FILES=$(docker exec rclone_sync rclone lsf \
    --s3-provider=MinIO \
    --s3-env-auth=false \
    --s3-access-key-id="$MINIO_ACCESS_KEY:-minioadmin" \
    --s3-secret-access-key="$MINIO_SECRET_KEY:-minioadmin123" \
    --s3-region=us-east-1 \
    --s3-endpoint="minio:9000" \
    --s3-force-path-style=true \
    "s3:workplace-backups" 2>/dev/null | wc -l || echo "0")

GD_FILES=$(docker exec rclone_sync rclone lsf "google-drive:workplace-backups" 2>/dev/null | wc -l || echo "0")

echo "   MinIO files: $MINIO_FILES"
echo "   Google Drive files: $GD_FILES"

# Test manual sync
echo ""
echo "🔄 Testing manual sync (dry run)..."
docker exec rclone_sync rclone sync \
    --s3-provider=MinIO \
    --s3-env-auth=false \
    --s3-access-key-id="$MINIO_ACCESS_KEY:-minioadmin" \
    --s3-secret-access-key="$MINIO_SECRET_KEY:-minioadmin123" \
    --s3-region=us-east-1 \
    --s3-endpoint="minio:9000" \
    --s3-force-path-style=true \
    "s3:workplace-backups" \
    "google-drive:workplace-backups" \
    --dry-run \
    --verbose

echo ""
echo "✅ All tests completed successfully!"
