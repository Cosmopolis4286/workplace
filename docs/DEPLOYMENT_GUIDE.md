# 📋 Guía de Despliegue - Optimizado para Recursos Limitados

## 🎯 Objetivo
Stack estable en 2CPU/4GB RAM sin swapping ni OOM killer.

## 📊 Consumo Optimizado

| Servicio | RAM Estimada | CPU | Estado |
|----------|----------------|------|---------|
| Traefik | 100-128 MB | 0.3 | ✅ Esencial |
| Backend | 400-512 MB | 0.5 | ✅ Optimizado |
| Frontend | 200-256 MB | 0.5 | ✅ Ligero |
| PostgreSQL | 500-600 MB | 0.5 | ✅ Tuning |
| Redis | 100-150 MB | 0.2 | ✅ Minimal |
| **TOTAL** | **~1.3-1.6 GB** | **2.0** | ✅ **Estable** |

## 🚀 Comandos de Despliegue

### Opción 1: Stack Lite (Recomendado)
```bash
# Usar versión optimizada
docker-compose -f docker-compose.lite.yml up -d

# Ver consumo
docker stats --no-stream
```

### Opción 2: Stack Completo (Solo si tienes 8GB+ RAM)
```bash
# Stack completo (consume ~3.5-5GB)
docker-compose up -d

# Monitorear consumo
docker stats --no-stream
```

## 🔧 Configuración de Producción

### 1. Variables de Entorno
```bash
# .env
DOMAIN=tudominio.com
EMAIL=admin@tudominio.com
NODE_PORT=3000
FRONTEND_PORT=3000
POSTGRES_USER=app_user
POSTGRES_PASSWORD=contraseña_segura_123
POSTGRES_DB=app_db
REDIS_PASSWORD=redis_seguro_456
```

### 2. SSL Automático
```bash
# Let's Encrypt se configura automáticamente
# Ver certificados:
docker exec traefik ls -la /letsencrypt/acme.json
```

### 3. Backups Esenciales
Los backups los hace `scripts/backup/host-backup.sh` desde el cron del host
(`host-backup.sh install`; requiere `apt install cron`) y antes de cada deploy:

```bash
# Postgres (diario 02:00), Redis (03:00) y archivos subidos (04:00):
# públicos (uploads_*) y privados — KYC y comprobantes — (private-uploads_*)
/opt/workplace/scripts/backup/host-backup.sh all
/opt/workplace/scripts/backup/host-backup.sh status

# Restaurar archivos subidos (con el backend detenido):
docker run --rm -v workplace_uploads_data:/target -v /opt/workplace/backups/uploads:/backup alpine:3 \
  sh -c 'tar xzf /backup/uploads_<fecha>.tar.gz -C /target'
docker run --rm -v workplace_private_uploads_data:/target -v /opt/workplace/backups/uploads:/backup alpine:3 \
  sh -c 'tar xzf /backup/private-uploads_<fecha>.tar.gz -C /target'
```

## 📈 Monitoreo Básico

### Health Checks
```bash
# Ver servicios saludables
docker ps --format "table {{.Names}}\t{{.Status}}"

# Ver logs recientes
docker logs --tail 50 backend
docker logs --tail 50 frontend
```

### Consumo de Recursos
```bash
# Tiempo real
docker stats

# Snapshot
docker stats --no-stream --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}"

# Alertas simples
watch -n 5 'docker stats --no-stream --format "table {{.Container}}\t{{.MemUsage}}"'
```

## 🚨 Escalado y Problemas

### Señales de Alerta
- **RAM > 3.5GB**: Reducir conexiones PostgreSQL
- **CPU > 80%**: Considerar cache más agresivo
- **Swap activo**: Inmediatamente reducir carga

### Acciones Correctivas
```bash
# Si hay swapping:
docker-compose down
# Reducir mem_limit en postgres de 600m a 400m
docker-compose -f docker-compose.lite.yml up -d

# Si CPU alta:
# Aumentar cache en Redis o agregar CDN
```

## 🔐 Seguridad Esencial

### Firewall Básico
```bash
# Solo puertos necesarios
ufw allow 80/tcp
ufw allow 443/tcp
ufw deny 5432/tcp  # PostgreSQL solo interno
ufw deny 6379/tcp  # Redis solo interno
```

### Updates Automáticos
```bash
# Script de updates simples
#!/bin/bash
docker-compose -f docker-compose.lite.yml pull
docker-compose -f docker-compose.lite.yml up -d
docker system prune -f
```

## 📝 Checklist Pre-Producción

- [ ] Variables de entorno configuradas
- [ ] Dominio apunta al servidor
- [ ] Puerto 80/443 abiertos
- [ ] SSL configurado (Let's Encrypt)
- [ ] Backups automáticos probados
- [ ] Monitoreo básico funcionando
- [ ] Límites de recursos probados bajo carga
- [ ] Logs rotando correctamente

## 🎯 Resultado Esperado

**Stack estable en 2CPU/4GB RAM:**
- ✅ Sin swapping
- ✅ Sin OOM killer
- ✅ Latencias < 200ms
- ✅ CPU < 70% en carga normal
- ✅ RAM estable ~1.5GB
- ✅ SSL automático
- ✅ Backups funcionando

**Monitoreo mínimo pero efectivo.**
