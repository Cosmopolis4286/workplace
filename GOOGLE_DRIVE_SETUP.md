# Google Drive Setup for rclone

## Overview
This guide explains how to configure Google Drive integration for MinIO backup synchronization, eliminating the single point of failure (SPOF).

## Prerequisites
1. Google Cloud Project with Drive API enabled
2. OAuth 2.0 Client ID credentials
3. `rclone_sync` container running

## Quick Setup

### 1. Run Setup Script
```bash
chmod +x scripts/setup/setup-google-drive.sh
./scripts/setup/setup-google-drive.sh
```

### 2. Configure Google Drive
Choose one method:

#### Method A: Interactive Setup (Recommended)
```bash
docker exec -it rclone_sync rclone config create google-drive drive
```

#### Method B: Manual Configuration
```bash
docker exec -it rclone_sync sh
rclone config
```

### 3. Test Configuration
```bash
chmod +x scripts/setup/test-google-drive.sh
./scripts/setup/test-google-drive.sh
```

## Google Cloud Setup

### 1. Create Google Cloud Project
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create new project or select existing one
3. Enable Google Drive API

### 2. Create OAuth 2.0 Credentials
1. Go to APIs & Services → Credentials
2. Create Credentials → OAuth client ID
3. Application type: Desktop app
4. Name: rclone-backup
5. Download JSON file

### 3. Get Authorization Code
During rclone setup, you'll need to:
1. Visit the provided URL
2. Sign in with Google account
3. Grant permissions
4. Copy authorization code back to rclone

## Configuration Details

### rclone Remote Configuration
```
Name: google-drive
Type: drive
Scope: drive
Client ID: [your-client-id]
Client Secret: [your-client-secret]
```

### Sync Schedule
- **Frequency**: Every 6 hours
- **Source**: MinIO bucket `workplace-backups`
- **Destination**: Google Drive folder `workplace-backups`
- **Backup**: Deleted files moved to `.deleted` folder

## Verification Commands

### Check rclone status
```bash
docker logs rclone_sync
docker exec rclone_sync rclone config show google-drive
```

### Check sync schedule
```bash
docker exec rclone_sync crontab -l
```

### Test manual sync
```bash
docker exec rclone_sync /scripts/backup/rclone-sync.sh
```

### Monitor logs
```bash
docker logs -f rclone_sync
tail -f logs/rclone-sync.log
```

## Troubleshooting

### Common Issues

1. **Container keeps restarting**
   - Wait for rclone installation to complete
   - Check logs: `docker logs rclone_sync`

2. **Google Drive connection failed**
   - Verify OAuth credentials
   - Check Drive API is enabled
   - Ensure proper authorization

3. **MinIO connection failed**
   - Verify MinIO is healthy: `docker ps | grep minio`
   - Check network connectivity

4. **Sync not working**
   - Verify rclone config: `docker exec rclone_sync rclone config show`
   - Test manual sync
   - Check cron job: `docker exec rclone_sync crontab -l`

### Reset Configuration
```bash
# Remove existing config
docker exec rclone_sync rm -f /config/rclone/rclone.conf

# Restart container
docker-compose restart rclone_sync

# Reconfigure
docker exec -it rclone_sync rclone config create google-drive drive
```

## Security Notes

- OAuth credentials stored in `/config/rclone/rclone.conf`
- Volume `rclone_config` persists configuration
- Use service account for production if possible
- Regularly rotate OAuth credentials

## Monitoring

### Health Check Script
```bash
#!/bin/bash
# Check if sync is working
if docker exec rclone_sync rclone lsf "google-drive:workplace-backups" >/dev/null 2>&1; then
    echo "✅ Google Drive sync healthy"
else
    echo "❌ Google Drive sync failed"
    exit 1
fi
```

### Log Monitoring
- Sync logs: `logs/rclone-sync.log`
- Container logs: `docker logs rclone_sync`
- Cron logs: `logs/rclone-cron.log`

## Production Considerations

1. **Service Account**: Use Google Service Account instead of OAuth
2. **Encryption**: Enable server-side encryption
3. **Retention**: Configure Google Drive retention policies
4. **Monitoring**: Set up alerts for sync failures
5. **Backup**: Keep local MinIO backups as secondary backup
