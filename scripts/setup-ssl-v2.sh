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

# Verificar si ya existen certificados para este dominio
echo "🔍 Verificando certificados existentes para $DOMAIN..."
echo "📁 Buscando: /etc/letsencrypt/live/$DOMAIN/fullchain.pem"
if [ -f "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" ]; then
  echo "✅ fullchain.pem encontrado"
else
  echo "❌ fullchain.pem NO encontrado"
fi

echo "📁 Buscando: /etc/letsencrypt/live/$DOMAIN/privkey.pem"
if [ -f "/etc/letsencrypt/live/$DOMAIN/privkey.pem" ]; then
  echo "✅ privkey.pem encontrado"
else
  echo "❌ privkey.pem NO encontrado"
fi

# Verificar si existen certificados en cualquier ubicación
echo "🔍 Buscando certificados existentes en el sistema..."
if sudo find /etc/letsencrypt -name "*$DOMAIN*" 2>/dev/null | head -5; then
  echo "⚠️ Se encontraron certificados existentes, limpiando..."
  # Limpiar certificados existentes para este dominio
  sudo certbot delete --cert-name $DOMAIN 2>/dev/null || true
  sudo rm -rf /etc/letsencrypt/live/$DOMAIN 2>/dev/null || true
  sudo rm -rf /etc/letsencrypt/archive/$DOMAIN 2>/dev/null || true
  sudo rm -f /etc/letsencrypt/renewal/$DOMAIN.conf 2>/dev/null || true
  echo "🧹 Certificados existentes eliminados"
else
  echo "✅ No hay certificados existentes para $DOMAIN"
fi

if [ -f "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" ] && [ -f "/etc/letsencrypt/live/$DOMAIN/privkey.pem" ]; then
  echo "🔒 SSL ya configurado, usando certificados existentes"
  
  # Reemplazar placeholder con dominio real
  sed -i "s/tu-dominio.com/$DOMAIN/g" /opt/workplace/nginx/conf.d/default.conf
  
  # Descomentar líneas SSL
  sed -i 's/listen 443;/listen 443 ssl;/' /opt/workplace/nginx/conf.d/default.conf
  sed -i 's/# http2 on;/http2 on;/' /opt/workplace/nginx/conf.d/default.conf
  sed -i 's/# ssl_certificate/ssl_certificate/' /opt/workplace/nginx/conf.d/default.conf
  sed -i 's/# ssl_certificate_key/ssl_certificate_key/' /opt/workplace/nginx/conf.d/default.conf
  sed -i 's|# include /etc/letsencrypt/options-ssl-nginx.conf;|include /etc/letsencrypt/options-ssl-nginx.conf;|' /opt/workplace/nginx/conf.d/default.conf
  sed -i 's/# ssl_dhparam/ssl_dhparam/' /opt/workplace/nginx/conf.d/default.conf
  
  # Reiniciar nginx si está corriendo
  if docker compose ps nginx | grep -q "Up"; then
    docker compose restart nginx
  else
    docker compose up -d nginx
  fi
else
  echo "🔒 Obteniendo certificados SSL para $DOMAIN..."
  
  # Detener nginx si está corriendo
  docker compose stop nginx || true
  docker compose rm -f nginx || true
  
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
  
  # Hacer backup del config actual y usar config temporal
  cp /opt/workplace/nginx/conf.d/default.conf /opt/workplace/nginx/conf.d/default.conf.backup
  mv /tmp/nginx-temp.conf /opt/workplace/nginx/conf.d/default.conf
  
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
  
  # Obtener certificados con modo standalone (deteniendo nginx completamente)
  echo "🔐 Solicitando certificados SSL..."
  
  # Detener completamente todos los servicios para liberar puerto 80
  docker compose down || true
  
  # Esperar a que los puertos se liberen
  sleep 5
  
  sudo certbot certonly \
    --standalone \
    -d $DOMAIN \
    -d www.$DOMAIN \
    --email admin@$DOMAIN \
    --agree-tos \
    --non-interactive \
    --force-renewal \
    --preferred-challenges http-01 \
    --http-01-port 80 || true
  
  # Verificar si se obtuvieron los certificados (o si ya existían)
  if [ -f "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" ]; then
    echo "✅ Certificados SSL disponibles"
    
    # Detener nginx temporal
    docker compose down nginx
    
    # Restaurar config completo y activar SSL
    mv /opt/workplace/nginx/conf.d/default.conf.backup /opt/workplace/nginx/conf.d/default.conf
    sed -i "s/tu-dominio.com/$DOMAIN/g" /opt/workplace/nginx/conf.d/default.conf
    
    # Descomentar líneas SSL
    sed -i 's/listen 443;/listen 443 ssl;/' /opt/workplace/nginx/conf.d/default.conf
    sed -i 's/# http2 on;/http2 on;/' /opt/workplace/nginx/conf.d/default.conf
    sed -i 's/# ssl_certificate/ssl_certificate/' /opt/workplace/nginx/conf.d/default.conf
    sed -i 's/# ssl_certificate_key/ssl_certificate_key/' /opt/workplace/nginx/conf.d/default.conf
    sed -i 's|# include /etc/letsencrypt/options-ssl-nginx.conf;|include /etc/letsencrypt/options-ssl-nginx.conf;|' /opt/workplace/nginx/conf.d/default.conf
    sed -i 's/# ssl_dhparam/ssl_dhparam/' /opt/workplace/nginx/conf.d/default.conf
    
    # Reiniciar todos los servicios
    docker compose up -d
    
    echo "🔄 Nginx reiniciado con configuración SSL"
  else
    echo "❌ Falló obtención de certificados SSL"
    echo "📋 Logs de Certbot:"
    sudo journalctl -u certbot --no-pager -n 20 || true
    exit 1
  fi
fi

echo "✅ Configuración SSL completada"
