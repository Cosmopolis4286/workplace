#!/bin/bash

# host-backup.sh - Backups del stack lite desde el host (cron nativo, sin RAM extra)
#
# Ubica los contenedores por sus labels de Docker Compose (proyecto + servicio),
# no por nombre fijo: en docker-compose.lite.yml postgres/redis no tienen
# container_name y Docker los llama <proyecto>-postgres-1. Las credenciales de
# PostgreSQL se leen del propio contenedor (no dependen del entorno de cron).
#
# Uso: host-backup.sh [postgres|redis|uploads|cleanup|status|check|verify|restore <archivo>|install|all]

set -euo pipefail

DEPLOY_PATH="${DEPLOY_PATH:-/opt/workplace}"
COMPOSE_PROJECT="${COMPOSE_PROJECT:-$(basename "$DEPLOY_PATH")}"
BACKUP_DIR="${BACKUP_DIR:-$DEPLOY_PATH/backups}"
RETENTION_DAYS="${RETENTION_DAYS:-7}"
# Antigüedad máxima aceptable del último backup de PostgreSQL (para `check`)
MAX_AGE_HOURS="${MAX_AGE_HOURS:-26}"
# En DEPLOY_PATH (no /var/log): el usuario de deploy puede no ser root, y si
# cron no puede abrir el log la tarea ni siquiera se ejecuta.
LOG_FILE="${LOG_FILE:-$DEPLOY_PATH/logs/backups.log}"

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

log() { echo -e "${GREEN}[$(date '+%Y-%m-%d %H:%M:%S')]${NC} $1"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
error() {
    echo -e "${RED}[ERROR]${NC} $1" >&2
    exit 1
}

# ID del contenedor en ejecución de un servicio del stack
container_for() {
    local service="$1" id
    id=$(docker ps -q \
        --filter "label=com.docker.compose.project=${COMPOSE_PROJECT}" \
        --filter "label=com.docker.compose.service=${service}" | head -1)
    [[ -n "$id" ]] || error "Contenedor '${service}' del proyecto '${COMPOSE_PROJECT}' no está corriendo"
    echo "$id"
}

# Valor de una variable del .env del deploy (sin ejecutarlo como shell)
env_value() {
    local key="$1" file="$DEPLOY_PATH/.env"
    [[ -f "$file" ]] || return 0
    grep -E "^${key}=" "$file" | tail -1 | cut -d= -f2- | sed -E "s/^['\"]//; s/['\"]$//"
}

setup_backup_dir() {
    mkdir -p "$BACKUP_DIR/postgres" "$BACKUP_DIR/redis" "$BACKUP_DIR/uploads"
}

backup_postgres() {
    log "🗄️ Backup PostgreSQL..."
    local pg file tmp
    pg=$(container_for postgres)
    file="$BACKUP_DIR/postgres/postgres_$(date +%Y%m%d_%H%M%S).sql.gz"
    tmp="${file}.partial"

    # Credenciales del propio contenedor; pipefail detecta un pg_dump fallido.
    if ! timeout 900 docker exec "$pg" sh -c \
        'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" --no-owner --no-privileges' \
        | gzip > "$tmp"; then
        rm -f "$tmp"
        error "❌ Falló pg_dump"
    fi

    gzip -t "$tmp" || { rm -f "$tmp"; error "❌ Backup PostgreSQL corrupto"; }
    # Un dump cortado a la mitad no trae la marca final de pg_dump.
    if ! gzip -dc "$tmp" | tail -n 5 | grep -q "PostgreSQL database dump complete"; then
        rm -f "$tmp"
        error "❌ Backup PostgreSQL incompleto"
    fi

    mv "$tmp" "$file"
    log "✅ PostgreSQL: $(basename "$file") ($(du -h "$file" | cut -f1))"
}

backup_redis() {
    log "🔴 Backup Redis..."
    local rd password before after file
    rd=$(container_for redis)
    password="$(env_value REDIS_PASSWORD)"
    file="$BACKUP_DIR/redis/redis_$(date +%Y%m%d_%H%M%S).rdb"

    redis() { docker exec -e REDISCLI_AUTH="$password" "$rd" redis-cli --no-auth-warning "$@"; }

    # redis-cli devuelve exit 0 aun con error de auth: validar la respuesta.
    before=$(redis LASTSAVE 2>&1 || true)
    [[ "$before" =~ ^[0-9]+$ ]] ||
        error "❌ Redis rechazó la conexión: ${before} (¿REDIS_PASSWORD en $DEPLOY_PATH/.env?)"
    redis BGSAVE 2>&1 | grep -q "Background saving" || error "❌ Falló BGSAVE"
    # BGSAVE es asíncrono: esperar a que LASTSAVE cambie antes de copiar.
    for _ in $(seq 1 60); do
        after=$(redis LASTSAVE)
        [[ "$after" != "$before" ]] && break
        sleep 1
    done
    [[ "$after" != "$before" ]] || error "❌ BGSAVE no terminó en 60s"

    docker cp "$rd:/data/dump.rdb" "$file" || error "❌ Falló copia de dump.rdb"
    gzip "$file"
    log "✅ Redis: $(basename "$file").gz"
}

backup_uploads() {
    log "📁 Backup Uploads..."
    local be volume file
    be=$(container_for backend)
    # Volumen real montado en /app/uploads (Compose le antepone el proyecto:
    # <proyecto>_uploads_data). Montar "uploads_data" a secas crea un volumen
    # nuevo vacío y el backup sale vacío sin error.
    volume=$(docker inspect -f '{{range .Mounts}}{{if eq .Destination "/app/uploads"}}{{.Name}}{{end}}{{end}}' "$be")
    [[ -n "$volume" ]] || error "❌ El backend no tiene un volumen montado en /app/uploads"
    file="uploads_$(date +%Y%m%d_%H%M%S).tar.gz"

    docker run --rm \
        -v "${volume}:/source:ro" \
        -v "$BACKUP_DIR/uploads:/backup" \
        alpine:3 \
        tar czf "/backup/${file}" -C /source . || error "❌ Falló backup de uploads"

    gzip -t "$BACKUP_DIR/uploads/$file" || error "❌ Backup de uploads corrupto"
    log "✅ Uploads: $file ($(tar tzf "$BACKUP_DIR/uploads/$file" | grep -vc '/$') archivos)"
}

latest_postgres_backup() {
    find "$BACKUP_DIR/postgres" -name 'postgres_*.sql.gz' -type f 2>/dev/null | sort | tail -1
}

cleanup_old() {
    log "🗑️ Limpiando backups de más de ${RETENTION_DAYS} días..."
    # Nunca borrar el último backup de PostgreSQL, aunque sea viejo (p. ej. si
    # los backups dejaron de correr, la limpieza no debe dejar la carpeta vacía).
    local keep
    keep="$(latest_postgres_backup)"
    find "$BACKUP_DIR/postgres" -name 'postgres_*.sql.gz' -mtime +"${RETENTION_DAYS}" \
        ! -path "${keep:-/nonexistent}" -delete 2>/dev/null || true
    find "$BACKUP_DIR/postgres" -name '*.partial' -mmin +60 -delete 2>/dev/null || true
    find "$BACKUP_DIR/redis" -name 'redis_*.rdb.gz' -mtime +"${RETENTION_DAYS}" -delete 2>/dev/null || true
    find "$BACKUP_DIR/uploads" -name 'uploads_*.tar.gz' -mtime +"${RETENTION_DAYS}" -delete 2>/dev/null || true
    log "✅ Limpieza completada"
}

show_status() {
    for kind in postgres redis uploads; do
        echo "${kind}:"
        find "$BACKUP_DIR/$kind" -type f -printf '  %TY-%Tm-%Td %TH:%TM  %8s  %f\n' 2>/dev/null | sort | tail -5
    done
    echo "Uso de disco: $(du -sh "$BACKUP_DIR" 2>/dev/null | cut -f1)"
}

# Para monitoreo: falla si el último backup de PostgreSQL no existe o es viejo.
check_freshness() {
    local latest age_h
    latest="$(latest_postgres_backup)"
    [[ -n "$latest" ]] || error "❌ No hay backups de PostgreSQL en $BACKUP_DIR/postgres"
    age_h=$(( ($(date +%s) - $(stat -c %Y "$latest")) / 3600 ))
    if (( age_h > MAX_AGE_HOURS )); then
        error "❌ Último backup de PostgreSQL tiene ${age_h}h (máx ${MAX_AGE_HOURS}h): $(basename "$latest")"
    fi
    log "✅ Último backup de PostgreSQL: $(basename "$latest") (${age_h}h)"
}

# Restaura un dump en una base TEMPORAL dentro del mismo contenedor y la
# borra: prueba que el backup sirve sin tocar la base real.
verify_restore() {
    local file="${1:-$(latest_postgres_backup)}" pg tables
    [[ -n "$file" && -f "$file" ]] || error "❌ No hay backup para verificar"
    pg=$(container_for postgres)
    log "🧪 Verificando restauración de $(basename "$file")..."

    docker exec "$pg" sh -c 'dropdb -U "$POSTGRES_USER" --if-exists backup_verify && createdb -U "$POSTGRES_USER" backup_verify'
    if ! gzip -dc "$file" | docker exec -i "$pg" sh -c \
        'psql -U "$POSTGRES_USER" -d backup_verify -v ON_ERROR_STOP=1 -q' >/dev/null; then
        docker exec "$pg" sh -c 'dropdb -U "$POSTGRES_USER" --if-exists backup_verify' || true
        error "❌ El backup no se pudo restaurar"
    fi
    tables=$(docker exec "$pg" sh -c \
        "psql -U \"\$POSTGRES_USER\" -d backup_verify -tAc \"SELECT count(*) FROM information_schema.tables WHERE table_schema='public'\"")
    docker exec "$pg" sh -c 'dropdb -U "$POSTGRES_USER" backup_verify'
    log "✅ Restauración verificada: ${tables} tablas"
}

# Restaura un dump SOBRE la base real (reemplaza todo su contenido).
restore_postgres() {
    local file="${1:-}" pg
    [[ -n "$file" && -f "$file" ]] || error "Uso: $0 restore <archivo.sql.gz>"
    gzip -t "$file" || error "❌ Backup corrupto: $file"
    pg=$(container_for postgres)
    if [[ "${CONFIRM_RESTORE:-}" != "yes" ]]; then
        echo "⚠️  Esto REEMPLAZA la base de datos de producción con $(basename "$file")."
        read -r -p "Escribe 'restaurar' para continuar: " answer
        [[ "$answer" == "restaurar" ]] || error "Cancelado"
    fi
    log "💾 Backup previo de seguridad antes de restaurar..."
    backup_postgres
    log "🔄 Restaurando $(basename "$file")..."
    docker exec "$pg" sh -c \
        'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -v ON_ERROR_STOP=1 -qc "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"'
    gzip -dc "$file" | docker exec -i "$pg" sh -c \
        'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -v ON_ERROR_STOP=1 -q' >/dev/null \
        || error "❌ Falló la restauración (hay un backup previo en $BACKUP_DIR/postgres)"
    log "✅ Restauración completada. Reinicia el backend: docker compose -f $DEPLOY_PATH/docker-compose.lite.yml restart backend"
}

install_crontab() {
    log "⏰ Instalando crontab de backups..."
    command -v crontab >/dev/null || error "❌ crontab no está instalado (apt install cron)"
    local script tmp
    mkdir -p "$(dirname "$LOG_FILE")"
    script="$(readlink -f "$0")"
    tmp=$(mktemp)
    # Reemplaza solo el bloque propio; conserva el resto del crontab tal cual.
    crontab -l 2>/dev/null | sed '/# >>> workplace-backups/,/# <<< workplace-backups/d' > "$tmp" || true
    cat >> "$tmp" <<EOF
# >>> workplace-backups (gestionado por host-backup.sh install)
0 2 * * * DEPLOY_PATH=$DEPLOY_PATH $script postgres >> $LOG_FILE 2>&1
0 3 * * * DEPLOY_PATH=$DEPLOY_PATH $script redis >> $LOG_FILE 2>&1
0 4 * * 0 DEPLOY_PATH=$DEPLOY_PATH $script uploads >> $LOG_FILE 2>&1
30 4 * * 0 DEPLOY_PATH=$DEPLOY_PATH $script verify >> $LOG_FILE 2>&1
0 5 * * * DEPLOY_PATH=$DEPLOY_PATH $script cleanup >> $LOG_FILE 2>&1
0 9 * * * DEPLOY_PATH=$DEPLOY_PATH $script check >> $LOG_FILE 2>&1
# <<< workplace-backups
EOF
    crontab "$tmp" || { rm -f "$tmp"; error "❌ Falló instalación de crontab"; }
    rm -f "$tmp"
    log "✅ Crontab instalado (revisar con: crontab -l)"
}

main() {
    local cmd="${1:-}"
    case "$cmd" in
        status|check|install|"") ;;
        *)
            # Un solo backup a la vez; si hay otro corriendo (cron + deploy),
            # esperar en lugar de fallar.
            setup_backup_dir
            exec 9>"$BACKUP_DIR/.lock"
            flock -w 1800 9 || error "Otro backup sigue en curso tras 30 min"
            ;;
    esac

    case "$cmd" in
        postgres) backup_postgres ;;
        redis) backup_redis ;;
        uploads) backup_uploads ;;
        cleanup) cleanup_old ;;
        status) show_status ;;
        check) check_freshness ;;
        verify) verify_restore "${2:-}" ;;
        restore) restore_postgres "${2:-}" ;;
        install) install_crontab ;;
        all)
            backup_postgres
            backup_redis
            backup_uploads
            cleanup_old
            ;;
        *)
            cat <<EOF
Uso: $0 <comando>

  postgres            Backup de PostgreSQL (pg_dump comprimido y verificado)
  redis               Backup de Redis (BGSAVE + dump.rdb)
  uploads             Backup del volumen de uploads
  cleanup             Borra backups de más de ${RETENTION_DAYS} días (conserva el último de PostgreSQL)
  status              Muestra los últimos backups
  check               Falla si el último backup de PostgreSQL tiene más de ${MAX_AGE_HOURS}h
  verify [archivo]    Restaura en una base temporal para probar el backup
  restore <archivo>   Restaura sobre la base real (pide confirmación)
  install             Instala/actualiza las tareas de cron
  all                 postgres + redis + uploads + cleanup

Variables: DEPLOY_PATH (${DEPLOY_PATH}), BACKUP_DIR, COMPOSE_PROJECT, RETENTION_DAYS, MAX_AGE_HOURS
EOF
            exit 1
            ;;
    esac
}

main "$@"
