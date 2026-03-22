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

# Obtener certificados SSL si no existen
if [ ! -f "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" ]; then
  echo "🔒 Obteniendo certificados SSL para $DOMAIN..."
  
  # Detener nginx si está corriendo
  docker compose down nginx || true
  
  # Crear directorio para certbot
  sudo mkdir -p /var/www/certbot
  
  # Crear config temporal simple para validación
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
  
  # Iniciar nginx con configuración temporal
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
    
    # Usar config con SSL
    cp /opt/workplace/nginx/conf.d/default.prod.conf /opt/workplace/nginx/conf.d/default.conf
    # Reemplazar placeholder con dominio real
    sed -i "s/tu-dominio.com/$DOMAIN/g" /opt/workplace/nginx/conf.d/default.conf
    
    # Reiniciar nginx con SSL
    docker compose restart nginx
    
    echo "🔄 Nginx reiniciado con configuración SSL"
  else
    echo "❌ Falló obtención de certificados SSL"
    echo "📋 Logs de Certbot:"
    sudo journalctl -u certbot --no-pager -n 20 || true
    exit 1
  fi
else
  echo "🔒 SSL ya configurado, usando certificados existentes"
  # Usar config con SSL
  cp /opt/workplace/nginx/conf.d/default.prod.conf /opt/workplace/nginx/conf.d/default.conf
  # Reemplazar placeholder con dominio real
  sed -i "s/tu-dominio.com/$DOMAIN/g" /opt/workplace/nginx/conf.d/default.conf
  
  # Reiniciar nginx si está corriendo
  if docker compose ps nginx | grep -q "Up"; then
    docker compose restart nginx
  fi
fi

echo "✅ Configuración SSL completada"
