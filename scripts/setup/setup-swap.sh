#!/bin/bash

# setup-swap.sh - Configuración de swap para producción en 4GB RAM
# Prevención de OOM killer y estabilidad del sistema

set -euo pipefail

# Configuration
SWAP_FILE="${SWAP_FILE:-/swapfile}"
SWAP_SIZE="${SWAP_SIZE:-1G}"

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

# Check if swap already exists
check_swap() {
    log "🔍 Verificando configuración actual de swap..."
    
    if swapon --show | grep -q "$SWAP_FILE"; then
        warn "Swap ya está activo: $SWAP_FILE"
        swapon --show
        return 0
    fi
    
    log "✅ No hay swap activo, procediendo con configuración..."
    return 1
}

# Check available disk space
check_disk_space() {
    log "💾 Verificando espacio disponible..."
    
    local available_space=$(df -BG1 --output=avail "$SWAP_FILE" | tail -1 | tr -d ' ')
    local required_space=$(numfmt --from=iec --to=iec "${SWAP_SIZE}" | cut -d' ' -f1)
    
    if [ "$available_space" -lt "$required_space" ]; then
        error "Espacio insuficiente. Disponible: ${available_space}B, Requerido: ${required_space}B"
    fi
    
    log "✅ Espacio suficiente: ${available_space}B disponible"
}

# Create swap file
create_swap() {
    log "📁 Creando archivo de swap: $SWAP_FILE (${SWAP_SIZE})..."
    
    # Create sparse file (faster than dd)
    if fallocate -l "$SWAP_SIZE" "$SWAP_FILE"; then
        log "✅ Swap file creado con fallocate"
    else
        log "⚠️ fallocate falló, usando dd (más lento)..."
        dd if=/dev/zero of="$SWAP_FILE" bs=1M count=$(numfmt --from=iec --to=si "${SWAP_SIZE}" | cut -d' ' -f1) status=progress
    fi
    
    # Set proper permissions
    chmod 600 "$SWAP_FILE"
    log "✅ Permisos configurados (600)"
}

# Setup swap
setup_swap() {
    log "🔧 Configurando swap..."
    
    # Format as swap
    mkswap "$SWAP_FILE"
    log "✅ Swap formateado"
    
    # Enable swap
    swapon "$SWAP_FILE"
    log "✅ Swap activado"
    
    # Show status
    swapon --show
}

# Add to fstab for persistence
add_to_fstab() {
    log "📝 Agregando a fstab para persistencia..."
    
    # Check if already in fstab
    if grep -q "$SWAP_FILE" /etc/fstab; then
        warn "Swap ya está en fstab"
        return 0
    fi
    
    # Get UUID of swap file
    local swap_uuid=$(blkid -s UUID -o UUID "$SWAP_FILE")
    
    # Add to fstab
    echo "UUID=$swap_uuid none swap sw 0 0" >> /etc/fstab
    log "✅ Agregado a fstab: UUID=$swap_uuid"
}

# Configure swappiness
configure_swappiness() {
    log "🎛 Configurando swappiness..."
    
    # Set swappiness to 10 (more conservative than default 60)
    echo 10 > /proc/sys/vm/swappiness
    log "✅ Swappiness configurado a 10 (conservador)"
    
    # Set cache pressure to 100
    echo 100 > /proc/sys/vm/vfs_cache_pressure
    log "✅ Cache pressure configurado a 100"
}

# Show final status
show_status() {
    log "📊 Estado final de swap:"
    echo "Swap file: $SWAP_FILE"
    echo "Swap size: $SWAP_SIZE"
    echo "Swappiness: $(cat /proc/sys/vm/swappiness)"
    echo "Cache pressure: $(cat /proc/sys/vm/vfs_cache_pressure)"
    echo ""
    swapon --show
    echo ""
    free -h
}

# Main execution
main() {
    log "🚀 Configuración de Swap para Producción (4GB RAM)"
    echo ""
    
    # Check if already configured
    if ! check_swap; then
        check_disk_space
        create_swap
        setup_swap
        add_to_fstab
        configure_swappiness
        show_status
        
        echo ""
        log "🎉 Swap configurado exitosamente!"
        log "💡 Esto prevendrá OOM killer y mejorará estabilidad bajo carga"
        log "📈 Para verificar: free -h y swapon --show"
    fi
}

# Handle script arguments
case "${1:-}" in
    "status")
        swapon --show
        free -h
        ;;
    "disable")
        log "🚫 Desactivando swap..."
        swapoff -a
        log "✅ Swap desactivado"
        ;;
    "cleanup")
        log "🗑️ Limpiando swap..."
        swapoff -a
        if [ -f "$SWAP_FILE" ]; then
            rm -f "$SWAP_FILE"
            log "✅ Archivo swap eliminado"
        fi
        # Remove from fstab
        sed -i "\|$SWAP_FILE|d" /etc/fstab
        log "✅ Removido de fstab"
        ;;
    *)
        main
        ;;
esac
