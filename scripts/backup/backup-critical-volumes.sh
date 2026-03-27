#!/bin/bash

# backup-critical-volumes.sh - Backup de volúmenes críticos
# Backups de uploads, grafana, prometheus data

set -euo pipefail

# Configuration
BACKUP_DIR="${BACKUP_DIR:-/opt/workplace/backups/critical}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
RETENTION_DAYS="${RETENTION_DAYS:-7}"

# Ensure backup directory exists
mkdir -p "$BACKUP_DIR"

# Function to log with timestamp
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "${BACKUP_DIR}/backup-critical.log"
}

# Function to backup volume
backup_volume() {
    local volume_name="$1"
    local container_name="$2"
    local backup_path="$3"
    
    log "Iniciando backup de volumen: $volume_name"
    
    # Create backup
    if docker run --rm \
        -v "${volume_name}":/source:ro \
        -v "$BACKUP_DIR":/backup \
        alpine:latest \
        tar czf "/backup/${backup_path}_${TIMESTAMP}.tar.gz" -C /source .; then
        
        log "✅ Backup completado: ${backup_path}_${TIMESTAMP}.tar.gz"
        
        # Verify backup integrity
        if docker run --rm \
            -v "$BACKUP_DIR":/backup:ro \
            alpine:latest \
            tar tf "/backup/${backup_path}_${TIMESTAMP}.tar.gz" >/dev/null 2>&1; then
            
            log "✅ Verificación de integridad exitosa"
            
            # Clean old backups
            find "$BACKUP_DIR" -name "${backup_path}_*.tar.gz" -mtime +${RETENTION_DAYS} -delete
            log "🗑️ Backups antiguos eliminados (más de ${RETENTION_DAYS} días)"
        else
            log "❌ ERROR: Verificación de integridad falló"
            return 1
        fi
    else
        log "❌ ERROR: Falló backup de $volume_name"
        return 1
    fi
}

# Function to backup Grafana data with database export
backup_grafana() {
    log "Iniciando backup especial de Grafana (database + data)"
    
    # Export Grafana database
    if docker exec grafana \
        grafana-cli admin export-annotations \
        --output="/tmp/grafana_annotations_${TIMESTAMP}.json" 2>/dev/null; then
        
        log "✅ Annotations exportadas"
    fi
    
    # Backup Grafana data volume
    backup_volume "grafana_data" "grafana" "grafana_data"
    
    # Copy annotations backup
    if docker cp grafana:/tmp/grafana_annotations_${TIMESTAMP}.json \
        "${BACKUP_DIR}/grafana_annotations_${TIMESTAMP}.json" 2>/dev/null; then
        
        log "✅ Annotations copiadas al backup"
    fi
}

# Main execution
main() {
    log "=== Iniciando backup de volúmenes críticos ==="
    
    # Check if MinIO is available
    if ! docker exec minio mc ls local/workplace-backups >/dev/null 2>&1; then
        log "⚠️ MinIO no disponible, guardando backups localmente"
        REMOTE_BACKUP=false
    else
        log "✅ MinIO disponible, sincronizará remotamente"
        REMOTE_BACKUP=true
    fi
    
    # Backup critical volumes
    backup_volume "uploads_data" "workplace-frontend-1" "uploads_data"
    
    if docker ps | grep -q grafana; then
        backup_grafana
    fi
    
    backup_volume "prometheus_data" "prometheus" "prometheus_data"
    
    # Sync to MinIO if available
    if [ "${REMOTE_BACKUP}" = true ]; then
        log "🔄 Sincronizando backups a MinIO..."
        
        for backup_file in "${BACKUP_DIR}"/*_${TIMESTAMP}.tar.gz; do
            filename=$(basename "$backup_file")
            docker exec minio mc cp "/backup/${filename}" "local/workplace-backups/critical/${filename}"
            log "📤 ${filename} → MinIO"
        done
        
        # Sync annotations if exists
        if [ -f "${BACKUP_DIR}/grafana_annotations_${TIMESTAMP}.json" ]; then
            docker exec minio mc cp "/backup/grafana_annotations_${TIMESTAMP}.json" \
                "local/workplace-backups/critical/grafana_annotations_${TIMESTAMP}.json"
            log "📤 grafana_annotations_${TIMESTAMP}.json → MinIO"
        fi
        
        log "✅ Sincronización completada"
    fi
    
    # Cleanup local backups if remote sync successful
    if [ "${REMOTE_BACKUP}" = true ]; then
        find "$BACKUP_DIR" -name "*_${TIMESTAMP}.tar.gz" -delete
        find "$BACKUP_DIR" -name "grafana_annotations_${TIMESTAMP}.json" -delete 2>/dev/null || true
        log "🗑️ Backups locales temporales eliminados"
    fi
    
    log "=== Backup de volúmenes críticos completado ==="
}

# Run main function
main "$@"
