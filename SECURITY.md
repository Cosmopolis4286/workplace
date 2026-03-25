# 🔒 Workplace Security Guide

## 🛡️ **Security Components Implemented**

### **1. Fail2Ban Configuration**
- **HTTP Auth Protection**: Bloquea intentos de autenticación fallidos
- **Rate Limiting Protection**: Detecta y bloquea excesos de rate limiting
- **Bot Protection**: Bloquea bots y scanners maliciosos
- **HTTP Flood Protection**: Protege contra ataques de denegación de servicio
- **SSL Abuse Protection**: Detecta abusos en handshake SSL/TLS
- **ACME Challenge Protection**: Previene abuso de desafíos Let's Encrypt

### **2. Enhanced Nginx Security**
- **Rate Limiting**: 50 requests/second por IP
- **Connection Limiting**: Máximo 10 conexiones por IP
- **Security Headers**: CSP, HSTS, XSS Protection, etc.
- **Request Size Limits**: Protección contra ataques de payload grandes
- **Timeout Protection**: Defiende contra ataques slowloris
- **File Upload Protection**: Previene ejecución de archivos maliciosos

### **3. Real-time Monitoring**
- **Traffic Pattern Analysis**: Detección de patrones anómalos
- **ACME Abuse Detection**: Monitoreo de desafíos SSL
- **Authentication Monitoring**: Detección de brute force
- **SSL Certificate Monitoring**: Alertas de expiración
- **Suspicious Pattern Detection**: SQLi, XSS, etc.

## 🚀 **Deploy Security Components**

### **Opción 1: Docker Compose (Recomendado)**
```bash
# Iniciar con seguridad
docker compose -f docker-compose.yml -f docker-compose.security.yml up -d

# Verificar estado
docker compose ps
docker logs workplace_security_monitor --tail=10
```

### **Opción 2: Setup Manual (Host)**
```bash
# Ejecutar script de seguridad
chmod +x security/monitoring/setup-security.sh
sudo ./security/monitoring/setup-security.sh

# Verificar Fail2Ban
sudo fail2ban-client status
sudo fail2ban-client status nginx-http-flood
```

## 📊 **Monitoreo y Logs**

### **Logs de Seguridad**
```bash
# Logs del monitor
tail -f logs/security/monitor.log

# Logs de nginx con seguridad
tail -f logs/nginx/security_access.log
tail -f logs/nginx/security_error.log

# Logs de Fail2Ban
sudo tail -f /var/log/fail2ban.log
```

### **Comandos de Monitoreo**
```bash
# Estado general de seguridad
docker exec workplace_security_monitor cat /var/log/security/monitor.log | tail -20

# IPs baneadas por Fail2Ban
sudo fail2ban-client status nginx-http-flood

# Análisis de tráfico reciente
docker exec workplace_nginx tail -100 /var/log/nginx/security_access.log | awk '{print $1}' | sort | uniq -c | sort -nr | head -10

# Intentos de autenticación fallidos
docker exec workplace_nginx tail -100 /var/log/nginx/auth_access.log | grep " [45][0-9][0-9] " | awk '{print $1}' | sort | uniq -c | sort -nr | head -5
```

## ⚙️ **Configuración Personalizada**

### **Ajustar Rate Limiting**
```yaml
# En docker-compose.security.yml
environment:
  - RATE_LIMIT_REQUESTS=100  # Aumentar a 100 req/s
  - RATE_LIMIT_WINDOW=30s    # Ventana de 30 segundos
```

### **Personalizar Fail2Ban**
```bash
# Editar tiempos de baneo
sudo nano /etc/fail2ban/jail.local

# Cambiar bantime (segundos)
# bantime = 7200  # 2 horas en vez de 1 hora
```

### **Ajustar Umbrales de Alerta**
```bash
# Editar monitor.sh
ALERT_THRESHOLD=200  # Aumentar a 200 requests
BAN_THRESHOLD=50     # Aumentar a 50 IPs baneadas
```

## 🚨 **Respuesta a Incidentes**

### **Si recibes alertas:**
1. **Verificar logs**: `tail -f logs/security/monitor.log`
2. **Analizar IPs**: `fail2ban-client status nginx-http-flood`
3. **Revisar tráfico**: `docker exec workplace_nginx tail -1000 /var/log/nginx/security_access.log`
4. **Bloquear manualmente**: `sudo fail2ban-client set nginx-http-flood banip IP_ADDRESS`

### **Desbanear IP (si es falso positivo):**
```bash
sudo fail2ban-client set nginx-http-flood unbanip IP_ADDRESS
```

### **Escalado de amenazas:**
- **Alta tasa de errores**: Revisar configuración de aplicación
- **Muchos baneos**: Considerar aumentar rate limits
- **Patrones sospechosos**: Analizar logs de aplicación

## 🔧 **Mantenimiento**

### **Actualizaciones de seguridad**
```bash
# Actualizar Fail2Ban
sudo apt update && sudo apt upgrade fail2ban

# Recargar configuración
sudo fail2ban-client reload
```

### **Rotación de logs**
```bash
# Verificar configuración de logrotate
sudo nano /etc/logrotate.d/workplace

# Forzar rotación manual
sudo logrotate -f /etc/logrotate.d/workplace
```

### **Backup de configuración**
```bash
# Backup de reglas Fail2Ban
sudo cp -r /etc/fail2ban/ backups/fail2ban-$(date +%Y%m%d)/

# Backup de configuración nginx
cp -r nginx/conf.d/ backups/nginx-$(date +%Y%m%d)/
```

## 📈 **Métricas de Seguridad**

### **KPIs a monitorear:**
- **Tasa de baneos**: IPs baneadas por hora
- **Tasa de errores**: HTTP 4xx/5xx por minuto  
- **Intentos de auth**: Fallidos vs exitosos
- **ACME challenges**: Solicitudes por IP
- **Uso de CPU/Memory**: Impacto de seguridad

### **Dashboard recomendado:**
- Grafana + Prometheus para métricas
- Alertas por Slack/Email
- Reportes diarios/semanales

## 🏆 **Best Practices**

1. **Review logs diariamente**: Primeros 15 minutos del día
2. **Update reglas regularmente**: Nuevas amenazas, nuevos patrones
3. **Test alertas**: Verificar que funcionen las notificaciones
4. **Documentar incidentes**: Aprender de cada ataque
5. **Backup configurations**: Prepararse para recuperación rápida

---

🔒 **Con esta configuración, Workplace está protegido contra:**
- ✅ Ataques de fuerza bruta
- ✅ Denegación de servicio (DoS)
- ✅ Inyección SQL/XSS
- ✅ Abuso de certificados SSL
- ✅ Bots y scanners automatizados
- ✅ Ataques slowloris
- ✅ Upload de archivos maliciosos
