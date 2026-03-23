#!/bin/bash

# =========================
# Cloudflare IPs Updater
# =========================
# Script para mantener actualizadas las IPs de Cloudflare en nginx
# Uso: ./update-cloudflare-ips.sh

CLOUDFLARE_IPV4_URL="https://www.cloudflare.com/ips-v4"
CLOUDFLARE_IPV6_URL="https://www.cloudflare.com/ips-v6"
NGINX_CONF="/etc/nginx/conf.d/cloudflare-ips.conf"
TEMP_FILE="/tmp/cloudflare-ips.tmp"

echo "🔄 Actualizando IPs de Cloudflare..."

# Descargar IPs actuales
curl -s $CLOUDFLARE_IPV4_URL > $TEMP_FILE.ipv4
curl -s $CLOUDFLARE_IPV6_URL > $TEMP_FILE.ipv6

# Verificar que se descargaron correctamente
if [ ! -s "$TEMP_FILE.ipv4" ] || [ ! -s "$TEMP_FILE.ipv6" ]; then
    echo "❌ Error descargando IPs de Cloudflare"
    exit 1
fi

# Generar configuración nginx
cat > $NGINX_CONF << 'EOF'
# =========================
# Cloudflare IPs (Auto-generado)
# =========================
# Última actualización: $(date)
EOF

# Añadir IPs IPv4
echo "# IPv4" >> $NGINX_CONF
while read -r ip; do
    echo "allow $ip;" >> $NGINX_CONF
done < $TEMP_FILE.ipv4

# Añadir IPs IPv6
echo "# IPv6" >> $NGINX_CONF
while read -r ip; do
    echo "allow $ip;" >> $NGINX_CONF
done < $TEMP_FILE.ipv6

echo "deny all;" >> $NGINX_CONF

# Limpiar archivos temporales
rm -f $TEMP_FILE.ipv4 $TEMP_FILE.ipv6

# Verificar configuración nginx
nginx -t > /dev/null 2>&1
if [ $? -eq 0 ]; then
    echo "✅ Configuración nginx válida"
    # Recargar nginx si es necesario
    if command -v nginx &> /dev/null; then
        nginx -s reload
        echo "🔄 Nginx recargado exitosamente"
    fi
else
    echo "❌ Error en configuración nginx generada"
    exit 1
fi

echo "🎉 IPs de Cloudflare actualizadas correctamente"
echo "📊 Total IPv4: $(wc -l < <(curl -s $CLOUDFLARE_IPV4_URL))"
echo "📊 Total IPv6: $(wc -l < <(curl -s $CLOUDFLARE_IPV6_URL))"
