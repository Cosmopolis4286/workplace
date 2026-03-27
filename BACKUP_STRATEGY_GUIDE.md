# 📋 Estrategia de Backups - Optimizada para 4GB RAM

## 🎯 Objetivo
Backups confiables sin consumir recursos extra del stack principal.

## 📊 Comparación de Estrategias

| Estrategia | Consumo RAM | Complejidad | Confiabilidad | Recomendación |
|------------|---------------|-------------|---------------|----------------|
| Docker Backup | 200-400MB | Media | Alta | ❌ No recomendado |
| Host Crontab | 0MB | Baja | Máxima | ✅ **Recomendado** |
| Script Manual | 0MB | Baja | Media | ⚠️ Depende de humano |

## 🚀 Opción 1: Host Crontab (Recomendada)

### Ventajas
- ✅ 0MB consumo extra del stack
- ✅ Crontab nativo del SO
- ✅ Máxima fiabilidad
- ✅ Backups fuera de Docker
- ✅ Recuperación independiente

### Instalación
```bash
# 1. Instalar script de backups
chmod +x scripts/backup/host-backup.sh

# 2. Instalar crontab
./scripts/backup/host-backup.sh install

# 3. Ver crontab instalado
crontab -l
```

### Crontab Generado
```bash
# PostgreSQL: Diario a las 2 AM
0 2 * * * /opt/workplace/scripts/backup/host-backup.sh postgres >> /var/log/workplace-backups.log 2>&1

# Redis: Diario a las 3 AM  
0 3 * * * /opt/workplace/scripts/backup/host-backup.sh redis >> /var/log/workplace-backups.log 2>&1

# Uploads: Semanal domingos 4 AM
0 4 * * 0 /opt/workplace/scripts/backup/host-backup.sh uploads >> /var/log/workplace-backups.log 2>&1

# Limpieza: Diario 5 AM
0 5 * * * /opt/workplace/scripts/backup/host-backup.sh cleanup >> /var/log/workplace-backups.log 2>&1
```

### Uso
```bash
# Backup individual
./scripts/backup/host-backup.sh postgres
./scripts/backup/host-backup.sh redis
./scripts/backup/host-backup.sh uploads

# Todos los backups
./scripts/backup/host-backup.sh all

# Estado actual
./scripts/backup/host-backup.sh status
```

## 🐳 Opción 2: Docker Backup Container

### Ventajas
- ✅ Todo dentro de Docker
- ✅ Configuración centralizada
- ✅ Logs unificados
- ✅ Control via docker-compose

### Desventajas
- ❌ Consumo extra 50-100MB RAM
- ❌ Complejidad adicional
- ❌ Dependencia del stack principal

### Uso
```bash
# Iniciar servicio de backups
docker-compose -f docker-compose.backup-lite.yml up -d

# Ver logs
docker logs -f workplace_backup

# Detener
docker-compose -f docker-compose.backup-lite.yml down
```

## �️ Opción 3: Docker Backup Seguro (Recomendado)

### Ventajas
- ✅ Todo dentro de Docker
- ✅ Sin acceso root al host (seguro)
- ✅ Configuración centralizada
- ✅ Logs unificados
- ✅ Control via docker-compose

### Desventajas
- ⚠️ Requiere configuración de red manual
- ⚠️ Comunicación entre contenedores

### Uso
```bash
# Iniciar servicio de backups seguro
docker-compose -f docker-compose.backup-secure.yml up -d

# Ver logs
docker logs -f workplace_backup

# Detener
docker-compose -f docker-compose.backup-secure.yml down
```

## 🔥 Comparación Final de Estrategias

| Estrategia | Consumo RAM | Seguridad | Complejidad | Fiabilidad | Recomendación |
|------------|---------------|----------|-------------|------------|----------------|
| Host Crontab | 0MB | Máxima | Baja | Alta | ⭐⭐⭐ |
| Docker Lite | 50MB | Media | Media | Alta | ⭐⭐ |
| Docker Seguro | 50MB | Alta | Alta | Alta | ⭐⭐ |

### 🔧 Configuración de Red (para Docker Seguro)

```bash
# Crear red externa si no existe
docker network create workplace_private_network --driver bridge --internal=false

# O usar red existente del stack principal
```

## �📁 Estructura de Backups

```
/opt/workplace/backups/
├── postgres/
│   ├── postgres_20240327_020000.sql
│   ├── postgres_20240326_020000.sql.gz
│   └── ...
├── redis/
│   ├── redis_20240327_030000.rdb
│   ├── redis_20240326_030000.rdb.gz
│   └── ...
├── uploads/
│   ├── uploads_20240324_040000.tar.gz
│   └── ...
└── logs/
    └── workplace-backups.log
```

## 🔄 Proceso de Restore

### PostgreSQL
```bash
# Desde host
docker exec -i postgres psql -U $POSTGRES_USER -d $POSTGRES_DB < /opt/workplace/backups/postgres_latest.sql

# Desde archivo comprimido
gunzip -c /opt/workplace/backups/postgres_latest.sql.gz | docker exec -i postgres psql -U $POSTGRES_USER -d $POSTGRES_DB
```

### Redis
```bash
# Copiar RDB al contenedor
docker cp /opt/workplace/backups/redis_latest.rdb redis:/data/dump.rdb

# Reiniciar Redis
docker restart redis
```

### Uploads
```bash
# Extraer uploads
tar xzf /opt/workplace/backups/uploads_latest.tar.gz -C /tmp/

# Copiar al volumen
docker cp /tmp/uploads/. uploads_data:/app/
```

## 📈 Monitoreo de Backups

### Script de monitoreo
```bash
#!/bin/bash
# monitor-backups.sh
echo "📊 Estado de backups:"
echo "Último PostgreSQL: $(ls -t /opt/workplace/backups/postgres/ | head -1)"
echo "Último Redis: $(ls -t /opt/workplace/backups/redis/ | head -1)"
echo "Último Uploads: $(ls -t /opt/workplace/backups/uploads/ | head -1)"
echo "Uso de disco: $(du -sh /opt/workplace/backups)"
```

### Alertas simples
```bash
# Agregar a crontab (verificación de backups)
0 6 * * * /opt/workplace/scripts/monitor-backups.sh | mail -s "Backup Status" admin@tudominio.com
```

## 🎯 Recomendación Final

**Usar Opción 1 (Host Crontab) porque:**

1. **Cero impacto** en el stack principal
2. **Máxima fiabilidad** - crontab nativo
3. **Independencia total** - backups fuera de Docker
4. **Recursos para app** - toda la RAM para la aplicación
5. **Simplicidad** - menos puntos de fallo

**Resultado: Stack estable de 2CPU/4GB RAM con backups confiables sin overhead.**
