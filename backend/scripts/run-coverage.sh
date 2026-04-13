#!/bin/bash

# Script para ejecutar tests y verificar cobertura
# Uso: ./scripts/run-coverage.sh

echo "🚀 Ejecutando tests con cobertura..."

# Verificar si estamos en el directorio correcto
if [ ! -f "package.json" ]; then
    echo "❌ Error: Debes ejecutar este script desde el directorio backend/"
    exit 1
fi

# Instalar dependencias si es necesario
if [ ! -d "node_modules" ]; then
    echo "📦 Instalando dependencias..."
    pnpm install
fi

# Ejecutar tests con cobertura
echo "🧪 Ejecutando tests unitarios con cobertura..."
pnpm test:coverage

# Verificar resultado
if [ $? -eq 0 ]; then
    echo "✅ Tests ejecutados exitosamente"
    
    # Obtener porcentaje de cobertura
    if [ -f "coverage/coverage-summary.json" ]; then
        COVERAGE=$(node -e "
            const summary = require('./coverage/coverage-summary.json');
            const total = summary.total;
            console.log(total.lines.pct);
        ")
        
        echo "📊 Cobertura actual: ${COVERAGE}%"
        
        # Comparar con umbral mínimo
        THRESHOLD=65
        if (( $(echo "$COVERAGE >= $THRESHOLD" | bc -l) )); then
            echo "✅ Cobertura ${COVERAGE}% está por encima del umbral mínimo ${THRESHOLD}%"
        else
            echo "⚠️  Cobertura ${COVERAGE}% está por debajo del umbral mínimo ${THRESHOLD}%"
            echo "💡 Considera agregar más tests para mejorar la cobertura"
        fi
    else
        echo "⚠️  No se pudo encontrar el archivo de cobertura"
    fi
    
    # Mostrar reporte HTML si está disponible
    if [ -f "coverage/lcov-report/index.html" ]; then
        echo "📄 Reporte HTML disponible en: coverage/lcov-report/index.html"
        echo "💡 Abre el archivo en tu navegador para ver detalles de cobertura"
    fi
    
else
    echo "❌ Los tests fallaron"
    exit 1
fi

echo "🎉 Proceso completado"
