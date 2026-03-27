#!/bin/bash

# setup-google-drive.sh - Google Drive configuration for rclone
# This script sets up Google Drive integration for MinIO backups

set -euo pipefail

echo "🚀 Setting up Google Drive integration for rclone..."

# Check if rclone_sync container is running
if ! docker ps | grep -q rclone_sync; then
    echo "❌ rclone_sync container is not running"
    echo "Please start it first: docker-compose up -d rclone_sync"
    exit 1
fi

echo "⏳ Waiting for rclone installation to complete..."
sleep 15

# Check if rclone is installed
echo "🔍 Checking rclone installation..."
if docker exec rclone_sync which rclone >/dev/null 2>&1; then
    echo "✅ rclone is installed"
else
    echo "❌ rclone installation failed"
    exit 1
fi

# Check if Google Drive is already configured
echo "🔍 Checking existing Google Drive configuration..."
if docker exec rclone_sync rclone config show google-drive >/dev/null 2>&1; then
    echo "✅ Google Drive already configured"
    docker exec rclone_sync rclone config show google-drive
    echo ""
    echo "🎯 Configuration complete! The sync service will start automatically."
else
    echo "⚠️  Google Drive not configured yet"
    echo ""
    echo "📋 To configure Google Drive manually, run:"
    echo "   docker exec -it rclone_sync rclone config create google-drive drive"
    echo ""
    echo "📋 Or use the interactive setup:"
    echo "   docker exec -it rclone_sync sh"
    echo "   rclone config"
    echo ""
    echo "🔑 You will need:"
    echo "   - Google Cloud Project with Drive API enabled"
    echo "   - OAuth 2.0 Client ID credentials"
    echo "   - Authorization code from Google"
fi

echo ""
echo "📊 Current rclone status:"
docker exec rclone_sync rclone version 2>/dev/null || echo "rclone not available yet"

echo ""
echo "📝 Next steps:"
echo "1. Configure Google Drive (if not done)"
echo "2. Container will automatically start syncing every 6 hours"
echo "3. Check logs: docker logs rclone_sync"
echo "4. Check sync status: docker exec rclone_sync crontab -l"
