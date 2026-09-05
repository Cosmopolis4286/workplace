# Changelog

Registro cronológico de cambios relevantes del proyecto. Formato inspirado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.0.0/). Ver `WORKPLACE_STATUS_FEEDBACK.md` para el snapshot de estado actual y `WORKPLACE_VISION.md` para la visión de producto de largo plazo.

## [Unreleased]

### Added — Business Shield, Fase 2d: Supplier Intelligence (2026-09-05)

Segundo módulo del roadmap "WorkPlace Business Shield": antes de esto, `Supplier` existía como modelo en la base de datos pero sin service, controller ni pantalla — ningún comerciante podía cargar proveedores. Sin proveedores comparables, la sección 12 del audit estratégico (Supplier Intelligence) no tenía dónde apoyarse.

- **Backend**: CRUD completo de `Supplier` (`SuppliersService`/`SuppliersController`). Modelo nuevo `SupplierQuote` — precio *ofertado* por un proveedor para un producto, distinto de `Purchase` (lo que ya se compró): permite comparar proveedores antes de comprarles, no solo después. Mismo criterio de snapshot inmutable de tasa de cambio que `Purchase`.
- **`SuppliersService.compareForProduct()`**: compara la última cotización de cada proveedor para un producto, ordenadas por precio, con variación % respecto a la cotización anterior del mismo proveedor en los últimos 30 días. Valida el ejemplo exacto del brief original: proveedor más barato pero con mayor tiempo de entrega queda visible en la misma respuesta.
- **`ExchangeRatesService.resolveRateToUsd()`**: extraído como método compartido (antes esta lógica de conversión con snapshot vivía solo dentro de `PurchasesService`) — evita duplicar la resolución de moneda→tasa USD en cada módulo nuevo que registre montos en moneda extranjera.
- Endpoints nuevos: `GET/POST /api/suppliers`, `GET/PUT/DELETE /api/suppliers/:id`, `POST/GET /api/suppliers/:id/quotes`, `GET /api/suppliers/compare/:productId`. Los permisos `suppliers:view/create/edit/delete` ya existían huérfanos en el seed desde antes — ahora tienen endpoints reales detrás.
- Migración `20260905022607_add_supplier_quote`.
- **Frontend**: `useSuppliers.ts`, `SupplierModal.vue` (CRUD de proveedores con formulario embebido, mismo patrón que `ExpenseCategoryModal.vue`), `SupplierQuoteModal.vue` (cargar una cotización sin haber comprado todavía), selector de proveedor opcional agregado a `PurchaseModal.vue`, comparación de cotizaciones (proveedor más barato resaltado, variación de precio) integrada en `ReplacementCostCard.vue`.
- Tests: suite completa de `SuppliersService` (CRUD scoped por comercio, conversión de moneda en cotizaciones, ordenamiento por precio, cálculo de variación %, caso sin cotización previa que comparar).
- Validado end-to-end contra el backend real: dos proveedores cotizando el mismo producto ($10/6 días vs. $9.60/2 días) → comparación correcta con el más barato marcado.

### Added — Business Shield, Fase 2a: Purchases + costo de reposición (2026-09-04)

Primer paso del roadmap "WorkPlace Business Shield" (ver audit estratégico de esta fecha): sin un registro real de compras a proveedores, no había forma de distinguir el costo histórico de un producto de lo que realmente costaría reponerlo hoy — condición necesaria para Price Guard, Purchasing Power y cualquier alerta de margen en un contexto de inflación/devaluación.

- **Backend**: modelo `Purchase` (Prisma) — producto, proveedor (opcional), cantidad, costo unitario, moneda, y snapshot inmutable de la tasa de cambio aplicada (`exchangeRateValue`, `exchangeRateSource`) + costo convertido a USD (`unitCostUsd`). El snapshot es deliberado: la tasa cambia después, el historial de la compra no debe recalcularse retroactivamente.
- **`PurchasesService`**: CRUD de compras (`create`, `findAll`, `remove`) + `getReplacementCost(productId, commerceId)`, que compara margen histórico (`Product.cost`) vs. margen de reposición (última compra / promedio de las últimas 5 compras registradas).
- Multimoneda: USD como moneda base (tasa=1 implícita), cualquier otra moneda resuelve la tasa vía `ExchangeRatesService.findByCode()` ya existente — reutiliza el sistema de tasas de cambio (con historial y auto-sync BCV) que ya estaba construido.
- Endpoints nuevos: `POST/GET /api/purchases`, `GET /api/purchases/replacement-cost/:productId`, `DELETE /api/purchases/:id`. Permisos nuevos: `purchases:view`, `purchases:create`, `purchases:delete`.
- Migración `20260904213503_add_purchase`.
- Tests: suite completa de `PurchasesService` (creación en USD y en moneda extranjera con conversión, validación de pertenencia de producto/proveedor al comercio, cálculo de costo de reposición con y sin historial de compras).
- Validado end-to-end contra el backend real corriendo en Docker (`docker-compose.hybrid.yml`): compra en USD y en VES con tasa 40, conversión correcta a `unitCostUsd`, cálculo de margen histórico (33.3%) vs. margen de reposición (13.3%) coincide con el ejemplo del audit estratégico.

### Fixed — RBAC: `ProfilePermission` sin poblar desde la fusión de roles (2026-09-04)

Encontrado al aplicar los permisos nuevos de `purchases:*`: `prisma/seed.js` seguía usando `roles = ['SUPERADMIN', 'ADMIN', 'COMMERCE', 'FREELANCER', 'NORMAL']`, valores que dejaron de existir en el enum `Role` real desde que `COMMERCE`+`FREELANCER` se fusionaron en `PROFESIONAL` (2026-08-25/29) — el seed fallaba al correr.

Al corregir eso se encontró un problema más profundo: `seed.js` **nunca** escribió en la tabla `ProfilePermission` (la que debería distinguir comercio de freelancer/service-provider dentro de `Role.PROFESIONAL`). Efecto real: `getActiveProfilePermissions()` devolvía siempre `[]`, así que todo usuario `PROFESIONAL` tenía exactamente el mismo set de permisos — la unión completa de lo que antes eran los roles `COMMERCE` y `FREELANCER` por separado —, sin importar si había activado un perfil de comercio o de profesional independiente. Un freelancer podía, en teoría, tener acceso a endpoints de `menu`/`inventory`/`cash` que nunca debería ver.

- `ROLE_DEFAULTS.PROFESIONAL` ahora es la unión explícita de `BUSINESS_PROFILE_KEYS` (ex `COMMERCE_KEYS`) + `FREELANCER_KEYS` — sigue siendo correcto a nivel de rol (RBAC = nivel de acceso, no tipo de negocio).
- Nueva función `seedProfilePermissions()`, llamada desde `main()`: puebla `ProfilePermission` con la distinción fina real — `BUSINESS` (69 permisos, el set completo de comercio), `PROFESSIONAL/FREELANCER` y `PROFESSIONAL/SERVICE_PROVIDER` (23 permisos cada uno, el set reducido de servicios).
- Verificado corriendo el seed contra la base de datos real: los conteos de permisos por rol/perfil coinciden con lo esperado y los 598 tests backend siguen pasando.

### Added — Business Shield, Fase 2b/2c: UI de compras + primera alerta del Alert Engine (2026-09-04)

- **Frontend**: `usePurchases.ts` (composable, mismo patrón que `useExpenses.ts`), `ReplacementCostCard.vue` (widget que muestra margen histórico vs. margen de reposición, con aviso visual si la caída supera 5 puntos porcentuales) integrado en `ProductModal.vue` — solo visible al editar un producto existente. `PurchaseModal.vue`: formulario compacto para registrar una compra (cantidad, costo unitario, moneda USD o la moneda por defecto del comercio, notas), reutiliza `useDefaultRate()` ya existente para mostrar el equivalente en USD sin depender del endpoint `/exchange-rates` (que requiere permiso de admin).
- **Backend — primera alerta real del Alert Engine (`MARGIN_DROP`)**: `PurchasesService.create()` ahora recalcula el costo de reposición después de registrar una compra y, si el margen de reposición cae 5 puntos porcentuales o más por debajo del margen histórico, dispara `NotificationsService.notifyMarginDrop()` sobre el canal de notificaciones (WebSocket) ya existente — sin motor de reglas genérico todavía, umbral fijo en código a propósito (ver sección 21 del audit estratégico: validar valor real antes de generalizar). Falla de notificación no bloquea el registro de la compra (fire-and-forget con `.catch()`).
- Validado end-to-end: compra con erosión de margen menor al umbral no genera notificación; compra que hace caer el margen de 33.3% a 22.7% (promedio de 2 compras) sí genera la notificación con el mensaje explicando qué pasa, por qué y el riesgo — sin prescribir una acción, tal como pide la sección 11 del audit ("no imponer decisiones, mostrar riesgo/costo/exposición/recomendación").
- Tests nuevos en `purchases.service.test.ts`: dispara la alerta cuando corresponde, no la dispara si el margen apenas se mueve, y una notificación fallida no rompe la creación de la compra.

### Changed

- `WORKPLACE_STATUS_FEEDBACK.md` actualizado: sección 5.1 nueva (Purchases + UI + alerta), sección 7 con el hallazgo de RBAC y la advertencia de `Float` vs `Decimal` en campos monetarios (71 campos, cero `Decimal` en todo el schema), conteo de tests actualizado (453 → 602).

---

## Convenciones de este archivo

- Cada entrada de `[Unreleased]` describe una unidad de trabajo real, no un commit individual — agrupa varios commits relacionados cuando corresponde.
- Se prioriza explicar **por qué** se hizo un cambio y qué problema resolvía, no solo qué archivos cambiaron (eso ya lo muestra `git log`/`git diff`).
- Hallazgos de deuda técnica o bugs preexistentes encontrados de paso (no causados por el cambio en curso) se documentan bajo `Fixed` o se anotan en `WORKPLACE_STATUS_FEEDBACK.md` sección 7 si quedan pendientes.
