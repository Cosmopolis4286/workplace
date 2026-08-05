# 🚀 V1 Launch Readiness — FREELANCER / NORMAL (+ ADMIN / SUPERADMIN)

## Alcance de esta v1

Marketplace de servicios con **cuatro roles activos**: `FREELANCER` (proveedor), `NORMAL`
(cliente), `ADMIN` y `SUPERADMIN` (operación de la plataforma). `COMMERCE` queda fuera de
alcance. No hay alta pública de `FREELANCER` — es una decisión de producto explícita, ver
sección 1 abajo. Se lanza en **web (Nuxt 3 SPA) y Android (Capacitor APK)** — ver
[`CAPACITOR_MOBILE_APP.md`](./CAPACITOR_MOBILE_APP.md) para el estado detallado de la app móvil,
no se repite aquí.

Este documento cubre el estado de **negocio/producto/dinero real** para lanzar. Se actualiza a
medida que se cierran ítems — marca cada uno `[x]` cuando esté resuelto y **verificado
manualmente** (no solo implementado y con tests unitarios).

---

## ✅ Bloqueantes resueltos (2026-08-03)

### 1. Conversión NORMAL → FREELANCER
El registro público (`/register`) y el registro con Google se mantienen **sin cambios**, tal
como se decidió: no hay alta pública de FREELANCER. En su lugar:
- Un usuario `NORMAL` solicita convertirse en freelancer desde `/profile` (categoría de
  servicio + subcategoría opcional + mensaje).
- Un `ADMIN`/`SUPERADMIN` revisa la solicitud en `/freelancer-applications-admin` y
  aprueba/rechaza. Al aprobar, el rol cambia a `FREELANCER` y se copian categoría/subcategoría.
- La aprobación **exige KYC aprobado** del solicitante (bloqueado a nivel de backend, no solo
  UI) — ver ítem 3 más abajo, que ya no es un pendiente separado.
- Un `ADMIN` sigue pudiendo asignar el rol directamente desde `/users` sin pasar por este flujo,
  sin cambios ahí.
- [x] Implementado — commits `feat(identity-access): solicitud de conversion NORMAL -> FREELANCER`,
  `fix(identity-access): exigir KYC aprobado antes de aprobar freelancer`
- [ ] **Falta probar manualmente end-to-end**: crear usuario NORMAL → solicitar → admin aprueba
  con KYC pendiente (debe rechazar) → aprobar KYC → aprobar solicitud (debe funcionar) → confirmar
  que el usuario ve `/my-services` y puede publicar.

### 2. Depósitos de wallet con comprobante y aprobación admin
`WalletsService.deposit()` ya **no es accesible públicamente** — se eliminó
`POST /wallets/me/deposit`. El único camino para acreditar saldo real:
- El usuario sube comprobante (imagen) + método de pago + referencia desde `/wallet` → queda
  como `WalletDepositRequest` en `PENDING`.
- Un admin revisa el comprobante en `/wallet-deposit-requests-admin` y aprueba/rechaza. Al
  aprobar, se llama internamente al mismo `WalletsService.deposit()` de siempre (mismos límites
  por rol, mismo registro de `WalletTransaction`).
- [x] Implementado — commit `feat(wallets): depositos con comprobante y aprobacion admin`
- [ ] **Falta probar manualmente end-to-end**: subir comprobante → verificar que el saldo NO se
  acredita hasta la aprobación → admin aprueba → confirmar saldo acreditado y transacción
  visible en `/wallet`.
- **Nota**: esto resuelve el hueco de "acreditación sin verificar", pero sigue siendo un proceso
  *manual* de operaciones (un humano revisa cada comprobante). No hay pasarela de pago
  automática — para volumen alto, evaluar una integración real más adelante.

---

## 🟡 Importantes resueltos (2026-08-03)

### 3. KYC aprobado requerido para aprobar freelancer — ver ítem 1 arriba (ya no es un pendiente separado)

### 4. Panel de administración — reportes y wallets
- `/reports-admin`: bandeja de reportes de usuario (`ReportProblemModal`) con filtro por estado,
  notas internas, marcar en revisión/resuelto/descartado. El backend ya existía
  (`GET/PATCH /reports/admin`), solo faltaba la UI.
- `/wallets-admin`: listado paginado de billeteras + modal de gestión (congelar/descongelar,
  ajuste manual de saldo con motivo). El backend ya existía, solo faltaba la UI.
- [x] Implementado — commit `feat(admin): paneles de reportes de usuario y gestion de billeteras`
- Ver ítem 14 (reconciliación financiera de escrow) para lo que sigue pendiente de este panel.

### 5. Cobertura de tests del código de dinero
`wallets.service.ts`, `wallet-deposit-requests.service.ts` y `freelancer-applications.service.ts`
no tenían ningún test. Se agregaron 23 tests nuevos cubriendo escrow (incluida la regresión que
se corrigió en esta misma ronda — `holdEscrow` distinguiendo saldo insuficiente de otros errores),
aprobación/rechazo de depósitos, y el requisito de KYC para freelancer.
- [x] Implementado — commit `test(money): cobertura de escrow, depositos y solicitudes de freelancer`

---

## ✅ Bloqueantes e importantes resueltos (2026-08-04) — segunda ronda de auditoría

Auditoría más amplia sobre el resto del backend (commerce-core, engagement, money restante,
identity-access/operations/platform), no solo lo ya cubierto el día anterior.

### 7. `POST /plans/self-subscribe` activaba planes pagos sin verificación
Mismo patrón que el bug de `deposit()` ya corregido: un `FREELANCER`/`COMMERCE` podía cambiar de
plan gratuito a uno pago (Pro, Enterprise) con un solo POST, sin pasar por ningún pago ni
aprobación — quedaba `ACTIVE` de inmediato. Ahora un plan gratuito se activa igual de inmediato,
pero un plan pago **siempre** queda `PENDING`, reutilizando el mismo flujo de aprobación admin que
ya existía para el upgrade NORMAL→FREELANCER (`approveSubscription`).
- [x] Implementado — commit `fix(plans): self-subscribe no debe activar planes pagos sin aprobacion`

### 8. Webhook de Telegram público sin autenticación
`POST /telegram/webhook` no validaba ningún secret — cualquiera en internet podía llamarlo sin
restricción. Ahora exige el header `X-Telegram-Bot-Api-Secret-Token` (fail-closed: sin
`TELEGRAM_WEBHOOK_SECRET` configurado, rechaza todo) más rate limit.
- [x] Implementado — commit `fix(security): verificar secret token en webhook de Telegram`

### 9. Fallback inseguro `commerceId ?? userId` sin defensa en profundidad
Patrón repetido en 12 servicios (`orders`, `receipts`, `expenses`, `delivery`, `customers`,
`appointments`, `cash`, `branches`, `employees`, `bnpl`...): si el usuario no tiene `Commerce`
propio, el `commerceId` resuelto caía a su propio `userId`. Hoy no explotable (el sistema de
permisos ya no otorga esos permisos a FREELANCER/NORMAL) pero frágil — bastaba un permiso mal
asignado por un admin. Se agregó `AccountTypeGuard` + `@RequireAccountType('COMMERCE')` a los 10
controllers HTTP correspondientes como defensa en profundidad real, sin tocar las rutas `mine`
que sí usan NORMAL/FREELANCER (`orders/mine`, `orders/stats/mine`).
- [x] Implementado

### 10. UI admin de categorías/modalidades de servicio
El backend ya tenía el CRUD completo (`/services/categories`, `/services/modalities`) protegido
correctamente, pero ninguna pantalla lo consumía. Nueva página `/service-categories-admin`.
- [x] Implementado — commit `feat(frontend): admin de categorías de servicio...`

### 11. Sin moderación admin de `Service` ni forma de reportarlo directamente
Un admin no podía ocultar el anuncio de un `Service` ajeno (solo el dueño podía, vía
`assertOwner`), y un cliente solo podía reportar un servicio después de contratarlo
(`SERVICE_REQUEST`), no el anuncio del catálogo en sí. Se agregó `PATCH /services/:id/moderate`
(SUPERADMIN/ADMIN, pone el servicio en `INACTIVE` — el dueño no puede reactivarlo con su propio
toggle, que solo alterna ACTIVE↔PAUSED) y `ReportEntityType.SERVICE` como motivo reportable desde
el catálogo público, con acción "Ocultar servicio" integrada en `/reports-admin`.
- [x] Implementado — commits `feat(backend): moderación de servicios para admin...`,
  `feat(frontend): acción de moderación de servicios en panel de reportes`

### 12. Reportes de reseña duplicados sin límite
`ReviewReport` no tenía restricción de unicidad — un usuario podía reportar la misma reseña N
veces, cada intento notificando a todos los moderadores. Se agregó
`@@unique([reviewId, reporterId])` + verificación explícita con 409 claro.
- [x] Implementado — commit `fix(reviews): evitar reportes duplicados de la misma reseña`

**341/341 tests del backend pasan** tras toda la ronda.

---

## ✅ No bloqueantes resueltos (2026-08-04) — tercera ronda

### 13. Chat interno mínimo por ServiceRequest
Se agregó un chat 1:1 scoped a cada `ServiceRequest` (`ServiceRequestMessage`): mensajes de
texto simples entre cliente y proveedor, con notificación in-app al recibir uno nuevo
(reutilizando `NotificationsGateway`, sin WebSocket dedicado — el modal hace polling cada 10s
mientras está abierto). Reemplaza el "contacto por teléfono" como canal principal, aunque
`clientPhone` se mantiene visible para el proveedor por si lo prefiere.
- Backend: `GET/POST /services/requests/:id/messages`, `PATCH .../messages/read`,
  `GET .../messages/unread-count` — solo accesible a `providerId`/`requesterId` de la solicitud.
- Frontend: sección de mensajes en `ServiceRequestDetailModal.vue` + composable
  `useServiceRequestMessages.ts`.
- [x] Implementado — commits `feat(backend): módulo de mensajería en solicitudes de servicio`,
  `feat(frontend): UI de chat 1:1 en el detalle de ServiceRequest`
- 10 tests unitarios nuevos (`ServiceRequestMessagesService`), **368/368 tests del backend pasan**.
- [ ] **Falta probar manualmente end-to-end**: dos usuarios reales (cliente/proveedor) enviando
  mensajes, confirmar notificación in-app y que `unread-count` baja al abrir el modal.

### 14. Endpoint de reconciliación financiera de escrow
Nuevo `GET /wallets/escrow-reconciliation` (solo ADMIN/SUPERADMIN): compara el saldo real de la
wallet del usuario-sistema de escrow contra la suma esperada de `ServiceRequest.escrowAmount` en
estado `HELD`, más el total y conteo de solicitudes en `PENDING_FUNDS`. Tarjeta visual en
`/wallets-admin` (verde si cuadra, roja si hay discrepancia).
- [x] Implementado — commit `feat(backend+frontend): reconciliación de escrow para admin`
- 3 tests unitarios nuevos en `wallets.service.test.ts`.
- [ ] **Falta probar manualmente en producción** con datos reales tras el primer ciclo de
  escrow completo, para confirmar que `isBalanced` da `true` en operación normal.

### 15. Rides (corridas/fletes) inalcanzable para FREELANCER
La UI de conductor ya existía en el frontend (`rides.vue`, `useRides.ts`), pero nadie podía
llegar a ella en v1: el permiso `corridas:manage` solo estaba en el seed para `COMMERCE`
(fuera de alcance). Se decidió habilitarlo para `FREELANCER` como un servicio más que puede
ofrecer (mismo modelo de comisión post-viaje que ya tenía Rides, sin escrow todavía — análogo
al estado de ServiceRequest antes de agregar escrow).
- `corridas:manage` agregado a `ROLE_DEFAULTS.FREELANCER` en `seed.js` — **seed corrido en la
  base de datos real**, verificado con `role_permissions` (`FREELANCER: corridas:manage = t`).
- `KycApprovedGuard` agregado a `POST /rides/:id/accept` (aceptar corridas como conductor) —
  mismo criterio que otros flujos donde ganar dinero exige KYC aprobado.
- `@RateLimit` agregado a `create`/`accept`/`updateStatus`/`cancel` (antes sin límite, a
  diferencia del resto de módulos de dinero).
- Notificaciones in-app nuevas: `notifyRideAccepted` (pasajero, cuando un conductor acepta) y
  `notifyRideStatusChanged` (pasajero, en IN_PROGRESS/COMPLETED) — antes Rides no notificaba nada.
- [x] Implementado — commits `feat(backend): notificaciones en tiempo real para corridas...`,
  `chore(backend): agregar corridas:manage al rol freelancer en seed`,
  `test(backend): tests unitarios para... RidesService`
- 17 tests unitarios nuevos (`RidesService`), **385/385 tests del backend pasan**.
- **No incluido en esta ronda** (decisión explícita, fuera de alcance): escrow para Rides (el
  pago pasajero→conductor sigue sin pasar por la plataforma, solo la comisión). Documentado
  para una ronda futura si se prioriza.
- **Sí resuelto en un segundo paso**: el teléfono del pasajero ya no se expone en
  `GET /rides/available` (conductores viendo el pool de corridas antes de aceptar) — solo se
  revela tras `accept()`, cuando existe una relación real conductor↔pasajero. Antes cualquier
  usuario con `corridas:manage` veía el teléfono de todos los pasajeros con corridas PENDING,
  sin haber aceptado nada.
- [ ] **Falta probar manualmente end-to-end**: un FREELANCER real solicitando `corridas:manage`
  (vía admin o re-login para refrescar permisos en sesión), aceptando una corrida, avanzando
  estados, y confirmando que el pasajero recibe las notificaciones.

### 16. Jobs (empleos) sin límites, notificaciones ni defensa en profundidad
Auditoría dedicada al módulo de empleos, mismo tipo de huecos que tenía Rides antes de esta
ronda:
- **Sin límite de plan**: cualquiera podía publicar empleos ilimitados en el plan gratuito, a
  diferencia de Services (3 activos). Nuevo campo `Plan.maxJobs` (-1 = ilimitado, 3 en el tier
  gratuito) + `assertJobLimit()` en `PlanLimitsService`, aplicado en `createJob`.
- **Aplicaciones a empleos completamente silenciosas**: el empleador no se enteraba de una
  nueva aplicación salvo que revisara `/jobs` manualmente, y el aplicante no se enteraba de un
  cambio de estado. Nuevas notificaciones in-app: `notifyNewJobApplication` (al empleador) y
  `notifyJobApplicationStatusChanged` (al aplicante, solo en ACCEPTED/REJECTED — no en
  transiciones intermedias como SEEN/IN_PROGRESS).
- **Aplicaciones duplicadas devolvían 500 genérico**: el modelo ya tenía
  `@@unique([jobId, applicantId])` a nivel de base de datos, pero el service no capturaba el
  error `P2002` de Prisma. Ahora devuelve `409 ConflictException` con mensaje claro ("Ya
  aplicaste a este empleo").
- **Sin `PermissionsGuard`/`RateLimit` en endpoints de aplicaciones**: `createApplication`,
  `getMyApplications`, `getJobApplications`, `updateApplicationStatus` solo tenían
  `JwtAuthGuard`, dependiendo únicamente de checks de ownership en el service. Se agregó
  `PermissionsGuard` (`jobs:view`/`jobs:edit`, ya otorgados a todos los roles activos — defensa
  en profundidad, no restringe a nadie hoy) y `@RateLimit` en `createJob`/`createApplication`.
  También se agregó `KycApprovedGuard` a `createApplication` (aplicar expone tu identidad real
  al empleador, mismo criterio que otros flujos de "ganar visibilidad").
- [x] Implementado — commit `feat(backend): límite de empleos activos por plan + notificaciones
  de aplicaciones a empleos`
- 12 tests unitarios nuevos (`JobsService`), **399/399 tests del backend pasan**.
- [ ] **Falta probar manualmente end-to-end**: publicar 4 empleos con plan gratuito (el 4to debe
  fallar con 403), aplicar dos veces al mismo empleo (debe fallar con 409 claro), y confirmar
  que ambas notificaciones (nueva aplicación / cambio de estado) llegan correctamente.

### 18. Auditoría de identity-access (auth/users/kyc/permissions/profiles) + analytics/audit
Ronda dedicada a los módulos de seguridad/identidad restantes. **Resultado: los 7 dominios
auditados están en buen estado** — jerarquía de roles (`role-hierarchy.util.ts`) aplicada
consistentemente en `users`/`permissions`/`kyc` sin vector de auto-escalada a ADMIN/SUPERADMIN,
2FA con rate limit efectivo, perfiles públicos sin fuga de email/teléfono, analytics filtrado
correctamente por `userId` del JWT (nunca de query/body), y `AuditInterceptor` capturando
automáticamente todas las escrituras sensibles. Un solo hallazgo real, ya corregido:
- **`GET /auth/demo-credentials` exponía la contraseña del SUPERADMIN demo sin autenticación**
  si `USE_DEMO=true` quedaba activo en un entorno con `APP_ENV` distinto de `development` — y
  el `.env` local de este repo tenía exactamente esa combinación peligrosa
  (`APP_ENV=production` + `USE_DEMO=true`) al momento de la auditoría. Corregido: el endpoint
  ahora rechaza siempre que `APP_ENV=production`, sin importar `USE_DEMO` — una sola variable
  mal configurada ya no puede exponer la credencial.
- [x] Implementado — commit `fix(backend): bloquear /demo-credentials en APP_ENV=production sin
  importar USE_DEMO`
- 4 tests unitarios nuevos (`AuthController.getDemoCredentials`), **403/403 tests del backend
  pasan**.
- [ ] **Acción manual requerida, no solo código**: confirmar que el `.env` real de producción
  tenga `USE_DEMO=false` (o ausente) antes de desplegar — el fix de código es una segunda capa
  de defensa, no reemplaza configurar la variable correctamente.

### 20. Catalog: pedido creado con datos no verificados contra la base real
Auditoría de `catalog` (pedidos tipo cotización sobre productos, sin pago real conectado —
mismo modelo "solo comisión eventual" que ServiceRequest antes del escrow) y
`categories-global`/`proposed-categories` (estas dos últimas: **en buen estado, sin
hallazgos**, guards de ADMIN/SUPERADMIN correctos y rate limit ya presente en propuestas).

En `catalog.service.ts` (`createOrder`), el pedido se creaba con `productName`, `commerceName`
y `totalEstimate` tal como los enviaba el cliente en el body, sin verificar contra el `Product`
real — un request directo (no desde la UI) podía notificar a un comercio arbitrario con un
nombre de producto y monto falsos, o declarar un `commerceId` que no correspondía al dueño real
del `productId`. El frontend (`CatalogOrderModal.vue`) siempre mandó los valores correctos
calculados desde el producto real, así que esto no afectaba el uso normal de la app — el hueco
era solo explotable manipulando el request directamente.
- Corregido: `createOrder` ahora busca el `Product` real, valida que esté disponible
  (`forSale && status === AVAILABLE`) y que pertenezca al `commerceId` del body, y deriva
  `productName`/`commerceName`/`totalEstimate` (`price * quantity`) del registro real en vez de
  confiar en el cliente.
- [x] Implementado — commit `fix(backend): validar producto/comercio real al crear pedido de
  catálogo`
- 6 tests unitarios nuevos (`CatalogService.createOrder`), **409/409 tests del backend pasan**.
- **No incluido en esta ronda** (decisión explícita del usuario, alcance acotado): PII
  (`address`/`phone` exactos del comercio) expuesta sin auth en el detalle público de producto
  (`getProduct`), y falta de validación de máquina de estados en `updateOrderStatus` (un
  comercio puede saltar `PENDING`→`CLOSED` sin pasar por `CONTACTED`). Ambos documentados aquí
  para una ronda futura si se prioriza — ninguno es bloqueante para v1.

Con esto se da por **cerrada la ronda de auditoría de módulos backend** para v1. Los módulos
restantes sin auditar (`menu`, `settings`, `system-modules`, `health`, `mail`) son exclusivos de
COMMERCE (fuera de alcance) o de bajo riesgo estructural (health checks, envío de correo) — no
se considera necesario auditarlos antes de lanzar.

---

## 🟡 Importante — pendiente

### 21. Push notifications (FCM) es un no-op — feature incompleta, no un bug
`NotificationsService.sendPush()` está vacío (falta configurar Firebase). El flujo de
`DeviceToken`/registro sí está completo y expuesto, lo que puede dar la falsa impresión de que
las notificaciones push ya funcionan. Documentado explícitamente para que no se asuma resuelto.

---

## Checklist de verificación antes de dar por lista la v1

- [ ] Prueba manual end-to-end de conversión NORMAL → FREELANCER (ver ítem 1)
- [ ] Prueba manual end-to-end de depósito con comprobante (ver ítem 2)
- [ ] Prueba manual end-to-end de cambio a plan pago vía self-subscribe (ver ítem 7): debe quedar
      PENDING, no ACTIVE
- [ ] Prueba manual del ciclo completo de escrow con dos usuarios reales (cliente con saldo,
      proveedor con `hasEscrow: true`): crear solicitud → fijar precio → retención → confirmar
      finalización → liberación neta de comisión; y un segundo caso con cancelación → reembolso
- [ ] Prueba manual del límite de plan gratuito: 4to servicio activo debe devolver 403 con
      mensaje claro
- [ ] `TELEGRAM_WEBHOOK_SECRET` configurado en producción antes de registrar el webhook con
      Telegram (`setWebhook` con `secret_token`) — ver ítem 8
- [ ] `NUXT_PUBLIC_API_URL` de producción confirmado apuntando a la URL pública real (no
      `localhost`) en el pipeline de build del APK — ver `CAPACITOR_MOBILE_APP.md`
- [ ] Todas las migraciones de Prisma aplicadas en la base de datos de producción — **nota**: el
      historial de migraciones fue squasheado a un único `..._init` en esta sesión (otra rama de
      trabajo en el mismo repo), así que no queda un migration file por feature; verificar con
      `npx prisma migrate status` que la base de datos de destino no tenga drift antes de
      desplegar, no asumir que cada ítem de este documento tiene su propia migración con nombre
- [ ] **Seed de permisos (`node prisma/seed.js`) corrido en producción** para que `FREELANCER`
      tenga `corridas:manage` — sin esto, la corrección del ítem 15 no tiene efecto real
- [ ] Prueba manual end-to-end del chat interno por ServiceRequest (ver ítem 13)
- [ ] Prueba manual del endpoint de reconciliación de escrow con datos reales (ver ítem 14)
- [ ] Prueba manual end-to-end de Rides como FREELANCER/conductor (ver ítem 15)
- [ ] Prueba manual end-to-end de límites y notificaciones de Jobs (ver ítem 16)
- [ ] **`USE_DEMO=false` (o ausente) en el `.env` real de producción** — el `.env` local de este
      repo tenía `APP_ENV=production` + `USE_DEMO=true` al mismo tiempo, la combinación exacta
      que exponía credenciales demo sin autenticar antes del fix del ítem 18. El código ya no
      confía solo en esta variable, pero sigue siendo mala práctica dejarla en `true` en prod
- [ ] Prueba manual de crear un pedido de catálogo con datos manipulados (ej. vía curl con
      `commerceId` de otro comercio) — debe devolver 400, no crear el pedido (ver ítem 20)
- [ ] Firebase/FCM configurado si se quiere push real antes de lanzar (ítem 21, pendiente —
      requiere credenciales externas, no accionable por código)
