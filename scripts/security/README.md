# 🔒 Security Scripts - Workplace

Scripts de hardening y seguridad para proteger la infraestructura de Workplace en producción.

---

## 📁 Estructura

```
security/
├── harden-server.sh      # Hardening completo del servidor (UFW + Fail2Ban + Kernel)
├── fail2ban/
│   ├── jail.local        # Configuración de Fail2Ban
│   └── filter.d/         # Filtros personalizados
└── monitoring/
    ├── setup-security.sh # Setup inicial de seguridad
    ├── monitor.sh        # Monitoreo de seguridad
    └── nginx-security.conf # Configuración de seguridad de Nginx
```

---

## 🚀 Uso Rápido

### 1. Hardening Completo del Servidor (Nuevo)

```bash
# Ejecutar en el servidor VPS como root
sudo ./scripts/security/harden-server.sh
```

**Qué hace:**
- ✅ Instala y configura UFW (firewall)
- ✅ Bloquea puertos internos de Docker (5432, 6379, 8080)
- ✅ Configura Fail2Ban con protección para SSH y Traefik
- ✅ Aplica hardening de kernel (SYN cookies, anti-MITM)
- ✅ Prepara soporte para Cloudflare (opcional)

**Puertos abiertos después:**
| Puerto | Servicio | Descripción |
|--------|----------|-------------|
| 22 | SSH | Acceso remoto |
| 80 | HTTP | Traefik (redirige a HTTPS) |
| 443 | HTTPS | Traefik + SSL |

**Puertos bloqueados externamente:**
- `5432` - PostgreSQL (solo interno Docker)
- `6379` - Redis (solo interno Docker)
- `8080` - Traefik ping (solo localhost)

---

## 📋 Scripts Disponibles

### `harden-server.sh`

Script completo de hardening. **Ejecutar una sola vez por servidor.**

```bash
# Descargar y ejecutar
git pull
sudo ./scripts/security/harden-server.sh
```

**Verificación post-ejecución:**
```bash
# Ver estado del firewall
sudo ufw status verbose

# Ver IPs baneadas
sudo fail2ban-client status

# Ver reglas de iptables
sudo iptables -L DOCKER-USER -n

# Ver logs de seguridad
sudo tail -f /var/log/ufw.log
```

---

### `setup-security.sh`

Setup inicial de seguridad (usado por harden-server.sh).

```bash
# No ejecutar directamente - llamado por harden-server.sh
sudo ./security/monitoring/setup-security.sh
```

---

### `monitor.sh`

Script de monitoreo de seguridad.

```bash
# Verificar estado de seguridad
sudo ./security/monitoring/monitor.sh
```

---

## 🛡️ Fail2Ban Configuration

### Jails Activos

| Jail | Propósito | Max Retry | Ban Time |
|------|-----------|-----------|----------|
| `nginx-http-auth` | Fuerza bruta en auth | 3 | 1 hora |
| `nginx-limit-req` | Rate limiting abuse | 10 | 1 hora |
| `nginx-badbots` | Bots/scanners | 2 | 24 horas |
| `nginx-http-flood` | HTTP floods | 200 | 2 horas |
| `nginx-ssl-abuse` | SSL/TLS abuse | 5 | 1 hora |
| `sshd` | SSH brute force | 3 | 1 hora |

### Comandos Útiles

```bash
# Ver estado de todos los jails
sudo fail2ban-client status

# Ver IPs baneadas por un jail específico
sudo fail2ban-client status sshd
sudo fail2ban-client status nginx-http-flood

# Desbanear IP manualmente
sudo fail2ban-client set sshd unbanip 192.168.1.100

# Ver logs de fail2ban
sudo tail -f /var/log/fail2ban.log
```

---

## ☁️ Cloudflare (Opcional)

Si usas Cloudflare como proxy:

```bash
# Actualizar IPs de Cloudflare en UFW
sudo /usr/local/bin/update-cloudflare-ips.sh
```

**Agregar al cron para actualización diaria:**
```bash
echo "0 3 * * * /usr/local/bin/update-cloudflare-ips.sh" | sudo crontab -
```

**Beneficios de Cloudflare:**
- DDoS protection
- WAF (Web Application Firewall)
- CDN global
- Oculta IP real del servidor

---

## 🔍 Troubleshooting

### UFW bloquea el acceso SSH

```bash
# Desde consola VPS (emergencia)
sudo ufw disable

# O reiniciar servidor y volver a configurar
```

### Fail2Ban no inicia

```bash
# Verificar configuración
sudo fail2ban-client -t

# Ver logs
sudo tail -f /var/log/fail2ban.log

# Reiniciar
sudo systemctl restart fail2ban
```

### Docker no puede conectar a internet

```bash
# Verificar que UFW permite outgoing
sudo ufw default allow outgoing

# Verificar reglas DOCKER-USER
sudo iptables -L DOCKER-USER -n
```

### Puertos de DB expuestos

```bash
# Verificar desde fuera del servidor
nmap -p 5432,6379 <tu-ip-publica>

# Si están abiertos, revisar UFW
sudo ufw status
sudo iptables -L DOCKER-USER -n | grep DROP
```

---

## 📊 Monitoreo de Seguridad

### Logs importantes

```bash
# Firewall
sudo tail -f /var/log/ufw.log

# Fail2Ban
sudo tail -f /var/log/fail2ban.log

# Auth (SSH)
sudo tail -f /var/log/auth.log

# Workplace Security (si existe)
sudo tail -f /var/log/workplace-security.log
```

### Alertas automáticas

El script `monitor.sh` configura cron para verificar:
- IPs baneadas (threshold: 50)
- Tasa de requests HTTP (threshold: 100/min)
- Errores (threshold: 10/min)
- Expiración de certificados SSL (< 7 días)

---

## 🔐 Checklist de Seguridad Pre-Deploy

- [ ] Ejecutar `harden-server.sh` en VPS
- [ ] Verificar UFW: solo 22, 80, 443 abiertos
- [ ] Verificar Fail2Ban está activo
- [ ] Confirmar puertos 5432 y 6379 bloqueados externamente
- [ ] Configurar Cloudflare (si se usa)
- [ ] Probar login funciona después del hardening
- [ ] Documentar IP de acceso de emergencia

---

## 📚 Referencias

- [UFW Documentation](https://help.ubuntu.com/community/UFW)
- [Fail2Ban Manual](https://www.fail2ban.org/wiki/index.php/MANUAL_0_8)
- [Docker Security](https://docs.docker.com/engine/security/)
- [Cloudflare IPs](https://www.cloudflare.com/ips/)

---

## ⚠️ Advertencias

1. **NO ejecutar `harden-server.sh` en desarrollo local** - puede bloquear puertos necesarios
2. **Tener acceso a consola VPS** antes de ejecutar (por si UFW bloquea SSH)
3. **Probar en staging primero** si es posible
4. **Backup de configuración actual** antes de aplicar cambios

---

**Última actualización:** Marzo 2026  
**Versión:** 1.0.0
