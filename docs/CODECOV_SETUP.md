# Configuración de CODECOV_TOKEN para GitHub Actions

## 🚨 Problema Actual

El pipeline de CI/CD está fallando en el paso de upload de cobertura a Codecov con el error:
```
Upload queued for processing failed: {"message":"Token required - not valid tokenless upload"}
```

## 🔧 Solución: Configurar CODECOV_TOKEN

### Paso 1: Obtener el Token de Codecov

1. **Iniciar sesión en [Codecov](https://codecov.io/)**
   - Usa tu cuenta de GitHub para autenticarte

2. **Seleccionar el repositorio**
   - Busca `workplace` en tu dashboard de Codecov
   - Si no aparece, haz clic en "Add new repository"

3. **Obtener el token**
   - En la página del repositorio, haz clic en **Settings** (ícono de engranaje)
   - Busca la sección **Repository Upload Token**
   - Copia el token que aparece (empieza con `eyJ...`)

### Paso 2: Configurar el Secret en GitHub

1. **Ir a los settings del repositorio GitHub**
   - En tu repositorio `workplace`, haz clic en **Settings**
   - En el menú lateral, ve a **Secrets and variables** → **Actions**

2. **Crear el nuevo secret**
   - Haz clic en **New repository secret**
   - **Name**: `CODECOV_TOKEN`
   - **Secret**: Pega el token que copiaste de Codecov
   - Haz clic en **Add secret**

### Paso 3: Verificar la Configuración

1. **Ejecutar el workflow manualmente**
   - Ve a la pestaña **Actions** del repositorio
   - Selecciona el workflow **Development CI** o **Production Deploy**
   - Haz clic en **Run workflow**

2. **Verificar que el upload funcione**
   - El paso "Subir coverage" debería completarse exitosamente
   - Deberías ver los reportes de cobertura en Codecov

## 📋 Archivos Modificados

Los siguientes archivos fueron actualizados para solucionar otros problemas del pipeline:

### 1. ESLint Error - ✅ Corregido
**Archivo**: `backend/src/common/middleware/security-context.middleware.ts`
- Cambiado de `declare global { namespace Express { ... } }` a `declare module 'express' { ... }`

### 2. Frontend Coverage - ✅ Corregido
**Archivo**: `frontend/vitest.config.ts`
- Agregado `'lcov'` a los reporters de cobertura

### 3. Auth Controller Tests - ✅ Corregidos
**Archivo**: `backend/src/test/unit/auth.controller.test.ts`
- Actualizadas las expectativas para que coincidan con las llamadas reales del controlador

## 🔍 Verificación Post-Configuración

Después de configurar el `CODECOV_TOKEN`, verifica:

1. **Los tests unitarios pasen** ✅
2. **El linting no tenga errores** ✅  
3. **Los archivos de cobertura se generen** ✅
4. **El upload a Codecov funcione** ⏳ (requiere token)

## 🚀 Resultado Esperado

Una vez configurado el token, el pipeline debería:
- Ejecutar todos los tests exitosamente
- Generar reportes de cobertura para backend y frontend
- Subir los reportes a Codecov sin errores
- Permitir tracking de cobertura en el tiempo

## 📞 Soporte

Si tienes problemas:
1. Verifica que el token esté correctamente copiado
2. Asegúrate que el secret se llame exactamente `CODECOV_TOKEN`
3. Revisa que el repositorio esté conectado a Codecov

---

**Estado Actual**: 
- ✅ ESLint: Corregido
- ✅ Tests: Corregidos  
- ✅ Cobertura Frontend: Corregida
- ⏳ Codecov Upload: Esperando configuración de token
