# 🚀 Setup Servidor Production - Root

## 📁 Comandos Directos (Estando como Root en el Servidor)

### 1. Crear Estructura de Directorios
```bash
mkdir -p /opt/workplace/{logs/{deploy,sla},metrics,backups,scripts/{deploy,deployment},nginx/conf.d}
```

### 2. Subir Archivos (Desde tu máquina local)
```bash
# Desde tu máquina local, NO desde el servidor
scp docker-compose.prod.yml root@TU_SERVER_IP:/opt/workplace/
scp -r nginx/ root@TU_SERVER_IP:/opt/workplace/
scp -r scripts/deploy/ root@TU_SERVER_IP:/opt/workplace/scripts/
```

### 3. Opción B: Crear Archivos Directamente en el Servidor
Si prefieres crear los archivos directamente desde el servidor como root:

```bash
# Establecer directorio de trabajo
cd /opt/workplace

# Crear script de inicialización
cat > scripts/deployment/init-backend-prod.sh << 'EOF'
#!/bin/bash
set -euo pipefail
echo "🚀 Inicializando Backend Production..."
cd /app/backend
echo "🔧 Aplicando migraciones Prisma..."
pnpm prisma migrate deploy || true
echo "✅ Migraciones aplicadas"
echo "🚀 Iniciando aplicación backend..."
exec node dist/src/main.js
EOF

# Crear .env base
cat > .env << 'EOF'
ENVIRONMENT=production
POSTGRES_DB=workplace_prod
POSTGRES_USER=workplace_user
POSTGRES_PASSWORD=CHANGE_ME_SECURE_PASSWORD
DATABASE_URL=postgresql://workplace_user:CHANGE_ME_SECURE_PASSWORD@postgres:5432/workplace_prod
REDIS_PASSWORD=CHANGE_ME_REDIS_PASSWORD
REDIS_HOST=redis
REDIS_PORT=6379
NODE_PORT=3001
FRONTEND_PORT=3000
JWT_SECRET=CHANGE_ME_JWT_SECRET_MIN_32_CHARS
SESSION_SECRET=CHANGE_ME_SESSION_SECRET
DOCKER_USERNAME=tu-usuario-docker
COMPOSE_PROJECT_NAME=workplace
LOG_LEVEL=info
METRICS_ENABLED=true
EOF
```

### 4. Establecer Permisos
```bash
chmod +x scripts/deployment/init-backend-prod.sh
chmod +x scripts/deploy/*.sh
chmod -R 755 {logs,metrics,scripts,nginx}
chmod 600 .env
```

### 5. Verificar Estructura
```bash
ls -la /opt/workplace/
tree /opt/workplace/  # si tienes tree instalado
```

## 🔧 Flujo Recomendado

### Opción A: Subir desde Local (Más fácil)
```bash
# Desde tu máquina local (NO desde el servidor)
scp docker-compose.prod.yml root@TU_SERVER_IP:/opt/workplace/
scp -r nginx/ root@TU_SERVER_IP:/opt/workplace/
scp -r scripts/deploy/ root@TU_SERVER_IP:/opt/workplace/scripts/

# Luego conectar al servidor para permisos
ssh root@TU_SERVER_IP
cd /opt/workplace
chmod +x scripts/deployment/init-backend-prod.sh
chmod +x scripts/deploy/*.sh
```

### Opción B: Todo desde el Servidor
```bash
# Ya estando como root en el servidor
cd /opt/workplace

# Esperar a que subas los archivos con scp desde otra terminal
# O crearlos manualmente con nano/vim

nano docker-compose.prod.yml
nano nginx/conf.d/common.conf
# etc...
```

## 📋 Checklist como Root

- [ ] `mkdir -p /opt/workplace/{logs/{deploy,sla},metrics,backups,scripts/{deploy,deployment},nginx/conf.d}`
- [ ] Subir `docker-compose.prod.yml`
- [ ] Subir directorio `nginx/`
- [ ] Subir directorio `scripts/deploy/`
- [ ] Crear `scripts/deployment/init-backend-prod.sh`
- [ ] Crear `.env` con tus datos
- [ ] `chmod +x scripts/deployment/init-backend-prod.sh`
- [ ] `chmod +x scripts/deploy/*.sh`
- [ ] `chmod -R 755 {logs,metrics,scripts,nginx}`
- [ ] `chmod 600 .env`

## 🚀 Para Iniciar Servicios

```bash
cd /opt/workplace
docker-compose up -d
```

## 📝 Variables a Actualizar en .env

```bash
# Reemplaza estos valores:
POSTGRES_PASSWORD=TU_PASSWORD_SEGURO_AQUI
REDIS_PASSWORD=TU_REDIS_PASSWORD_AQUI
JWT_SECRET=TU_JWT_SECRET_MIN_32_CHARS
SESSION_SECRET=TU_SESSION_SECRET_AQUI
DOCKER_USERNAME=tu-usuario-docker-real
```

## � Configurar Permisos para Usuario myapp (Opción 3 - Recomendada)

### Dar Propiedad y Acceso a myapp
```bash
# 1. Dar propiedad completa a myapp
chown -R myapp:myapp /opt/workplace

# 2. Agregar myapp al grupo docker (para docker-compose)
usermod -a -G docker myapp

# 3. Reiniciar servicio Docker para aplicar cambios de grupo
systemctl restart docker

# 4. Verificar acceso
sudo -u myapp ls -la /opt/workplace
sudo -u myapp docker --version 2>/dev/null || echo "Docker no accesible para myapp"
```

### Verificación Completa como myapp
```bash
# Test completo como myapp
sudo -u myapp bash -c "
cd /opt/workplace
ls -la
echo '✅ Acceso correcto'
docker --version && echo '✅ Docker accesible' || echo '❌ Docker no accesible'
"
```

### Configurar SSH para myapp (Opcional)
```bash
# Crear home para myapp si no existe
mkdir -p /home/myapp
chown myapp:myapp /home/myapp

# Configurar SSH
mkdir -p /home/myapp/.ssh
touch /home/myapp/.ssh/authorized_keys
chown -R myapp:myapp /home/myapp/.ssh
chmod 700 /home/myapp/.ssh
chmod 600 /home/myapp/.ssh/authorized_keys
```

### Resumen de Comandos para Permisos
```bash
# Como root ejecutar estos 3 comandos:
chown -R myapp:myapp /opt/workplace
usermod -a -G docker myapp
systemctl restart docker

# Verificar:
sudo -u myapp ls -la /opt/workplace
sudo -u myapp docker --version
```

## 🔍 Verificación Final

```bash
# Verificar estructura
ls -la /opt/workplace/

# Verificar archivos críticos
ls -la /opt/workplace/.env /opt/workplace/docker-compose.prod.yml /opt/workplace/scripts/deployment/init-backend-prod.sh

# Verificar permisos de scripts
ls -la /opt/workplace/scripts/deploy/

# Verificar propietario (debe ser myapp:myapp)
ls -la /opt/workplace | head -5
```

## 🚨 Notas Importantes

- **Reemplaza `TU_SERVER_IP`** con tu IP real del servidor
- **Actualiza las contraseñas** en `.env` antes de iniciar servicios
- **Verifica que Docker y Docker Compose** estén instalados
- **Revisa los logs** después del primer inicio: `docker-compose logs -f`

## 📞 Troubleshooting

### Si no puedes escribir en /opt:
```bash
# Ya que eres root, no debería haber problemas, pero si los hay:
chmod 755 /opt
chown root:root /opt
```

### Si Docker no está instalado:
```bash
# Ubuntu/Debian
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# Docker Compose
curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose
```

### Si los permisos no se aplican:
```bash
# Forzar permisos como root
chmod -R 755 /opt/workplace
chmod +x /opt/workplace/scripts/deployment/init-backend-prod.sh
chmod +x /opt/workplace/scripts/deploy/*.sh

# Asegurar propietario correcto
chown -R myapp:myapp /opt/workplace
```

---

## ✅ Listo para Deploy

Una vez completados estos pasos, tu entorno estará listo para:

1. **Zero Downtime Deployments** con Canary Real
2. **SLA Monitoring** en tiempo real  
3. **Rolling Updates** controlados
4. **Auto-healing** y rollback automático

🎉 **Tu infraestructura enterprise estará lista!**
