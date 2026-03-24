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
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')] E2E:${NC} $1"
}

log_success() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] E2E:${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] E2E:${NC} $1"
}

log_error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] E2E:${NC} $1"
}

# Main function
main() {
    case "${1:-run}" in
        "setup")
            log "🚀 Setting up E2E test environment..."
            docker compose -f docker-compose.test.yml up -d
            log "⏳ Waiting for services to be ready..."
            timeout 120 bash -c '
                until docker compose -f docker-compose.test.yml ps | grep -q "healthy"; do
                    echo "Waiting for services... $(date)"
                    sleep 5
                done
            '
            log_success "✅ All services ready for E2E tests"
            ;;
        "run")
            log "🧪 Running E2E tests..."
            docker compose -f docker-compose.test.yml run --rm test-runner
            log_success "✅ E2E tests completed"
            ;;
        "cleanup")
            log "🧹 Cleaning up test environment..."
            docker compose -f docker-compose.test.yml down -v --remove-orphans
            docker network rm workplace-test-network || true
            docker rmi workplace-backend:test workplace-frontend:test test-runner || true
            log_success "✅ Cleanup completed"
            ;;
        "logs")
            log "📋 Showing logs..."
            docker compose -f docker-compose.test.yml logs -f
            ;;
        "status")
            log "📊 Showing status..."
            docker compose -f docker-compose.test.yml ps
            ;;
        "help"|"-h"|"--help")
            echo "Usage: $0 [command]"
            echo ""
            echo "Commands:"
            echo "  setup    - Set up test environment"
            echo "  run      - Run E2E tests"
            echo "  cleanup  - Clean up test environment"
            echo "  logs     - Show logs"
            echo "  status   - Show status"
            echo "  help     - Show this help"
            echo ""
            echo "Default command: run"
            ;;
        *)
            log_error "Unknown command: $1"
            echo "Use '$0 help' for usage information"
            exit 1
            ;;
    esac
}

# Run main function with all arguments
main "$@"
