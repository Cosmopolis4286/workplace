#!/bin/bash
# 💾 Host Backup Script for Workplace
# Ejecutar desde host (no dentro del contenedor)
# Configurar cron: 0 2 * * * /opt/workplace/scripts/database/host-backup.sh

set -euo pipefail

# Configuración
WORKPLACE_DIR="/opt/workplace"
BACKUP_DIR="${WORKPLACE_DIR}/backups"
CONTAINER_NAME="backup"
LOG_FILE="/var/log/workplace-backup.log"
RETENTION_DAYS=7

# Colores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log() {
    echo -e "${GREEN}[$(date '+%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a "$LOG_FILE"
}

warn() {
    echo -e "${YELLOW}[$(date '+%Y-%m-%d %H:%M:%S')]⚠${NC} $1" | tee -a "$LOG_FILE"
}

error() {
    echo -e "${RED}[$(date '+%Y-%m-%d %H:%M:%S')]✗${NC} $1" | tee -a "$LOG_FILE"
}

# Verificar que el contenedor existe
if ! docker ps --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
    error "Contenedor ${CONTAINER_NAME} no está corriendo"
    exit 1
fi

# Crear directorio de backups si no existe
mkdir -p "$BACKUP_DIR"

# Timestamp
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="workplace_backup_${TIMESTAMP}.sql.gz"

log "🚀 Iniciando backup de PostgreSQL..."

# Ejecutar backup dentro del contenedor
docker exec "$CONTAINER_NAME" sh -c "
    export PGPASSWORD=\${POSTGRES_PASSWORD}
    pg_dump -h \${POSTGRES_HOST} -U \${POSTGRES_USER} -d \${POSTGRES_DB} --verbose 2>/dev/null | gzip
" > "${BACKUP_DIR}/${BACKUP_FILE}"

# Verificar que el backup se creó
if [ -f "${BACKUP_DIR}/${BACKUP_FILE}" ] && [ -s "${BACKUP_DIR}/${BACKUP_FILE}" ]; then
    FILESIZE=$(du -h "${BACKUP_DIR}/${BACKUP_FILE}" | cut -f1)
    log "✅ Backup completado: ${BACKUP_FILE} (${FILESIZE})"
else
    error "❌ Backup falló: archivo no creado o vacío"
    exit 1
fi

# Limpiar backups antiguos
log "🧹 Limpiando backups antiguos (>${RETENTION_DAYS} días)..."
BEFORE_COUNT=$(find "$BACKUP_DIR" -name "workplace_backup_*.sql.gz" | wc -l)
find "$BACKUP_DIR" -name "workplace_backup_*.sql.gz" -mtime +${RETENTION_DAYS} -delete
AFTER_COUNT=$(find "$BACKUP_DIR" -name "workplace_backup_*.sql.gz" | wc -l)
DELETED=$((BEFORE_COUNT - AFTER_COUNT))
log "📊 Backups eliminados: ${DELETED}, restantes: ${AFTER_COUNT}"

# Listar backups actuales
log "📁 Backups disponibles:"
ls -lh "$BACKUP_DIR"/workplace_backup_*.sql.gz 2>/dev/null | while read line; do
    log "   $line"
done

log "🎉 Backup completado exitosamente"
