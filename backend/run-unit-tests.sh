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
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')] UNIT:${NC} $1"
}

log_success() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] UNIT:${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] UNIT:${NC} $1"
}

log_error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] UNIT:${NC} $1"
}

# Main function
main() {
    case "${1:-run}" in
        "setup")
            log "🚀 Setting up backend unit test environment..."
            docker compose -f docker-compose.test.yml up -d test-postgres test-redis
            
            log "⏳ Waiting for services to be ready..."
            timeout 60 bash -c '
                until docker compose -f docker-compose.test.yml ps test-postgres test-redis | grep -q "healthy"; do
                    echo "Waiting for services... $(date)"
                    sleep 3
                done
            '
            
            log_success "✅ Services ready for unit tests"
            ;;
        "run")
            log "🧪 Running backend unit tests with coverage..."
            docker compose -f docker-compose.test.yml run --rm test-backend
            
            TEST_EXIT_CODE=$?
            
            if [ $TEST_EXIT_CODE -eq 0 ]; then
                log_success "✅ All unit tests passed!"
                log "📊 Coverage report generated in ./coverage/"
            else
                log_error "❌ Unit tests failed with exit code: $TEST_EXIT_CODE"
            fi
            
            exit $TEST_EXIT_CODE
            ;;
        "coverage")
            log "📊 Running tests with coverage..."
            docker compose -f docker-compose.test.yml run --rm test-backend
            ;;
        "cleanup")
            log "🧹 Cleaning up unit test environment..."
            docker compose -f docker-compose.test.yml down -v --remove-orphans
            docker network rm backend-test-network || true
            docker rmi backend_test-backend || true
            log_success "✅ Cleanup completed"
            ;;
        "logs")
            log "📋 Showing logs..."
            docker compose -f docker-compose.test.yml logs -f test-backend
            ;;
        "status")
            log "📊 Showing status..."
            docker compose -f docker-compose.test.yml ps
            ;;
        "help"|"-h"|"--help")
            echo "Usage: $0 [command]"
            echo ""
            echo "Commands:"
            echo "  setup    - Set up test environment (DB + Redis)"
            echo "  run      - Run unit tests"
            echo "  coverage  - Run tests with coverage"
            echo "  cleanup  - Clean up test environment"
            echo "  logs     - Show test logs"
            echo "  status   - Show service status"
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
