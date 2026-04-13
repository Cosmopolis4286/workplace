# Guía de Tests y Cobertura

## 📋 Resumen

Este documento describe cómo ejecutar los tests, verificar la cobertura y contribuir a mejorarla.

## 🚀 Ejecutar Tests

### Tests Unitarios
```bash
# Ejecutar todos los tests
pnpm test

# Ejecutar tests con cobertura
pnpm test:coverage

# Ejecutar tests en modo CI
pnpm test:ci
```

### Script Automático
```bash
# Ejecutar script completo con verificación de cobertura
./scripts/run-coverage.sh
```

### Tests de Integración
```bash
# Ejecutar tests de integración
pnpm test:integration
```

## 📊 Cobertura Actual

### Umbral Mínimo
- **Líneas**: 65%
- **Funciones**: 65%
- **Branches**: 60%
- **Statements**: 65%

### Reportes
- **Texto**: Se muestra en consola
- **HTML**: `coverage/lcov-report/index.html`
- **LCOV**: `coverage/lcov.info`

## 📁 Estructura de Tests

```
src/test/
├── unit/                    # Tests unitarios
│   ├── auth.service.test.ts
│   ├── orders.service.test.ts
│   ├── employees.service.test.ts
│   ├── menu.service.test.ts
│   ├── branches.service.test.ts
│   └── ...
├── integration/             # Tests de integración
│   ├── orders.integration.test.ts
│   └── ...
├── setup.ts                # Configuración de tests
└── env-setup.ts           # Variables de entorno
```

## 🎯 Módulos Críticos con Tests

### ✅ Con Cobertura
- **Auth Service**: Login, registro, refresh tokens
- **Orders Service**: CRUD, estadísticas, actualización de estado
- **Employees Service**: Gestión de empleados, límites del plan
- **Menu Service**: Items del menú, categorías, disponibilidad
- **Branches Service**: Sucursales, horarios, sucursal principal

### 🔄 Necesitan Más Tests
- **Analytics Service**: Reportes y métricas
- **Notifications Service**: Envío de notificaciones
- **Exchange Rates Service**: Sincronización de tasas
- **Delivery Service**: Gestión de entregas
- **Expenses Service**: Control de gastos

## 📝 Cómo Agregar Tests

### 1. Test Unitario de Servicio
```typescript
// src/test/unit/tu-servicio.test.ts
import { Test, TestingModule } from '@nestjs/testing'
import { TuService } from '../tu-servicio.service'

describe('TuService', () => {
  let service: TuService

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TuService],
    }).compile()

    service = module.get<TuService>(TuService)
  })

  it('should be defined', () => {
    expect(service).toBeDefined()
  })

  describe('tuMetodo', () => {
    it('should do something', async () => {
      // Tu test aquí
    })
  })
})
```

### 2. Test de Integración
```typescript
// src/test/integration/tu-endpoint.integration.test.ts
import { Test, TestingModule } from '@nestjs/testing'
import * as request from 'supertest'
import { AppModule } from '../app.module'

describe('TuEndpoint Integration', () => {
  let app: INestApplication

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile()

    app = moduleFixture.createNestApplication()
    await app.init()
  })

  it('should return data', async () => {
    return request(app.getHttpServer())
      .get('/api/tu-endpoint')
      .expect(200)
  })
})
```

## 🔧 Configuración

### Jest Config
```javascript
// jest.config.js
module.exports = {
  // ... configuración
  coverageThreshold: {
    global: {
      branches: 60,
      functions: 65,
      lines: 65,
      statements: 65,
    },
  },
}
```

### Exclusiones de Cobertura
- Archivos de test (`**/*.test.ts`, `**/*.spec.ts`)
- Configuración (`src/config/**`)
- Decoradores (`src/common/decorators/**`)
- Middleware (`src/common/middleware/**`)
- Guards (`src/common/guards/**`)
- Interceptors (`src/common/interceptors/**`)

## 📈 Mejorar Cobertura

### 1. Identificar Código sin Cubrir
```bash
# Ejecutar tests con cobertura
pnpm test:coverage

# Abrir reporte HTML
open coverage/lcov-report/index.html
```

### 2. Prioridades
1. **Servicios críticos**: Auth, Orders, Payments
2. **Controladores**: Endpoints principales
3. **Utilidades**: Funciones helper
4. **Validaciones**: DTOs y pipes

### 3. Buenas Prácticas
- **Mock dependencies**: Usar mocks para servicios externos
- **Test edge cases**: Casos límite y errores
- **Test happy path**: Flujo normal exitoso
- **Test error handling**: Manejo de errores

## 🚨 CI/CD

### GitHub Actions
El workflow verifica la cobertura automáticamente:
- Umbral mínimo: 65%
- Si falla, el deploy se detiene
- Se puede forzar con `force-deploy: true`

### Comandos Útiles
```bash
# Verificar cobertura localmente
./scripts/run-coverage.sh

# Ver reporte detallado
cat coverage/coverage-summary.json

# Forzar deploy (solo en emergencias)
# En GitHub Actions: setting force-deploy: true
```

## 🐛 Debugging

### Tests Fallidos
```bash
# Ejecutar tests en modo watch
pnpm test --watch

# Ejecutar test específico
pnpm test -- test-name-pattern="tu-test"

# Ver detalles de cobertura
pnpm test:coverage --verbose
```

### Problemas Comunes
1. **Database connection**: Usar mocks
2. **Missing dependencies**: `pnpm install`
3. **Timeout**: Aumentar `testTimeout` en jest.config.js
4. **Import errors**: Verificar `moduleNameMapper`

## 📚 Recursos

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [NestJS Testing](https://docs.nestjs.com/fundamentals/testing)
- [Supertest](https://github.com/visionmedia/supertest)

## 🤝 Contribuir

1. Fork el repositorio
2. Crear feature branch
3. Agregar tests para nuevas funcionalidades
4. Verificar cobertura ≥ 65%
5. Submit PR

---

**Nota**: La cobertura es una métrica guía, no un fin en sí misma. Enfócate en tests significativos que validen comportamiento crítico del negocio.
