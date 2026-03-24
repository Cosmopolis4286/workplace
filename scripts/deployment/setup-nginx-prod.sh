#!/bin/bash
set -euo pipefail

echo "🔧 Configurando Nginx para Producción..."

# Variables del entorno
DOMAIN_NAME="${DOMAIN_NAME:-localhost}"

# Crear configuración específica de producción
cat > /opt/workplace/nginx/conf.d/production.conf << EOF
# Configuración específica de producción
server {
    listen 80;
    server_name $DOMAIN_NAME;
    
    # Redirect HTTP to HTTPS
    return 301 https://\$server_name\$request_uri;
}

server {
    listen 443 ssl http2;
    server_name $DOMAIN_NAME;
    
    # SSL configuration (certificados deben existir en el servidor)
    ssl_certificate /etc/ssl/certs/$DOMAIN_NAME.pem;
    ssl_certificate_key /etc/ssl/private/$DOMAIN_NAME.key;
    
    # Security headers específicos de producción
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    
    # Rate limiting específico de producción
    limit_req zone=api_limit burst=50 nodelay;
    
    # Logging específico
    access_log /var/log/nginx/production_access.log json_combined;
    error_log /var/log/nginx/production_error.log;
}
EOF

# Crear script de verificación de nginx
cat > /opt/workplace/scripts/verify-nginx.sh << 'EOF'
#!/bin/bash
echo "🔍 Verificando configuración nginx..."
cd /opt/workplace

# Verificar archivos base
if [ ! -f "nginx/nginx.conf" ]; then
  echo "❌ nginx.conf no encontrado"
  exit 1
fi

if [ ! -f "nginx/conf.d/common.conf" ]; then
  echo "❌ common.conf no encontrado"
  exit 1
fi

if [ ! -f "nginx/conf.d/production.conf" ]; then
  echo "❌ production.conf no encontrado"
  exit 1
fi

echo "✅ Configuración nginx verificada"
EOF

chmod +x /opt/workplace/scripts/verify-nginx.sh

echo "✅ Configuración nginx producción creada"
