# Changelog

Registro cronológico de cambios relevantes del proyecto. Formato inspirado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.0.0/). Ver `WORKPLACE_STATUS_FEEDBACK.md` para el snapshot de estado actual y `WORKPLACE_VISION.md` para la visión de producto de largo plazo.

## [Unreleased]

### Added — Menú de siguiente nivel (2026-10-05 → 2026-10-17)

- **Búsqueda y filtro por estado** en `/menu` (client-side sobre el catálogo agrupado), con empty-state distinto para "sin resultados" y "sin productos".
- **Acciones masivas**: `POST /menu/products/bulk-activate|bulk-deactivate|bulk-delete|bulk-move-category` (máx. 200 ids, scope por `commerceId` en el `where`) + modo de selección y barra sticky en el frontend.
- **Reordenamiento drag-and-drop** de categorías y de productos dentro de cada categoría: nueva columna `Product.sortOrder` (migración `20261005151012_add_sort_order_to_product`), `POST /menu/categories/reorder` y `POST /menu/products/reorder`, actualización optimista en `useMenu()`. El arrastre de productos solo se habilita sin búsqueda/filtros y con orden "relevancia". `DraggableWidget` acepta `disabled` y detiene la propagación para poder anidarse.
- Botón **"Ver catálogo público"** (`/loja/[slug]`) y `MenuProductCard.vue` migrado a TypeScript.

### Added — Tasas de cambio robustas (2026-10)

- **`BcvSyncService.ensureDefaultRate()`**: al arrancar y en el health-check horario garantiza que exista la tasa VES/BCV, la reactiva y la marca como predeterminada si no hay otra elegida por un admin.
- Sync BCV **fire-and-forget** en `GET /exchange-rates` y `/default` (antes podía bloquear hasta ~40 s si el BCV estaba caído); `SELECT … FOR UPDATE` en `updateCurrencyRate` para evitar historial duplicado por syncs concurrentes; confianza baja + validación de rango cuando la tasa sale del regex de respaldo.
- `GET /exchange-rates/:id/usage` y confirmación de borrado mostrando cuántas compras/cotizaciones/cuentas usan la moneda; badge "Atrasada" en la tabla, errores de red categorizados con botón Reintentar y layout de tabla responsive.

### Changed — Modelo de acceso por capas (2026-09-22 → 2026-10)

- **Perfiles múltiples**: activar, desactivar y reactivar perfiles desde `/profile`; PROFESSIONAL y BUSINESS son mutuamente excluyentes; flujo unificado de conversión (`pricing`/`onboarding`/`profile`) sobre `profile-activations`, con categoría/subcategoría "Otro" propuesta por el usuario para revisión admin.
- **`CategoryScopeService` + `CategoryScopeGuard`**: `ServiceCategory`/`JobCategory` se acotan al rubro del usuario (`userCategoryIds`), con UI admin para editarlos y test de coherencia del seed (`catalog-categories.data.test.ts`).
- **`ModuleAccessGuard` + `@RequireModule`** aplican en el backend los mismos `effectiveModules` que muestra el sidebar; **`CapabilityGuard`/`CapabilitiesService`** (`HAS_COMMERCE`, …) reemplazan a `AccountTypeGuard`. Settings, analytics, reportes, dashboard y navegación deciden por capacidad, no por `accountType`. Un profesional que vende producto físico recibe su `Commerce` de forma determinista (`ensureForUser`).
- `PlanLimitsService` amplía el techo de módulos de servicios para proveedores autónomos en rubros de comercio; `appointments` (reserva de mesa) deja de otorgarse a profesionales.
- Navegación y módulos se invalidan y recargan tras login, OAuth y cambio de perfil.
- Usuario demo `costura@demo.com` y categoría "Reparación y Oficios Técnicos"; `comidarapida@demo.com` pasa a `SERVICE_PROVIDER`.

### Changed — Documentación y GitHub (2026-10-18)

- README reescrito según la arquitectura actual; nuevos `SECURITY.md`, `CONTRIBUTING.md`, plantillas de PR e issues, `CODEOWNERS` y `dependabot.yml`.

### Added — Fase 3 (Network): Sistema de disputas para Pago Protegido (2026-09-28)

Cierra el hueco que quedó explícito al lanzar Pago Protegido: hasta ahora un escrow retenido solo tenía dos salidas binarias (liberar todo, reembolsar todo) sin mediación cuando comprador y comercio/proveedor no se ponían de acuerdo.

- **Modelo `EscrowDispute`** (separado de `Report`, que es moderación de contenido/reputación sin campos de dinero): `raisedByRole` (`PAYER`/`PAYEE`, cualquiera puede abrir), `status` (`OPEN`/`RESOLVED`), `resolution` (`RELEASE_FULL`/`REFUND_FULL`/`SPLIT`), montos de liberación/reembolso. Nuevo estado `EscrowStatus.DISPUTED`.
- **`EscrowService.openDispute()`**: valida que el escrow esté `HELD`, que quien la abre sea el payer o el payee, y que no haya otra disputa `OPEN` — congela la liberación/reembolso automáticos y sincroniza el espejo desnormalizado en `ServiceRequest`/`CatalogOrder`.
- **`EscrowService.resolveDispute()`**: ejecuta los movimientos de dinero reales vía `WalletsService` según la resolución. `SPLIT` valida que `releaseAmount + refundAmount` sea exactamente el monto total retenido (tolerancia 0.01) — no puede aparecer ni desaparecer dinero al resolver, solo redistribuirse. El `Escrow.status` final siempre queda `RELEASED` (representa "ya no queda nada retenido"); el desglose real de cuánto fue a cada parte vive en `EscrowDispute`.
- Endpoints: `PATCH /services/requests/:id/dispute` y `PATCH /catalog/orders/:id/dispute` (comprador o comercio/proveedor, solo desde estado en curso), `GET /escrow/disputes/open` y `PATCH /escrow/disputes/:id/resolve` (admin, mismo patrón `@Roles(SUPERADMIN, ADMIN)` que el resto de operaciones de wallet con impacto real de dinero).
- Tests: 32 casos nuevos (`EscrowService`, `ServicesService`, `CatalogService`) cubriendo apertura, permisos, disputa duplicada, las 3 resoluciones, validación de montos en split, sincronización del espejo y notificaciones a ambas partes.
- Validado end-to-end en Docker con dinero real: comprador abre disputa sobre un pedido con $100 retenidos, admin resuelve con split 60/40 → comercio recibe $60, comprador reembolsado $40 (saldo final $440, matemáticamente correcto), `Escrow.status` y `CatalogOrder.escrowStatus` sincronizados en `RELEASED`, disputa ya resuelta no aparece en el listado de abiertas y no se puede volver a resolver.

### Added — Fase 3 (Network): Pago Protegido / Escrow genérico (2026-09-27)

Cuarta pieza de la Fase 3 ("Network", sección 11 del audit estratégico): generaliza el escrow que ya existía solo para `ServiceRequest` a un modelo reutilizable, y lo activa por primera vez en `CatalogOrder` (pedidos del marketplace público).

- **Modelo `Escrow` genérico** (`entityType: SERVICE_REQUEST | CATALOG_ORDER`, `payerId`, `payeeId`, `status`, `amount`, `heldAt`/`releasedAt`/`refundedAt`): proyección consultable de toda garantía del sistema, independiente de qué dominio la originó — mismo criterio que `ReputationScore` es una proyección derivada.
- **`EscrowService`/`EscrowFacade`** (`domains/money/escrow/`) envuelve `WalletsService.holdEscrow/releaseEscrow/refundEscrow` sin alterar su lógica atómica (Wallet/WalletTransaction siguen siendo la única fuente real de movimiento de dinero) — solo agrega la escritura de la proyección `Escrow`. `hold()` acumula sobre lo ya retenido cuando corresponde (aumento de precio aprobado), nunca sobrescribe el monto total con el delta.
- **`ServicesService` migrado** de `WalletsService` directo a `EscrowFacade` en los 6 puntos donde manejaba escrow (retención, liberación, reembolso en 2 rechazos distintos, los 2 modos de retry de `PENDING_FUNDS`, y el hold del delta en aumento de precio aprobado) — comportamiento 100% preservado, validado con la suite de tests existente de `ServiceRequest` sin modificar ninguna aserción de negocio.
- **`CatalogOrder` — primer pago real de este flujo**: nuevo `CommerceSettings.requiresEscrowForCatalogOrders` (el comercio lo activa por cuenta propia). Si está activo, `createOrder` retiene el monto ANTES de descontar stock (si no hay saldo, el pedido no se crea) y reembolsa automáticamente si la transacción de stock falla después del hold. `confirmOrderCompletion` libera al comercio, cobrando la comisión de plataforma si no se cobró al comprador al crear. Se agregó `CatalogOrderStatus.CANCELLED` (no existía) — el comercio puede cancelar y el escrow retenido se reembolsa automáticamente al comprador.
- **Bug crítico preexistente encontrado y corregido**: las 13 queries `$queryRaw` de `WalletsService` usaban `UPDATE "Wallet"` (nombre del modelo Prisma) en vez de `"wallets"` (la tabla real, `@@map("wallets")`) — Postgres es case-sensitive con identificadores entre comillas, así que **toda operación de wallet vía SQL crudo fallaba con error 42P01** (deposit, withdraw, transfer, payment, adjust, y los 3 métodos de escrow). Nunca se había ejercitado con datos reales en este ambiente hasta validar Pago Protegido end-to-end. Corregido en las 13 ocurrencias.
- Tests: 10 casos de `EscrowService`, 8 casos nuevos de `CatalogService` (retención/fallo por saldo/reembolso en rollback/fee al crear, bloqueo de transición terminal, liberación con y sin fee al confirmar).
- Validado end-to-end en Docker con dinero real: pedido de $100 con escrow → wallet del comprador ($500→$400) → confirmación → comercio recibe $100 (`Escrow.status=RELEASED`); segundo pedido cancelado por el comercio → comprador reembolsado (`Escrow.status=REFUNDED`, saldo final $400, matemáticamente correcto en ambos casos).
- **`ServiceRequest` no se migró de sus propios campos `escrowStatus`/`escrowAmount`/`escrowHeldAt`** a leer desde `Escrow` — decisión deliberada: su flujo tiene ~15 puntos con edge cases finos (retry de `PENDING_FUNDS` en 2 modos, ajustes de precio dinámicos) ya probados; migrar la lectura sin necesidad real habría sido riesgo sin beneficio. Sí escribe en `Escrow` como proyección, para que la reconciliación admin pueda consultar todo el sistema desde un solo lugar en el futuro.
- **`Order` (pedido interno/POS) queda explícitamente fuera de escrow**: usa `Customer` (registro sin cuenta ni wallet), no tiene comprador con capacidad de pago real — solo `CatalogOrder` (marketplace, `requesterId: User` opcional) tiene sentido económico para retener garantía.

### Added — Fase 3 (Network): WorkPlace Score — satisfacción + clientes recurrentes (2026-09-23)

Tercera pieza de la Fase 3 del roadmap ("Network"): el `ReputationService` (sección 10 del audit estratégico) medía solo cumplimiento operacional (completion/cancellation/dispute rate) — nunca si al cliente le gustó ni si vuelve. Se agregaron las dos señales que le faltaban para acercarse al "WorkPlace Score" de la visión.

- **`satisfactionRate`**: promedio de `Review.rating` (1-5, no ocultas) del dueño de la entidad, normalizado a 0-1, calculado directo desde `Review` en vez de depender de `Commerce.avgRating` (que es no-op para `PROFESSIONAL`, sin Commerce propio).
- **`repeatCustomerRate`**: % de clientes/solicitantes con ≥2 transacciones — `Customer` con ≥2 `Order` para `COMMERCE`, `User` (`ServiceRequest.requesterId`) con ≥2 solicitudes para `PROFESSIONAL`. Reemplaza la ausencia total de cálculo automático (`CustomerSegment` VIP/PREMIUM/REGULAR/NEW seguía siendo 100% manual, sin relación con este número).
- **Pesos redistribuidos**: completion 30% (antes 40%), no-cancelación 20% (antes 25%), puntualidad 15% (antes 20%), no-disputa 15% (sin cambio), satisfacción 15% (nuevo), clientes recurrentes 5% (nuevo).
- **`confidenceMultiplier` ahora también penaliza señales faltantes**, no solo volumen bajo: antes solo dependía de `sampleSize/CONFIDENCE_FLOOR`; ahora se multiplica además por la fracción de señales realmente disponibles (`dataConfidence`) — mismo criterio ya validado en `MatchingService` esta misma fase, para que una entidad sin reviews/clientes recurrentes no aparente la misma confianza que una con las 6 señales.
- `DRIVER` no tiene `satisfactionRate` (Review no lo referencia, solo referencia `User.id`) ni `repeatCustomerRate` (las asignaciones son del comercio, no "clientes propios" del driver) — ambos quedan `null`, excluidos honestamente del promedio.
- Tests: 18 casos nuevos (`ReputationService` no tenía ninguno hasta ahora) cubriendo los 3 `entityType`, normalización de rating, exclusión de clientes sin `requesterId`/`customerId`, y el caso explícito de que más señales reales nunca pierde contra una sola señal perfecta.
- **Pendiente de validar end-to-end** contra el backend real en Docker (Docker Desktop no estaba disponible al cerrar esta fase) — próxima sesión debe confirmar con datos reales antes de dar por cerrada la fase.

### Added — Fase 3 (Network): Matching Inteligente (2026-09-22)

Segunda pieza de la Fase 3 del roadmap ("Network"): ranking de comercios/profesionales por precio + distancia + reputación + disponibilidad, en vez de solo texto/rating (sección 12 del audit estratégico).

- **`MatchingService.rankCandidates(candidates, { origin })`**: recibe candidatos `COMMERCE`/`PROFESSIONAL` ya resueltos por el caller y devuelve un ranking 0-100 combinando 4 señales — reputación (`ReputationService.getScore`, ya existente, solo se consume), precio (más barato = 100, el doble del mínimo = 0), distancia (Haversine real, satura a 0 más allá de 30km) y disponibilidad (producto en stock / servicio `ACTIVE`).
- **El score final se penaliza por `confidence`** (fracción de señales realmente disponibles): sin este factor, un candidato con una sola señal perfecta (ej. solo "disponible") podía superar a otro con más señales pero ninguna perfecta, porque el promedio ponderado normaliza por peso disponible sin considerar cuántas faltan. Con la penalización, menos datos nunca gana a más datos con score comparable.
- **Ubicación real agregada** (no existía): `Commerce.latitude/longitude`, `FreelancerSettings.latitude/longitude`, `User.latitude/longitude` — fijadas manualmente en un selector de mapa (Leaflet + OpenStreetMap, sin geocoding automático), no derivadas de país/ciudad/estado.
- **`SearchService.suggest()`** ahora reordena productos/servicios por `matchScore` cuando el comprador tiene coordenadas fijadas — best-effort: si el ranking falla, devuelve el orden original sin romper la búsqueda. Empleos mantienen su orden (MatchingService solo conoce COMMERCE/PROFESSIONAL).
- Fórmula Haversine deduplicada: extraída a `common/utils/geo.util.ts`, reutilizada tanto por `MatchingService` como por `routing.service.ts` (antes duplicada).
- Endpoint standalone `POST /api/matching/rank`, pensado para el futuro AI Orchestrator (recibe candidatos + origin, devuelve el ranking) — no depende de productos/servicios, reutilizable desde cualquier dominio.
- **Frontend**: `LocationPickerMap.vue` (mapa interactivo, clic o arrastre de marcador, botón "usar mi ubicación actual"), `LocationSettingsCard.vue` (Commerce/FreelancerSettings, en Settings de negocio) y `LocationPreferenceCard.vue` (User, en preferencias personales).
- Tests: 11 casos de `MatchingService` (precio, distancia con saturación a 30km, reputación, disponibilidad, confidence, penalización del score, ordenamiento).
- Validado end-to-end en Docker: dos comercios con el mismo producto al mismo precio, uno a 400m del comprador y otro a 505km — el cercano resultó primero (`matchScore: 75` vs `46`) en `/search/suggest`.

### Added — Fase 3 (Network): Group Buying B2B (2026-09-22)

Primera pieza de la Fase 3 del roadmap ("Network"), fuera del núcleo de Business Shield: compra agrupada entre comercios para acceder a mejores precios por volumen.

- **`GroupBuyingCampaign`**: un organizador crea una campaña con `priceTiers` (tramos de precio por cantidad mínima acumulada), `deadline` y unidad. Comercios hacen `Pledge` (compromiso de cantidad). El tramo aplicable es el de mayor `minQuantity` alcanzado por la SUMA de pledges activos — más volumen agregado nunca empeora el precio de nadie, y todos pagan el mismo precio final.
- Pledge reactivable si estaba cancelado (UPDATE en vez de duplicar; `@@unique([campaignId, commerceId])` lo garantiza a nivel de DB). Cancelar un pledge o una campaña siempre es lógico (soft-cancel), nunca borra historial.
- Al cerrar la campaña (`POST /campaigns/:id/close`, solo el organizador), se resuelve el tramo final y se registra la comisión de plataforma por pledge vía `PlatformFeesFacade` (`FeeTransactionType.GROUP_BUYING`) — snapshot inmutable (`platformFeeRate`/`platformFeeAmount` en el momento del cierre, nunca recalculado después).
- Campos computados por la API (no persistidos): `totalQuantity`, `currentUnitPrice`, `nextTier` (con `unitsToUnlock`, para mostrar cuánto falta para desbloquear el siguiente precio).
- Endpoints: `GET /api/group-buying/campaigns` (abiertas), `GET /api/group-buying/campaigns/:id`, `POST /api/group-buying/campaigns`, `POST /api/group-buying/campaigns/:id/close`, `POST /api/group-buying/campaigns/:id/cancel`, `POST` y `DELETE /api/group-buying/campaigns/:id/pledges`.
- Migración `20260922115044_add_group_buying`.
- Tests: 19 casos (`createCampaign` validaciones de tramos/deadline, `pledge` nuevo/reactivado/duplicado/deadline vencido/campaña cerrada, `cancelPledge`, `close` con fee por pledge y sin config de fee, `withComputedFields` en sus tres estados).
- Validado end-to-end contra el backend en Docker: campaña con tramos 100→$5 / 500→$4 / 1000→$3, pledge de 300 + pledge de 250 de dos comercios distintos → `totalQuantity: 550`, `currentUnitPrice: 4`, `nextTier` correcto a 450 unidades del tramo de $3; cierre exitoso.
- **Nota de proceso**: el commit original (`8889a3eb`) agregó service/controller/DTOs/migración pero el registro en `app.module.ts` y los modelos en `schema.prisma` no llegaron a persistirse en ese commit (la tabla ya existía en la DB por la migración, pero Prisma Client no la conocía) — causaba 404 y luego un 500 en runtime. Corregido reconstruyendo el schema a partir del DDL real ya aplicado, confirmando cero drift con `prisma migrate diff` antes de regenerar el cliente.
- **Frontend**: `useGroupBuying.ts` (composable, mismo patrón que `useSuppliers.ts`), `GroupBuyingCampaignModal.vue` (crear campaña con tramos de precio dinámicos), `GroupBuyingPledgeModal.vue` (comprometer cantidad, muestra precio actual y cuánto falta para el siguiente tramo), página `/group-buying` (tarjetas con progreso, cerrar/cancelar solo para el organizador). Ítem de sidebar agregado reutilizando el permiso `purchases:view` — mismo módulo de plan/categoría que Compras, sin introducir un tercer "techo" nuevo. Validado: `/api/navigation` devuelve el ítem para un comercio con el módulo `purchases` habilitado, ruta `/group-buying` responde 200.

### Added — Business Shield: Purchasing Power (2026-09-21)

Última pieza del núcleo del roadmap "WorkPlace Business Shield" (sección 7 del audit estratégico): "no debe pretender ser un índice oficial de inflación... debe representar el poder adquisitivo operativo del negocio."

- **`PurchasingPowerService.getPurchasingPower(commerceId)`**: compara el costo de reponer la MISMA cesta de productos (los que el comercio compró en los últimos 30 días, ponderados por esa cantidad) usando los precios de la ventana anterior (30-60 días atrás) vs. los precios actuales — 100% basado en `Purchase` real, sin depender de ningún índice externo. La cesta se fija con las cantidades de la ventana ACTUAL para que un cambio de volumen de compra no distorsione la señal de precio.
- Productos sin una compra comparable en la ventana anterior se excluyen de la cesta — no se inventa un "antes" que no existe. Sin compras en absoluto, responde `hasData: false` con la razón.
- Endpoint: `GET /api/purchasing-power`.
- **Frontend**: `PurchasingPowerWidget.vue` en el dashboard principal — semáforo de color, mensaje "tu capital nominal se mantuvo, pero el costo de reponer tu cesta subió X%", detalle expandible por producto. `usePurchasingPower.ts`.
- Tests: 8 casos (sin datos, cesta sin comparación previa, el ejemplo exacto del audit, cesta fijada a cantidad actual para aislar el efecto de volumen, exclusión de productos no comparables, promedio ponderado con múltiples compras en la misma ventana, orden por peor variación).
- Validado end-to-end: cesta de 100 unidades a $10 (hace 45 días) vs. $11.80 (hace 5 días) → `valueAtPreviousPrices: 1000`, `valueAtCurrentPrices: 1180`, `purchasingPowerChangePct: 18` — coincide exactamente con el ejemplo del audit estratégico.

Con esto, los 6 pilares originales de Business Shield (Purchases, Supplier Intelligence, Price Guard, Accounts, Business Health Score, Alert Engine, Purchasing Power) quedan implementados y validados end-to-end.

### Added — Business Shield: Alert Engine generalizado (2026-09-06)

Hasta esta fase, `MARGIN_DROP` era la única alerta real y su umbral estaba fijo en código (5 puntos porcentuales, sin forma de ajustarlo por comercio). Se generalizó el motor siguiendo la sección 21 del audit estratégico: reglas configurables por comercio y tipo de alerta, con default de fábrica si el comercio no personalizó nada.

- **Modelo `AlertRule`**: `commerceId` + `alertType` (enum `MARGIN_DROP | REPLACEMENT_COST_RISK | SUPPLIER_PRICE_CHANGE | LOW_LIQUIDITY`) + `thresholdValue` + `enabled`. Único por comercio+tipo.
- **`AlertEngineService.shouldFire(commerceId, alertType, observedValue)`**: punto único que cualquier servicio de negocio consulta — lee la regla personalizada si existe y está habilitada, si no cae al default de fábrica (mismos valores que antes estaban hardcodeados). Una regla `enabled: false` nunca dispara, sin importar el valor observado.
- **`PurchasesService.checkMarginDrop()` refactorizado** para usar el motor en vez de su umbral hardcodeado — mismo comportamiento por defecto, ahora configurable.
- **`SuppliersService` — nueva alerta `SUPPLIER_PRICE_CHANGE`**: al registrar una cotización, compara contra la anterior del mismo proveedor+producto (mismo cálculo que `compareForProduct`) y notifica si el aumento supera el threshold configurado. `NotificationsService.notifySupplierPriceChange()` nuevo.
- Endpoints de autoservicio: `GET /api/alert-rules` (los 4 tipos siempre, con su threshold y si es default), `PUT /api/alert-rules/:alertType`, `DELETE /api/alert-rules/:alertType` (restablece al default).
- Migración `20260906032558_add_alert_rules`.
- **Frontend**: `AlertRulesSettingsCard.vue` en Settings — toggle on/off y threshold editable por tipo de alerta, con indicador de "(default)" o botón "Restablecer default". `useAlertRules.ts`.
- Tests: suite completa de `AlertEngineService` (defaults, override, disabled-siempre-false, listRules combinando reglas propias y defaults, upsert, reset) + tests actualizados de `PurchasesService`/`SuppliersService` verificando que consultan el motor con el valor observado correcto.
- Validado end-to-end: umbral de `SUPPLIER_PRICE_CHANGE` personalizado a 3% (default 8%), aumento de precio de 5% disparó la alerta (por encima del umbral personalizado, por debajo del default — confirma que lee la regla real, no el hardcode); reset volvió al default de fábrica correctamente.
- La sesión que trabajó en paralelo sobre esta misma base extendió el motor con `ExpenseOverdueScheduler` (cron diario que marca gastos vencidos y dispara `LOW_LIQUIDITY`) y una alerta de margen al vender en `catalog.service.ts` — quedaron integrados en la misma suite verde (709/709).

### Added — Business Shield: Business Health Score compuesto (2026-09-06)

Con Purchases + Price Guard + Accounts (Receivable/Payable) ya construidos, este era el primer momento en que un Business Health Score podía apoyarse en datos reales sin caer en "una puntuación arbitraria" (sección 10 del audit estratégico) — se pospuso deliberadamente hasta este punto.

- **`BusinessHealthService.getScore(commerceId)`**: score 0-100, promedio de 4 componentes con peso igual — margen de reposición promedio (de `Purchase`, normalizado 0-40% de margen → 0-100), cumplimiento de Price Guard (% de productos vendiendo en o por encima del precio mínimo recomendado), salud de cuentas por cobrar y por pagar (% de cuentas `PENDING` que no están vencidas).
- **Cada componente se excluye del promedio si no hay datos** (ej. sin compras registradas) en vez de asumir un valor arbitrario — el score sigue siendo honesto con información parcial. **`confidence`** expone qué % de los 4 indicadores tienen datos reales, para que el número no aparente más precisión de la que realmente tiene.
- Rating derivado del score: `SALUDABLE` (≥80) / `ACEPTABLE` (≥60) / `EN_RIESGO` (≥40) / `CRITICO` (<40) / `SIN_DATOS` (score null).
- Endpoint: `GET /api/business-health/score`.
- **Frontend**: `BusinessHealthWidget.vue` en el dashboard principal — semáforo de color (🟢🟡🟠🔴⚪) con el score, aviso de confianza cuando hay datos parciales, y detalle expandible por componente. `useBusinessHealth.ts`.
- Tests: 9 casos (sin datos, cobertura parcial con 1-2 componentes, promedio completo con las 4 señales, límites/piso de los componentes numéricos, los 4 umbrales de rating).
- Validado end-to-end: producto con compra registrada (margen real 50%, capado a 100), cumpliendo Price Guard, más una cuenta por cobrar vencida → score 67, confidence 75% (3 de 4 componentes con datos), rating `ACEPTABLE`.

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
