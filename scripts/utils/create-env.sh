#!/bin/bash
set -euo pipefail

# Crear archivo .env para producción solo si no existe
if [ ! -f "/opt/workplace/.env" ]; then
  echo "📝 Creando archivo .env para producción..."
  cat > /opt/workplace/.env << 'EOL'
APP_NAME=WorkPlace
ENVIRONMENT=production
NODE_PORT=3001
FRONTEND_PORT=3000
NITRO_HOST=0.0.0.0
NODE_OPTIONS=--max-old-space-size=512
POSTGRES_USER=workplace
POSTGRES_PASSWORD=REDACTED_ROTATED_SECRET
POSTGRES_DB=workplace_db
DATABASE_URL=postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@postgres:5432/${POSTGRES_DB}
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=REDACTED_ROTATED_SECRET
JWT_SECRET=REDACTED_ROTATED_SECRET
JWT_EXPIRES_IN=15m
JWT_REFRESH_SECRET=REDACTED_ROTATED_SECRET
JWT_REFRESH_EXPIRES_IN=7d
DOMAIN=playrke.com
FRONTEND_URL=http://frontend:3000
API_URL=http://backend:3001/api
DOCKER_USER=eiskerhc
GOOGLE_CLIENT_ID=YOUR_GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET=YOUR_GOOGLE_CLIENT_SECRET
EOL
  echo "✅ Archivo .env creado para producción"
else
  echo "ℹ️ Archivo .env ya existe, usando el existente"
fi
