#!/bin/bash
set -Eeuo pipefail

# Colors for output
RED='\\033[0;31m'
GREEN='\\033[0;32m'
YELLOW='\\033[1;33m'
BLUE='\\033[0;34m'
NC='\\033[0m' # No Color

log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')] CI-E2E:${NC} $1"
}

log_success() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] CI-E2E:${NC} $1"
}

log_error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] CI-E2E:${NC} $1"
}

cleanup() {
    local exit_code=$?
    log "🧹 Cleaning up test environment..."
    docker compose -f docker-compose.test.yml down -v --remove-orphans || true
    docker network rm workplace-test-network >/dev/null 2>&1 || true
    docker rmi workplace-backend:test workplace-frontend:test test-runner >/dev/null 2>&1 || true
    return "$exit_code"
}

main() {
    log "🚀 Starting optimized E2E test pipeline..."

    # Playwright writes reports to a bind mount. Match the container UID/GID
    # to the runner so the next checkout can clean the workspace safely.
    export HOST_UID="$(id -u)"
    export HOST_GID="$(id -g)"
    mkdir -p playwright-report test-results
    chmod u+rwx,g+rwx playwright-report test-results

    trap cleanup EXIT

    log "🔧 Building optimized test images..."
    docker build -t workplace-backend:test -f backend/Dockerfile.prod --target production .
    docker build -t workplace-frontend:test -f frontend/Dockerfile.prod --target production .
    docker build -t test-runner -f e2e-tests/Dockerfile.test ./e2e-tests

    log "🌐 Setting up ultra-lightweight test environment..."
    docker compose -f docker-compose.test.yml up -d --wait --wait-timeout 120 || {
        log_error "❌ Servicios fallaron al arrancar"
        docker compose -f docker-compose.test.yml ps
        docker compose -f docker-compose.test.yml logs test-backend --tail 80
        docker compose -f docker-compose.test.yml logs postgres --tail 20
        return 1
    }

    log_success "✅ All services ready for E2E tests"
    log "🧪 Running E2E tests..."

    if docker compose -f docker-compose.test.yml run --rm test-runner; then
        log_success "✅ All E2E tests passed!"
        return 0
    else
        local test_exit_code=$?
        log_error "❌ E2E tests failed with exit code: $test_exit_code"
        return "$test_exit_code"
    fi
}

cd "$(dirname "$0")/../../e2e-tests"
main "$@"
