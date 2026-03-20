# 🚀 Flujo Profesional Docker + Prisma - WorkPlace Manager

## 📋 Overview

Este flujo profesional separa las responsabilidades de **infraestructura**, **aplicación** y **datos iniciales** para lograr un sistema más seguro, reproducible y mantenible.

## 🏗️ Arquitectura

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Host (Dev)    │    │  Docker Host    │    │  Containers     │
├─────────────────┤    ├─────────────────┤    ├─────────────────┤
│ • Scripts       │◄──►│ • Docker Engine │◄──►│ • PostgreSQL    │
│ • Seed Manual   │    │ • Networks      │    │ • Redis         │
│ • Control       │    │ • Volumes       │    │ • Backend App   │
└─────────────────┘    └─────────────────┘    │ • Frontend App  │
                                              └─────────────────┘
```

## 🔄 Flujo de Datos

1. **Infraestructura**: PostgreSQL + Redis corren en contenedores
2. **Migraciones**: Se ejecutan automáticamente al iniciar el backend
3. **Seed**: Se ejecuta manualmente desde el host (control total)
4. **Aplicación**: Corre limpia, sin lógica de seed

## 📁 Scripts Disponibles

### 🛠️ Desarrollo
```bash
./scripts/dev.sh
```
- Levanta todo el stack
- Ejecuta migraciones automáticamente
- Hace seed si no hay usuarios
- Ideal para desarrollo local

### 🚀 Producción
```bash
./scripts/prod.sh
```
- Despliega stack optimizado
- Solo ejecuta migraciones
- **NO ejecuta seed** (manual)
- Ideal para producción/CI/CD

### 🔄 Migraciones Externas
```bash
./scripts/migrate-external.sh
```
- Ejecuta migraciones desde el host
- Verifica estado actual
- Control total sobre schema
- Ideal para CI/CD

### 🌱 Seed Externo
```bash
./scripts/seed-external.sh
```
- Ejecuta seed desde el host
- Verifica si ya hay datos
- Evita duplicación
- Control total sobre datos iniciales

## 🎯 Casos de Uso

### Desarrollo Local
```bash
# 1. Iniciar todo (incluye migraciones y seed automático)
./scripts/dev.sh

# 2. O paso a paso
docker compose up -d postgres redis
./scripts/migrate-external.sh
./scripts/seed-external.sh
docker compose up backend frontend
```

### Producción/CI-CD
```bash
# 1. Desplegar infraestructura y app
./scripts/prod.sh

# 2. Ejecutar migraciones manual
./scripts/migrate-external.sh

# 3. Ejecutar seed manual (solo primera vez)
./scripts/seed-external.sh

# 4. Verificar estado
docker compose ps
curl http://localhost:3001/api/health
```

### Reset de Datos
```bash
# 1. Limpiar base de datos
docker compose exec -T postgres psql -U postgres -d workplace_db -c "TRUNCATE TABLE \"User\" CASCADE;"

# 2. Volver a seed
./scripts/seed-external.sh
```

## 🔧 Ventajas de este Flujo

### ✅ Seguridad
- **Sin datos en contenedores**: La seed no vive en la imagen
- **Control de acceso**: Solo desde el host se puede modificar datos iniciales
- **Aislamiento**: La app solo maneja lógica de negocio

### ✅ Reproducibilidad
- **Imágenes limpias**: Same image, different environments
- **Datos controlados**: Seed explícito y versionado
- **Estado predecible**: Mismos datos en todos los ambientes

### ✅ Mantenibilidad
- **Separación de responsabilidades**: Infraestructura vs Datos vs App
- **Debugging fácil**: Cada componente tiene su rol claro
- **Testing simple**: Seed aislado para pruebas

### ✅ CI/CD Friendly
- **Build rápido**: Sin dependencias de datos en el build
- **Deploy seguro**: Sin riesgo de datos basura en producción
- **Rollback controlado**: Seed reversible y explícito

## 🚨 Buenas Prácticas

### 📋 Checklist Producción
- [ ] Ejecutar `./scripts/prod.sh`
- [ ] Verificar salud de servicios
- [ ] Ejecutar `./scripts/migrate-external.sh`
- [ ] Ejecutar `./scripts/seed-external.sh` (solo primera vez)
- [ ] Monitorear logs
- [ ] Configurar backups

### 🔒 Seguridad
- Nunca incluir datos sensibles en el seed
- Usar variables de entorno para credenciales
- Rotar claves JWT después del seed
- Validar datos después del seed

### 📊 Monitoreo
```bash
# Ver estado
docker compose ps

# Ver logs
docker compose logs -f backend

# Health checks
curl http://localhost:3001/api/health
curl http://localhost:3000
```

## 🔄 Troubleshooting

### ❌ Seed no ejecuta
```bash
# Verificar contenedor postgres
docker compose ps postgres

# Verificar conexión
docker compose exec -T postgres pg_isready

# Forzar seed (cuidado)
docker compose exec -T postgres psql -U postgres -d workplace_db -c "TRUNCATE TABLE \"User\" CASCADE;"
./scripts/seed-external.sh
```

### ❌ Backend no inicia
```bash
# Verificar migraciones
docker compose run --rm backend pnpm prisma migrate deploy

# Verificar logs
docker compose logs backend

# Reiniciar
docker compose restart backend
```

### ❌ Frontend no conecta
```bash
# Verificar backend health
curl http://localhost:3001/api/health

# Verificar variables de entorno
docker compose exec frontend env | grep API
```

## 🎉 Conclusión

Este flujo profesional proporciona:
- **Separación clara** de responsabilidades
- **Control total** sobre datos iniciales
- **Seguridad** en producción
- **Reproducibilidad** en todos los ambientes
- **Mantenibilidad** a largo plazo

Perfecto para equipos que necesitan **confiabilidad**, **escalabilidad** y **control** sobre su stack de NestJS + Prisma + Docker.
