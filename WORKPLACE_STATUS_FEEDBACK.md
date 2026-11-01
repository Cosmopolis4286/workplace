# WorkPlace Manager — Estado actual y flujo (para feedback externo)

> Generado 2026-08-24, actualizado 2026-10-03 (§3, §4, §7, §8: modelo de acceso por capas). Pensado como input para pedir feedback (ej. a ChatGPT) sobre arquitectura, producto o próximos pasos. Refleja el estado real del código en este momento, no aspiracional. Ver `CHANGELOG.md` para el detalle cronológico de cambios recientes.

## 1. Qué es

WorkPlace Manager es un marketplace/directorio multi-rubro para Venezuela: comercios (restaurantes, tiendas, farmacias, etc.), profesionales/freelancers, delivery, empleos, rides. No es solo una app de delivery — cubre gestión de negocio (ERP básico) + marketplace + búsqueda de empleo en una sola plataforma.

Hay un documento de visión de largo plazo (`WORKPLACE_VISION.md`) que describe hacia dónde se quiere llevar el producto: un ecosistema donde el usuario expresa una necesidad y un AI Agent la resuelve coordinando comercios/profesionales, con perfiles múltiples por usuario, presupuesto inteligente, reputación unificada ("WorkPlace Score") y pagos protegidos. Este documento (`WORKPLACE_STATUS_FEEDBACK.md`) describe el **estado actual real**, no la visión.

## 2. Stack técnico

- **Backend**: NestJS + Prisma ORM + PostgreSQL + Redis. Puerto 3001.
- **Frontend**: Nuxt 3 (SPA) + Tailwind CSS + @headlessui/vue. Puerto 3000.
- **Package manager**: pnpm, monorepo (workspace con `backend/` y `frontend/`).
- **Auth**: JWT (access 15min / refresh 7d, o 1d + cookie de sesión si no se marca "mantener sesión"), blacklist de tokens en Redis, 2FA (TOTP) opcional, reCAPTCHA v3 en login/register, OAuth con Google.
- **Infra dev**: Docker Compose (`docker-compose.lite.dev.yml`), Traefik como router, contenedores separados para backend/frontend/postgres/redis/mailhog/adminer. El backend en modo dev **no** corre sin Docker (depende de que Compose inyecte las variables de entorno; no hay carga de `.env` en el script npm).

## 3. Modelo de identidad y control de acceso (actualizado 2026-10-03)

Cada pregunta de acceso tiene **una sola capa** que la responde, y backend (guards), sidebar (`GET /navigation`) y frontend (middleware, dashboard) evalúan las mismas capas en el mismo orden:

| Pregunta | Capa | Dónde vive |
|---|---|---|
| ¿Qué nivel de acceso tiene? | `User.role`: `SUPERADMIN \| ADMIN \| PROFESIONAL \| NORMAL` | `RolesGuard` |
| ¿Qué papel cumple? | `UserProfile` (varios ACTIVE a la vez): `CUSTOMER`, `PROFESSIONAL` (`FREELANCER`/`SERVICE_PROVIDER`), `JOB_SEEKER`, `BUSINESS` | Tabla `user_profiles` |
| ¿Qué puede hacer ese papel? | Matriz de permisos: `RolePermission` (base del rol) ∪ `ProfilePermission` (por perfil ACTIVE); `UserPermission` como override individual | `PermissionsGuard` (`@RequirePermission`) |
| ¿Su rubro y su plan lo incluyen? | `effectiveModules` = `Plan.enabledModules` ∩ `UserCategory.allowedModules` | `ModuleAccessGuard` (`@RequireModule`) |
| ¿Existe lo que la operación necesita? | Capacidades derivadas, sin tabla: `HAS_COMMERCE`, `HAS_PROFESSIONAL_PROFILE`, `HAS_BUSINESS_PROFILE` | `CapabilityGuard` (`@RequireCapability`); expuestas en `GET /auth/me → capabilities` |
| ¿Identidad verificada? | `kycStatus` | `KycApprovedGuard` |

- **`role=PROFESIONAL` concede solo la base común** de todos los perfiles de negocio (intersección calculada en `prisma/permission-defaults.js`). Lo exclusivo de comercio (empleados, sucursales, caja, compras, proveedores, cuentas, citas) solo lo concede el perfil `BUSINESS`. Antes el rol era la *unión*, así que los perfiles no podían restringir nada y cada capa del frontend parcheaba con listas de `accountType`.
- **Opción 2 (decisión de producto 2026-09-28): un `PROFESSIONAL` puede vender producto físico sin perfil `BUSINESS`.** Su perfil incluye el kit de venta (menú, inventario, pedidos, clientes, delivery, gastos); quién lo usa de verdad lo decide la categoría. `BUSINESS` y `PROFESSIONAL` son mutuamente excluyentes al activarse por autoservicio.
- **El `Commerce` se crea solo de forma explícita** (`CommerceResolverService.ensureForUser`), en cada camino que activa un perfil o cambia la categoría: `BUSINESS` siempre; `PROFESSIONAL` si su categoría incluye `menu`, `inventory` u `orders`. Nunca como efecto secundario de abrir una pantalla (antes `/menu` y Configuración lo auto-creaban, incluso para SUPERADMIN). `resolve()` responde 403 si no hay Commerce, en vez de usar el `userId` como `commerceId`.
- `accountType` (`COMMERCE \| FREELANCER \| null`) **sigue existiendo solo como etiqueta derivada** de `UserProfile` (colapsa perfiles: `BUSINESS` gana). No se usa para decidir acceso. Lo usan las etiquetas de UI y la elección de forma de `/settings` (`FreelancerSettings` vs `CommerceSettings`).
- `Commerce.userId` sigue siendo 1:1 con `User`. `Commerce.profileId` vincula el comercio al perfil que lo originó.
- La activación de perfiles va solo por `POST /api/profile-activations` (UI en `/profile` y `/profile-activations-admin`). El camino legacy `POST /freelancer-applications` responde **410 Gone** desde 2026-10-03; su lectura y revisión admin se conservan para solicitudes PENDING históricas.
- Detalle del diseño y de la migración: `IDENTITY_ARCHITECTURE_PLAN.md`.

## 4. Flujo de uso actual (usuario final)

1. **Registro**: email+password o Google OAuth. Usuario nace con `role=NORMAL` (cliente).
2. **Verificación de identidad (KYC)**: requerida antes de poder publicar/contratar/vender — no antes de solo navegar o comprar como invitado limitado.
3. **Como cliente (NORMAL)**: navega comercios/profesionales por categoría, compra en catálogo, contrata servicios, agenda citas, pide delivery, pide rides, postula a empleos.
4. **Convertirse en negocio o profesional**: el usuario activa un perfil `BUSINESS` o `PROFESSIONAL` (onboarding, `/pricing` o `/profile`, todos vía `POST /api/profile-activations`), opcionalmente con un plan. Un admin lo aprueba (requiere KYC aprobado); al aprobar se sincroniza `role=PROFESIONAL`, se activa el plan elegido y, si corresponde, se crea el `Commerce`. `CUSTOMER`/`JOB_SEEKER` se activan al instante.
5. **Como comercio**: gestiona catálogo/menú, categorías, empleados, sucursales, caja (apertura/cierre de turno con arqueo), gastos, pedidos, delivery (con repartidores propios o invitados con cuenta propia), citas, clientes, analytics, notificaciones en tiempo real (WebSocket), comprobantes de venta (no fiscales — ver sección 6), planes/suscripciones con límites por plan.
6. **Como profesional/freelancer**: publica servicios, recibe y gestiona solicitudes de servicio (con mensajería), analytics propios. Si su categoría vende producto (ej. "Comida"), además tiene un `Commerce` y opera menú, pedidos, clientes, delivery y gastos; sus analytics y reportes pasan a ser de comercio. No accede a empleados, sucursales, caja, compras, proveedores ni cuentas (exclusivos de `BUSINESS`).
7. **Empleos**: cualquier usuario puede publicar una oferta o postular, sin necesidad de un perfil "Job Seeker" separado hoy (aunque el modelo `UserProfile` ya contempla ese tipo para el futuro).
8. **Delivery**: comercios asignan pedidos a repartidores (`Driver`); un repartidor puede tener cuenta propia vinculada (con su propio KYC) vía invitación, con periodo de gracia de 30 días para los repartidores "legado" sin cuenta.
9. **Wallets / pagos**: sistema de wallet interno con solicitudes de depósito (con comprobante), y BNPL (compra ahora paga después) con adaptadores por proveedor (Cashea, Krece, simulado para dev).
10. **Admin**: gestiona categorías propuestas por usuarios, solicitudes de freelancer/perfiles, solicitudes de depósito de wallet, reportes, tasas de la plataforma, permisos/roles granulares (matriz de permisos), planes.

## 5. Módulos implementados (backend + frontend, con CRUD y tests)

Menu, Customers, Settings, Appointments, Analytics, Delivery, Orders, Expenses, Dashboard, Notifications (WebSocket), Employees, Branches, RBAC/Roles, Permission Matrix, Plans & Subscriptions, Plan Limits, Cash (caja/arqueo), Receipts (comprobantes no-fiscales), KYC, Wallets, Wallet Deposit Requests, BNPL, Exchange Rates, Rides, Jobs, Reports, Proposed Categories, Telegram (notificaciones), Locations, Landing, Search, 2FA, Auditoría (interceptor global que registra operaciones), **Purchases**, **Suppliers/SupplierQuote**, **Price Guard** y **Accounts (Receivable/Payable)** (backend + frontend, ver sección 5.1), **Trial autoservicio + Feature Grants** (backend + frontend, ver sección 5.2), **Business Health Score** (backend + frontend, ver sección 5.3), **Alert Engine generalizado** (backend + frontend, ver sección 5.4), **Purchasing Power** (backend + frontend, ver sección 5.5), **Group Buying** (backend + frontend, ver sección 5.6), **Matching Inteligente** (backend + frontend, ver sección 5.7), **WorkPlace Score — satisfacción + recurrencia** (backend, ver sección 5.8 — pendiente de validar end-to-end), **Pago Protegido / Escrow genérico + disputas** (backend, ver secciones 5.9 y 5.10).

### 5.10 Sistema de disputas para Pago Protegido (2026-09-28)

Cierra el hueco de Pago Protegido: antes solo había liberar-todo o reembolsar-todo, sin mediación.

- **`EscrowDispute`** (separado de `Report`, que es moderación de contenido sin campos de dinero): cualquiera de las dos partes (payer o payee) puede abrir una disputa sobre un escrow `HELD`, que pasa a `DISPUTED` y congela la liberación/reembolso automáticos.
- **Resolución admin** con 3 modos: liberar todo, reembolsar todo, o dividir el monto (`SPLIT`, validado para que `releaseAmount + refundAmount` sea exactamente el total retenido). `Escrow.status` final siempre `RELEASED`; el desglose real vive en `EscrowDispute`.
- Endpoints: abrir disputa desde `ServiceRequest`/`CatalogOrder` (dueños de la transacción), `GET/PATCH /escrow/disputes` para admin.
- 32 tests nuevos. Validado end-to-end en Docker: disputa sobre $100 resuelta con split 60/40 → comercio recibe $60, comprador reembolsado $40, saldos y estados verificados en Postgres.

### 5.9 Pago Protegido / Escrow genérico (2026-09-27)

Cuarta pieza de la Fase 3: generaliza el escrow de `ServiceRequest` a un modelo reutilizable (`Escrow`) y lo activa en `CatalogOrder`.

- **`EscrowService`** envuelve `WalletsService.holdEscrow/releaseEscrow/refundEscrow` sin tocar su lógica atómica — agrega la proyección `Escrow` consultable por `entityType`/`entityId`. `ServicesService` migrado a usarlo en sus 6 puntos de escrow, comportamiento 100% preservado (mismos tests en verde).
- **`CatalogOrder` ahora procesa el primer pago real de ese flujo**: `CommerceSettings.requiresEscrowForCatalogOrders` (opt-in del comercio). Retiene al crear (falla si no hay saldo, antes de tocar stock), libera al confirmar (con comisión), reembolsa al cancelar (nuevo `CatalogOrderStatus.CANCELLED`).
- **Bug crítico preexistente encontrado y corregido**: `WalletsService` usaba `UPDATE "Wallet"` en SQL crudo (nombre del modelo, no de la tabla real `wallets`) — Postgres case-sensitive lo rechazaba con error 42P01. **Todas** las operaciones de wallet vía SQL crudo (deposit, withdraw, transfer, payment, adjust, escrow) estaban rotas en runtime, nunca detectado porque nunca se habían ejercitado con datos reales en este ambiente. Corregido en las 13 ocurrencias.
- 18 tests nuevos (`EscrowService` + `CatalogService`). Validado end-to-end en Docker con dinero real: retención, liberación al comercio y reembolso al comprador, saldos verificados en Postgres.
- `ServiceRequest` sigue leyendo sus propios campos de escrow (no migrado a leer desde `Escrow`) — decisión deliberada por el riesgo de su flujo con 15 puntos y edge cases finos ya probados; sí escribe en `Escrow` como proyección.
- `Order` (POS interno) queda fuera de escrow a propósito: usa `Customer` sin cuenta ni wallet.

### 5.8 WorkPlace Score: satisfacción + clientes recurrentes (2026-09-23)

Tercera pieza de la Fase 3, extiende `ReputationService` (que hasta ahora solo medía cumplimiento operacional) hacia el "WorkPlace Score" completo de la sección 10 del audit.

- **`satisfactionRate`** (Review.rating normalizado 0-1) y **`repeatCustomerRate`** (% de clientes/solicitantes con ≥2 transacciones) agregados como señales nuevas, con exclusión honesta (`null`) cuando faltan — no se aproximan con otra señal.
- Pesos redistribuidos: completion 30%, no-cancelación 20%, puntualidad 15%, no-disputa 15%, satisfacción 15%, recurrencia 5%.
- `confidenceMultiplier` ahora penaliza también señales faltantes (no solo volumen bajo), mismo criterio que `MatchingService` — evita que una entidad sin reviews aparente la misma confianza que una con las 6 señales.
- `DRIVER` sin `satisfactionRate`/`repeatCustomerRate` reales todavía (Review no referencia Driver; las asignaciones son del comercio, no clientes propios).
- 18 tests unitarios nuevos (`ReputationService` no tenía ninguno).
- **⚠️ Pendiente**: no se validó end-to-end contra el backend real (Docker Desktop no estaba disponible al cerrar esta fase). Antes de dar la fase por cerrada, correr un caso real: comercio con reviews + clientes recurrentes debe mostrar un score consistentemente mayor que uno idéntico sin esos datos.

### 5.7 Matching Inteligente (2026-09-22)

Segunda pieza de la Fase 3 ("Network"): ranking de comercios/profesionales combinando 4 señales en vez de solo precio/rating.

- **`MatchingService.rankCandidates()`**: precio (más barato=100) + distancia real (Haversine, satura a 0 más allá de 30km) + reputación (reutiliza `ReputationService`, no la recalcula) + disponibilidad, con el score final **penalizado por confidence** para que menos señales nunca gane a más señales con score comparable.
- Ubicación real nueva (no existía): `Commerce`/`FreelancerSettings`/`User.latitude/longitude`, fijada en un mapa interactivo (Leaflet), sin geocoding automático.
- `SearchService.suggest()` reordena productos/servicios por `matchScore` cuando el comprador tiene ubicación fijada (best-effort, nunca rompe la búsqueda si falla). Endpoint standalone `POST /api/matching/rank` para el futuro AI Orchestrator.
- 11 tests unitarios. Validado end-to-end: mismo producto/precio en 2 comercios, el que está a 400m del comprador salió primero (`matchScore 75`) sobre el que está a 505km (`matchScore 46`).

### 5.6 Group Buying B2B (2026-09-22)

Primera pieza de la Fase 3 del roadmap ("Network"), fuera del núcleo de Business Shield.

- **`GroupBuyingCampaign` + `Pledge`**: un organizador crea una campaña con tramos de precio por volumen (`priceTiers`); comercios comprometen cantidad (`Pledge`). El tramo aplicable es el de mayor `minQuantity` alcanzado por la SUMA de pledges activos — todos pagan el mismo precio final, más volumen agregado nunca lo empeora.
- Al cerrar la campaña (solo el organizador), se cobra la comisión de plataforma por pledge vía `PlatformFeesFacade` (`FeeTransactionType.GROUP_BUYING`), como snapshot inmutable.
- Endpoints bajo `/api/group-buying/campaigns`. Migración `20260922115044_add_group_buying`. 19 tests unitarios.
- Validado end-to-end en Docker: tramos 100→$5/500→$4/1000→$3, dos comercios comprometen 300+250 → tramo de $4 correctamente resuelto (550 ≥ 500 < 1000), cierre exitoso.
- **Nota de proceso** (por si se repite): el commit que agregó el módulo no incluyó el registro en `app.module.ts` ni los modelos en `schema.prisma` (la migración SQL sí quedó y se aplicó, dejando la tabla física sin que Prisma la conociera) — causaba 404 en las rutas y luego 500 en runtime. Se detectó y corrigió en la validación end-to-end de esta misma fase, reconstruyendo el schema desde el DDL real ya aplicado (`prisma migrate diff` confirmó cero drift antes de regenerar el cliente). Al cerrar cualquier fase de aquí en más, confirmar explícitamente que el módulo aparece en los logs de arranque (`InstanceLoader ... dependencies initialized`) antes de darla por terminada, no solo que compile.
- **Frontend**: `useGroupBuying.ts` (composable), `GroupBuyingCampaignModal.vue` (crear campaña, tramos de precio dinámicos), `GroupBuyingPledgeModal.vue` (comprometer cantidad), página `/group-buying` (tarjetas con progreso; cerrar/cancelar solo el organizador). Ítem de sidebar reutiliza el permiso `purchases:view` (mismo módulo de plan/categoría que Compras). Validado: `/api/navigation` devuelve el ítem, ruta responde 200.

### 5.5 Purchasing Power (2026-09-21)

Última pieza del núcleo de Business Shield (audit estratégico sección 7): poder adquisitivo operativo, no un índice de inflación oficial.

- **`PurchasingPowerService.getPurchasingPower()`**: compara el costo de reponer la misma cesta de productos (los comprados en los últimos 30 días, cantidades fijas) a precios de hace 30-60 días vs. precios actuales — 100% basado en `Purchase` real. Productos sin compra comparable en la ventana anterior se excluyen, no se inventan.
- Endpoint `GET /api/purchasing-power`. Frontend: `PurchasingPowerWidget.vue` en el dashboard (semáforo + detalle expandible).
- Validado end-to-end: cesta de 100 unidades ($10 hace 45 días → $11.80 hace 5 días) → `purchasingPowerChangePct: 18`, coincide exactamente con el ejemplo del audit.
- **Con esto, los 7 pilares del núcleo de Business Shield quedan implementados y validados end-to-end**: Purchases, Supplier Intelligence, Price Guard, Accounts (Receivable/Payable), Business Health Score, Alert Engine, Purchasing Power. Lo que sigue en el roadmap original (Fase 3 en adelante: Network/Marketplace, Delivery, Procurement, Payments, Financing, AI) queda fuera del núcleo de Business Shield.

### 5.4 Alert Engine generalizado (2026-09-06)

Antes de esto, `MARGIN_DROP` era la única alerta real y su umbral (5pp) estaba fijo en código, sin forma de ajustarlo por comercio ni de agregar un segundo tipo de alerta sin duplicar la lógica de "leer threshold, comparar, notificar".

- **`AlertRule`** (por comercio + tipo) + **`AlertEngineService.shouldFire()`**: punto único que cualquier servicio consulta — regla personalizada si existe y está habilitada, si no default de fábrica. `enabled: false` nunca dispara.
- `PurchasesService.checkMarginDrop()` refactorizado para usar el motor (mismo comportamiento default, ahora configurable). Nueva alerta real: `SuppliersService` dispara `SUPPLIER_PRICE_CHANGE` al registrar una cotización que sube más del threshold respecto a la anterior del mismo proveedor.
- Endpoints: `GET/PUT/DELETE /api/alert-rules/:alertType`. Frontend: `AlertRulesSettingsCard.vue` en Settings (toggle + threshold editable + reset a default).
- Validado end-to-end: umbral personalizado (3%) disparó con un aumento de 5% que el default (8%) no habría disparado — confirma que lee la regla real, no el hardcode.
- **La sesión que trabajó en paralelo extendió el mismo motor**: `ExpenseOverdueScheduler` (cron diario, marca gastos vencidos y dispara `LOW_LIQUIDITY`) y una alerta de margen al vender en `catalog.service.ts` — los 4 tipos de `AlertType` ya tienen al menos un disparador real.

Con Purchases + Price Guard + Accounts ya construidos, primer momento en que el score podía apoyarse en datos reales sin ser "una puntuación arbitraria" (audit estratégico sección 10) — pospuesto deliberadamente hasta este punto.

- **`BusinessHealthService.getScore()`**: promedio de 4 componentes con datos reales (margen de reposición, cumplimiento de Price Guard, salud de cuentas por cobrar/pagar) — cada uno se excluye del promedio si no hay datos suficientes, en vez de asumir un valor. `confidence` expone qué % de indicadores tienen datos reales.
- Rating: `SALUDABLE`/`ACEPTABLE`/`EN_RIESGO`/`CRITICO`/`SIN_DATOS`. Endpoint `GET /api/business-health/score`.
- **Frontend**: `BusinessHealthWidget.vue` en el dashboard principal (semáforo de color + detalle expandible), `useBusinessHealth.ts`.
- Validado end-to-end (score 67, confidence 75%, ACEPTABLE con 3/4 componentes con datos reales).

### 5.2 Planes de siguiente nivel: trial autoservicio + Feature Grants (2026-09-05)

Extiende `Plan`/`Subscription` (que ya solo manejaban "todo el plan, por mes/año") con activaciones temporales más finas — trial de plan completo por 7 días, y features individuales por tiempo limitado con 3 modos de consumo.

- **Trial**: `User.trialUsedAt` (marca permanente, una vez de por vida) + `PlansService.activateTrial()` — autoservicio, activable en cualquier momento desde un plan gratuito, 7 días, reutiliza el scheduler de expiración de suscripciones ya existente. `getMySubscription()` expone `trialAvailable`.
- **`PlanFeatureRule` + `FeatureGrant`**: qué puede activar cada plan (`featureKey` libre, duración, `SINGLE_USE | MULTI_USE | REACTIVATABLE`, límite de usos) vs. una activación concreta (con snapshot inmutable de la regla). `FeatureGrantsService.hasFeature()` es el punto único que cualquier guard/servicio debe consultar — expiración y agotamiento se evalúan al vuelo (perezoso), no solo por cron.
- Autoservicio (`SELF_SERVICE`, sigue una regla del plan) + otorgamiento manual de admin (`ADMIN`, sin regla — cortesías puntuales) conviven en el mismo modelo.
- Endpoints: `POST /api/plans/trial/activate`; `/api/feature-grants/*` (mine, available, activate, has, + CRUD de reglas y grant/revoke admin).
- **Frontend**: CTA de trial + panel "Funciones de tu plan" en `my-plan.vue`, `useFeatureGrants.ts`.
- Validado end-to-end (trial sobre plan Pro con `endAt` exacto a 7 días; regla `REACTIVATABLE` y `MULTI_USE` activadas correctamente; doble-activación rechazada).

### 5.1 Business Shield: Purchases + Supplier Intelligence + Price Guard + Accounts (Fases 2a-2f — 2026-09-04/05)

Primeros dos módulos del roadmap "WorkPlace Business Shield" (ver `WORKPLACE_VISION.md` y el audit estratégico de esta misma fecha). Antes de esto, `Product.cost` era un único `Float` mutable sin historial, y `Supplier` no tenía ni CRUD ni pantalla — no existía forma de distinguir "cuánto costó" de "cuánto costaría reponerlo hoy", ni de comparar proveedores.

**Purchases (Fases 2a/2b/2c):**
- **Modelo `Purchase`**: registra cada compra a proveedor — producto, cantidad, costo unitario, moneda, y un **snapshot inmutable** de la tasa de cambio usada (`exchangeRateValue`, `exchangeRateSource`) + el costo ya convertido a USD (`unitCostUsd`). El snapshot es deliberado: si la tasa de cambio cambia mañana, el historial de esta compra no debe recalcularse retroactivamente.
- **`PurchasesService.getReplacementCost(productId, commerceId)`**: compara el costo histórico (`Product.cost`, cargado a mano) contra el costo de reposición real (última compra y promedio de las últimas 5), devolviendo margen histórico vs. margen de reposición. `Product.cost` no se sobreescribe automáticamente al registrar una compra.
- Endpoints: `POST /api/purchases`, `GET /api/purchases`, `GET /api/purchases/replacement-cost/:productId`, `DELETE /api/purchases/:id`.
- **Frontend**: `usePurchases.ts`, `ReplacementCostCard.vue` (margen histórico vs. reposición, con aviso visual si la caída supera 5pp) integrado en `ProductModal.vue`, `PurchaseModal.vue` para registrar una compra desde ahí.
- **Primera alerta real del Alert Engine — `MARGIN_DROP`**: al registrar una compra, si el margen de reposición cae ≥5 puntos porcentuales por debajo del histórico, se dispara una notificación (WebSocket, canal ya existente) explicando el riesgo sin prescribir una acción — umbral fijo en código a propósito, sin motor de reglas genérico todavía.

**Suppliers + SupplierQuote (Fase 2d, Supplier Intelligence):**
- **CRUD de `Supplier`** (antes existía el modelo en la DB pero sin service/controller/pantalla — nadie podía cargar proveedores).
- **Modelo `SupplierQuote`**: precio *ofertado* por un proveedor para un producto (a diferencia de `Purchase`, que es lo que realmente se compró) — permite comparar proveedores antes de comprarles. Mismo criterio de snapshot inmutable de tasa de cambio que `Purchase`.
- **`SuppliersService.compareForProduct(productId, commerceId)`**: compara la última cotización de cada proveedor para un producto, ordenadas por precio, con la variación % respecto a la cotización anterior del mismo proveedor en los últimos 30 días — reproduce el ejemplo del brief original ("Proveedor A es 4% más barato, pero tarda 6 días más" / "Proveedor B subió 12% en 14 días").
- Endpoints: `GET/POST /api/suppliers`, `GET/PUT/DELETE /api/suppliers/:id`, `POST /api/suppliers/:id/quotes`, `GET /api/suppliers/:id/quotes`, `GET /api/suppliers/compare/:productId`.
- **Frontend**: `useSuppliers.ts`, `SupplierModal.vue` (CRUD de proveedores), `SupplierQuoteModal.vue` (cargar una cotización sin comprar todavía), selector de proveedor en `PurchaseModal.vue`, comparación de cotizaciones integrada en `ReplacementCostCard.vue`.
- `ExchangeRatesService.resolveRateToUsd()`: método compartido nuevo para resolver moneda→tasa USD con snapshot inmutable, reutilizable por cualquier módulo que registre un monto en moneda extranjera (ya usado por `Purchase` y `SupplierQuote`).

**Price Guard (Fase 2e):**
- **`CommerceSettings.targetMarginPct`/`minMarginPct`** (defaults 30%/15%) + **`Product.minMarginPct`** (override opcional por producto).
- **`PriceGuardService.getMinPrice()`**: precio mínimo recomendado = costo de reposición efectivo / (1 - margen mínimo). Reutiliza `PurchasesService.getReplacementCost` — usa el promedio de compras recientes si existen, si no cae al costo histórico. Valida el ejemplo del audit: costo $13, margen 20% → mínimo $16.25.
- **`PriceGuardService.simulatePriceChange()`**: simula "¿qué pasa si el tipo de cambio sube X%?" sin tocar datos reales — devuelve nuevo costo, nuevo mínimo, y el margen que resultaría con el precio actual (detecta venta a pérdida antes de que ocurra).
- Endpoints: `GET /api/price-guard/:productId/min-price`, `POST /api/price-guard/:productId/simulate`, `PATCH /api/settings/price-guard`.
- **Frontend**: `usePriceGuard.ts`, precio mínimo + simulador inline en `ReplacementCostCard.vue`, `PriceGuardSettingsCard.vue` en Settings (visible para todo comercio, no solo categoría "Comida" como Operaciones/Pagos).

**Accounts: AccountReceivable/AccountPayable (Fase 2f):**
- **Modelos `AccountReceivable`/`AccountPayable`**: dinero por cobrar (fiado a clientes) y por pagar (crédito de proveedores), con el mismo snapshot inmutable de tasa de cambio. Deliberadamente separado de `Order.paymentStatus` (operativo) — esto es crédito explícito con vencimiento.
- **`AccountReceivablesService.getReplacementRisk()`**: compara la tasa al momento de la venta vs. la tasa actual. Valida el ejemplo del audit: vendió 4000 VES fiado (tasa 40, =$100 USD), la tasa subió a 50 antes de cobrar → cobrar hoy equivale a $80 USD, pérdida de $20 por el retraso.
- Endpoints: `GET/POST /api/accounts/receivables`, `GET/POST /api/accounts/payables`, `PATCH .../:id/paid`, `GET /api/accounts/receivables/:id/replacement-risk`.
- **Frontend**: página completa `/accounts` (tabs Por Cobrar/Por Pagar), `useAccounts.ts`, listas con el riesgo de reposición expandible por fila.

**Navegación real para Purchases/Suppliers/Accounts:** hasta esta fase Purchases/Suppliers solo eran accesibles desde dentro del modal de un producto — se agregaron páginas de listado propias (`/purchases`, `/suppliers`) y las 3 entradas en el sidebar. Al conectarlas se encontró que el sidebar tiene un **doble techo de módulos** (`Plan.enabledModules` ∩ `UserCategory.allowedModules`), independiente de los permisos RBAC — los módulos nuevos no aparecían aunque el permiso estuviera bien. Se agregaron a las categorías de comercio físico ("Comida", "Comercio") y a los planes "Pro"/"Enterprise" (decisión de producto: Business Shield como feature de planes pagos medios/altos, no en "Gratis"/"Básico").

- **Pendiente**: más tipos de alerta del Alert Engine (`REPLACEMENT_COST_RISK`, `SUPPLIER_PRICE_CHANGE`, `LOW_LIQUIDITY`), motor de reglas configurable, Business Health Score compuesto (ahora sí con datos reales de cuentas por cobrar/pagar para no ser arbitrario, ver sección 10 del audit), actualización masiva de precios con Price Guard, reglas de redondeo. Ver el audit estratégico para el orden completo.

## 6. Decisiones de producto/negocio relevantes ya tomadas

- **No es facturación fiscal SENIAT**: Venezuela exige desde 2025 un sistema de facturación homologado (Providencias SNAT/2024/000102 y 121) con transmisión automática al SENIAT. WorkPlace construyó en su lugar un "Comprobante de Venta" no-fiscal, rotulado explícitamente como tal. Cumplimiento fiscal real es una decisión de negocio pendiente, no un bug.
- Guest checkout fue eliminado en catálogo/servicios — KYC es obligatorio antes de operar como no-admin.
- El nombre de dominio interno para "comercio" (`Commerce`) reemplazó a un legado `Restaurant` — ya no es solo para restaurantes.

## 7. Deuda técnica y advertencias conocidas

- Sin reporte financiero exportable.
- Paginación en memoria en 4 módulos (no en DB).
- Archivos `.env` trackeados en git (riesgo de secretos versionados).
- Sin Sentry/logging estructurado en backend.
- Sin backup de base de datos automatizado.
- La FK real `Commerce.userId` sigue siendo 1:1 estricta (un usuario tiene como máximo un comercio). No se migra sin un caso de uso real de multi-ownership.
- `FreelancerApplication` está deprecado (alta en 410). Pendiente eliminar el módulo, después de verificar en prod que no haya solicitudes `PENDING`.
- **Tipos numéricos del schema verificados (2026-10-31):** los 23 campos `Float` actuales corresponden a coordenadas, rating, velocidad/rumbo, distancia, peso aproximado y un umbral genérico; no son campos monetarios. Los importes, precios, saldos, comisiones, tasas de cambio y liquidaciones del schema usan `Decimal` con precisión explícita (`@db.Decimal(20, 2)` o `(20, 8)`). La advertencia histórica de 101 campos monetarios `Float` quedó obsoleta tras las migraciones de octubre de 2026.
- **`/settings` de un profesional con Commerce**: recibe `FreelancerSettings` (la estrategia del backend se elige por `accountType`), así que las tarjetas de Operaciones y Price Guard no muestran sus valores guardados de `CommerceSettings`. Pendiente unificar la respuesta.
- **Comercios "fantasma" de admins**: hasta 2026-10-03, abrir `/menu` o Configuración le creaba un `Commerce` a cualquier cuenta, incluidos SUPERADMIN/ADMIN (en local, `superadmin@demo.com` tiene uno). Con eso, SUPERADMIN opera endpoints de comercio sobre ese Commerce vacío. El bug está corregido pero esos registros no se borraron: decisión pendiente (revisar en prod cuáles existen y si tienen datos).
- **Seed y matriz de permisos**: `seed.js` ya no pisa la matriz (solo crea filas faltantes; `SEED_RESET_PERMISSIONS=1` la reimpone en dev). Cambiar un default existente se hace con una migración de datos, simulando antes con `node scripts/simulate-permission-defaults.js`.
- **Historial — bug de RBAC (2026-09-04, superado 2026-09-28)**: `ProfilePermission` no se sembraba, y luego `RolePermission.PROFESIONAL` pasó a ser la unión comercio ∪ profesional. Desde la migración `invert_profesional_role_permissions` el rol es la base común y la distinción vive solo en los perfiles (ver §3).

## 8. Testing y calidad

- 937 tests unitarios backend (70 suites), todos pasando (`npx jest`, 2026-10-03), incluidos tests de contrato de la matriz de permisos (`permission-defaults.test.ts`) y de capacidades.
- `tsc --noEmit` limpio en backend.
- Frontend: `npx nuxi typecheck` corre, pero reporta **224 errores de tipos previos** (los más antiguos de febrero de 2026; ninguno introducido por el refactor de acceso). `vitest`: 25 tests, todos pasando.
- Exception filter global de errores implementado.

## 9. Roadmap de producto (visión, no implementado aún)

Ver `WORKPLACE_VISION.md` para el detalle completo. Resumen de las piezas más grandes que faltan:

- **AI Agent orquestador**: interpretar necesidades del usuario en lenguaje natural y coordinar automáticamente búsqueda, selección, operación y pago entre comercios/profesionales del ecosistema. Arquitectura propuesta: Nuxt → NestJS → AI Orchestrator (TypeScript, no Python para el MVP) → LLM → herramientas que llaman a la API de NestJS (el agente no escribe directo a la DB).
- **Compra/servicio compuesto**: una necesidad del usuario resuelta por múltiples proveedores a la vez (ej. organizar un evento), sentido como una sola experiencia aunque sean varias órdenes internamente.
- **Presupuesto inteligente + "Mi mes"**: análisis de gasto, predicción de necesidades recurrentes, alertas de exceso de presupuesto, oportunidades de ahorro.
- ~~WorkPlace Score~~: satisfacción + clientes recurrentes implementados 2026-09-23 (ver sección 5.8), sin validar end-to-end todavía. Pendiente real: puntualidad (hoy sigue siendo un proxy de completion, no un dato temporal real — requeriría SLA/hora esperada vs. real en Order/ServiceRequest/Delivery).
- ~~Pago protegido~~: implementado 2026-09-27 para CatalogOrder (ver sección 5.9); sistema de disputas con split de monto implementado 2026-09-28 (ver sección 5.10), ambos validados end-to-end con dinero real. Pendiente real: extender a Group Buying si el negocio lo pide.
- ~~Matching inteligente~~: primera versión implementada 2026-09-22, ver sección 5.7 (precio+distancia+reputación+disponibilidad). Pendiente: historial/tasa de cancelación como señal propia (hoy solo se usa indirectamente vía reputación) y especialidad/preferencias explícitas del usuario.
- **Modelo de negocio objetivo**: combinación de suscripciones (comercios, profesionales, usuarios finales) + tasas por operación, apuntando a ~$500/mes iniciales sin depender solo de SaaS.
- **Diferencial estratégico**: no competir como un vertical más (Uber, iFood, Fiverr, portal de empleo) sino integrar las categorías bajo una sola experiencia de "decime qué necesitás y cuánto podés gastar".
