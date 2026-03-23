#!/bin/bash

# Monitor de contenedores Docker con health check
# Reinicia automáticamente contenedores en estado unhealthy

# Configuración
LOGFILE="${LOGFILE:-/var/log/docker-monitor.log}"
MAX_RESTARTS="${MAX_RESTARTS:-3}"
RESTART_WINDOW="${RESTART_WINDOW:-300}"  # 5 minutos en segundos
LOCKFILE="/tmp/docker-monitor.lock"

# Función de logging
log() {
    local level="$1"
    shift
    local message="$*"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo "[$timestamp] [$level] $message" >> "$LOGFILE"
}

# Función para verificar si el script ya está corriendo
check_lock() {
    if [ -f "$LOCKFILE" ]; then
        local pid=$(cat "$LOCKFILE")
        if ps -p "$pid" > /dev/null 2>&1; then
            log "INFO" "Monitor ya está corriendo (PID: $pid). Saliendo."
            exit 0
        else
            rm -f "$LOCKFILE"
        fi
    fi
    echo $$ > "$LOCKFILE"
}

# Función de limpieza
cleanup() {
    rm -f "$LOCKFILE"
    exit 0
}

# Manejo de señales
trap cleanup SIGTERM SIGINT

# Verificar si Docker está corriendo
if ! docker info > /dev/null 2>&1; then
    log "ERROR" "Docker no está disponible o no se tienen permisos"
    exit 1
fi

# Verificar lock
check_lock

log "INFO" "=== Iniciando monitoreo de contenedores ==="

# Contador para evitar reinicios excesivos
declare -A restart_counts
declare -A last_restart_time

# Itera por todos los contenedores con healthcheck
for CONTAINER in $(docker ps --filter "health=starting" --filter "health=healthy" --filter "health=unhealthy" --format "{{.Names}}"); do
    STATUS=$(docker inspect -f '{{.State.Health.Status}}' "$CONTAINER" 2>/dev/null)
    
    if [ $? -ne 0 ]; then
        log "ERROR" "No se pudo obtener el estado del contenedor $CONTAINER"
        continue
    fi
    
    log "DEBUG" "Contenedor $CONTAINER: estado $STATUS"
    
    if [ "$STATUS" == "unhealthy" ]; then
        current_time=$(date +%s)
        last_restart=${last_restart_time[$CONTAINER]:-0}
        
        # Verificar si estamos en la ventana de reinicio
        if [ $((current_time - last_restart)) -lt $RESTART_WINDOW ]; then
            restart_counts[$CONTAINER]=$((restart_counts[$CONTAINER]:-0 + 1))
            
            if [ ${restart_counts[$CONTAINER]} -ge $MAX_RESTARTS ]; then
                log "WARNING" "Contenedor $CONTAINER ha alcanzado el máximo de reinicios ($MAX_RESTARTS) en $RESTART_WINDOW segundos. Omitiendo reinicio."
                continue
            fi
        else
            # Resetear contador si pasó la ventana de tiempo
            restart_counts[$CONTAINER]=1
        fi
        
        log "WARNING" "Contenedor $CONTAINER está UNHEALTHY. Reiniciando... (intento ${restart_counts[$CONTAINER]}/$MAX_RESTARTS)"
        
        if docker restart "$CONTAINER" > /dev/null 2>&1; then
            log "INFO" "Contenedor $CONTAINER reiniciado exitosamente"
            last_restart_time[$CONTAINER]=$current_time
        else
            log "ERROR" "Falló el reinicio del contenedor $CONTAINER"
        fi
    fi
done

log "INFO" "=== Monitoreo completado ==="
cleanup