#!/bin/bash
set -euo pipefail

# Script para ejecutar tests con coverage
# Uso: ./run-tests.sh [force-deploy]

echo "🧪 Running Tests with Coverage..."

# Parámetros
FORCE_DEPLOY="${1:-false}"
COVERAGE_THRESHOLD="${COVERAGE_THRESHOLD:-80}"

echo "📊 Coverage threshold: ${COVERAGE_THRESHOLD}%"
echo "🔧 Force deploy: ${FORCE_DEPLOY}"

# Backend Tests
echo "🔍 Running Backend Tests..."
cd backend
pnpm test:coverage

# Frontend Tests  
echo "🔍 Running Frontend Tests..."
cd ../frontend
pnpm test:coverage

# Check Coverage
echo "📈 Checking Coverage Thresholds..."

# Backend coverage
BACKEND_COVERAGE=$(cd backend && pnpm run coverage:percentage || echo "0")
echo "Backend coverage: ${BACKEND_COVERAGE}%"

# Frontend coverage
FRONTEND_COVERAGE=$(cd frontend && pnpm run coverage:percentage || echo "0")
echo "Frontend coverage: ${FRONTEND_COVERAGE}%"

# Validar thresholds
if (( $(echo "$BACKEND_COVERAGE < $COVERAGE_THRESHOLD" | bc -l) )); then
    echo "❌ Backend coverage ${BACKEND_COVERAGE}% is below threshold ${COVERAGE_THRESHOLD}%"
    if [ "$FORCE_DEPLOY" != "true" ]; then
        echo "🚫 Deploy blocked by coverage requirements"
        exit 1
    fi
    echo "⚠️ Force deploy enabled - proceeding despite low coverage"
fi

if (( $(echo "$FRONTEND_COVERAGE < $COVERAGE_THRESHOLD" | bc -l) )); then
    echo "❌ Frontend coverage ${FRONTEND_COVERAGE}% is below threshold ${COVERAGE_THRESHOLD}%"
    if [ "$FORCE_DEPLOY" != "true" ]; then
        echo "🚫 Deploy blocked by coverage requirements"
        exit 1
    fi
    echo "⚠️ Force deploy enabled - proceeding despite low coverage"
fi

echo "✅ All coverage requirements met!"

# Linting
echo "🔍 Running Linting..."
cd backend
if [ "$FORCE_DEPLOY" != "true" ]; then
    pnpm lint:ci
else
    pnpm lint:ci || echo "⚠️ Linting failed but force deploy enabled"
fi

echo "✅ Tests completed successfully!"
