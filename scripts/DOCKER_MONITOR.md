# Docker Monitor - Monitor de Contenedores con Health Check

Script automatizado para monitorear contenedores Docker con health check y reiniciarlos automáticamente cuando se encuentran en estado `unhealthy`.

## 🚀 Características

- **Monitoreo automático**: Verifica el estado de salud de todos los contenedores con health check
- **Reinicio automático**: Reinicia contenedores que fallan sus health checks
- **Protección contra reinicios excesivos**: Limita el número de reinicios por ventana de tiempo
- **Logging detallado**: Registra todas las acciones con diferentes niveles de severidad
- **Prevención de ejecuciones múltiples**: Usa lock file para evitar múltiples instancias
- **Manejo robusto de errores**: Verifica disponibilidad de Docker y permisos

## 📋 Requisitos

- Docker instalado y corriendo
- Contenedores configurados con health checks
- Permisos de ejecución para el script
- Acceso de escritura a `/var/log/` (o ruta de log alternativa)

## ⚙️ Configuración

El script puede configurarse mediante variables de entorno:

| Variable | Valor por defecto | Descripción |
|----------|-------------------|-------------|
| `LOGFILE` | `/var/log/docker-monitor.log` | Ruta del archivo de log |
| `MAX_RESTARTS` | `3` | Máximo de reinicios permitidos por ventana |
| `RESTART_WINDOW` | `300` | Ventana de tiempo en segundos (5 minutos) |

## 🛠️ Instalación

### 1. Copiar el script
```bash
# Copiar a una ubicación accesible
sudo cp docker-monitor.sh /usr/local/bin/docker-monitor.sh
```

### 2. Dar permisos de ejecución
```bash
sudo chmod +x /usr/local/bin/docker-monitor.sh
```

### 3. Configurar cron para ejecución periódica
```bash
# Editar crontab
crontab -e
```

Añadir una de las siguientes líneas según la frecuencia deseada:

```bash
# Cada 5 minutos (recomendado)
*/5 * * * * /usr/local/bin/docker-monitor.sh

# Cada minuto (para monitoreo intensivo)
* * * * * /usr/local/bin/docker-monitor.sh

# Cada 10 minutos
*/10 * * * * /usr/local/bin/docker-monitor.sh
```

## 📊 Logs y Monitoreo

### Ver logs en tiempo real
```bash
tail -f /var/log/docker-monitor.log
```

### Ver últimos eventos
```bash
tail -n 50 /var/log/docker-monitor.log
```

### Filtrar por nivel
```bash
# Solo errores
grep "ERROR" /var/log/docker-monitor.log

# Solo advertencias
grep "WARNING" /var/log/docker-monitor.log

# Solo reinicios
grep "reiniciado" /var/log/docker-monitor.log
```

## 🔧 Configuración de Health Checks en Docker

Para que el script funcione correctamente, tus contenedores deben tener health checks configurados:

### En docker-compose.yml
```yaml
services:
  app:
    image: myapp:latest
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
```

### En Dockerfile
```dockerfile
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1
```

## 🚨 Solución de Problemas

### El script no se ejecuta
```bash
# Verificar permisos
ls -la /usr/local/bin/docker-monitor.sh

# Verificar cron
crontab -l
```

### No hay logs generados
```bash
# Verificar permisos de escritura
sudo touch /var/log/docker-monitor.log
sudo chmod 666 /var/log/docker-monitor.log
```

### Contenedores no se reinician
```bash
# Verificar si tienen health check
docker ps --format "table {{.Names}}\t{{.Status}}"
```

### Script corriendo múltiples veces
```bash
# Verificar lock file
ls -la /tmp/docker-monitor.lock

# Limpiar si es necesario
sudo rm -f /tmp/docker-monitor.lock
```

## 📝 Ejemplo de Log

```
[2024-03-21 10:30:00] [INFO] === Iniciando monitoreo de contenedores ===
[2024-03-21 10:30:01] [DEBUG] Contenedor backend: estado healthy
[2024-03-21 10:30:01] [DEBUG] Contenedor frontend: state unhealthy
[2024-03-21 10:30:01] [WARNING] Contenedor frontend está UNHEALTHY. Reiniciando... (intento 1/3)
[2024-03-21 10:30:15] [INFO] Contenedor frontend reiniciado exitosamente
[2024-03-21 10:30:15] [INFO] === Monitoreo completado ===
```

## 🔐 Consideraciones de Seguridad

- El script requiere permisos de Docker
- Los logs pueden contener información sensible
- Considera rotación de logs para producción
- Usa rutas de log específicas si `/var/log/` no es accesible

## 📈 Monitoreo Adicional

Para monitoreo avanzado, considera integrar con:
- **Prometheus + Grafana**: Métricas de reinicios
- **Alertmanager**: Notificaciones por correo/Slack
- **ELK Stack**: Análisis centralizado de logs
- **Systemd**: Servicio de sistema en lugar de cron
