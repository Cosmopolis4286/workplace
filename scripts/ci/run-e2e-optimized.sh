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
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')] CI-E2E:${NC} $1"
}

log_success() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] CI-E2E:${NC} $1"
}

log_error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] CI-E2E:${NC} $1"
}

# Main CI function
main() {
    log "🚀 Starting optimized E2E test pipeline..."
    
    # Build images optimizadas
    log "🔧 Building optimized test images..."
    docker build -t workplace-backend:test -f backend/Dockerfile.prod --target production .
    docker build -t workplace-frontend:test -f frontend/Dockerfile.prod --target production .
    docker build -t test-runner -f e2e-tests/Dockerfile.test ./e2e-tests
    
    # Levantar entorno optimizado
    log "🌐 Setting up ultra-lightweight test environment..."
    cd e2e-tests
    docker compose -f docker-compose.test.yml up -d
    
    # Esperar servicios
    log "⏳ Waiting for services to be ready..."
    timeout 180 bash -c '
        until docker compose -f docker-compose.test.yml ps | grep -q "healthy"; do
            echo "Waiting for services... $(date)"
            sleep 5
        done
    '
    
    if [ $? -ne 0 ]; then
        log_error "❌ Services failed to start within timeout"
        docker compose -f docker-compose.test.yml logs
        exit 1
    fi
    
    log_success "✅ All services ready for E2E tests"
    
    # Ejecutar tests
    log "🧪 Running E2E tests..."
    docker compose -f docker-compose.test.yml run --rm test-runner
    
    TEST_EXIT_CODE=$?
    
    # Capturar resultados
    log "📊 Capturing test results..."
    
    if [ $TEST_EXIT_CODE -eq 0 ]; then
        log_success "✅ All E2E tests passed!"
    else
        log_error "❌ E2E tests failed with exit code: $TEST_EXIT_CODE"
    fi
    
    # Cleanup
    log "🧹 Cleaning up test environment..."
    docker compose -f docker-compose.test.yml down -v --remove-orphans
    docker network rm workplace-test-network || true
    docker rmi workplace-backend:test workplace-frontend:test test-runner || true
    
    log_success "✅ E2E test pipeline completed"
    
    exit $TEST_EXIT_CODE
}

# Run main function
main "$@"
