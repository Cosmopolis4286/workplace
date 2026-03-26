#!/bin/sh
# SSL Backup Script
# Creates automated backups of SSL certificates

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')] SSL-BACKUP:${NC} $1"
}

log_success() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] SSL-BACKUP:${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] SSL-BACKUP:${NC} $1"
}

log_error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] SSL-BACKUP:${NC} $1"
}

# Get domain from environment
DOMAIN="${DOMAIN:-playrke.com}"

# Backup SSL certificates
backup_ssl_certificates() {
    if [ -f "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" ]; then
        local backup_dir="/letsencrypt/backups"
        local backup_file="$backup_dir/${DOMAIN}_$(date +%Y%m%d_%H%M%S).tar.gz"
        
        mkdir -p "$backup_dir"
        
        log "🔄 Creando backup SSL para $DOMAIN..."
        
        # Backup certificates and keys
        tar -czf "$backup_file" -C /etc/letsencrypt live/ "$DOMAIN" 2>/dev/null
        
        if [ $? -eq 0 ]; then
            log_success "✅ Backup SSL creado: $backup_file"
            
            # Get file size for logging
            local file_size=$(du -h "$backup_file" | cut -f1)
            log "📊 Tamaño del backup: $file_size"
            
            # Clean old backups (keep last 10)
            local backup_count=$(find "$backup_dir" -name "${DOMAIN}_*.tar.gz" -type f | wc -l)
            if [ $backup_count -gt 10 ]; then
                log "🧹 Limpiando backups antiguos (manteniendo últimos 10)..."
                find "$backup_dir" -name "${DOMAIN}_*.tar.gz" -type f | sort -r | tail -n +11 | xargs rm -f
                log_success "✅ Limpieza completada"
            fi
            
            # Verify backup integrity
            if tar -tzf "$backup_file" >/dev/null 2>&1; then
                log_success "✅ Integridad del backup verificada"
            else
                log_error "❌ Backup corrupto, eliminando archivo..."
                rm -f "$backup_file"
                return 1
            fi
            
            return 0
        else
            log_error "❌ Falló la creación del backup SSL"
            return 1
        fi
    else
        log_warning "⚠️ No hay certificados para hacer backup"
        return 1
    fi
}

# List existing backups
list_backups() {
    local backup_dir="/letsencrypt/backups"
    
    if [ -d "$backup_dir" ]; then
        log "📋 Backups existentes para $DOMAIN:"
        ls -la "$backup_dir/${DOMAIN}_"*.tar.gz 2>/dev/null || log "No se encontraron backups"
    else
        log "📁 Directorio de backups no encontrado"
    fi
}

# Restore from backup (emergency function)
restore_backup() {
    local backup_file="$1"
    
    if [ -z "$backup_file" ]; then
        log_error "❌ Se requiere archivo de backup para restaurar"
        return 1
    fi
    
    if [ ! -f "$backup_file" ]; then
        log_error "❌ Archivo de backup no encontrado: $backup_file"
        return 1
    fi
    
    log "🔄 Restaurando SSL desde backup: $backup_file"
    
    # Create emergency restore directory
    local restore_dir="/tmp/ssl-restore-$(date +%s)"
    mkdir -p "$restore_dir"
    
    # Extract backup
    if tar -xzf "$backup_file" -C "$restore_dir"; then
        # Backup current certificates
        if [ -d "/etc/letsencrypt/live/$DOMAIN" ]; then
            mv "/etc/letsencrypt/live/$DOMAIN" "/etc/letsencrypt/live/$DOMAIN.backup.$(date +%s)"
        fi
        
        # Restore certificates
        mv "$restore_dir/$DOMAIN" "/etc/letsencrypt/live/"
        
        log_success "✅ Certificados restaurados exitosamente"
        log "🔄 Se recomienda recargar nginx: nginx -s reload"
        
        # Clean up
        rm -rf "$restore_dir"
        
        return 0
    else
        log_error "❌ Falló la extracción del backup"
        rm -rf "$restore_dir"
        return 1
    fi
}

# Main execution
case "${1:-backup}" in
    "backup")
        log "🚀 Iniciando backup SSL para $DOMAIN"
        backup_ssl_certificates
        ;;
    "list")
        list_backups
        ;;
    "restore")
        restore_backup "$2"
        ;;
    *)
        echo "Uso: $0 {backup|list|restore [backup_file]}"
        exit 1
        ;;
esac
