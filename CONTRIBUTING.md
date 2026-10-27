# Cómo contribuir

## Ramas y PRs

- `main` es la única rama de larga vida y es producción (despliega con `deploy.yml`).
- Trabajá en una rama corta creada desde `main` y abrí el PR contra `main`.
- Completá la plantilla del PR. Los checks de CircleCI tienen que quedar en verde.

## Commits

Formato [Conventional Commits](https://www.conventionalcommits.org/es/), en español:

```
feat(menu): reordenamiento drag-and-drop de categorías y productos
fix(settings): resolveStrategy por HAS_COMMERCE
chore(frontend): baja la línea base del typecheck
```

## Antes de abrir el PR

```bash
# Backend
cd backend
pnpm type-check && pnpm lint:ci && pnpm format:check && pnpm deps:check && pnpm test

# Frontend
cd frontend
pnpm type-check:ratchet
```

- **Trinquete del typecheck del frontend**: la cantidad de errores por archivo solo puede bajar. Si corregiste errores, corré `node scripts/typecheck-ratchet.mjs --update` y commiteá `typecheck-baseline.json`.
- Agregá o actualizá tests para toda regla de negocio nueva (`backend/src/test/unit/`).
- Si cambiás `package.json`, commiteá también el `pnpm-lock.yaml` de la raíz (CI instala con `--frozen-lockfile`).

## Base de datos

- Cambios de schema → nueva carpeta en `backend/prisma/migrations/<timestamp>_<nombre>/migration.sql`, con timestamp **posterior** a la última migración existente. Nunca edites una migración ya aplicada.
- Datos de referencia (categorías, planes, permisos) van en el seed, que debe seguir siendo idempotente. Los catálogos viven en `backend/prisma/data/` y tienen un test de coherencia (`catalog-categories.data.test.ts`).

## Reglas de arquitectura

- Respetá los límites entre dominios (`backend/src/domains/*`); las dependencias cruzadas van por facades. `pnpm deps:check` lo valida.
- Para decidir acceso usá la fuente de verdad correspondiente (ver *Modelo de identidad y acceso* en el README): no compares `user.role` ni `accountType` para dar acceso a un módulo — usá `@RequireModule`, `@RequirePermission`, `@RequireCapability` o `CategoryScopeService`.
- Nuevos composables del frontend se auto-importan desde `composables/**`: evitá exportar tipos o funciones con nombres que ya existen en otro composable.

## Seguridad

Vulnerabilidades: ver [`SECURITY.md`](./SECURITY.md). No abras issues públicos.
