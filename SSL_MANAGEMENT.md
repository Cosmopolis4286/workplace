# 🔒 SSL Management Strategy - Workplace Infrastructure

## 📋 Por Qué Desacoplar SSL?

**Problema anterior:**
- ❌ Certbot acoplado al stack principal
- ❌ Dependencia circular (nginx ↔ certbot)
- ❌ Complejidad en deployment y scaling
- ❌ Violación del principio de separación de concerns

**Solución actual:**
- ✅ SSL management externo
- ✅ Stack principal limpio y desacoplado
- ✅ Flexibilidad en estrategias SSL
- ✅ Mejor mantenibilidad y escalabilidad

---

## 🚀 Arquitectura SSL Desacoplada

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   SSL Scripts    │    │   SSL Storage    │    │   Nginx Stack    │
│                 │    │                  │    │                 │
│ setup-ssl.sh    │───▶│ ./ssl/certificates│───▶│ Static SSL      │
│ auto-renew.sh   │    │ ./logs/ssl       │    │ HTTPS only      │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

---

## 🛠️ Estrategias SSL Disponibles

### 1. Self-Signed (Desarrollo)
**Uso:** Entornos de desarrollo y staging local

**Ventajas:**
- ✅ Sin dependencias externas
- ✅ Generación instantánea
- ✅ Perfecto para localhost

**Desventajas:**
- ❌ No confiable para producción
- ❌ Advertencias de navegador

**Comandos:**
```bash
# Setup inicial
./scripts/ssl/setup-ssl.sh setup

# Generar certificados
./scripts/ssl/setup-ssl.sh self-signed

# Verificar
./scripts/ssl/setup-ssl.sh verify
```

### 2. Let's Encrypt (Producción)
**Uso:** Producción con dominios públicos

**Ventajas:**
- ✅ Certificados gratuitos y confiables
- ✅ Automatización completa
- ✅ Soporte wildcard

**Desventajas:**
- ❌ Requiere dominio público
- ❌ Dependencia de internet

**Comandos:**
```bash
# Obtener certificados
./scripts/ssl/setup-ssl.sh letsencrypt

# Renovación manual
./scripts/ssl/setup-ssl.sh renew

# Auto-renovación
./scripts/ssl/setup-ssl.sh cron
```

### 3. Importación (Enterprise)
**Uso:** Certificados existentes o CA interna

**Ventajas:**
- ✅ Control total
- ✅ Compatible con CA interna
- ✅ Migración desde otros sistemas

**Desventajas:**
- ❌ Gestión manual de renovación

**Comandos:**
```bash
# Importar certificados existentes
./scripts/ssl/setup-ssl.sh import /path/to/certificates

# Verificar importación
./scripts/ssl/setup-ssl.sh verify
```

---

## 📁 Estructura de Directorios

```
workplace/
├── ssl/
│   └── certificates/
│       ├── live/
│       │   └── domain.com/
│       │       ├── fullchain.pem
│       │       ├── privkey.pem
│       │       └── chain.pem
│       ├── archive/
│       │   └── domain.com/
│       └── renewal/
├── scripts/
│   └── ssl/
│       ├── setup-ssl.sh
│       └── auto-renew.sh
├── logs/
│   └── ssl/
└── docker-compose.yml (sin certbot)
```

---

## 🔄 Flujo de Trabajo SSL

### Desarrollo Local
```bash
# 1. Setup SSL
./scripts/ssl/setup-ssl.sh setup

# 2. Generar self-signed
./scripts/ssl/setup-ssl.sh self-signed

# 3. Iniciar stack
docker compose up -d

# 4. Verificar HTTPS
curl -k https://localhost
```

### Producción
```bash
# 1. Configurar DNS para el dominio
# 2. Setup SSL
./scripts/ssl/setup-ssl.sh setup

# 3. Obtener certificados Let's Encrypt
./scripts/ssl/setup-ssl.sh letsencrypt

# 4. Configurar auto-renovación
./scripts/ssl/setup-ssl.sh cron

# 5. Iniciar stack
docker compose up -d

# 6. Verificar
curl https://yourdomain.com
```

### Enterprise (CA Interna)
```bash
# 1. Obtener certificados de CA interna
# 2. Setup SSL
./scripts/ssl/setup-ssl.sh setup

# 3. Importar certificados
./scripts/ssl/setup-ssl.sh import /path/to/ca/certs

# 4. Verificar
./scripts/ssl/setup-ssl.sh verify

# 5. Iniciar stack
docker compose up -d
```

---

## 🛡️ Configuración de Seguridad

### Nginx SSL Configuration
```nginx
# SSL/TLS Configuration
ssl_protocols TLSv1.2 TLSv1.3;
ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512;
ssl_prefer_server_ciphers off;
ssl_session_cache shared:SSL:50m;
ssl_session_timeout 1d;
ssl_session_tickets off;

# OCSP Stapling
ssl_stapling on;
ssl_stapling_verify on;

# Security Headers
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
add_header X-Frame-Options "SAMEORIGIN" always;
add_header X-Content-Type-Options "nosniff" always;
```

### Permisos de Archivos
```bash
# Permisos seguros para certificados
chmod 600 ./ssl/certificates/live/*/privkey.pem
chmod 644 ./ssl/certificates/live/*/fullchain.pem
chmod 644 ./ssl/certificates/live/*/chain.pem

# Owner correcto
chown -R root:root ./ssl/certificates/
```

---

## 🔧 Automatización y CI/CD

### GitHub Actions
```yaml
name: SSL Management
on:
  schedule:
    - cron: '30 3 * * *'  # Daily at 3:30 AM
  workflow_dispatch:

jobs:
  ssl-renewal:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Renew SSL Certificates
        run: ./scripts/ssl/setup-ssl.sh renew
      - name: Restart Services
        run: docker compose restart nginx
```

### Cron Job Local
```bash
# Verificar cron job activo
crontab -l | grep ssl

# Logs de renovación
tail -f ./logs/ssl/renewal.log
```

---

## 📊 Monitoreo SSL

### Verificación Manual
```bash
# Verificar validez del certificado
openssl x509 -in ./ssl/certificates/live/domain.com/fullchain.pem -noout -dates

# Verificar configuración SSL
nmap --script ssl-enum-ciphers -p 443 domain.com

# Test de seguridad SSL
testssl.sh https://domain.com
```

### Monitoreo Automático
```bash
# Script de monitoreo
./scripts/ssl/monitor-ssl.sh

# Alertas por email (opcional)
./scripts/ssl/ssl-alerts.sh
```

---

## 🚨 Troubleshooting

### Problemas Comunes

#### 1. Certificado no encontrado
```bash
# Error: nginx: [emerg] cannot load certificate
# Solución: Verificar rutas y permisos
ls -la ./ssl/certificates/live/${DOMAIN}/
./scripts/ssl/setup-ssl.sh verify
```

#### 2. Let's Encrypt falla
```bash
# Error: DNS problem: NXDOMAIN
# Solución: Verificar configuración DNS
nslookup ${DOMAIN}
dig ${DOMAIN}
```

#### 3. Auto-renovación no funciona
```bash
# Error: Cron job no ejecuta
# Solución: Verificar cron y permisos
crontab -l
./scripts/ssl/setup-ssl.sh cron
```

#### 4. Certificado expirado
```bash
# Error: Certificate has expired
# Solución: Renovar manualmente
./scripts/ssl/setup-ssl.sh renew
docker compose restart nginx
```

### Debug Mode
```bash
# Debug con verbosidad
./scripts/ssl/setup-ssl.sh letsencrypt 2>&1 | tee ./logs/ssl/debug.log

# Verificar configuración nginx
docker compose exec nginx nginx -t
```

---

## 🔄 Migración desde Certbot

### Backup Actual
```bash
# Backup certbot certificates
cp -r ./certbot/conf ./ssl/certificates.backup

# Migrar a nueva estructura
./scripts/ssl/setup-ssl.sh import ./certbot/conf/live/${DOMAIN}
```

### Limpieza
```bash
# Remover certbot del stack
docker compose down
# (Ya removido en docker-compose.yml)

# Limpiar directorios certbot (opcional)
rm -rf ./certbot
```

---

## 📈 Mejoras Futuras

### 1. ACME Client Integrado
- Cliente ACME propio en Go/Rust
- Integración con DNS providers
- Wildcard certificates automáticos

### 2. Zero-Trust SSL
- mTLS para comunicación interna
- Certificate rotation automático
- Vault integration

### 3. Multi-Cloud SSL
- Certificados distribuidos
- CDN integration
- Global load balancing

---

## 🎯 Mejores Prácticas

1. **Siempre verificar** certificados después de generar/importar
2. **Automatizar renovación** para evitar expiración
3. **Monitorear logs** de SSL renewal
4. **Testear** en staging antes de producción
5. **Backup** certificados regularmente
6. **Documentar** proceso de emergencia
7. **Rotar keys** periódicamente
8. **Usar HTTPS** estrictamente (no HTTP)

---

**🏁 Veredicto:** Stack completamente desacoplado con gestión SSL externa, flexible y mantenible.
