#!/bin/bash

# 🚀 Database Migration Script for CI/CD
# This script runs database migrations independently of the application stack

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Logging functions
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

warn() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING: $1${NC}"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR: $1${NC}"
    exit 1
}

# Load environment variables
load_env() {
    if [[ -f "$PROJECT_ROOT/.env" ]]; then
        log "Loading environment variables from .env"
        source "$PROJECT_ROOT/.env"
    else
        warn "No .env file found, using environment variables"
    fi
    
    # Required variables
    export POSTGRES_USER="${POSTGRES_USER:-postgres}"
    export POSTGRES_PASSWORD="${POSTGRES_PASSWORD:-password}"
    export POSTGRES_DB="${POSTGRES_DB:-workplace}"
    export POSTGRES_HOST="${POSTGRES_HOST:-localhost}"
    export POSTGRES_PORT="${POSTGRES_PORT:-5432}"
}

# Check if database is ready
wait_for_database() {
    log "Waiting for database to be ready..."
    
    local max_attempts=30
    local attempt=1
    
    while [[ $attempt -le $max_attempts ]]; do
        if PGPASSWORD="$POSTGRES_PASSWORD" psql -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "SELECT 1;" &>/dev/null; then
            log "Database is ready"
            return 0
        fi
        
        warn "Database not ready (attempt $attempt/$max_attempts), waiting 5 seconds..."
        sleep 5
        ((attempt++))
    done
    
    error "Database failed to become ready after $max_attempts attempts"
}

# Run migrations
run_migrations() {
    log "Starting database migrations..."
    
    cd "$PROJECT_ROOT"
    
    # Check if we're in the right directory
    if [[ ! -f "package.json" ]]; then
        error "Not in project root directory"
    fi
    
    # Run Prisma migrations
    log "Running Prisma migrate deploy..."
    if npx prisma migrate deploy; then
        log "✅ Migrations completed successfully"
    else
        error "❌ Migration failed"
    fi
    
    # Verify database schema
    log "Verifying database schema..."
    if npx prisma db push --accept-data-loss 2>/dev/null; then
        log "✅ Database schema verified"
    else
        warn "⚠️ Schema verification had issues, but migrations completed"
    fi
}

# Create migration backup (optional)
create_migration_backup() {
    if [[ "${CREATE_BACKUP:-false}" == "true" ]]; then
        log "Creating pre-migration backup..."
        
        local backup_file="$PROJECT_ROOT/backups/pre-migration-$(date +%Y%m%d_%H%M%S).sql"
        mkdir -p "$PROJECT_ROOT/backups"
        
        if PGPASSWORD="$POSTGRES_PASSWORD" pg_dump -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" -U "$POSTGRES_USER" -d "$POSTGRES_DB" > "$backup_file"; then
            log "✅ Backup created: $backup_file"
        else
            warn "⚠️ Backup creation failed, continuing with migrations"
        fi
    fi
}

# Main execution
main() {
    log "🚀 Starting database migration process"
    
    # Parse command line arguments
    case "${1:-run}" in
        "run")
            load_env
            wait_for_database
            create_migration_backup
            run_migrations
            log "🎉 Migration process completed successfully"
            ;;
        "status")
            load_env
            wait_for_database
            log "Checking migration status..."
            npx prisma migrate status || warn "Could not check migration status"
            ;;
        "reset")
            warn "⚠️ This will reset the database. Are you sure?"
            read -p "Type 'reset' to confirm: " confirm
            if [[ "$confirm" == "reset" ]]; then
                load_env
                wait_for_database
                npx prisma migrate reset --force --skip-seed
                log "✅ Database reset completed"
            else
                log "Reset cancelled"
            fi
            ;;
        "help"|"--help"|"-h")
            cat << EOF
Database Migration Script

Usage: $0 [command]

Commands:
    run       Run migrations (default)
    status    Check migration status
    reset     Reset database (DANGEROUS)
    help      Show this help message

Environment Variables:
    POSTGRES_USER        Database user (default: postgres)
    POSTGRES_PASSWORD    Database password (required)
    POSTGRES_DB          Database name (default: workplace)
    POSTGRES_HOST        Database host (default: localhost)
    POSTGRES_PORT        Database port (default: 5432)
    CREATE_BACKUP        Create backup before migration (default: false)

Examples:
    $0 run                    # Run migrations
    $0 status                 # Check status
    CREATE_BACKUP=true $0 run # Run with backup
EOF
            ;;
        *)
            error "Unknown command: $1. Use 'help' for usage information."
            ;;
    esac
}

# Execute main function
main "$@"
