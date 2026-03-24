#!/bin/bash
set -eu

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')] CI-UNIT:${NC} $1"
}

log_success() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] CI-UNIT:${NC} $1"
}

log_error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] CI-UNIT:${NC} $1"
}

# Main CI function
main() {
    log "🚀 Starting optimized backend unit test pipeline..."
    
    # Crear directorio de coverage si no existe
    mkdir -p backend/coverage
    
    # Build imagen ultra-ligera
    log "🔧 Building ultra-lightweight unit test image..."
    docker build -t backend_test-runner -f backend/Dockerfile.test .
    
    # Levantar servicios mínimos
    log "🌐 Setting up lightweight test environment..."
    cd backend
    docker compose -f docker-compose.test.yml up -d test-postgres test-redis
    
    # Esperar servicios
    log "⏳ Waiting for services to be ready..."
    timeout 60 bash -c '
        until docker compose -f docker-compose.test.yml ps test-postgres test-redis | grep -q "healthy"; do
            echo "Waiting for services... $(date)"
            sleep 3
        done
    '
    
    if [ $? -ne 0 ]; then
        log_error "❌ Services failed to start within timeout"
        docker compose -f docker-compose.test.yml logs test-postgres test-redis
        exit 1
    fi
    
    log_success "✅ Services ready for unit tests"
    
    # Ejecutar tests con coverage
    log "🧪 Running unit tests with coverage..."
    docker compose -f docker-compose.test.yml run --rm test-backend
    
    TEST_EXIT_CODE=$?
    
    # Capturar resultados
    log "📊 Processing test results..."
    
    if [ $TEST_EXIT_CODE -eq 0 ]; then
        log_success "✅ All unit tests passed!"
        
        # Extraer coverage percentage
        if [ -f "coverage/coverage-summary.json" ]; then
            COVERAGE=$(node -e "
                const fs = require('fs');
                const summary = JSON.parse(fs.readFileSync('coverage/coverage-summary.json', 'utf8'));
                console.log(summary.total.lines.pct);
            " 2>/dev/null || echo "0")
            log_success "📊 Coverage: ${COVERAGE}%"
        fi
    else
        log_error "❌ Unit tests failed with exit code: $TEST_EXIT_CODE"
    fi
    
    # Cleanup
    log "🧹 Cleaning up test environment..."
    docker compose -f docker-compose.test.yml down -v --remove-orphans
    docker network rm backend-test-network || true
    docker rmi backend_test-runner || true
    
    log_success "✅ Backend unit test pipeline completed"
    
    exit $TEST_EXIT_CODE
}

# Run main function
main "$@"
