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

# Verificar si ya existen certificados válidos
echo "🔍 Verificando certificados existentes para $DOMAIN..."
if [ -f "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" ] && [ -f "/etc/letsencrypt/live/$DOMAIN/privkey.pem" ]; then
  echo "✅ Certificados SSL encontrados, verificando validez..."
  
  # Verificar que los certificados no estén expirados
  if openssl x509 -checkend 86400 -noout -in "/etc/letsencrypt/live/$DOMAIN/fullchain.pem"; then
    echo "🔒 SSL ya configurado y válido, usando certificados existentes"
    
    # Configurar nginx con SSL
    sed -i "s/tu-dominio.com/$DOMAIN/g" /opt/workplace/nginx/conf.d/default.conf
    
    # Activar SSL
    sed -i 's/listen 443;/listen 443 ssl;/' /opt/workplace/nginx/conf.d/default.conf
    sed -i 's/# http2 on;/http2 on;/' /opt/workplace/nginx/conf.d/default.conf
    sed -i 's/# ssl_certificate/ssl_certificate/' /opt/workplace/nginx/conf.d/default.conf
    sed -i 's/# ssl_certificate_key/ssl_certificate_key/' /opt/workplace/nginx/conf.d/default.conf
    sed -i 's|# include /etc/letsencrypt/options-ssl-nginx.conf;|include /etc/letsencrypt/options-ssl-nginx.conf;|' /opt/workplace/nginx/conf.d/default.conf
    sed -i 's/# ssl_dhparam/ssl_dhparam/' /opt/workplace/nginx/conf.d/default.conf
    
    # Iniciar nginx con SSL si no está corriendo
    if ! docker compose ps nginx | grep -q "Up"; then
      docker compose up -d nginx
    else
      docker compose restart nginx
    fi
    
    echo "✅ Configuración SSL completada con certificados existentes"
    exit 0
  else
    echo "⚠️ Certificados expirados, renovando..."
  fi
fi

# Si no hay certificados válidos, generar nuevos
echo "🔒 Obteniendo nuevos certificados SSL para $DOMAIN..."

# Limpieza de certificados existentes si los hay
echo "🧹 Limpiando certificados anteriores..."
sudo certbot delete --cert-name $DOMAIN 2>/dev/null || true
sudo rm -rf /etc/letsencrypt/live/$DOMAIN 2>/dev/null || true
sudo rm -rf /etc/letsencrypt/archive/$DOMAIN 2>/dev/null || true
sudo rm -f /etc/letsencrypt/renewal/$DOMAIN.conf 2>/dev/null || true

# Detener completamente todos los servicios para liberar puerto 80
echo "🔄 Deteniendo servicios para liberar puerto 80..."
docker compose down || true
sleep 5

# Generar certificados con modo standalone
echo "🔐 Generando certificados SSL..."
if sudo certbot certonly \
  --standalone \
  -d $DOMAIN \
  -d www.$DOMAIN \
  --email admin@$DOMAIN \
  --agree-tos \
  --non-interactive \
  --preferred-challenges http-01 \
  --http-01-port 80; then
  
  echo "✅ Certificados generados exitosamente"
  
  # Verificar archivos
  if [ -f "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" ] && [ -f "/etc/letsencrypt/live/$DOMAIN/privkey.pem" ]; then
    echo "🔍 Archivos de certificado verificados"
    
    # Configurar nginx con SSL
    sed -i "s/tu-dominio.com/$DOMAIN/g" /opt/workplace/nginx/conf.d/default.conf
    
    # Activar SSL
    sed -i 's/listen 443;/listen 443 ssl;/' /opt/workplace/nginx/conf.d/default.conf
    sed -i 's/# http2 on;/http2 on;/' /opt/workplace/nginx/conf.d/default.conf
    sed -i 's/# ssl_certificate/ssl_certificate/' /opt/workplace/nginx/conf.d/default.conf
    sed -i 's/# ssl_certificate_key/ssl_certificate_key/' /opt/workplace/nginx/conf.d/default.conf
    sed -i 's|# include /etc/letsencrypt/options-ssl-nginx.conf;|include /etc/letsencrypt/options-ssl-nginx.conf;|' /opt/workplace/nginx/conf.d/default.conf
    sed -i 's/# ssl_dhparam/ssl_dhparam/' /opt/workplace/nginx/conf.d/default.conf
    
    # Iniciar todos los servicios
    echo "🚀 Iniciando servicios con SSL..."
    docker compose up -d
    
    # Verificar que nginx esté corriendo
    sleep 10
    if docker compose ps nginx | grep -q "Up"; then
      echo "✅ Nginx iniciado con SSL correctamente"
    else
      echo "❌ Error al iniciar nginx"
      docker compose logs nginx --tail=20
      exit 1
    fi
    
    echo "✅ Configuración SSL completada exitosamente"
  else
    echo "❌ No se encontraron los archivos de certificado después de generar"
    exit 1
  fi
else
  echo "❌ Falló la generación de certificados SSL"
  echo "📋 Últimos logs de Certbot:"
  sudo journalctl -u certbot --no-pager -n 10 || true
  exit 1
fi
