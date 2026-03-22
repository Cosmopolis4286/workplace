#!/bin/bash
set -euo pipefail

# Cargar variables de entorno
if [ -f "/opt/workplace/.env" ]; then
  source /opt/workplace/.env
fi

# Usar DOMAIN_HOST del .env, o valor por defecto
DOMAIN="${DOMAIN_HOST:-localhost}"

echo "🔧 Configurando SSL para dominio: $DOMAIN"

# Instalar Certbot si no está disponible
if ! command -v certbot &> /dev/null; then
  echo "📦 Instalando Certbot..."
  sudo apt update
  sudo apt install -y certbot python3-certbot-nginx
fi

# Crear archivos SSL de nginx si no existen
if [ ! -f "/etc/letsencrypt/options-ssl-nginx.conf" ]; then
  echo "📝 Creando configuración SSL para nginx..."
  sudo mkdir -p /etc/letsencrypt
  
  # Crear options-ssl-nginx.conf
  cat > /tmp/options-ssl-nginx.conf << 'EOL'
ssl_session_cache shared:le_nginx_SSL:10m;
ssl_session_timeout 1440m;
ssl_session_tickets off;

ssl_protocols TLSv1.2 TLSv1.3;
ssl_prefer_server_ciphers off;

ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-ECDSA-CHACHA20-POLY1305:ECDHE-RSA-CHACHA20-POLY1305:DHE-RSA-AES128-GCM-SHA256:DHE-RSA-AES256-GCM-SHA384;

ssl_ecdh_curve X25519:prime256v1:secp384r1:secp521r1;
ssl_stapling on;
ssl_stapling_verify on;

ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;
EOL
  
  sudo mv /tmp/options-ssl-nginx.conf /etc/letsencrypt/options-ssl-nginx.conf
  
  # Generar dhparams si no existe
  if [ ! -f "/etc/letsencrypt/ssl-dhparams.pem" ]; then
    echo "🔐 Generando parámetros DH..."
    sudo openssl dhparam -out /tmp/dhparams.pem 2048
    sudo mv /tmp/dhparams.pem /etc/letsencrypt/ssl-dhparams.pem
  fi
fi

# Obtener certificados SSL si no existen
if [ ! -f "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" ]; then
  echo "🔒 Obteniendo certificados SSL para $DOMAIN..."
  
  # Detener nginx si está corriendo
  docker compose down nginx || true
  
  # Crear directorio para certbot
  sudo mkdir -p /var/www/certbot
  
  # Crear config temporal simple para validación (sin SSL)
  cat > /tmp/nginx-temp.conf << EOL
server {
    listen 80;
    server_name $DOMAIN www.$DOMAIN;
    
    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
        try_files \$uri \$uri/ =404;
    }
    
    location / {
        return 301 https://\$host\$request_uri;
    }
}
EOL
  
  # Mover config temporal al lugar correcto
  sudo mv /tmp/nginx-temp.conf /opt/workplace/nginx/conf.d/default.conf
  
  # Iniciar nginx con configuración temporal (solo HTTP)
  docker compose up -d nginx
  
  # Esperar a que nginx esté listo
  echo "⏳ Esperando a nginx (15s)..."
  sleep 15
  
  # Verificar que nginx esté corriendo
  if ! docker compose ps nginx | grep -q "Up"; then
    echo "❌ Nginx no inició correctamente"
    docker compose logs nginx --tail=20
    exit 1
  fi
  
  # Verificar que el dominio resuelva
  echo "🔍 Verificando resolución DNS..."
  if ! nslookup $DOMAIN > /dev/null 2>&1; then
    echo "❌ El dominio $DOMAIN no resuelve"
    exit 1
  fi
  
  # Obtener certificados con modo standalone
  echo "🔐 Solicitando certificados SSL..."
  sudo certbot certonly \
    --standalone \
    -d $DOMAIN \
    -d www.$DOMAIN \
    --email admin@$DOMAIN \
    --agree-tos \
    --non-interactive \
    --preferred-challenges http-01 \
    --http-01-port 80
  
  # Verificar si se obtuvieron los certificados
  if [ -f "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" ]; then
    echo "✅ Certificados SSL obtenidos exitosamente"
    
    # Detener nginx temporal
    docker compose down nginx
    
    # Usar config con SSL y reemplazar placeholder con dominio real
    cp /opt/workplace/nginx/conf.d/default.prod.conf /opt/workplace/nginx/conf.d/default.conf
    sed -i "s/tu-dominio.com/$DOMAIN/g" /opt/workplace/nginx/conf.d/default.conf
    
    # Descomentar líneas SSL
    sed -i 's/listen 443;/listen 443 ssl;/' /opt/workplace/nginx/conf.d/default.conf
    sed -i 's/# http2 on;/http2 on;/' /opt/workplace/nginx/conf.d/default.conf
    sed -i 's/# ssl_certificate/ssl_certificate/' /opt/workplace/nginx/conf.d/default.conf
    sed -i 's/# ssl_certificate_key/ssl_certificate_key/' /opt/workplace/nginx/conf.d/default.conf
    sed -i 's/# include \/etc\/letsencrypt\/options-ssl-nginx.conf;/include \/etc\/letsencrypt\/options-ssl-nginx.conf;/' /opt/workplace/nginx/conf.d/default.conf
    sed -i 's/# ssl_dhparam/ssl_dhparam/' /opt/workplace/nginx/conf.d/default.conf
    
    # Iniciar nginx con SSL
    docker compose up -d nginx
    
    echo "🔄 Nginx reiniciado con configuración SSL"
  else
    echo "❌ Falló obtención de certificados SSL"
    echo "📋 Logs de Certbot:"
    sudo journalctl -u certbot --no-pager -n 20 || true
    exit 1
  fi
else
  echo "🔒 SSL ya configurado, usando certificados existentes"
  # Usar config con SSL y reemplazar placeholder con dominio real
  cp /opt/workplace/nginx/conf.d/default.prod.conf /opt/workplace/nginx/conf.d/default.conf
  sed -i "s/tu-dominio.com/$DOMAIN/g" /opt/workplace/nginx/conf.d/default.conf
  
  # Descomentar líneas SSL
  sed -i 's/listen 443;/listen 443 ssl;/' /opt/workplace/nginx/conf.d/default.conf
  sed -i 's/# http2 on;/http2 on;/' /opt/workplace/nginx/conf.d/default.conf
  sed -i 's/# ssl_certificate/ssl_certificate/' /opt/workplace/nginx/conf.d/default.conf
  sed -i 's/# ssl_certificate_key/ssl_certificate_key/' /opt/workplace/nginx/conf.d/default.conf
  sed -i 's/# include \/etc\/letsencrypt\/options-ssl-nginx.conf;/include \/etc\/letsencrypt\/options-ssl-nginx.conf;/' /opt/workplace/nginx/conf.d/default.conf
  sed -i 's/# ssl_dhparam/ssl_dhparam/' /opt/workplace/nginx/conf.d/default.conf
  
  # Reiniciar nginx si está corriendo
  if docker compose ps nginx | grep -q "Up"; then
    docker compose restart nginx
  fi
fi

echo "✅ Configuración SSL completada"
