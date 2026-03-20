# Script de Inicialización del Backend

## Descripción
El script `init.sh` se encarga de inicializar el backend de forma automática y segura.

## Funcionalidades
- ✅ Espera a que PostgreSQL esté disponible
- ✅ Espera a que Redis esté disponible (verificación de puerto)
- ✅ Genera Prisma Client automáticamente
- ✅ Verifica que las migraciones estén aplicadas
- ✅ Inicia la aplicación
- ❌ **NO ejecuta migraciones** (se manejan externamente)
- ❌ **NO ejecuta seed** (se maneja externamente)

## Flujo de ejecución
1. **Espera PostgreSQL**: Verifica que la base de datos esté accesible
2. **Espera Redis**: Verifica que Redis esté accesible (verificación de puerto)
3. **Genera Prisma Client**: Crea el cliente de Prisma para la aplicación
4. **Verifica migraciones**: Confirma que las migraciones estén aplicadas
5. **Inicio**: Lanza la aplicación

## Gestión de Migraciones

### Script de Migraciones
- **Archivo**: `migrate.sh`
- **Uso**: `docker-compose run --rm migrate`
- **Función**: Ejecuta migraciones de forma segura y controlada

### Flujo recomendado
1. **Ejecutar migraciones**: `docker-compose run --rm migrate`
2. **Iniciar aplicación**: `docker-compose up -d backend`

### Ventajas del nuevo enfoque
- **Seguro**: Solo un contenedor ejecuta migraciones
- **Controlado**: Las migraciones se manejan explícitamente
- **Robusto**: La aplicación no depende de migraciones durante startup
- **Reversible**: Es fácil revertir migraciones si es necesario

## Ventajas
- **Idempotente**: Puede ejecutarse múltiples veces sin efectos secundarios
- **Seguro**: Las migraciones son seguras y re-ejecutables
- **Automático**: No requiere intervención manual para migraciones
- **Robusto**: Maneja errores y desconexiones
- **Limpio**: Separación clara entre infraestructura y datos

## Uso

### Flujo de producción recomendado
```bash
# 1. Ejecutar migraciones
docker-compose run --rm migrate

# 2. Iniciar aplicación
docker-compose up -d backend
```

### Desarrollo
El script `init.sh` se ejecuta automáticamente al iniciar el contenedor del backend a través del Dockerfile. 

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
