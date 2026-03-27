@echo off
chcp 65001 >nul
echo Starting Workplace DEV environment...
echo.

if not exist ".env.dev" (
    echo ERROR: .env.dev not found
    exit /b 1
)

if not exist "docker-compose.lite.dev.yml" (
    echo ERROR: docker-compose.lite.dev.yml not found
    exit /b 1
)

echo Stopping existing services...
docker compose --env-file .env.dev -f docker-compose.lite.dev.yml down 2^>nul

echo Building images...
docker compose --env-file .env.dev -f docker-compose.lite.dev.yml build

echo Starting services...
docker compose --env-file .env.dev -f docker-compose.lite.dev.yml up -d

echo Waiting for services...
timeout /t 10 /nobreak ^>nul

echo.
echo Service status:
docker ps --format "table {{.Names}}\t{{.Status}}" | findstr /I "dev traefik"

echo.
echo URLs:
echo   Frontend:  http://localhost:3000
echo   Backend:   http://localhost:3001
echo   Postgres:  localhost:5432
echo   Redis:     localhost:6379
echo   Traefik:   http://localhost:8080
echo.
echo DEV environment ready!
echo.
