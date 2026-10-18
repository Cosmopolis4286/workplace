## Qué cambia

<!-- Resumen en 2-3 líneas y el porqué. -->

## Tipo

- [ ] feat — funcionalidad nueva
- [ ] fix — corrección de bug
- [ ] refactor / chore / docs

## Impacto

- [ ] Incluye migración de Prisma (timestamp posterior a la última)
- [ ] Cambia el seed o datos de referencia
- [ ] Cambia permisos, módulos, guards o reglas de acceso
- [ ] Mueve dinero (wallets, escrow, comisiones)
- [ ] Requiere variables de entorno nuevas

## Cómo se probó

<!-- Tests agregados, verificación manual, capturas si hay cambios de UI. -->

## Checklist

- [ ] Backend: `type-check`, `lint:ci`, `deps:check` y `test` en verde
- [ ] Frontend: `node scripts/typecheck-ratchet.mjs` en verde
- [ ] `pnpm-lock.yaml` actualizado si cambió algún `package.json`
- [ ] `CHANGELOG.md` actualizado si el cambio es relevante para el producto
