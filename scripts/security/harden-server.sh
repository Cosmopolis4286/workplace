#!/bin/bash
# 🔒 Server Hardening Script for Workplace
# Configura UFW + Fail2Ban para protección externa del VPS
# Ejecutar como root en el servidor: sudo ./scripts/security/harden-server.sh

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WORKPLACE_DIR="${SCRIPT_DIR}/../.."

# Colores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log() { echo -e "${GREEN}[$(date +%H:%M:%S)]${NC} $1"; }
warn() { echo -e "${YELLOW}[$(date +%H:%M:%S)]⚠${NC} $1"; }
error() { echo -e "${RED}[$(date +%H:%M:%S)]✗${NC} $1"; }

# ==========================================
# 1. UFW (Uncomplicated Firewall)
# ==========================================
setup_ufw() {
    log "🛡️ Configurando UFW (Firewall)..."
    
    # Instalar UFW si no existe
    if ! command -v ufw &> /dev/null; then
        apt-get update
        apt-get install -y ufw
    fi
    
    # Resetear a defaults
    ufw --force reset
    
    # Política por defecto: deny todo
    ufw default deny incoming
    ufw default allow outgoing
    
    # Permitir SSH (para no perder acceso)
    ufw allow 22/tcp comment 'SSH access'
    
    # Permitir HTTP y HTTPS (Traefik los maneja)
    ufw allow 80/tcp comment 'HTTP - Traefik'
    ufw allow 443/tcp comment 'HTTPS - Traefik'
    
    # Permitir puerto de healthcheck interno de Traefik (solo localhost)
    # Esto ya está protegido por el binding 127.0.0.1 en docker-compose
    
    # Bloquear puertos de management que no deberían estar expuestos
    # Docker expone puertos directamente, pero UFW no los ve por default
    # debido a cómo maneja iptables Docker
    
    # Solución: Configurar Docker para usar iptables-legacy o agregar reglas DROP
    cat > /etc/ufw/after.rules << 'EOF'
# Bloquear acceso directo a puertos Docker (solo Traefik debe exponer)
*filter
:DOCKER-USER - [0:0]

# Permitir tráfico desde loopback
-A DOCKER-USER -i lo -j RETURN

# Permitir tráfico establecido
-A DOCKER-USER -m conntrack --ctstate ESTABLISHED,RELATED -j RETURN

# Bloquear puertos de DB y Redis (5432, 6379)
-A DOCKER-USER -p tcp --dport 5432 -j DROP
-A DOCKER-USER -p tcp --dport 6379 -j DROP

# Bloquear puerto interno de Traefik (8080) si se expusiera
-A DOCKER-USER -p tcp --dport 8080 -j DROP

# Permitir todo lo demás (que pase a la cadena de Docker)
-A DOCKER-USER -j RETURN

COMMIT
EOF

    # Habilitar UFW
    echo "y" | ufw enable
    
    log "✅ UFW configurado"
    ufw status verbose
}

# ==========================================
# 2. Fail2Ban para Docker/Traefik
# ==========================================
setup_fail2ban() {
    log "🔨 Configurando Fail2Ban..."
    
    # Instalar fail2ban
    apt-get install -y fail2ban iptables-persistent
    
    # Copiar configuración personalizada
    if [ -f "${WORKPLACE_DIR}/security/fail2ban/jail.local" ]; then
        cp "${WORKPLACE_DIR}/security/fail2ban/jail.local" /etc/fail2ban/jail.local
        cp "${WORKPLACE_DIR}/security/fail2ban/filter.d/"*.conf /etc/fail2ban/filter.d/ 2>/dev/null || true
    fi
    
    # Configurar acción para Docker (usar iptables directamente)
    cat > /etc/fail2ban/action.d/iptables-docker.conf << 'EOF'
[Definition]
# Action para bloquear IPs en Docker host
actionstart = 
actionstop = 
actioncheck = 
actionban = /sbin/iptables -I DOCKER-USER -s <ip> -j DROP
actionunban = /sbin/iptables -D DOCKER-USER -s <ip> -j DROP

[Init]
EOF

    # Actualizar jail.local para usar la acción de Docker
    sed -i 's/^banaction = .*/banaction = iptables-docker/' /etc/fail2ban/jail.local 2>/dev/null || true
    
    # Crear jail adicional para proteger SSH
    cat >> /etc/fail2ban/jail.local << 'EOF'

# SSH Protection
[sshd]
enabled = true
port = ssh
filter = sshd
logpath = /var/log/auth.log
maxretry = 3
bantime = 3600
findtime = 600

# Traefik / Docker logs protection
[traefik-auth]
enabled = true
port = http,https
filter = nginx-http-auth
logpath = /var/log/traefik/access.log
maxretry = 5
bantime = 3600
findtime = 600
EOF

    # Crear directorio de logs de Traefik si no existe
    mkdir -p /var/log/traefik
    touch /var/log/traefik/access.log
    
    # Reiniciar fail2ban
    systemctl enable fail2ban
    systemctl restart fail2ban
    
    log "✅ Fail2Ban configurado"
    sleep 2
    fail2ban-client status 2>/dev/null || warn "Fail2Ban status no disponible aún"
}

# ==========================================
# 3. Sysctl Hardening (Kernel)
# ==========================================
setup_sysctl() {
    log "⚙️ Aplicando hardening de kernel..."
    
    cat >> /etc/sysctl.conf << 'EOF'

# Security hardening
# Deshabilitar IP source routing
net.ipv4.conf.all.accept_source_route = 0
net.ipv4.conf.default.accept_source_route = 0

# No aceptar ICMP redirects (previene MITM)
net.ipv4.conf.all.accept_redirects = 0
net.ipv4.conf.default.accept_redirects = 0
net.ipv4.conf.all.secure_redirects = 0

# Ignorar broadcast pings
net.ipv4.icmp_echo_ignore_broadcasts = 1

# Habilitar protección contra SYN floods
net.ipv4.tcp_syncookies = 1
net.ipv4.tcp_max_syn_backlog = 2048
net.ipv4.tcp_synack_retries = 2
net.ipv4.tcp_syn_retries = 5

# Deshabilitar IPv6 si no se usa (opcional, descomentar si es necesario)
# net.ipv6.conf.all.disable_ipv6 = 1

# Mejorar rendimiento de conexiones TCP
net.ipv4.tcp_tw_reuse = 1
net.ipv4.tcp_fin_timeout = 15
net.ipv4.tcp_keepalive_time = 300
net.ipv4.tcp_keepalive_probes = 5
net.ipv4.tcp_keepalive_intvl = 15
EOF

    sysctl -p
    
    log "✅ Kernel hardening aplicado"
}

# ==========================================
# 4. Cloudflare (Opcional)
# ==========================================
setup_cloudflare() {
    log "☁️ Configurando Cloudflare IPs..."
    
    # Descargar IPs de Cloudflare
    mkdir -p /etc/cloudflare
    curl -s https://www.cloudflare.com/ips-v4 > /etc/cloudflare/ips-v4.txt
    curl -s https://www.cloudflare.com/ips-v6 > /etc/cloudflare/ips-v6.txt
    
    # Crear script para actualizar IPs periódicamente
    cat > /usr/local/bin/update-cloudflare-ips.sh << 'EOF'
#!/bin/bash
# Actualizar IPs de Cloudflare para UFW

curl -s https://www.cloudflare.com/ips-v4 > /etc/cloudflare/ips-v4.txt
curl -s https://www.cloudflare.com/ips-v6 > /etc/cloudflare/ips-v6.txt

# Limpiar reglas antiguas de Cloudflare
for ip in $(ufw status | grep -oP 'ALLOW\s+\K[\d\.]+/\d+'); do
    if grep -q "$ip" /etc/cloudflare/ips-v4.txt 2>/dev/null; then
        continue
    fi
    ufw delete allow from "$ip" 2>/dev/null || true
done

# Agregar nuevas reglas
while read -r ip; do
    [ -z "$ip" ] && continue
    ufw allow from "$ip" to any port 80,443 comment 'Cloudflare' 2>/dev/null || true
done < /etc/cloudflare/ips-v4.txt

while read -r ip; do
    [ -z "$ip" ] && continue
    ufw allow from "$ip" to any port 80,443 comment 'Cloudflare IPv6' 2>/dev/null || true
done < /etc/cloudflare/ips-v6.txt
EOF

    chmod +x /usr/local/bin/update-cloudflare-ips.sh
    
    # Preguntar si está usando Cloudflare
    echo ""
    warn "¿Estás usando Cloudflare como proxy?"
    warn "Si es así, ejecuta: sudo /usr/local/bin/update-cloudflare-ips.sh"
    warn "Y agrega al cron: 0 3 * * * /usr/local/bin/update-cloudflare-ips.sh"
    echo ""
}

# ==========================================
# 5. Verificación
# ==========================================
verify_setup() {
    log "🔍 Verificando configuración..."
    
    echo ""
    echo "=== UFW Status ==="
    ufw status numbered
    
    echo ""
    echo "=== Fail2Ban Status ==="
    fail2ban-client status 2>/dev/null || echo "Fail2Ban no responde (puede necesitar reinicio)"
    
    echo ""
    echo "=== Reglas iptables (DOCKER-USER) ==="
    iptables -L DOCKER-USER -n 2>/dev/null || echo "Cadena DOCKER-USER no existe aún"
    
    echo ""
    echo "=== Puertos escuchando ==="
    ss -tlnp | grep -E ':(22|80|443|5432|6379|8080)' || netstat -tlnp | grep -E ':(22|80|443|5432|6379|8080)' || true
}

# ==========================================
# Main
# ==========================================
main() {
    log "🔒 Iniciando hardening del servidor..."
    
    # Verificar root
    if [ "$EUID" -ne 0 ]; then
        error "Este script debe ejecutarse como root (sudo)"
        exit 1
    fi
    
    setup_ufw
    setup_fail2ban
    setup_sysctl
    setup_cloudflare
    verify_setup
    
    log "✅ Hardening completado!"
    echo ""
    echo "📋 Resumen de cambios:"
    echo "   - UFW: Solo puertos 22, 80, 443 abiertos"
    echo "   - Docker: Puertos internos (5432, 6379, 8080) bloqueados"
    echo "   - Fail2Ban: Protección contra brute force activada"
    echo "   - Kernel: Protecciones SYN flood y MITM aplicadas"
    echo ""
    echo "⚠️  IMPORTANTE:"
    echo "   - Si pierdes acceso SSH, reinicia el servidor"
    echo "   - Para deshabilitar UFW: sudo ufw disable"
    echo "   - Para ver logs: sudo tail -f /var/log/ufw.log"
    echo "   - Para ver bans: sudo fail2ban-client status"
}

main "$@"
