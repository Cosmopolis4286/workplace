# 🚀 Deploy Limpio - Workplace LITE (PROD)

## Requisitos Previos

- Servidor con Docker y Docker Compose instalados
- 2 CPU / 4GB RAM mínimo
- Puerto 80 y 443 abiertos
- Dominio apuntando al servidor

## Pasos para Deploy

### 1. Clonar/Copiar el proyecto

```bash
# En tu servidor
sudo mkdir -p /opt
sudo chown $USER:$USER /opt
cd /opt

# Copiar el proyecto (desde tu máquina local o git)
git clone <tu-repo> workplace
# O copiar archivos: scp -r ./workplace user@server:/opt/
```

### 2. Preparar el entorno

```bash
cd /opt/workplace

# Copiar y editar el archivo de entorno
cp .env.example .env
nano .env  # Editar con tus valores
```

**Variables mínimas requeridas en `.env`:**
```bash
# Dominio (ej: midominio.com)
DOMAIN=tudominio.com

# Email para Let's Encrypt
EMAIL=admin@tudominio.com

# Base de datos
POSTGRES_USER=workplace
POSTGRES_PASSWORD=$(openssl rand -base64 32)
POSTGRES_DB=workplace

# Redis
REDIS_PASSWORD=$(openssl rand -base64 32)

# Puerto del backend
NODE_PORT=3001
FRONTEND_PORT=3000
```

### 3. Ejecutar el deploy

```bash
cd /opt/workplace
chmod +x scripts/deploy.sh
./scripts/deploy.sh
```

### 4. Verificar el deploy

```bash
# Ver logs en tiempo real
docker-compose -f docker-compose.lite.yml logs -f

# Ver estado de servicios
docker-compose -f docker-compose.lite.yml ps

# Test de endpoints
curl -I https://tudominio.com/api/ready
curl -I https://tudominio.com
```

### 5. Backups (automático)

Los backups se ejecutan automáticamente a las **2:00 AM** todos los días.

```bash
# Ver backups existentes
ls -la /opt/workplace/backups/

# Backup manual (opcional)
docker-compose -f docker-compose.lite.yml exec backup /scripts/backup.sh
```

## Comandos Útiles

```bash
# Reiniciar todo
docker-compose -f docker-compose.lite.yml restart

# Ver logs de un servicio específico
docker-compose -f docker-compose.lite.yml logs -f backend

# Escalar backend (si necesitas más capacidad)
docker-compose -f docker-compose.lite.yml up -d --scale backend=2

# Actualizar imágenes
docker-compose -f docker-compose.lite.yml pull
docker-compose -f docker-compose.lite.yml up -d

# Limpieza completa (⚠️ Elimina datos!)
docker-compose -f docker-compose.lite.yml down -v
```

## Troubleshooting

### Let's Encrypt no emite certificados
```bash
# Verificar permisos
ls -la traefik_letsencrypt/acme.json  # Debe ser 600

# Ver logs de Traefik
docker-compose -f docker-compose.lite.yml logs traefik
```

### PostgreSQL no inicia
```bash
# Verificar permisos del volumen
docker-compose -f docker-compose.lite.yml exec postgres ls -la /var/lib/postgresql/data

# Resetear (⚠️ Pierdes datos!)
docker-compose -f docker-compose.lite.yml down -v
rm -rf /opt/workplace/postgres_data
./scripts/deploy.sh
```

### Backend unhealthy
```bash
# Ver logs
docker-compose -f docker-compose.lite.yml logs backend

# Forzar healthcheck
docker-compose -f docker-compose.lite.yml exec backend curl http://localhost:3001/api/ready
```

## Estructura Final

```
/opt/workplace/
├── docker-compose.lite.yml
├── .env
├── .env.example
├── backups/           # Backups automáticos de PostgreSQL
├── logs/              # Logs de aplicación
├── traefik/
│   ├── dynamic/       # Middlewares y configuración
│   └── ssl/           # Certificados SSL (opcional)
├── traefik_letsencrypt/
│   └── acme.json      # Certificados Let's Encrypt (permisos 600)
└── scripts/
    ├── deploy.sh
    ├── init-traefik-permissions.sh
    └── database/
        └── backup.sh
```

## Seguridad

- ✅ HTTPS forzado por Traefik
- ✅ No se exponen puertos de DB/Redis
- ✅ Backups automáticos diarios
- ✅ Rate limiting activo
- ✅ Headers de seguridad configurados
- ✅ Redis sin comandos peligrosos (FLUSHALL, FLUSHDB, CONFIG)

## Recursos

- **RAM total usada:** ~1.6GB
- **Margen para picos:** ~2.4GB
- **Backups retenidos:** 7 días
- **Logs rotados:** 3 archivos de 10MB máximo

---

Deploy listo para producción real 🎉
