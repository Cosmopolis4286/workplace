# Script de Inicialización del Backend

## Descripción
El script `init.sh` se encarga de inicializar el backend de forma automática y segura.

## Funcionalidades
- ✅ Espera a que PostgreSQL esté disponible
- ✅ Ejecuta las migraciones de Prisma
- ✅ Verifica si la base de datos está vacía
- ✅ Ejecuta el seed solo si es necesario
- ✅ Inicia la aplicación

## Flujo de ejecución
1. **Espera PostgreSQL**: Verifica que la base de datos esté accesible
2. **Migraciones**: Aplica todas las migraciones pendientes
3. **Verificación**: Cuenta los usuarios existentes
4. **Seed condicional**: 
   - Si no hay usuarios → ejecuta el seed
   - Si ya hay datos → omite el seed
5. **Inicio**: Lanza la aplicación

## Ventajas
- **Idempotente**: Puede ejecutarse múltiples veces sin efectos secundarios
- **Seguro**: No sobrescribe datos existentes
- **Automático**: No requiere intervención manual
- **Robusto**: Maneja errores y desconexiones

## Uso
El script se ejecuta automáticamente al iniciar el contenedor del backend a través del Dockerfile. No requiere configuración adicional.

## Logs
El script proporciona logs detallados con emojis para facilitar el seguimiento:
- 🔍 Verificación
- ⏳ Espera
- ✅ Éxito
- 🔄 Proceso
- 🌱 Seed
- 🚀 Inicio
