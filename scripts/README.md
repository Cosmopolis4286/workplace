# Scripts Organizados - WorkPlace Manager

## 📁 Estructura de Carpetas

Los scripts han sido organizados por funcionalidad para mejor mantenimiento:

### 🔐 SSL (`scripts/ssl/`)
- `setup-ssl-v2.sh` - Configuración mejorada de SSL con ACME verification
- `setup-ssl-v2-old.sh` - Versión anterior (backup)
- `renew-ssl.sh` - Renovación automática de certificados
- `SSL_SETUP_IMPROVEMENTS.md` - Documentación de mejoras SSL

### 🗄️ Database (`scripts/database/`)
- `backup-postgres.sh` - Backup automático de PostgreSQL
- `restore-postgres.sh` - Restauración de backups
- `migrate-external.sh` - Ejecución de migraciones Prisma
- `seed-external.sh` - Poblado inicial de base de datos

### 📊 Monitoring (`scripts/monitoring/`)
- `docker-monitor.sh` - Monitor de contenedores con auto-restart
- `production-monitor.sh` - Monitoreo completo de producción
- `DOCKER_MONITOR.md` - Documentación de monitoreo

### 🚀 Deployment (`scripts/deployment/`)
- `init-dev.sh` - Inicialización de entorno de desarrollo
- `init-backend-prod.sh` - Inicialización de backend en producción

### 🌐 Nginx (`scripts/nginx/`)
- `nginx-reload.sh` - Reload granular de nginx (usado por certbot)

### 🔧 Utils (`scripts/utils/`)
- `create-env.sh` - Creación de archivo .env para producción
- `update-cloudflare-ips.sh` - Actualización de IPs de Cloudflare

## 🔄 Uso Común

### Desarrollo
```bash
# Iniciar entorno completo
./scripts/deployment/init-dev.sh

# Migraciones manuales
./scripts/database/migrate-external.sh

# Seed manual
./scripts/database/seed-external.sh
```

### Producción
```bash
# Backup de base de datos
./scripts/database/backup-postgres.sh

# Monitoreo completo
./scripts/monitoring/production-monitor.sh

# Configuración SSL
./scripts/ssl/setup-ssl-v2.sh
```

### Mantenimiento
```bash
# Monitor de contenedores
./scripts/monitoring/docker-monitor.sh

# Actualizar IPs de Cloudflare
./scripts/utils/update-cloudflare-ips.sh
```

## 📋 Integraciones

### GitHub Actions
Los scripts son referenciados en `.github/workflows/deploy.yml`:
- `scripts/ssl/setup-ssl-v2.sh` - Configuración SSL en deploy
- `scripts/database/backup-postgres.sh` - Backup en producción
- `scripts/monitoring/production-monitor.sh` - Monitoreo en producción

### Docker Compose
- `scripts/nginx/nginx-reload.sh` - Montado en contenedor nginx para reload SSL

## 🔒 Permisos

Asegúrate de que los scripts tengan permisos de ejecución:
```bash
chmod +x scripts/**/*.sh
```

## 📝 Notas

- Todos los scripts usan `set -euo pipefail` para manejo robusto de errores
- Los scripts de base de datos verifican la conexión antes de operar
- Los scripts de SSL incluyen modo staging para pruebas
- Los scripts de monitoreo generan logs estructurados

## 🚨 Seguridad

- Los scripts de producción solo deben ejecutarse con privilegios adecuados
- Los backups se almacenan con compresión y verificación de integridad
- Los certificados SSL se verifican antes de la renovación
