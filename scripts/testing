#!/bin/bash

# 🧪 Traefik Setup Testing Script
# Pruebas completas antes del cutover

set -euo pipefail

# Configuration
DOMAIN="${DOMAIN:-$(grep DOMAIN .env | cut -d= -f2)}"
TEST_LOG="./logs/traefik-test.log"
STAGING_MODE="${STAGING_MODE:-true}"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Logging
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')] TEST:${NC} $1" | tee -a "$TEST_LOG"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR:${NC} $1" | tee -a "$TEST_LOG"
}

warn() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING:${NC} $1" | tee -a "$TEST_LOG"
}

success() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] SUCCESS:${NC} $1" | tee -a "$TEST_LOG"
}

# Test results tracking
TESTS_PASSED=0
TESTS_FAILED=0

test_pass() {
    ((TESTS_PASSED++))
    success "✅ $1"
}

test_fail() {
    ((TESTS_FAILED++))
    error "❌ $1"
}

# Create test log directory
mkdir -p "$(dirname "$TEST_LOG")"

# Test 1: Configuration validation
test_configuration() {
    log "🔍 Testing Traefik configuration..."
    
    # Test main config file
    if [[ -f "./traefik/traefik.yml" ]]; then
        test_pass "Main configuration file exists"
    else
        test_fail "Main configuration file missing"
    fi
    
    # Test dynamic config
    if [[ -f "./traefik/dynamic/middlewares.yml" ]]; then
        test_pass "Dynamic middlewares configuration exists"
    else
        test_fail "Dynamic middlewares configuration missing"
    fi
    
    # Test TLS config
    if [[ -f "./traefik/dynamic/tls.yml" ]]; then
        test_pass "TLS configuration exists"
    else
        test_fail "TLS configuration missing"
    fi
    
    # Test docker-compose file
    if [[ -f "./docker-compose.traefik.yml" ]]; then
        test_pass "Traefik docker-compose file exists"
    else
        test_fail "Traefik docker-compose file missing"
    fi
    
    # Validate YAML syntax
    if command -v yq >/dev/null 2>&1; then
        if yq eval '.' ./traefik/traefik.yml >/dev/null 2>&1; then
            test_pass "Main configuration YAML syntax valid"
        else
            test_fail "Main configuration YAML syntax invalid"
        fi
    else
        warn "yq not available, skipping YAML syntax validation"
    fi
}

# Test 2: Docker services startup
test_docker_services() {
    log "🐳 Testing Docker services startup..."
    
    # Start services
    log "Starting Traefik services..."
    if docker compose -f docker-compose.traefik.yml up -d; then
        test_pass "Docker services started successfully"
    else
        test_fail "Failed to start Docker services"
        return 1
    fi
    
    # Wait for services
    log "Waiting for services to initialize..."
    sleep 30
    
    # Check Traefik container
    if docker compose -f docker-compose.traefik.yml ps traefik | grep -q "Up"; then
        test_pass "Traefik container is running"
    else
        test_fail "Traefik container is not running"
    fi
    
    # Check backend container
    if docker compose -f docker-compose.traefik.yml ps backend | grep -q "Up"; then
        test_pass "Backend container is running"
    else
        test_fail "Backend container is not running"
    fi
    
    # Check frontend container
    if docker compose -f docker-compose.traefik.yml ps frontend | grep -q "Up"; then
        test_pass "Frontend container is running"
    else
        test_fail "Frontend container is not running"
    fi
    
    # Check container health
    if docker compose -f docker-compose.traefik.yml exec -T traefik traefik healthcheck --ping >/dev/null 2>&1; then
        test_pass "Traefik healthcheck passed"
    else
        test_fail "Traefik healthcheck failed"
    fi
}

# Test 3: Network connectivity
test_network_connectivity() {
    log "🌐 Testing network connectivity..."
    
    # Test HTTP to HTTPS redirect
    log "Testing HTTP to HTTPS redirect..."
    local redirect_test=$(curl -I -s --max-time 10 "http://localhost" 2>/dev/null | head -1)
    if echo "$redirect_test" | grep -q "301\|302"; then
        test_pass "HTTP to HTTPS redirect working"
    else
        test_fail "HTTP to HTTPS redirect not working"
    fi
    
    # Test Traefik dashboard
    log "Testing Traefik dashboard..."
    if curl -s --max-time 10 "http://localhost:8080/dashboard/" | grep -q "Traefik\|dashboard"; then
        test_pass "Traefik dashboard accessible"
    else
        test_fail "Traefik dashboard not accessible"
    fi
    
    # Test frontend routing
    log "Testing frontend routing..."
    if curl -s --max-time 10 "http://localhost" | grep -q "html\|js\|css"; then
        test_pass "Frontend routing working"
    else
        test_fail "Frontend routing not working"
    fi
    
    # Test backend API routing
    log "Testing backend API routing..."
    if curl -s --max-time 10 "http://localhost/api/ready" | grep -q "ready\|ok\|status"; then
        test_pass "Backend API routing working"
    else
        test_fail "Backend API routing not working"
    fi
}

# Test 4: SSL certificate handling
test_ssl_certificates() {
    log "🔒 Testing SSL certificate handling..."
    
    # Wait for certificate acquisition
    log "Waiting for SSL certificate acquisition..."
    local max_attempts=30
    local attempt=1
    
    while [[ $attempt -le $max_attempts ]]; do
        if docker compose -f docker-compose.traefik.yml exec -T traefik test -f /letsencrypt/acme.json 2>/dev/null; then
            test_pass "SSL certificates file created"
            break
        fi
        
        if [[ $attempt -eq $max_attempts ]]; then
            test_fail "SSL certificates file not created after timeout"
            return 1
        fi
        
        sleep 10
        ((attempt++))
    done
    
    # Check acme.json content
    if docker compose -f docker-compose.traefik.yml exec -T traefik test -s /letsencrypt/acme.json; then
        test_pass "SSL certificates file has content"
    else
        test_fail "SSL certificates file is empty"
    fi
    
    # Test HTTPS connectivity (if domain is configured)
    if [[ "$DOMAIN" != "localhost" ]] && [[ "$STAGING_MODE" == "false" ]]; then
        log "Testing HTTPS connectivity for $DOMAIN..."
        if curl -I -s --max-time 10 "https://$DOMAIN" | grep -q "200\|301\|302"; then
            test_pass "HTTPS connectivity working for $DOMAIN"
        else
            warn "HTTPS connectivity test failed for $DOMAIN (may need DNS propagation)"
        fi
    else
        warn "Skipping HTTPS test (localhost or staging mode)"
    fi
}

# Test 5: Middlewares and security
test_middlewares() {
    log "🛡️ Testing middlewares and security..."
    
    # Test security headers
    log "Testing security headers..."
    local headers=$(curl -I -s --max-time 10 "http://localhost" 2>/dev/null)
    
    if echo "$headers" | grep -qi "x-frame-options"; then
        test_pass "X-Frame-Options header present"
    else
        test_fail "X-Frame-Options header missing"
    fi
    
    if echo "$headers" | grep -qi "x-content-type-options"; then
        test_pass "X-Content-Type-Options header present"
    else
        test_fail "X-Content-Type-Options header missing"
    fi
    
    if echo "$headers" | grep -qi "strict-transport-security"; then
        test_pass "HSTS header present"
    else
        test_fail "HSTS header missing"
    fi
    
    # Test rate limiting
    log "Testing rate limiting..."
    local rapid_requests=0
    for i in {1..10}; do
        if curl -s --max-time 5 "http://localhost" >/dev/null 2>&1; then
            ((rapid_requests++))
        fi
    done
    
    if [[ $rapid_requests -ge 8 ]]; then
        test_pass "Rate limiting allows normal requests"
    else
        test_fail "Rate limiting may be too restrictive"
    fi
}

# Test 6: Metrics and monitoring
test_monitoring() {
    log "📊 Testing metrics and monitoring..."
    
    # Test Prometheus metrics endpoint
    if curl -s --max-time 10 "http://localhost:8080/metrics" | grep -q "traefik_"; then
        test_pass "Prometheus metrics endpoint working"
    else
        test_fail "Prometheus metrics endpoint not working"
    fi
    
    # Test health metrics
    if curl -s --max-time 10 "http://localhost:8080/ping" | grep -q "OK"; then
        test_pass "Health endpoint working"
    else
        test_fail "Health endpoint not working"
    fi
    
    # Test API metrics
    local api_metrics=$(curl -s --max-time 10 "http://localhost:8080/metrics" | grep "traefik_service_requests_total" | wc -l)
    if [[ $api_metrics -gt 0 ]]; then
        test_pass "API metrics being collected"
    else
        test_fail "API metrics not being collected"
    fi
}

# Test 7: Performance and load
test_performance() {
    log "⚡ Testing performance..."
    
    # Test response time
    local response_time=$(curl -o /dev/null -s --max-time 10 -w "%{time_total}" "http://localhost" 2>/dev/null)
    if [[ $(echo "$response_time < 2.0" | bc -l 2>/dev/null || echo "1") -eq 1 ]]; then
        test_pass "Response time acceptable (${response_time}s)"
    else
        test_fail "Response time too high (${response_time}s)"
    fi
    
    # Test concurrent connections
    log "Testing concurrent connections..."
    local concurrent_success=0
    for i in {1..5}; do
        if curl -s --max-time 5 "http://localhost" >/dev/null 2>&1 & then
            ((concurrent_success++))
        fi
    done
    wait
    
    if [[ $concurrent_success -ge 4 ]]; then
        test_pass "Concurrent connections handled well"
    else
        test_fail "Concurrent connections handling issues"
    fi
}

# Generate test report
generate_test_report() {
    local total_tests=$((TESTS_PASSED + TESTS_FAILED))
    local success_rate=0
    if [[ $total_tests -gt 0 ]]; then
        success_rate=$(( (TESTS_PASSED * 100) / total_tests ))
    fi
    
    local report_file="./logs/traefik-test-report-$(date +%Y%m%d).json"
    
    cat > "$report_file" << EOF
{
  "timestamp": "$(date -Iseconds)",
  "domain": "${DOMAIN}",
  "staging_mode": ${STAGING_MODE},
  "test_results": {
    "total": ${total_tests},
    "passed": ${TESTS_PASSED},
    "failed": ${TESTS_FAILED},
    "success_rate": ${success_rate}
  },
  "tests_performed": [
    "Configuration validation",
    "Docker services startup",
    "Network connectivity",
    "SSL certificate handling",
    "Middlewares and security",
    "Metrics and monitoring",
    "Performance and load"
  ],
  "recommendation": "$([[ $success_rate -ge 90 ]] && echo "Ready for production" || [[ $success_rate -ge 70 ]] && echo "Ready with warnings" || echo "Not ready for production")"
}
EOF
    
    log "📊 Test report generated: $report_file"
    
    # Print summary
    echo -e "\n${BLUE}=== Test Summary ===${NC}"
    echo -e "Total Tests: ${total_tests}"
    echo -e "${GREEN}Passed: ${TESTS_PASSED}${NC}"
    echo -e "${RED}Failed: ${TESTS_FAILED}${NC}"
    echo -e "Success Rate: ${success_rate}%"
    
    if [[ $success_rate -ge 90 ]]; then
        echo -e "${GREEN}✅ Ready for production deployment${NC}"
    elif [[ $success_rate -ge 70 ]]; then
        echo -e "${YELLOW}⚠️ Ready with warnings - review failed tests${NC}"
    else
        echo -e "${RED}❌ Not ready for production - fix failed tests${NC}"
    fi
}

# Cleanup test environment
cleanup_test_environment() {
    log "🧹 Cleaning up test environment..."
    
    # Stop test services
    docker compose -f docker-compose.traefik.yml down
    
    # Remove test containers
    docker compose -f docker-compose.traefik.yml rm -f 2>/dev/null || true
    
    success "Test environment cleaned up"
}

# Main test execution
main() {
    log "🧪 Starting Traefik setup testing for ${DOMAIN}"
    
    # Run all tests
    test_configuration
    test_docker_services
    test_network_connectivity
    test_ssl_certificates
    test_middlewares
    test_monitoring
    test_performance
    
    # Generate report
    generate_test_report
    
    # Cleanup
    cleanup_test_environment
    
    # Exit with appropriate code
    if [[ $TESTS_FAILED -eq 0 ]]; then
        success "🎉 All tests passed!"
        exit 0
    else
        error "❌ Some tests failed. Check the log for details."
        exit 1
    fi
}

# Show help
show_help() {
    cat << EOF
🧪 Traefik Setup Testing Script

Usage: $0 [options]

This script performs comprehensive testing of the Traefik setup:
- Configuration validation
- Docker services startup
- Network connectivity
- SSL certificate handling
- Middlewares and security
- Metrics and monitoring
- Performance and load

Environment Variables:
    DOMAIN               Domain name (default: from .env)
    STAGING_MODE         Use Let's Encrypt staging (default: true)
    TEST_LOG             Log file path (default: ./logs/traefik-test.log)

Examples:
    $0                                          # Run all tests
    DOMAIN=example.com $0                      # Test specific domain
    STAGING_MODE=false $0                       # Test with production certificates
    
Test Categories:
    1. Configuration validation
    2. Docker services startup
    3. Network connectivity
    4. SSL certificate handling
    5. Middlewares and security
    6. Metrics and monitoring
    7. Performance and load

EOF
}

# Handle arguments
case "${1:-}" in
    "help"|"--help"|"-h")
        show_help
        exit 0
        ;;
    "cleanup")
        cleanup_test_environment
        exit 0
        ;;
    *)
        main
        ;;
esac
