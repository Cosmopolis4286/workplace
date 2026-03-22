#!/bin/bash
set -euo pipefail

# Cargar variables de entorno
if [ -f "/opt/workplace/.env" ]; then
  source /opt/workplace/.env
fi

# Usar DOMAIN_HOST del .env, o valor por defecto
DOMAIN="${DOMAIN_HOST:-localhost}"

# Instalar Certbot si no está disponible
if ! command -v certbot &> /dev/null; then
  echo "📦 Instalando Certbot..."
  sudo apt update
  sudo apt install -y certbot python3-certbot-nginx
fi

# Obtener certificados SSL si no existen
if [ ! -f "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" ]; then
  echo "🔒 Obteniendo certificados SSL para $DOMAIN..."
  
  # Primero usar config con SSL como template para Certbot
  cp /opt/workplace/nginx/conf.d/default.prod.conf /opt/workplace/nginx/conf.d/default.conf
  # Reemplazar placeholder con dominio real
  sed -i "s/tu-dominio.com/$DOMAIN/g" /opt/workplace/nginx/conf.d/default.conf
  
  # Iniciar nginx con la configuración de SSL
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
