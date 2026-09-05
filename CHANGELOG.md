# Changelog

Registro cronológico de cambios relevantes del proyecto. Formato inspirado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.0.0/). Ver `WORKPLACE_STATUS_FEEDBACK.md` para el snapshot de estado actual y `WORKPLACE_VISION.md` para la visión de producto de largo plazo.

## [Unreleased]

### Added — Sistema de planes de siguiente nivel: trial autoservicio + Feature Grants (2026-09-05)

Pedido de negocio: además de la duración mensual/anual de una suscripción completa, cada plan debía poder activar features individuales (módulos o funciones puntuales) por tiempo limitado, con tres modos de consumo — un solo uso, múltiples usos con contador, o reactivable indefinidamente.

**Trial autoservicio de 7 días:**
- **`User.trialUsedAt`**: marca permanente de que la cuenta ya usó su prueba gratuita — una sola vez de por vida, sin importar cuántas veces cambie de plan después.
- **`PlansService.activateTrial()`**: activable en cualquier momento mientras el usuario esté en un plan gratuito (o sin suscripción). Crea una `Subscription` con `status: TRIAL`, `endAt`/`trialEnds` = +7 días — reutiliza el `SubscriptionsScheduler` ya existente (expira por `endAt`, no hizo falta un cron nuevo). Rechaza: cuenta que ya usó el trial, plan gratuito (no tiene sentido), o usuario con un plan pago ya activo.
- **`getMySubscription()`** ahora expone `trialAvailable` (calculado, no persistido) para que el frontend sepa cuándo mostrar el CTA.
- Endpoint: `POST /api/plans/trial/activate`.

**Feature Grants — activaciones temporales de módulos/funciones:**
- **Modelo `PlanFeatureRule`**: qué puede activar cada plan por autoservicio — `featureKey` (string libre: módulos como `"business_shield"`, límites como `"extra_branch_slot"`, consumibles como `"ai_credits_10"`), `durationDays`, `usageMode` (`SINGLE_USE | MULTI_USE | REACTIVATABLE`), `maxUses` (solo aplica a `MULTI_USE`).
- **Modelo `FeatureGrant`**: una activación concreta, con snapshot inmutable de la regla al momento de activar (mismo criterio que el snapshot de tasa de cambio en `Purchase`) — si la regla del plan cambia después, los grants ya emitidos no se alteran. Soporta activación por autoservicio (`SELF_SERVICE`, sigue una `PlanFeatureRule`) o manual (`ADMIN`, sin regla, para cortesías/soporte puntual).
- **`FeatureGrantsService.hasFeature()`**: consulta central que cualquier guard/servicio debe usar para saber "¿tiene esto activo ahora mismo?" — evalúa expiración y usos restantes al vuelo (expiración perezosa: si está vencido, lo marca `EXPIRED` en el momento de la consulta, no depende solo del cron).
- **`consumeUsage()`**: decrementa `usesRemaining` en `MULTI_USE`, marca `EXHAUSTED` al llegar a 0. No-op para `SINGLE_USE`/`REACTIVATABLE` (su "consumo" es la expiración misma, no un contador).
- Regla de reactivación: `SINGLE_USE` nunca se puede volver a activar aunque haya expirado (se busca cualquier grant histórico, no solo el activo); `REACTIVATABLE` sí, indefinidamente, una vez que el anterior expiró.
- `FeatureGrantsScheduler`: cron diario de higiene (mismo patrón que `SubscriptionsScheduler`) — no es la fuente de verdad de expiración, solo evita que el `status` guardado quede desactualizado si nadie consulta esa feature en particular.
- Endpoints: autoservicio `GET /feature-grants/mine`, `GET /feature-grants/available`, `POST /feature-grants/activate/:featureKey`, `GET /feature-grants/has/:featureKey`; admin `GET/POST /feature-grants/plans/:planId/rules`, `PUT/DELETE /feature-grants/rules/:id`, `POST /feature-grants/admin/grant`, `POST /feature-grants/admin/:id/revoke`.
- Migraciones `20260905035134_add_trial_used_at` y `20260905040348_add_feature_grants`.
- **Frontend**: CTA "Activar prueba gratis" en `my-plan.vue` (visible solo cuando `trialAvailable`, sobre el plan más popular disponible); panel "Funciones de tu plan" en el mismo sidebar, consumiendo `/feature-grants/available` — activa cada feature con un click y muestra su estado. `useFeatureGrants.ts` nuevo, `usePlans.ts` extendido con `trialAvailable`/`activateTrial()`.
- Tests: suite completa de `PlansService.activateTrial` (7 casos) y de `FeatureGrantsService` (19 casos — cubre los 3 modos de uso, expiración/agotamiento perezosos, reactivación permitida vs. rechazada, admin bypass).
- Validado end-to-end: trial activado sobre plan Pro (`endAt` = +7 días exacto, `enabledModules` con `purchases/suppliers/accounts` incluidos), regla `REACTIVATABLE` de 3 días activada y rechazo correcto de doble-activación, regla `MULTI_USE` con `usesRemaining` inicializado correctamente.

### Added — Business Shield, Fase 2f: Cuentas por Cobrar/Pagar + navegación (2026-09-05)

Cuarto módulo del roadmap "WorkPlace Business Shield" (sección 11 del audit estratégico): detectar cuándo vender fiado en un contexto de inflación destruye valor, sin imponer decisiones — solo mostrar el riesgo real.

- **Modelos `AccountReceivable`/`AccountPayable`** (`domains/money/accounts`): dinero que el comercio tiene que cobrar (venta fiado, vinculada opcionalmente a `Customer`/`Order`) o pagar (compra a crédito, vinculada opcionalmente a `Supplier`/`Purchase`). Mismo criterio de snapshot inmutable de tasa de cambio que `Purchase`/`SupplierQuote`. Deliberadamente separado de `Order.paymentStatus` (que es operativo, "¿ya procesé el pago?") — esto es crédito explícito con vencimiento y riesgo de poder adquisitivo.
- **`AccountReceivablesService.getReplacementRisk()`**: compara la tasa de cambio de la moneda original al momento de la venta contra la tasa actual. Valida el ejemplo exacto del audit: vendió 4000 VES fiado a tasa 40 (=$100 USD), la tasa subió a 50 antes de cobrar → cobrar hoy esos mismos 4000 VES equivale a solo $80 USD, una pérdida de $20 de poder de reposición por el retraso.
- Endpoints: `GET/POST /api/accounts/receivables`, `GET/POST /api/accounts/payables`, `PATCH .../:id/paid`, `DELETE .../:id`, `GET /api/accounts/receivables/:id/replacement-risk`. Permisos nuevos `accounts:view/create/edit/delete`.
- Migración `20260905030345_add_accounts_receivable_payable`.
- **Frontend**: página completa `/accounts` con tabs Por Cobrar/Por Pagar, `useAccounts.ts`, `ReceivablesList.vue` (con el riesgo de reposición expandible por fila) y `PayablesList.vue`, `ReceivableModal.vue`/`PayableModal.vue`.
- Tests: suite completa de `AccountReceivablesService` (incluye el ejemplo del audit con devaluación y el caso de apreciación de moneda) y `AccountPayablesService`.
- Validado end-to-end: cuenta creada en VES a tasa 40, tasa subida a 50 por fuera, `replacement-risk` devuelve exactamente `valueLossUsd: 20` y `rateChangePct: 25`.

**Páginas de listado nuevas + navegación real** (`/purchases`, `/suppliers`, además de `/accounts`): hasta esta fase, Purchases y Suppliers solo eran accesibles desde dentro del modal de un producto — no tenían entrada en el sidebar ni página propia. Se agregaron ambas páginas y las 3 entradas de navegación en la sección "Operaciones".

- **Hallazgo al conectar la navegación**: los módulos nuevos no aparecían en el sidebar aunque el usuario tuviera el permiso — el motivo real era el doble techo `plan ∩ categoría` (`Plan.enabledModules` ∩ `UserCategory.allowedModules`) que decide qué módulos ve cada comercio, independiente de los permisos RBAC. Se agregó `purchases`/`suppliers`/`accounts` a las categorías de comercio físico ("Comida", "Comercio") y a los planes "Pro"/"Enterprise" — Business Shield queda como feature de planes pagos medios/altos, no en "Gratis"/"Básico" (decisión de producto, coherente con la sección K del audit sobre cómo monetizar esto).

### Changed

- `PurchasesService.create()` ahora incluye `product` en la respuesta (antes solo incluía `supplier`) — necesario para que la página `/purchases` muestre el nombre del producto en una compra recién creada sin esperar un refresh.

### Added — Business Shield, Fase 2e: Price Guard (2026-09-05)

Tercer módulo del roadmap "WorkPlace Business Shield" (sección 6 del audit estratégico): calcula el precio mínimo recomendado para no perder margen frente al costo de reposición real, y simula el impacto de una devaluación antes de que ocurra.

- **`CommerceSettings.targetMarginPct`/`minMarginPct`** (defaults 30%/15%): margen objetivo (informativo) y mínimo (usado en el cálculo) por defecto para todo el comercio. **`Product.minMarginPct`** (nullable): override por producto, gana sobre el default del comercio si está seteado.
- **`PriceGuardService.getMinPrice()`**: precio mínimo = costo de reposición efectivo / (1 - margen mínimo). Usa el promedio de compras recientes si existen (`PurchasesService.getReplacementCost`), si no cae al costo histórico cargado a mano. Valida el ejemplo exacto del audit: costo $13, margen mínimo 20% → precio mínimo $16.25.
- **`PriceGuardService.simulatePriceChange()`**: "¿qué pasa si el tipo de cambio sube X%?" — aplica el incremento sobre el costo de reposición efectivo sin tocar ningún dato real, devuelve el nuevo costo, el nuevo precio mínimo, y el margen resultante con el precio ACTUAL (para detectar si ese precio pasaría a vender a pérdida).
- Endpoints: `GET /api/price-guard/:productId/min-price`, `POST /api/price-guard/:productId/simulate`. Settings: `PATCH /api/settings/price-guard`.
- Migración `20260905024405_add_price_guard_margins`.
- **Frontend**: `usePriceGuard.ts`, precio mínimo recomendado + simulador inline integrados en `ReplacementCostCard.vue` (con aviso en rojo si el precio actual está por debajo del mínimo), `PriceGuardSettingsCard.vue` en la página de Settings — visible para cualquier comercio (no restringido a la categoría "Comida" como Operaciones/Pagos, porque Price Guard aplica a cualquier negocio con inventario).
- Tests: suite completa de `PriceGuardService` (ejemplo del audit exacto, fallback a margen default del comercio, simulación de incremento de costo, cálculo de margen resultante).
- Validado end-to-end: compra registrada a $13 con margen mínimo 20% → precio mínimo $16.25 y detecta que el precio actual ($14) está por debajo; simulación de +10% en el costo → margen resultante -2.1% (venta a pérdida detectada antes de que ocurra).

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
