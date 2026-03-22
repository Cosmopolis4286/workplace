#!/bin/bash
set -euo pipefail

# Crear archivo .env para producción solo si no existe
if [ ! -f "/opt/workplace/.env" ]; then
  echo "📝 Creando archivo .env para producción..."
  cat > /opt/workplace/.env << 'EOL'
APP_NAME=WorkPlace
NODE_ENV=production
NODE_PORT=3001
FRONTEND_PORT=3000
NITRO_HOST=0.0.0.0
NODE_OPTIONS=--max-old-space-size=512
POSTGRES_USER=workplace
POSTGRES_PASSWORD=9FmK2xN8pL4qR7vT3wS6zY1iG5jB8nE2cV5aI9d=
POSTGRES_DB=workplace_db
DATABASE_URL=postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@postgres:5432/${POSTGRES_DB}
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=7XpQ3rN6mK9sF2tZ5wV8yU1iO4lA7dG0jB3eH6f=
JWT_SECRET=B+4CUOj1VX6xsGFKzcpbGLqyDBtuZjWOffnNGvRp1H8=
JWT_EXPIRES_IN=15m
JWT_REFRESH_SECRET=TzbxqqNI7GALfT0hkRhLmoEAZ/DVpt2N+REI33TJFqI=
JWT_REFRESH_EXPIRES_IN=7d
DOMAIN_HOST=playrke.com
FRONTEND_URL=http://frontend:3000
BACKEND_API_URL=http://backend:3001/api
DOCKER_USER=eiskerhc
GOOGLE_CLIENT_ID=YOUR_GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET=YOUR_GOOGLE_CLIENT_SECRET
EOL
  echo "✅ Archivo .env creado para producción"
else
  echo "ℹ️ Archivo .env ya existe, usando el existente"
fi
