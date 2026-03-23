#!/bin/bash
set -euo pipefail

# Cargar variables de entorno
if [ -f "/opt/workplace/.env" ]; then
  source /opt/workplace/.env
fi

# Usar DOMAIN del .env, o valor por defecto
DOMAIN="${DOMAIN:-localhost}"

# Detectar modo staging/testing
STAGING_MODE="${STAGING_MODE:-false}"
if [ "$STAGING_MODE" = "true" ]; then
  echo "🧪 Configurando SSL para dominio: $DOMAIN (modo staging/testing)"
else
  echo "🔧 Configurando SSL para dominio: $DOMAIN (modo producción sin downtime)"
fi

# Función para configurar nginx usando template
configure_nginx_ssl() {
  local domain="$1"
  local template_file="/opt/workplace/nginx/conf.d/default.conf.template"
  local config_file="/opt/workplace/nginx/conf.d/default.conf"
  
  echo "🔧 Configurando nginx con SSL para $domain..."
  
  # Verificar que el template exista
  if [ ! -f "$template_file" ]; then
    echo "❌ Error: Template $template_file no encontrado"
    exit 1
  fi
  
  # Crear backup de la configuración actual
  if [ -f "$config_file" ]; then
    cp "$config_file" "${config_file}.backup.$(date +%Y%m%d-%H%M%S)"
    echo "📋 Backup creado: ${config_file}.backup.$(date +%Y%m%d-%H%M%S)"
  fi
  
  # Reemplazar placeholders en el template
  sed "s/{{DOMAIN}}/$domain/g" "$template_file" > "$config_file"
  
  echo "✅ Configuración nginx actualizada usando template"
}

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

# Verificar si ya existen certificados (incluso expirados)
echo "🔍 Verificando certificados existentes para $DOMAIN..."
if [ -f "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" ] && [ -f "/etc/letsencrypt/live/$DOMAIN/privkey.pem" ]; then
  echo "✅ Certificados SSL encontrados, verificando validez..."
  
  # Verificar que los certificados no estén expirados
  if openssl x509 -checkend 86400 -noout -in "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" 2>/dev/null; then
    echo "🔒 SSL ya configurado y válido, usando certificados existentes"
    
    # Configurar nginx con SSL usando template
    configure_nginx_ssl "$DOMAIN"
    
    # Iniciar nginx con SSL si no está corriendo
    if ! docker compose ps nginx | grep -q "Up"; then
      echo "🚀 Iniciando nginx..."
      docker compose up -d nginx
      sleep 5
    else
      echo "🔄 Reiniciando nginx para aplicar SSL..."
      docker compose restart nginx
      sleep 5
    fi
    
    # Verificar que nginx esté levantado
    if ! docker compose ps nginx | grep -q "Up"; then
      echo "❌ Error: nginx no se inició correctamente"
      docker compose logs nginx --tail=20
      exit 1
    fi
    
    echo "✅ Configuración SSL completada con certificados existentes"
    exit 0
  else
    echo "⚠️ Certificados encontrados pero expirados, intentando renovar..."
    
    # Intentar renovar en lugar de generar nuevos (webroot mode)
    echo "🔄 Intentando renovar certificados existentes (webroot mode)..."
    if sudo certbot renew --cert-name $DOMAIN --webroot -w /opt/workplace/certbot/www --non-interactive; then
      echo "✅ Certificados renovados exitosamente"
      
      # Verificar que los archivos existan después de renovar
      if [ -f "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" ] && [ -f "/etc/letsencrypt/live/$DOMAIN/privkey.pem" ]; then
        echo "🔍 Archivos renovados verificados"
        
        # Configurar nginx con SSL usando template
        configure_nginx_ssl "$DOMAIN"
        
        # Reiniciar nginx para aplicar nuevos certificados
        echo "🔄 Reiniciando nginx para aplicar certificados renovados..."
        docker compose restart nginx
        sleep 5
        
        # Verificar que nginx esté levantado
        if ! docker compose ps nginx | grep -q "Up"; then
          echo "❌ Error: nginx no se inició después de renovar certificados"
          docker compose logs nginx --tail=20
          exit 1
        fi
        
        echo "✅ Configuración SSL completada con certificados renovados"
        exit 0
      else
        echo "❌ Error: archivos no encontrados después de renovar"
        exit 1
      fi
    else
      echo "⚠️ No se pudo renovar, usando certificados existentes (expirados) temporalmente..."
      
      # Usar certificados existentes aunque estén expirados para desarrollo
      configure_nginx_ssl "$DOMAIN"
      
      # Reiniciar nginx
      echo "🔄 Reiniciando nginx con certificados existentes..."
      docker compose restart nginx
      sleep 5
      
      # Verificar que nginx esté levantado
      if ! docker compose ps nginx | grep -q "Up"; then
        echo "❌ Error: nginx no se inició con certificados existentes"
        docker compose logs nginx --tail=20
        exit 1
      fi
      
      echo "⚠️ Configuración SSL completada con certificados existentes (pueden estar expirados)"
      echo "📅 Los certificados se podrán renovar después del rate limit de Let's Encrypt"
      exit 0
    fi
  fi
else
  echo "❌ No se encontraron certificados existentes, generando nuevos..."
fi

# Si no hay certificados, generar nuevos con webroot (SIN detener nginx)
echo "🔒 Generando nuevos certificados SSL para $DOMAIN (webroot mode)..."

# Asegurar que nginx esté corriendo para servir ACME challenges
if ! docker compose ps nginx | grep -q "Up"; then
  echo "🚀 Iniciando nginx para ACME challenges..."
  docker compose up -d nginx
  sleep 10
fi

# Verificar que nginx esté sirviendo ACME challenges
echo "🔍 Verificando configuración ACME..."
curl -f http://$DOMAIN/.well-known/acme-challenge/ || {
  echo "❌ ACME challenge no accesible, abortando generación de certificado"
  echo "🔍 Verifica que:"
  echo "   - El dominio $DOMAIN apunta a este servidor"
  echo "   - Nginx está corriendo y sirviendo en el puerto 80"
  echo "   - El firewall permite tráfico HTTP (puerto 80)"
  exit 1
}

# Construir comando certbot con o sin staging
CERTBOT_CMD="sudo certbot certonly --webroot -w /opt/workplace/certbot/www -d $DOMAIN -d www.$DOMAIN --email admin@$DOMAIN --agree-tos --non-interactive --preferred-challenges http-01"

if [ "$STAGING_MODE" = "true" ]; then
  CERTBOT_CMD="$CERTBOT_CMD --staging"
  echo "🧪 Usando servidor staging de Let's Encrypt (sin rate limits)"
fi

# Generar certificados con webroot (nginx sigue corriendo)
echo "🔐 Solicitando certificados SSL con webroot..."
if eval "$CERTBOT_CMD"; then
  
  echo "✅ Certificados generados exitosamente"
  
  # Verificar archivos
  if [ -f "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" ] && [ -f "/etc/letsencrypt/live/$DOMAIN/privkey.pem" ]; then
    echo "🔍 Archivos de certificado verificados"
    
    # Configurar nginx con SSL usando template
    configure_nginx_ssl "$DOMAIN"
    
    # Reiniciar nginx para aplicar SSL (sin downtime de otros servicios)
    echo "🔄 Reiniciando nginx para aplicar configuración SSL..."
    docker compose restart nginx
    sleep 5
    
    # Verificar que nginx esté levantado después del restart
    if docker compose ps nginx | grep -q "Up"; then
      echo "✅ Nginx reiniciado exitosamente"
    else
      echo "❌ Error: nginx no se inició después del restart"
      docker compose logs nginx --tail=20
      exit 1
    fi
    
    echo "✅ Configuración SSL completada exitosamente (sin downtime)"
    echo "🎉 Nginx ahora sirve HTTPS con certificados válidos"
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
