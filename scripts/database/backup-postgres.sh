#!/bin/bash
# Backup automático de PostgreSQL para producción
# Configurar en cron: 0 2 * * * /opt/workplace/scripts/backup-postgres.sh

set -euo pipefail

# Cargar variables de entorno
if [ -f "/opt/workplace/.env" ]; then
  source /opt/workplace/.env
fi

# Configuración
BACKUP_DIR="/opt/workplace/backups/postgres"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="$BACKUP_DIR/workplace_backup_$TIMESTAMP.sql"
RETENTION_DAYS=30

# Crear directorio de backups
mkdir -p "$BACKUP_DIR"

echo "🔄 Iniciando backup de PostgreSQL - $(date)"

# Verificar que PostgreSQL esté corriendo
if ! docker compose -f /opt/workplace/docker-compose.yml ps postgres | grep -q "Up"; then
  echo "❌ PostgreSQL no está corriendo"
  exit 1
fi

# Realizar backup
echo "📦 Creando backup: $BACKUP_FILE"
if docker compose -f /opt/workplace/docker-compose.yml exec -T postgres pg_dumpall -U "$POSTGRES_USER" > "$BACKUP_FILE"; then
  echo "✅ Backup creado exitosamente"
  
  # Comprimir backup
  echo "🗜️ Comprimiendo backup..."
  gzip "$BACKUP_FILE"
  BACKUP_FILE_GZ="$BACKUP_FILE.gz"
  
  # Verificar tamaño
  BACKUP_SIZE=$(stat -c%s "$BACKUP_FILE_GZ" 2>/dev/null || stat -f%z "$BACKUP_FILE_GZ" 2>/dev/null || echo "0")
  echo "📊 Tamaño del backup: $(($BACKUP_SIZE / 1024 / 1024)) MB"
  
  # Limpiar backups antiguos
  echo "🧹 Limpiando backups antiguos (más de $RETENTION_DAYS días)..."
  find "$BACKUP_DIR" -name "workplace_backup_*.sql.gz" -mtime +$RETENTION_DAYS -delete
  
  # Contar backups restantes
  BACKUP_COUNT=$(find "$BACKUP_DIR" -name "workplace_backup_*.sql.gz" | wc -l)
  echo "📁 Backups almacenados: $BACKUP_COUNT"
  
  # Verificar integridad del backup
  echo "🔍 Verificando integridad del backup..."
  if gzip -t "$BACKUP_FILE_GZ" 2>/dev/null; then
    echo "✅ Integridad del backup verificada"
  else
    echo "❌ Error en integridad del backup"
    exit 1
  fi
  
  # Crear symlink al backup más reciente
  ln -sf "$BACKUP_FILE_GZ" "$BACKUP_DIR/latest_backup.sql.gz"
  
  echo "✅ Backup completado exitosamente: $BACKUP_FILE_GZ"
  
  # Opcional: Upload a S3 (descomentar y configurar)
  # if command -v aws &> /dev/null && [ -n "${AWS_S3_BUCKET:-}" ]; then
  #   echo "☁️ Subiendo backup a S3..."
  #   aws s3 cp "$BACKUP_FILE_GZ" "s3://$AWS_S3_BUCKET/postgres-backups/"
  # fi
  
else
  echo "❌ Error al crear backup"
  exit 1
fi

echo "🎉 Backup de PostgreSQL completado - $(date)"
