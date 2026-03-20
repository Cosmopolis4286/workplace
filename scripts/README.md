# Script de Inicialización del Backend

## Descripción
El script `init.sh` se encarga de inicializar el backend de forma automática y segura.

## Funcionalidades
- ✅ Espera a que PostgreSQL esté disponible
- ✅ Ejecuta las migraciones de Prisma automáticamente
- ✅ Inicia la aplicación
- ❌ **NO ejecuta seed** (se maneja externamente)

## Flujo de ejecución
1. **Espera PostgreSQL**: Verifica que la base de datos esté accesible
2. **Migraciones**: Aplica todas las migraciones pendientes automáticamente
3. **Inicio**: Lanza la aplicación

## Ventajas
- **Idempotente**: Puede ejecutarse múltiples veces sin efectos secundarios
- **Seguro**: Las migraciones son seguras y re-ejecutables
- **Automático**: No requiere intervención manual para migraciones
- **Robusto**: Maneja errores y desconexiones
- **Limpio**: Separación clara entre infraestructura y datos

## Uso
El script se ejecuta automáticamente al iniciar el contenedor del backend a través del Dockerfile. 

## Seed Externo
El seed se maneja mediante scripts externos para mayor control:
- Desarrollo: `./scripts/dev.sh` (incluye seed automático)
- Producción: `./scripts/prod.sh` + `./scripts/seed-external.sh`
- Manual: `./scripts/seed-external.sh`

## Logs
El script proporciona logs detallados con emojis para facilitar el seguimiento:
- 🔍 Verificación
- ⏳ Espera
- ✅ Éxito
- 🔄 Migraciones
- 🚀 Inicio
