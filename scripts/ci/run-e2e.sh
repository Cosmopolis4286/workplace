#!/bin/bash
set -euo pipefail

# Script para ejecutar tests E2E con Playwright
# Uso: ./run-e2e.sh

echo "🎭 Running E2E Tests with Playwright..."

# Variables
BACKEND_IMAGE="workplace-backend:test"
FRONTEND_IMAGE="workplace-frontend:test"
NETWORK_NAME="workplace-test-network"

# Cleanup function
cleanup() {
    echo "🧹 Cleaning up test environment..."
    docker stop test-backend test-frontend test-postgres test-redis 2>/dev/null || true
    docker rm test-backend test-frontend test-postgres test-redis 2>/dev/null || true
    docker network rm $NETWORK_NAME 2>/dev/null || true
}

# Set trap for cleanup
trap cleanup EXIT

# Build test images
echo "🏗️ Building test images..."
docker build -t $BACKEND_IMAGE -f backend/Dockerfile.prod .
docker build -t $FRONTEND_IMAGE -f frontend/Dockerfile.prod .

# Create test network
echo "🌐 Creating test network..."
docker network create $NETWORK_NAME

# Start dependencies
echo "🗄️ Starting dependencies..."
docker run -d --name test-postgres \
    --network $NETWORK_NAME \
    -e POSTGRES_DB=workplace_e2e \
    -e POSTGRES_USER=workplace \
    -e POSTGRES_PASSWORD=test123 \
    postgres:16-alpine

docker run -d --name test-redis \
    --network $NETWORK_NAME \
    redis:7-alpine

# Wait for dependencies
echo "⏳ Waiting for dependencies to be ready..."
sleep 10

# Start applications
echo "🚀 Starting applications..."
docker run -d --name test-backend \
    --network $NETWORK_NAME \
    -e DATABASE_URL=postgresql://workplace:test123@test-postgres:5432/workplace_e2e \
    -e REDIS_URL=redis://test-redis:6379 \
    -e ENVIRONMENT=test \
    -p 3001:3001 \
    $BACKEND_IMAGE

docker run -d --name test-frontend \
    --network $NETWORK_NAME \
    -e NUXT_PUBLIC_API_URL=http://test-backend:3001 \
    -p 3000:3000 \
    $FRONTEND_IMAGE

# Wait for services
echo "⏳ Waiting for services to be ready..."
echo "Waiting for backend..."
timeout 60 bash -c 'until curl -f http://localhost:3001/api/health; do sleep 2; done'

echo "Waiting for frontend..."
timeout 60 bash -c 'until curl -f http://localhost:3000; do sleep 2; done'

echo "✅ All services ready!"

# Install Playwright
echo "📦 Installing Playwright..."
cd e2e-tests
pnpm install
npx playwright install --with-deps

# Run E2E tests
echo "🎭 Running E2E tests..."
npx playwright test --reporter=html

echo "✅ E2E tests completed!"
