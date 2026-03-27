#!/bin/sh
# 💾 Simple PostgreSQL Backup Script para contenedor Docker
# Se ejecuta via cron cada día a las 2 AM

set -e

BACKUP_DIR="/backups"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="$BACKUP_DIR/workplace_backup_$TIMESTAMP.sql"
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-7}"

echo "[$(date '+%Y-%m-%d %H:%M:%S')] Starting PostgreSQL backup..."

# Crear directorio de backups si no existe
mkdir -p "$BACKUP_DIR"

# Realizar backup
if pg_dump -h "$POSTGRES_HOST" -U "$POSTGRES_USER" -d "$POSTGRES_DB" > "$BACKUP_FILE"; then
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] Backup created: $BACKUP_FILE"
else
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] ERROR: Backup failed"
    exit 1
fi

# Comprimir backup
gzip "$BACKUP_FILE"
echo "[$(date '+%Y-%m-%d %H:%M:%S')] Backup compressed: ${BACKUP_FILE}.gz"

# Actualizar symlink al backup más reciente
ln -sf "${BACKUP_FILE}.gz" "$BACKUP_DIR/latest_backup.sql.gz"

# Limpiar backups antiguos
DELETED=$(find "$BACKUP_DIR" -name "workplace_backup_*.sql.gz" -mtime +$RETENTION_DAYS -delete -print | wc -l)
echo "[$(date '+%Y-%m-%d %H:%M:%S')] Cleaned up $DELETED old backups (retention: $RETENTION_DAYS days)"

# Listar backups actuales
BACKUP_COUNT=$(find "$BACKUP_DIR" -name "workplace_backup_*.sql.gz" | wc -l)
echo "[$(date '+%Y-%m-%d %H:%M:%S')] Backup completed. Total backups: $BACKUP_COUNT"
