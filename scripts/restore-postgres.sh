#!/bin/bash
# Restore de PostgreSQL desde backup
# Uso: ./restore-postgres.sh [backup_file.gz]

set -euo pipefail

# Cargar variables de entorno
if [ -f "/opt/workplace/.env" ]; then
  source /opt/workplace/.env
fi

BACKUP_FILE="${1:-}"
BACKUP_DIR="/opt/workplace/backups/postgres"

if [ -z "$BACKUP_FILE" ]; then
  echo "📁 Backups disponibles:"
  find "$BACKUP_DIR" -name "workplace_backup_*.sql.gz" -type f | sort -r | head -10
  echo ""
  echo "Uso: $0 [backup_file.gz]"
  echo "O usa el más reciente: $0 latest"
  exit 1
fi

if [ "$BACKUP_FILE" = "latest" ]; then
  BACKUP_FILE="$BACKUP_DIR/latest_backup.sql.gz"
fi

if [ ! -f "$BACKUP_FILE" ]; then
  echo "❌ Backup file no encontrado: $BACKUP_FILE"
  exit 1
fi

echo "🔄 Iniciando restore de PostgreSQL"
echo "📁 Backup: $BACKUP_FILE"

# Verificar integridad del backup
echo "🔍 Verificando integridad..."
if ! gzip -t "$BACKUP_FILE"; then
  echo "❌ Backup corrupto"
  exit 1
fi

# Confirmación
echo "⚠️ ADVERTENCIA: Esto sobrescribirá toda la base de datos actual"
read -p "¿Continuar? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  echo "❌ Operación cancelada"
  exit 1
fi

# Detener servicios que dependen de PostgreSQL
echo "🔄 Deteniendo servicios..."
docker compose -f /opt/workplace/docker-compose.yml stop backend frontend

# Realizar restore
echo "📥 Restaurando backup..."
if gunzip -c "$BACKUP_FILE" | docker compose -f /opt/workplace/docker-compose.yml exec -T postgres psql -U "$POSTGRES_USER"; then
  echo "✅ Restore completado exitosamente"
  
  # Reiniciar servicios
  echo "🚀 Reiniciando servicios..."
  docker compose -f /opt/workplace/docker-compose.yml start backend frontend
  
  echo "🎉 Restore completado - $(date)"
else
  echo "❌ Error durante el restore"
  
  # Reiniciar servicios incluso si falló
  docker compose -f /opt/workplace/docker-compose.yml start backend frontend
  exit 1
fi
