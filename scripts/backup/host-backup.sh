#!/bin/bash

# host-backup.sh - Backups simples desde el host (recomendado para 4GB RAM)
# Sin consumo extra de RAM, crontab nativo

set -euo pipefail

# Configuration
BACKUP_DIR="${BACKUP_DIR:-/opt/workplace/backups}"
POSTGRES_USER="${POSTGRES_USER:-app_user}"
POSTGRES_DB="${POSTGRES_DB:-app_db}"
REDIS_PASSWORD="${REDIS_PASSWORD:-redis_password}"
RETENTION_DAYS="${RETENTION_DAYS:-7}"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

log() {
    echo -e "${GREEN}[$(date '+%H:%M:%S')]${NC} $1"
}

warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
    exit 1
}

# Create backup directory
setup_backup_dir() {
    log "📁 Creando directorio de backups..."
    mkdir -p "$BACKUP_DIR/postgres"
    mkdir -p "$BACKUP_DIR/redis"
    mkdir -p "$BACKUP_DIR/uploads"
}

# Backup PostgreSQL
backup_postgres() {
    log "🗄️ Backup PostgreSQL..."
    local timestamp=$(date +%Y%m%d_%H%M%S)
    local backup_file="$BACKUP_DIR/postgres/postgres_${timestamp}.sql"
    
    if docker exec postgres pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB" > "$backup_file"; then
        log "✅ PostgreSQL backup: $(basename "$backup_file")"
        
        # Compress if file is large
        if [ $(stat -c%s "$backup_file") -gt 104857600 ]; then
            gzip "$backup_file"
            log "🗜️ Comprimido: $(basename "$backup_file").gz"
        fi
        
        # Verify backup integrity
        if [ -f "${backup_file}.gz" ]; then
            if gunzip -t "${backup_file}.gz" 2>/dev/null; then
                log "✅ Verificado: $(basename "${backup_file}.gz")"
            else
                error "❌ Corrupción detectada: $(basename "${backup_file}.gz")"
            fi
        fi
    else
        error "❌ Falló backup PostgreSQL"
    fi
}

# Backup Redis
backup_redis() {
    log "🔴 Backup Redis..."
    local timestamp=$(date +%Y%m%d_%H%M%S)
    local backup_file="$BACKUP_DIR/redis/redis_${timestamp}.rdb"
    
    # Trigger Redis save
    if docker exec redis redis-cli -a "$REDIS_PASSWORD" save; then
        sleep 2  # Wait for RDB to be written
        
        # Copy RDB file from container
        if docker cp redis:/data/dump.rdb "$backup_file"; then
            log "✅ Redis backup: $(basename "$backup_file")"
            
            # Compress if file is large
            if [ $(stat -f%s "$backup_file" | cut -d' ' ' -f1) -gt 10485760 ]; then
                gzip "$backup_file"
                log "🗜️ Comprimido: $(basename "$backup_file").gz"
            fi
        else
            error "❌ Falló copia Redis RDB"
        fi
    else
        error "❌ Falló save Redis"
    fi
}

# Backup Uploads
backup_uploads() {
    log "📁 Backup Uploads..."
    local timestamp=$(date +%Y%m%d_%H%M%S)
    local backup_file="$BACKUP_DIR/uploads/uploads_${timestamp}.tar.gz"
    
    if docker run --rm \
        -v uploads_data:/source:ro \
        -v "$BACKUP_DIR/uploads":/backup \
        alpine:latest \
        tar czf "/backup/uploads_${timestamp}.tar.gz" -C /source .; then
        
        log "✅ Uploads backup: $(basename "$backup_file")"
    else
        error "❌ Falló backup uploads"
    fi
}

# Cleanup old backups
cleanup_old() {
    log "🗑️ Limpiando backups antiguos (> ${RETENTION_DAYS} días)..."
    
    find "$BACKUP_DIR/postgres" -name "*.sql*" -mtime +${RETENTION_DAYS} -delete 2>/dev/null || true
    find "$BACKUP_DIR/postgres" -name "*.sql.gz*" -mtime +${RETENTION_DAYS} -delete 2>/dev/null || true
    find "$BACKUP_DIR/redis" -name "*.rdb*" -mtime +${RETENTION_DAYS} -delete 2>/dev/null || true
    find "$BACKUP_DIR/redis" -name "*.rdb.gz*" -mtime +${RETENTION_DAYS} -delete 2>/dev/null || true
    find "$BACKUP_DIR/uploads" -name "*.tar.gz*" -mtime +${RETENTION_DAYS} -delete 2>/dev/null || true
    
    log "✅ Limpieza completada"
}

# Show backup status
show_status() {
    log "📊 Estado actual de backups:"
    
    echo "PostgreSQL:"
    find "$BACKUP_DIR/postgres" -name "*.sql*" -exec ls -lh {} \; | head -5
    
    echo "Redis:"
    find "$BACKUP_DIR/redis" -name "*.rdb*" -exec ls -lh {} \; | head -5
    
    echo "Uploads:"
    find "$BACKUP_DIR/uploads" -name "*.tar.gz*" -exec ls -lh {} \; | head -5
    
    echo "Uso de disco:"
    du -sh "$BACKUP_DIR"
}

# Install crontab
install_crontab() {
    log " Instalando crontab de backups..."
    
    local temp_cron=$(mktemp)
    
    # Keep existing cron jobs
    crontab -l 2>/dev/null > "$temp_cron" || echo "# Workplace Backups" > "$temp_cron"
    
    # Add new jobs
    cat >> "$temp_cron" << EOF

# Backups automáticos - Workplace App
# PostgreSQL: Diario a las 2 AM
0 2 * * * /opt/workplace/scripts/backup/host-backup.sh postgres >> /var/log/workplace-backups.log 2>&1

# Redis: Diario a las 3 AM
0 3 * * * /opt/workplace/scripts/backup/host-backup.sh redis >> /var/log/workplace-backups.log 2>&1

# Uploads: Semanal los domingos a las 4 AM
0 4 * * 0 /opt/workplace/scripts/backup/host-backup.sh uploads >> /var/log/workplace-backups.log 2>&1

# Limpieza: Diario a las 5 AM
0 5 * * * /opt/workplace/scripts/backup/host-backup.sh cleanup >> /var/log/workplace-backups.log 2>&1
EOF
    
    # Install new crontab safely
    if (crontab -l 2>/dev/null; cat "$temp_cron") | crontab -; then
        log " Crontab instalado (preservando jobs existentes)"
        log " Revisar con: crontab -l"
    else
        error " Falló instalación de crontab"
    fi
    
    rm -f "$temp_cron"
}

# Main execution
main() {
    case "${1:-}" in
        "postgres")
            setup_backup_dir
            backup_postgres
            ;;
        "redis")
            setup_backup_dir
            backup_redis
            ;;
        "uploads")
            setup_backup_dir
            backup_uploads
            ;;
        "cleanup")
            cleanup_old
            ;;
        "status")
            show_status
            ;;
        "install")
            install_crontab
            ;;
        "all")
            setup_backup_dir
            backup_postgres
            backup_redis
            backup_uploads
            cleanup_old
            ;;
        *)
            echo "Uso: $0 [postgres|redis|uploads|cleanup|status|install|all]"
            echo ""
            echo "Comandos:"
            echo "  postgres  - Backup PostgreSQL"
            echo "  redis     - Backup Redis"
            echo "  uploads   - Backup Uploads"
            echo "  cleanup   - Limpiar backups antiguos"
            echo "  status    - Mostrar estado"
            echo "  install   - Instalar crontab"
            echo "  all       - Todos los backups"
            exit 1
            ;;
    esac
}

# Run main function
main "$@"
