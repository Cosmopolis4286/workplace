#!/bin/bash
set -euo pipefail

# SLA Monitoring Script
# Monitorea el cumplimiento de SLA durante deployments y operación normal

# Configuración
LOG_DIR="/opt/workplace/logs/sla"
METRICS_DIR="/opt/workplace/metrics"
ALERT_THRESHOLD_UPTIME=99.9  # SLA objetivo
ALERT_THRESHOLD_RESPONSE_TIME=1000  # ms
ALERT_THRESHOLD_ERROR_RATE=1.0  # %

# Crear directorios
mkdir -p "$LOG_DIR" "$METRICS_DIR"

# Variables globales
CURRENT_DEPLOY_ID=""
START_TIME=""
END_TIME=""

# Funciones de logging
function log_sla() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] SLA: $1" | tee -a "$LOG_DIR/sla_$(date +%Y%m%d).log"
}

function log_metric() {
  local metric_name=$1
  local metric_value=$2
  local timestamp=$(date +%s)
  
  echo "${timestamp},${metric_name},${metric_value}" >> "$METRICS_DIR/metrics_$(date +%Y%m%d).csv"
  log_sla "METRIC: $metric_name=$metric_value"
}

# Función para obtener ID del deploy actual
function get_deploy_id() {
  if [ -z "$CURRENT_DEPLOY_ID" ]; then
    CURRENT_DEPLOY_ID="deploy_$(date +%s)_$(git rev-parse --short HEAD 2>/dev/null || echo 'unknown')"
  fi
  echo "$CURRENT_DEPLOY_ID"
}

# Función para iniciar monitoreo de deploy
function start_deploy_monitoring() {
  CURRENT_DEPLOY_ID=$(get_deploy_id)
  START_TIME=$(date +%s)
  
  log_sla "🚀 Iniciando monitoreo de deploy: $CURRENT_DEPLOY_ID"
  
  # Guardar estado inicial
  local initial_uptime=$(get_current_uptime)
  local initial_response_time=$(get_average_response_time)
  local initial_error_rate=$(get_error_rate)
  
  log_metric "deploy_start" "$START_TIME"
  log_metric "initial_uptime" "$initial_uptime"
  log_metric "initial_response_time" "$initial_response_time"
  log_metric "initial_error_rate" "$initial_error_rate"
  
  # Iniciar monitoreo continuo en background
  start_continuous_monitoring &
}

# Función para finalizar monitoreo de deploy
function end_deploy_monitoring() {
  local deploy_status=$1  # success|failure
  END_TIME=$(date +%s)
  
  local deploy_duration=$((END_TIME - START_TIME))
  
  log_sla "🏁 Finalizando monitoreo de deploy: $CURRENT_DEPLOY_ID (status: $deploy_status)"
  
  # Métricas finales
  local final_uptime=$(get_current_uptime)
  local final_response_time=$(get_average_response_time)
  local final_error_rate=$(get_error_rate)
  
  log_metric "deploy_end" "$END_TIME"
  log_metric "deploy_status" "$deploy_status"
  log_metric "deploy_duration" "$deploy_duration"
  log_metric "final_uptime" "$final_uptime"
  log_metric "final_response_time" "$final_response_time"
  log_metric "final_error_rate" "$final_error_rate"
  
  # Calcular impacto en SLA
  calculate_sla_impact "$deploy_status" "$deploy_duration"
  
  # Detener monitoreo continuo
  stop_continuous_monitoring
}

# Función para obtener uptime actual
function get_current_uptime() {
  local nginx_id=$(docker compose ps -q nginx)
  if [ -n "$nginx_id" ]; then
    # Hacer 10 requests y calcular éxito
    local success_count=0
    for i in {1..10}; do
      if docker exec "$nginx_id" curl -f --max-time 2 http://localhost/api/health >/dev/null 2>&1; then
        success_count=$((success_count + 1))
      fi
      sleep 0.1
    done
    echo "$((success_count * 10))"  # Porcentaje
  else
    echo "0"
  fi
}

# Función para obtener tiempo de respuesta promedio
function get_average_response_time() {
  local nginx_id=$(docker compose ps -q nginx)
  if [ -n "$nginx_id" ]; then
    local total_time=0
    local success_count=0
    
    for i in {1..5}; do
      local start_time=$(date +%s%N)
      if docker exec "$nginx_id" curl -f --max-time 2 http://localhost/api/health >/dev/null 2>&1; then
        local end_time=$(date +%s%N)
        local response_time=$(((end_time - start_time) / 1000000))  # Convertir a ms
        total_time=$((total_time + response_time))
        success_count=$((success_count + 1))
      fi
      sleep 0.2
    done
    
    if [ "$success_count" -gt 0 ]; then
      echo $((total_time / success_count))
    else
      echo "9999"
    fi
  else
    echo "9999"
  fi
}

# Función para obtener tasa de error
function get_error_rate() {
  local nginx_id=$(docker compose ps -q nginx)
  if [ -n "$nginx_id" ]; then
    local error_count=0
    local total_count=10
    
    for i in {1..10}; do
      if ! docker exec "$nginx_id" curl -f --max-time 2 http://localhost/api/health >/dev/null 2>&1; then
        error_count=$((error_count + 1))
      fi
      sleep 0.1
    done
    
    echo "($error_count * 100) / $total_count" | bc -l
  else
    echo "100"
  fi
}

# Función para monitoreo continuo
function start_continuous_monitoring() {
  log_sla "🔍 Iniciando monitoreo continuo..."
  
  while true; do
    local current_uptime=$(get_current_uptime)
    local current_response_time=$(get_average_response_time)
    local current_error_rate=$(get_error_rate)
    
    log_metric "continuous_uptime" "$current_uptime"
    log_metric "continuous_response_time" "$current_response_time"
    log_metric "continuous_error_rate" "$current_error_rate"
    
    # Verificar umbrales de alerta
    check_alert_thresholds "$current_uptime" "$current_response_time" "$current_error_rate"
    
    sleep 30  # Monitorear cada 30 segundos
  done &
  
  CONTINUOUS_MONITOR_PID=$!
  log_sla "📊 Monitoreo continuo iniciado (PID: $CONTINUOUS_MONITOR_PID)"
}

# Función para detener monitoreo continuo
function stop_continuous_monitoring() {
  if [ -n "${CONTINUOUS_MONITOR_PID:-}" ]; then
    log_sla "🛑 Deteniendo monitoreo continuo (PID: $CONTINUOUS_MONITOR_PID)"
    kill "$CONTINUOUS_MONITOR_PID" 2>/dev/null || true
    wait "$CONTINUOUS_MONITOR_PID" 2>/dev/null || true
    unset CONTINUOUS_MONITOR_PID
    log_sla "✅ Monitoreo continuo detenido"
  fi
}

# Función para verificar umbrales de alerta
function check_alert_thresholds() {
  local uptime=$1
  local response_time=$2
  local error_rate=$3
  
  # Alerta de uptime - usar awk en lugar de bc
  if awk "BEGIN {exit ($uptime < $ALERT_THRESHOLD_UPTIME)}"; then
    log_sla "🚨 ALERTA: Uptime por debajo del umbral: ${uptime}% < ${ALERT_THRESHOLD_UPTIME}%"
    send_alert "uptime_low" "Uptime: ${uptime}% (umbral: ${ALERT_THRESHOLD_UPTIME}%)"
  fi
  
  # Alerta de tiempo de respuesta - usar awk en lugar de bc
  if awk "BEGIN {exit ($response_time > $ALERT_THRESHOLD_RESPONSE_TIME)}"; then
    log_sla "🚨 ALERTA: Tiempo de respuesta alto: ${response_time}ms > ${ALERT_THRESHOLD_RESPONSE_TIME}ms"
    send_alert "response_time_high" "Response Time: ${response_time}ms (umbral: ${ALERT_THRESHOLD_RESPONSE_TIME}ms)"
  fi
  
  # Alerta de tasa de error - usar awk en lugar de bc
  if awk "BEGIN {exit ($error_rate > $ALERT_THRESHOLD_ERROR_RATE)}"; then
    log_sla "🚨 ALERTA: Tasa de error alta: ${error_rate}% > ${ALERT_THRESHOLD_ERROR_RATE}%"
    send_alert "error_rate_high" "Error Rate: ${error_rate}% (umbral: ${ALERT_THRESHOLD_ERROR_RATE}%)"
  fi
}

# Función para enviar alertas
function send_alert() {
  local alert_type=$1
  local message=$2
  
  log_sla "📢 ALERTA: $alert_type - $message"
  
  # Aquí podrías integrar con:
  # - Slack webhook
  # - Discord webhook  
  # - Email
  # - SMS
  # - PagerDuty
  
  # Por ahora, solo logueamos
  echo "ALERT[$(date '+%Y-%m-%d %H:%M:%S')] $alert_type: $message" >> "$LOG_DIR/alerts_$(date +%Y%m%d).log"
}

# Función para calcular impacto en SLA
function calculate_sla_impact() {
  local deploy_status=$1
  local deploy_duration=$2
  
  log_sla "📊 Calculando impacto en SLA..."
  
  # Calcular downtime durante deploy
  local downtime_during_deploy=0
  
  if [ "$deploy_status" = "failure" ]; then
    # Si falló, asumir todo el tiempo como downtime
    downtime_during_deploy="$deploy_duration"
  else
    # Si fue exitoso, calcular downtime real basado en métricas
    # Aquí podrías analizar las métricas continuas para encontrar períodos de caída
    downtime_during_deploy=$(calculate_downtime_from_metrics)
  fi
  
  # Calcular SLA del período - usar awk en lugar de bc
  local period_duration=86400  # 24 horas en segundos
  local uptime_percentage=$(awk "BEGIN {printf \"%.2f\", ($period_duration - $downtime_during_deploy) * 100 / $period_duration}")
  
  log_metric "downtime_during_deploy" "$downtime_during_deploy"
  log_metric "sla_percentage" "$uptime_percentage"
  
  # Verificar cumplimiento de SLA - usar awk en lugar de bc
  if awk "BEGIN {exit ($uptime_percentage >= $ALERT_THRESHOLD_UPTIME)}"; then
    log_sla "❌ SLA NO CUMPLIDO: ${uptime_percentage}% < ${ALERT_THRESHOLD_UPTIME}%"
    send_alert "sla_breached" "SLA: ${uptime_percentage}% (requerido: ${ALERT_THRESHOLD_UPTIME}%)"
  else
    log_sla "✅ SLA CUMPLIDO: ${uptime_percentage}% >= ${ALERT_THRESHOLD_UPTIME}%"
  fi
}

# Función para calcular downtime a partir de métricas
function calculate_downtime_from_metrics() {
  local metrics_file="$METRICS_DIR/metrics_$(date +%Y%m%d).csv"
  
  if [ ! -f "$metrics_file" ]; then
    echo "0"
    return
  fi
  
  # Analizar métricas para encontrar períodos con uptime < 99%
  local total_downtime=0
  
  while IFS=',' read -r timestamp metric_name metric_value; do
    if [ "$metric_name" = "continuous_uptime" ]; then
      if (( $(echo "$metric_value < 99" | bc -l) )); then
        total_downtime=$((total_downtime + 30))  # 30 segundos por cada medición
      fi
    fi
  done < "$metrics_file"
  
  echo "$total_downtime"
}

# Función para generar reporte SLA
function generate_sla_report() {
  local report_date=${1:-$(date +%Y%m%d)}
  local report_file="$LOG_DIR/sla_report_${report_date}.html"
  
  log_sla "📋 Generando reporte SLA para ${report_date}..."
  
  cat > "$report_file" << EOF
<!DOCTYPE html>
<html>
<head>
    <title>SLA Report - ${report_date}</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { background: #f0f0f0; padding: 20px; border-radius: 5px; }
        .metric { margin: 10px 0; padding: 10px; border-left: 4px solid #007cba; }
        .alert { border-left-color: #dc3545; background: #f8d7da; }
        .success { border-left-color: #28a745; background: #d4edda; }
        table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #f2f2f2; }
    </style>
</head>
<body>
    <div class="header">
        <h1>📊 SLA Report - ${report_date}</h1>
        <p>Generated: $(date)</p>
    </div>
    
    <h2>📈 SLA Summary</h2>
    <div class="metric $(get_sla_class $report_date)">
        <strong>Overall SLA:</strong> $(get_overall_sla $report_date)%
    </div>
    
    <h2>🚀 Deployments</h2>
    <table>
        <tr><th>Time</th><th>Deploy ID</th><th>Status</th><th>Duration</th><th>Impact</th></tr>
$(generate_deploy_table $report_date)
    </table>
    
    <h2>📊 Metrics</h2>
    <table>
        <tr><th>Metric</th><th>Average</th><th>Min</th><th>Max</th><th>Alerts</th></tr>
$(generate_metrics_table $report_date)
    </table>
    
    <h2>🚨 Alerts</h2>
    <div class="alerts">
$(generate_alerts_section $report_date)
    </div>
</body>
</html>
EOF

  log_sla "✅ Reporte SLA generado: $report_file"
}

# Funciones helper para generar reporte
function get_sla_class() {
  local date=$1
  local sla=$(get_overall_sla "$date")
  if (( $(echo "$sla >= $ALERT_THRESHOLD_UPTIME" | bc -l) )); then
    echo "success"
  else
    echo "alert"
  fi
}

function get_overall_sla() {
  # Implementar cálculo de SLA general del día
  echo "99.95"  # Placeholder
}

function generate_deploy_table() {
  # Implementar generación de tabla de deploys
  echo "<tr><td>2024-01-01 10:00</td><td>deploy_123</td><td>success</td><td>45s</td><td>0s downtime</td></tr>"
}

function generate_metrics_table() {
  # Implementar generación de tabla de métricas
  echo "<tr><td>Response Time</td><td>250ms</td><td>180ms</td><td>450ms</td><td>0</td></tr>"
}

function generate_alerts_section() {
  # Implementar sección de alertas
  echo "<div class='metric alert'>No alerts</div>"
}

# Función principal
function main() {
  local command=${1:-monitor}
  
  case $command in
    "start-deploy")
      start_deploy_monitoring
      ;;
    "end-deploy")
      end_deploy_monitoring "${2:-success}"
      ;;
    "report")
      generate_sla_report "$2"
      ;;
    "monitor")
      start_continuous_monitoring
      trap stop_continuous_monitoring EXIT
      wait  # Mantener corriendo
      ;;
    *)
      echo "Usage: $0 {start-deploy|end-deploy|report|monitor}"
      echo "  start-deploy              - Iniciar monitoreo de deploy"
      echo "  end-deploy [success|failure] - Finalizar monitoreo de deploy"
      echo "  report [date]             - Generar reporte SLA"
      echo "  monitor                   - Iniciar monitoreo continuo"
      exit 1
      ;;
  esac
}

# Ejecutar función principal
main "$@"
