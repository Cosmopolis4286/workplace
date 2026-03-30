#!/bin/bash
set -e

# Script de inicialización para PostgreSQL
# Se ejecuta automáticamente cuando el contenedor inicia por primera vez
# o cuando /var/lib/postgresql/data está vacío

echo "🔧 PostgreSQL init script starting..."

# Crear la base de datos si no existe
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" <<-EOSQL
    SELECT 'CREATE DATABASE ${POSTGRES_DB}' 
    WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = '${POSTGRES_DB}')\gexec
EOSQL

echo "✅ Database '${POSTGRES_DB}' created (or already exists)"

# Verificar que la base de datos existe
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
    SELECT current_database();
EOSQL

echo "✅ PostgreSQL init completed successfully!"
