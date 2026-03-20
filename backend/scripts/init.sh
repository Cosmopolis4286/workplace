# ---------- INICIO DE APLICACIÓN ----------
echo "🚀 Iniciando aplicación..."

# Esperar a Postgres (si es necesario)
cat > wait-for-postgres.js << 'EOF'
const net = require('net');
const client = new net.Socket();

const host = process.env.DB_HOST || 'localhost';
const port = process.env.DB_PORT || 5432;

client.connect(port, host, function() {
  console.log('✅ Postgres está listo');
  process.exit(0);
});

client.on('error', function(err) {
  console.log('❌ Postgres no está listo');
  process.exit(1);
});
EOF

# Reintentar conexión a Postgres
RETRIES=10
until node wait-for-postgres.js; do
    ((RETRIES--))
    if [ "$RETRIES" -le 0 ]; then
        echo "❌ No se pudo conectar a Postgres después de varios intentos"
        exit 1
    fi
    echo "⏳ Esperando a Postgres..."
    sleep 2
done

echo "✅ Postgres está listo"

# Ejecutar migraciones automáticamente
echo "� Ejecutando migraciones Prisma..."
if ! pnpm prisma migrate deploy; then
    echo "❌ Fallaron las migraciones"
    exit 1
fi

echo "✅ Migraciones aplicadas"
echo "�🚀 Iniciando servidor de producción..."
echo "📝 NOTA: El seed debe ejecutarse manualmente con: ./scripts/seed-external.sh"

# Iniciar la aplicación
exec pnpm start