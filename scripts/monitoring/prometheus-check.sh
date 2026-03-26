#!/bin/bash

# prometheus-check.sh - Verify Prometheus rules and alerting status
set -euo pipefail

PROMETHEUS_URL="${PROMETHEUS_URL:-http://localhost:9090}"
LOG_FILE="${LOG_FILE:-/var/log/prometheus-check.log}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

# Function to check if Prometheus is accessible
check_prometheus_health() {
    log "Checking Prometheus health..."
    
    if curl -s "${PROMETHEUS_URL}/-/healthy" > /dev/null; then
        log -e "${GREEN}✅ Prometheus is healthy${NC}"
        return 0
    else
        log -e "${RED}❌ Prometheus is not accessible${NC}"
        return 1
    fi
}

# Function to check if rules are loaded
check_rules_loaded() {
    log "Checking if Prometheus rules are loaded..."
    
    local rules_count
    rules_count=$(curl -s "${PROMETHEUS_URL}/api/v1/rules" | jq -r '.data.groups | length' 2>/dev/null || echo "0")
    
    if [ "$rules_count" -gt 0 ]; then
        log -e "${GREEN}✅ Rules are loaded: $rules_count rule groups found${NC}"
        
        # Show rule groups
        log "Rule groups:"
        curl -s "${PROMETHEUS_URL}/api/v1/rules" | jq -r '.data.groups[].name' 2>/dev/null | while read -r group; do
            log "  - $group"
        done
        
        return 0
    else
        log -e "${RED}❌ No rules are loaded${NC}"
        return 1
    fi
}

# Function to check alerting status
check_alerting_status() {
    log "Checking alerting status..."
    
    local active_alerts
    active_alerts=$(curl -s "${PROMETHEUS_URL}/api/v1/alerts" | jq -r '.data.alerts | length' 2>/dev/null || echo "0")
    
    log -e "${YELLOW}📊 Active alerts: $active_alerts${NC}"
    
    if [ "$active_alerts" -gt 0 ]; then
        log "Current active alerts:"
        curl -s "${PROMETHEUS_URL}/api/v1/alerts" | jq -r '.data.alerts[] | "\(.labels.alertname): \(.state)"' 2>/dev/null | while read -r alert; do
            log "  - $alert"
        done
    fi
    
    return 0
}

# Function to check specific targets
check_targets() {
    log "Checking Prometheus targets..."
    
    local total_targets healthy_targets
    total_targets=$(curl -s "${PROMETHEUS_URL}/api/v1/targets" | jq -r '.data.activeTargets | length' 2>/dev/null || echo "0")
    healthy_targets=$(curl -s "${PROMETHEUS_URL}/api/v1/targets" | jq -r '.data.activeTargets[] | select(.health=="up") | .job' 2>/dev/null | wc -l)
    
    log -e "${YELLOW}🎯 Targets: $healthy_targets/$total_targets healthy${NC}"
    
    if [ "$healthy_targets" -lt "$total_targets" ]; then
        log -e "${YELLOW}⚠️ Some targets are down:${NC}"
        curl -s "${PROMETHEUS_URL}/api/v1/targets" | jq -r '.data.activeTargets[] | select(.health!="up") | "  - \(.job): \(.health)"' 2>/dev/null | while read -r target; do
            log "$target"
        done
    fi
    
    return 0
}

# Function to test rule evaluation
test_rule_evaluation() {
    log "Testing rule evaluation..."
    
    # Get rule evaluation results
    local evaluation_results
    evaluation_results=$(curl -s "${PROMETHEUS_URL}/api/v1/rules?type=alert" 2>/dev/null)
    
    if [ $? -eq 0 ] && [ -n "$evaluation_results" ]; then
        local firing_alerts
        firing_alerts=$(echo "$evaluation_results" | jq -r '.data.groups[].rules[] | select(.state=="firing") | .name' 2>/dev/null | wc -l)
        
        if [ "$firing_alerts" -gt 0 ]; then
            log -e "${YELLOW}🚨 $firing_alerts alerts are currently firing${NC}"
            echo "$evaluation_results" | jq -r '.data.groups[].rules[] | select(.state=="firing") | "  - \(.name): \(.annotations.summary // "No summary")"' 2>/dev/null | while read -r alert; do
                log "$alert"
            done
        else
            log -e "${GREEN}✅ No alerts are firing${NC}"
        fi
    else
        log -e "${YELLOW}⚠️ Could not retrieve rule evaluation results${NC}"
    fi
}

# Function to check configuration
check_config() {
    log "Checking Prometheus configuration..."
    
    local config_status
    config_status=$(curl -s "${PROMETHEUS_URL}/api/v1/status/config" | jq -r '.status' 2>/dev/null || echo "error")
    
    if [ "$config_status" = "success" ]; then
        log -e "${GREEN}✅ Configuration is valid${NC}"
        
        # Check if rule files are included
        local rule_files
        rule_files=$(curl -s "${PROMETHEUS_URL}/api/v1/status/config" | jq -r '.data.yaml.rule_files[]?' 2>/dev/null || echo "")
        
        if [ -n "$rule_files" ]; then
            log "Rule files in config:"
            echo "$rule_files" | while read -r file; do
                log "  - $file"
            done
        else
            log -e "${YELLOW}⚠️ No rule files found in configuration${NC}"
        fi
    else
        log -e "${RED}❌ Configuration error${NC}"
        return 1
    fi
}

# Main execution
main() {
    log "=== Prometheus Health Check Started ==="
    
    local overall_status=0
    
    # Run all checks
    if ! check_prometheus_health; then
        overall_status=1
    fi
    
    if ! check_config; then
        overall_status=1
    fi
    
    if ! check_rules_loaded; then
        overall_status=1
    fi
    
    check_targets
    check_alerting_status
    test_rule_evaluation
    
    # Final status
    if [ $overall_status -eq 0 ]; then
        log -e "${GREEN}=== All checks passed! Prometheus is properly configured ===${NC}"
    else
        log -e "${RED}=== Some checks failed. Please review the configuration ===${NC}"
    fi
    
    return $overall_status
}

# Run main function
main "$@"
