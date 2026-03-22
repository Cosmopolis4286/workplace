#!/bin/bash
set -euo pipefail

# Instalar Certbot si no está disponible
if ! command -v certbot &> /dev/null; then
  echo "📦 Instalando Certbot..."
  sudo apt update
  sudo apt install -y certbot python3-certbot-nginx
fi

# Configurar dominio (reemplazar con tu dominio real)
DOMAIN="tu-dominio.com"

# Obtener certificados SSL si no existen
if [ ! -f "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" ]; then
  echo "🔒 Obteniendo certificados SSL para $DOMAIN..."
  
  # Primero crear config temporal sin SSL para validar dominio
  cat > /opt/workplace/nginx/conf.d/default.conf << EOL
server {
    listen 80;
    server_name $DOMAIN www.$DOMAIN;
    
    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }
    
    location / {
        return 301 https://\$host\$request_uri;
    }
}
EOL
  
  # Iniciar nginx temporal para validación
  docker compose up -d nginx
  
  # Esperar a que nginx esté listo
  sleep 10
  
  # Obtener certificados
  sudo certbot --nginx -d $DOMAIN -d www.$DOMAIN --email admin@$DOMAIN --agree-tos --non-interactive
  
  # Si tuvo éxito, usar config con SSL
  if [ -f "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" ]; then
    echo "✅ SSL configurado exitosamente"
    cp /opt/workplace/nginx/conf.d/default.prod.conf /opt/workplace/nginx/conf.d/default.conf
    # Reemplazar placeholder con dominio real
    sed -i "s/tu-dominio.com/$DOMAIN/g" /opt/workplace/nginx/conf.d/default.conf
  else
    echo "⚠️ Falló configuración SSL, usando HTTP"
    # Mantener config temporal sin SSL
  fi
else
  echo "🔒 SSL ya configurado, usando certificados existentes"
  cp /opt/workplace/nginx/conf.d/default.prod.conf /opt/workplace/nginx/conf.d/default.conf
  sed -i "s/tu-dominio.com/$DOMAIN/g" /opt/workplace/nginx/conf.d/default.conf
fi
