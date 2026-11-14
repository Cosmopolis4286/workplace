# Levanta el entorno de desarrollo híbrido (backend, Postgres, Redis y
# herramientas en Docker; el frontend corre aparte con `pnpm dev`).
#
# Uso (desde la raíz del repo, en PowerShell):
#   .\scripts\dev\dev-hybrid.ps1            # levantar
#   .\scripts\dev\dev-hybrid.ps1 -Build     # reconstruir la imagen del backend
#
# Antes de levantar revisa .env.dev y avisa de los errores típicos:
# variables vacías, contraseña de Postgres con caracteres que rompen la
# DATABASE_URL, APP_ENV distinto de development. La contraseña de Postgres
# se sincroniza sola con .env.dev en cada arranque
# (docker/postgres/dev-entrypoint.sh).
param(
    [switch]$Build
)

# 'Continue': en Windows PowerShell 5.1, con 'Stop' cualquier línea que docker
# escriba en stderr (p. ej. el progreso de compose) aborta el script.
$ErrorActionPreference = 'Continue'
$Root = Resolve-Path (Join-Path $PSScriptRoot '..\..')
Set-Location $Root

$EnvFile = '.env.dev'
$Compose = @('compose', '--env-file', $EnvFile, '-f', 'docker-compose.hybrid.yml')

function Fail($msg) { Write-Host "❌ $msg" -ForegroundColor Red; exit 1 }
function Warn($msg) { Write-Host "⚠️  $msg" -ForegroundColor Yellow }
function Ok($msg)   { Write-Host "✅ $msg" -ForegroundColor Green }

if (-not (Test-Path $EnvFile)) {
    Fail "No existe $EnvFile. Cópialo desde .env.dev.example y complétalo."
}

# Lee KEY=VALUE (ignora comentarios y quita comillas que envuelvan el valor).
$vars = @{}
foreach ($line in Get-Content $EnvFile) {
    if ($line -match '^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$') {
        # Guardar la clave antes del segundo -match, que pisa $Matches.
        $key = $Matches[1]
        $value = $Matches[2].Trim()
        if ($value -match '^"(.*)"$' -or $value -match "^'(.*)'$") { $value = $Matches[1] }
        $vars[$key] = $value
    }
}

$missing = @('POSTGRES_USER', 'POSTGRES_PASSWORD', 'POSTGRES_DB', 'REDIS_PASSWORD') |
    Where-Object { -not $vars[$_] }
if ($missing) { Fail "Faltan valores en ${EnvFile}: $($missing -join ', ')" }

# La DATABASE_URL se arma en el compose con la contraseña tal cual: símbolos
# como @ : / # ? % & la cortan y el backend falla con P1000.
if ($vars['POSTGRES_PASSWORD'] -notmatch '^[A-Za-z0-9._~-]+$') {
    Fail ("POSTGRES_PASSWORD tiene caracteres que rompen la DATABASE_URL. " +
          "Usa solo letras, números y . _ ~ - (p. ej. la salida de: openssl rand -hex 24).")
}
if ($vars['APP_ENV'] -ne 'development') {
    Warn "APP_ENV no es 'development' en $EnvFile: probar desde el celular por la red local no funcionará (CORS)."
}
Ok "$EnvFile revisado"

$upArgs = $Compose + @('up', '-d')
if ($Build) { $upArgs += '--build' }
& docker @upArgs
if ($LASTEXITCODE -ne 0) { Fail "docker compose up falló" }

Write-Host "⏳ Esperando a que el backend esté listo (migraciones incluidas)..."
$deadline = (Get-Date).AddMinutes(4)
$status = ''
while ((Get-Date) -lt $deadline) {
    $status = (& docker inspect -f '{{.State.Health.Status}}' backend-hybrid 2>$null)
    $running = (& docker inspect -f '{{.State.Running}}' backend-hybrid 2>$null)
    if ($status -eq 'healthy') { break }
    if ($running -eq 'false') { break }
    Start-Sleep -Seconds 3
}

if ($status -ne 'healthy') {
    Write-Host ""
    Warn "El backend no quedó listo. Últimas líneas de Postgres y del backend:"
    & docker logs postgres-hybrid --tail 15
    Write-Host "-----"
    & docker logs backend-hybrid --tail 40
    Fail "Revisa los logs de arriba."
}

$ip = (Get-NetIPAddress -AddressFamily IPv4 -ErrorAction SilentlyContinue |
    Where-Object { $_.IPAddress -match '^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)' -and $_.PrefixOrigin -ne 'WellKnown' } |
    Select-Object -First 1).IPAddress

Write-Host ""
Ok "Backend listo en http://localhost:3001"
Write-Host "   Ahora el frontend:  cd frontend; pnpm dev   →  http://localhost:3000"
if ($ip) { Write-Host "   Desde el celular (mismo WiFi): http://${ip}:3000" }
Write-Host "   Logs:     docker $($Compose -join ' ') logs -f backend"
Write-Host "   Detener:  docker $($Compose -join ' ') down"
