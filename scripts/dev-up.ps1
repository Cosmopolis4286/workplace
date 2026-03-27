# 🚀 Dev Environment Launcher - Workplace DEV
# Uso: ./scripts/dev-up.ps1

$ErrorActionPreference = "Stop"

Write-Host "🚀 Iniciando entorno de desarrollo Workplace..." -ForegroundColor Blue
Write-Host ""

# Verificar archivos existen
if (-not (Test-Path ".env.dev")) {
    Write-Host "❌ Archivo .env.dev no encontrado" -ForegroundColor Red
    exit 1
}

if (-not (Test-Path "docker-compose.lite.dev.yml")) {
    Write-Host "❌ Archivo docker-compose.lite.dev.yml no encontrado" -ForegroundColor Red
    exit 1
}

# Detener servicios existentes si hay
Write-Host "🛑 Deteniendo servicios existentes..." -ForegroundColor Yellow
docker compose --env-file .env.dev -f docker-compose.lite.dev.yml down 2>$null

# Build
Write-Host "🔨 Construyendo imágenes..." -ForegroundColor Yellow
docker compose --env-file .env.dev -f docker-compose.lite.dev.yml build

# Up
Write-Host "▶️ Iniciando servicios..." -ForegroundColor Green
docker compose --env-file .env.dev -f docker-compose.lite.dev.yml up -d

# Esperar salud
Write-Host "⏳ Esperando servicios..." -ForegroundColor Yellow
Start-Sleep -Seconds 10

# Verificar estado
Write-Host ""
Write-Host "📊 Estado de servicios:" -ForegroundColor Blue
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" | Select-String "dev|traefik"

Write-Host ""
Write-Host "🌐 URLs de desarrollo:" -ForegroundColor Green
Write-Host "   Frontend:     http://localhost:3000"
Write-Host "   Backend API:  http://localhost:3001"
Write-Host "   PostgreSQL:   localhost:5432"
Write-Host "   Redis:        localhost:6379"
Write-Host "   Traefik Dash: http://localhost:8080"
Write-Host ""
Write-Host "✅ Entorno DEV listo!" -ForegroundColor Green
Write-Host "   Hot reload activo: guarda cambios y verás actualizaciones automáticas" -ForegroundColor Cyan
Write-Host ""
Write-Host "💡 Comandos útiles:" -ForegroundColor Blue
Write-Host "   Ver logs:  docker compose --env-file .env.dev -f docker-compose.lite.dev.yml logs -f"
Write-Host "   Detener:   docker compose --env-file .env.dev -f docker-compose.lite.dev.yml down"
Write-Host "   Restart:   ./scripts/dev-up.ps1"
