#!/bin/bash
# Auto-renewal script for Let's Encrypt certificates
# Place this in /etc/cron.daily/ or run via cron

set -euo pipefail

# Load environment variables
if [ -f "/opt/workplace/.env" ]; then
  source /opt/workplace/.env
fi

DOMAIN="${DOMAIN:-localhost}"

echo "🔄 Auto-renewal check for $DOMAIN at $(date)"

# Check if certificates exist and need renewal
if [ -f "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" ]; then
  # Check if certificate expires in less than 30 days
  if ! openssl x509 -checkend 2592000 -noout -in "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" 2>/dev/null; then
    echo "📅 Certificate expires within 30 days, attempting renewal..."
    
    # Ensure nginx is running for ACME challenges
    if ! docker compose -f /opt/workplace/docker-compose.yml ps nginx | grep -q "Up"; then
      echo "🚀 Starting nginx for renewal..."
      docker compose -f /opt/workplace/docker-compose.yml up -d nginx
    fi
    
    # Renew with webroot
    if sudo certbot renew --cert-name $DOMAIN --webroot -w /opt/workplace/certbot/www --non-interactive --quiet; then
      echo "✅ Certificate renewed successfully"
      
      # Restart nginx to apply new certificate
      docker compose -f /opt/workplace/docker-compose.yml restart nginx
      
      echo "🎉 Nginx restarted with renewed certificate"
    else
      echo "❌ Certificate renewal failed"
      exit 1
    fi
  else
    echo "✅ Certificate is still valid for more than 30 days"
  fi
else
  echo "❌ No certificate found for $DOMAIN"
  exit 1
fi

echo "✅ Auto-renewal check completed"
