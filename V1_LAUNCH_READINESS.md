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

> **Auditoría v1 (2026-11-12):** ver `AUDITORIA_V1_FUNCIONAL.md` para lo que falta lanzar.

## 🔄 Estado al 2026-11-02 — cobro tipo Cashea y flujos de v1 (PRs #78, #80, #84 y siguientes)

Lo de esta sección **reemplaza** a los ítems viejos que contradice (marcados más abajo).

- **Pago directo al vendedor** (#78): el cliente paga a las cuentas de cobro del vendedor y
  reporta la referencia; el vendedor confirma. Publicar servicios exige una cuenta de cobro activa.
- **Estado de cuenta semanal** (#80): las comisiones se agrupan y se facturan los lunes, 5 días
  para pagar; vencido bloquea publicar y a las 48 h pausa todo. Panel `/billing` y
  `/billing-admin`. Comisiones que antes no se cobraban: la que paga el cliente, pedidos de
  catálogo con pago directo y compras agrupadas.
- **Billetera solo retiro** (#84): sin recargas ni transferencias. Retiros reales pagados por
  SUPERADMIN. **Reemplaza el ítem 2** (depósitos con comprobante): ese flujo ya no acepta
  solicitudes nuevas; las pendientes solo las aprueba un SUPERADMIN.
- **Pago Protegido por operación** (#84): la garantía se paga a una cuenta de la plataforma por
  solicitud; vence a las 72 h sin pagar. El proveedor marca terminado y la solicitud se cierra
  sola a las 72 h. Disputas en `/disputes-admin`.
- **Notificaciones** (#84): push FCM implementado (se activa con `FIREBASE_*`, ver
  `frontend/docs/PUSH_NOTIFICATIONS.md`) y copia por email de los avisos que piden acción.
  **Reemplaza el ítem 21.**
- **Delivery y corridas** (#84): el repartidor actualiza la entrega con código del cliente;
  conductores de corridas verificados en `/ride-drivers-admin` (**cambia el ítem 15**: tener
  `corridas:manage` ya no basta para aceptar corridas).
- **Términos de servicio**: secciones de pagos, comisiones, Pago Protegido, billetera, delivery
  y corridas. **Pendiente de revisión legal.**

- **Pago Protegido apagado para la v1** (`PROTECTED_PAYMENTS_ENABLED=false` por defecto): la
  plataforma no recibe ni custodia dinero de terceros, porque eso puede requerir autorización de
  SUDEBAN/BCV (ITFB, Resolución 001-21). Sin el interruptor: no se crean garantías nuevas
  (servicios ni catálogo), no se aceptan pagos de garantía y la opción no aparece en la UI; las
  garantías ya existentes se terminan de liquidar. Encenderlo solo con un aliado autorizado que
  custodie la garantía y asesoría legal.
- **IVA en el estado de cuenta**: comisiones + IVA (`PLATFORM_VAT_RATE`, 16 por defecto) = total.
  Falta confirmar con el contador la alícuota, el IGTF según la moneda y la emisión de la factura
  fiscal (imprenta digital autorizada por el SENIAT).

**Decisiones pendientes de producto:** exigir KYC para retirar a todos o permitir retiros
pequeños sin KYC; conciliación bancaria automática (hoy los admins confirman referencias a mano).

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

### 2. Depósitos de wallet con comprobante y aprobación admin — ⚠️ reemplazado (billetera solo retiro, ver arriba)
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

Con esto se da por **cerrada la ronda de auditoría de módulos backend en el alcance de v1**
(FREELANCER/NORMAL/ADMIN/SUPERADMIN). Ver sección "Auditoría de COMMERCE" más abajo para la
ronda que extendió la revisión a los módulos exclusivos de comercio (fuera de v1, pero código
activo en el repo).

---

## 🟡 Importante — pendiente

### 21. Push notifications (FCM) — ✅ implementado; solo falta configurar Firebase (ver arriba)
`NotificationsService.sendPush()` está vacío (falta configurar Firebase). El flujo de
`DeviceToken`/registro sí está completo y expuesto, lo que puede dar la falsa impresión de que
las notificaciones push ya funcionan. Documentado explícitamente para que no se asuma resuelto.

---

## Checklist de verificación antes de dar por lista la v1

- [ ] Prueba manual end-to-end de conversión NORMAL → FREELANCER (ver ítem 1)
- [ ] Prueba manual end-to-end de pago directo: cliente reporta referencia → vendedor confirma
- [ ] Prueba manual del estado de cuenta: comisión de una venta → estado del lunes → pago
      reportado → confirmado por SUPERADMIN; y vencido → bloqueo → pausa a las 48 h
- [ ] Prueba manual de Pago Protegido por operación: fijar precio → pagar garantía → confirmar
      admin → retenida → proveedor marca terminado → cierre (manual y automático a las 72 h)
- [ ] Prueba manual de disputa: abrir desde la solicitud → resolver en `/disputes-admin` (reparto)
- [ ] Prueba manual de retiro: solicitar → pagar con referencia; y rechazar → saldo devuelto
- [ ] Prueba manual de delivery con código de entrega y de envío por corridas con código
- [ ] Conductores actuales de corridas registraron su vehículo y fueron aprobados antes de anunciar
- [ ] Cuentas de cobro de la plataforma cargadas en `/billing-admin` (sin ellas nadie puede pagar
      estados de cuenta ni garantías)
- [ ] `MAIL_*` configurado en producción (avisos por email) y prueba de un aviso real
- [ ] Términos de servicio revisados por un abogado antes de lanzar
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
      el repositorio conserva 56 directorios de migración Prisma (verificado el 2026-10-31);
      no está squasheado a una única migración `..._init`. CI valida la cadena desde una base
      vacía, pero eso no acredita el estado de la base real: ejecutar `npx prisma migrate status`
      contra la base de destino y confirmar que no haya migraciones pendientes ni drift antes de
      desplegar, no asumir que cada ítem de este documento tiene su propia migración con nombre
- [ ] **Seed de producción (`node prisma/seed.js --production`, nunca el seed demo) corrido en producción** para que `FREELANCER`
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
- [ ] Firebase/FCM configurado (`google-services.json` en la APK y `FIREBASE_*` en el backend) y
      prueba de un push con la app cerrada (ítem 21)

---

## Auditoría de COMMERCE (fuera de alcance de v1, código activo en el repo)

`COMMERCE` no se lanza en esta v1, pero el rol y sus módulos (menu, orders internos, employees,
branches, appointments, expenses, cash, receipts, delivery) siguen activos en el código y
accesibles a cualquier usuario con ese rol/permisos — por ejemplo, un ADMIN puede asignarlo
manualmente desde `/users`. El usuario pidió ampliar la auditoría a "toda la app, no solo
freelancer", así que se revisó la lógica interna de estos módulos (los guards de
`AccountTypeGuard` ya se habían verificado en una ronda anterior).

**Resultado: en buen estado.** Ownership (`getCommerceId(userId)` + `assertOwnership`/
`findFirst({..., commerceId})`) verificado correcto y consistente en los 9 módulos — ninguno
permite que un comercio toque recursos de otro. `Employee` es un registro de RRHH sin cuenta de
login propia (no `User`), así que no hay vector de auto-escalada de permisos vía empleados.
Cash (caja/arqueo) es el módulo más sensible y el mejor blindado: apertura protegida contra
doble sesión con índice único parcial a nivel de DB, cierre calculado dentro de una transacción
Prisma, discrepancias siempre registradas en `CashSession.difference` (no hay forma de
"esconder" un descuadre ni endpoints para borrar `CashSession`/`CashMovement`).

Dos hallazgos corregidos:

- **Orders: descuento sin tope permitía total negativo.** `discount` solo validaba `@Min(0)`,
  sin tope máximo — un valor mayor al subtotal producía `Order.total` negativo, que contaminaba
  `Customer.totalSpent` y el cálculo de `expectedAmount` en el arqueo de caja para pagos CASH.
  Corregido: `create` ahora devuelve 400 si `discount > subtotal + tax + deliveryFee`.
- **Appointments: sin validación de solapamiento de mesa.** `create`/`update` no verificaban
  ningún conflicto de horario — se podía doble-reservar la misma mesa a la misma hora sin
  ninguna restricción (ni siquiera era un problema de race condition, faltaba la regla de
  negocio en sí). Corregido: cuando `tableNumber` está presente, rechaza si ya existe otra cita
  `PENDING`/`CONFIRMED`/`SEATED` en la misma mesa dentro de una ventana de ±2h. Sin
  `tableNumber` (uso genérico sin mesas, ej. citas de servicio) no aplica ninguna restricción.
- [x] Implementado — commits `fix(backend): rechazar descuento mayor al total en creación de
  pedidos`, `feat(backend): validar solapamiento de mesa al crear/editar citas`
- 28 tests unitarios nuevos (18 `OrdersService` incluyendo 2 nuevos de discount, 10
  `AppointmentsService` nuevo), **421/421 tests del backend pasan**.

No corregido en esta ronda (documentado para cuando/si COMMERCE se lance):
- `delivery.service.ts` (`createDelivery`) no valida `driver.isActive` al asignar directamente
  en la creación (sí lo hace `assignDriver`) — inconsistencia menor, no bloqueante.
- `cash:manage` es un único permiso para operar caja del día a día Y hacer ajustes manuales —
  decisión de granularidad de permisos a revisar antes de dar ese permiso a roles de cajero, no
  es un bug de código.

### Segunda ronda — domains restantes de toda la app (money/bnpl, exchange-rates, customers,
search, mail, platform/*, segunda pasada de menu/employees)

Auditoría de los domains que nunca se habían revisado con lectura real de código. `exchange-rates`,
`customers`, `search`/`search-tabs`, `mail` (sin exposición HTTP), y `platform/*` (settings,
system-modules, landing, locations, navigation, health) — **todos en buen estado, sin
hallazgos**: guards correctos en escritura, sin datos sensibles en endpoints públicos, sin
riesgo de injection en búsqueda (Prisma parametrizado). `menu` (segunda pasada): validación de
inputs correcta, sin hallazgos.

Dos hallazgos corregidos, ambos de mayor severidad que los anteriores:

- **BNPL: endpoint de "resolución simulada" sin ningún guard, explotable en el estado actual
  del código.** `POST /bnpl/simulate/:externalReference/resolve` no tenía `JwtAuthGuard` ni
  chequeo de entorno — cualquiera sin autenticación podía marcar un pedido BNPL como `PAID`
  adivinando/observando un `externalReference`. Agravante real (no solo teórico): los adapters
  "reales" de Cashea/Krece (`cashea.adapter.ts`, `krece.adapter.ts`) son hoy esqueletos que
  delegan el 100% al `SimulatedAdapter` — la integración real con esos proveedores está
  pendiente (requiere credenciales/specs externas, documentado como TODO explícito en el
  código, igual que el caso de push FCM). Esto significa que en el estado actual, **todo el
  flujo BNPL es simulado**, y el endpoint sin guard era la única pieza faltante para que
  cualquiera pudiera falsificar una aprobación de crédito sin que ningún proveedor real
  interviniera.
  - Corregido: el endpoint rechaza siempre en `APP_ENV=production` (mismo patrón que
    `/auth/demo-credentials`), y el service (`simulateResolve`) solo resuelve referencias con
    prefijo `SIM-` — nunca una transacción que, en el futuro, haya usado un adapter real.
  - **No es un fix de la integración en sí** — no hay integración real que corregir todavía.
    Cuando se implementen los adapters reales de Cashea/Krece, agregar validación de firma
    HMAC/secreto compartido en `handleWebhook` (ya señalado como TODO explícito en el código) es
    obligatorio antes de activarlos, y no debe asumirse resuelto por este fix.
- **Employees: salario y datos personales expuestos en el listado.** `GET /employees` devolvía
  el modelo completo (salario, fecha de nacimiento, dirección, contacto de emergencia, notas) a
  cualquiera con el permiso `employees:view` — no solo al dueño del comercio, ya que ese permiso
  es genérico y asignable a cualquier rol de staff. Corregido con cambio en backend y frontend a
  la vez (el modal de edición usaba el objeto ya cargado del listado, así que restringir el
  backend solo hubiera vaciado esos campos al editar): el listado ahora usa un `select`
  restringido, y el frontend hace `fetch` a `GET /employees/:id` (que sí expone todo, protegido
  por el mismo `employees:view` + ownership) al abrir el modal de edición.
- [x] Implementado — commits `fix(backend): bloquear /bnpl/simulate/:ref/resolve en producción`,
  `fix(backend+frontend): no exponer salario/datos sensibles en listado de empleados`
- 6 tests unitarios nuevos (3 `BnplService`, 2 `BnplWebhookController`, 1 `EmployeesService`
  adicional), **427/427 tests del backend pasan**.
- [ ] **Falta probar manualmente**: confirmar que `/bnpl/simulate/:ref/resolve` devuelve 403 con
  `APP_ENV=production` configurado, y que el modal de edición de empleados sigue mostrando
  salario/dirección correctamente al abrir (no quedaron vacíos por el cambio de fetch).

---

## Auditoría de frontend (middleware de rutas + wallets-admin)

Primera ronda de auditoría dedicada al frontend (Vue/Nuxt), más allá de los ajustes puntuales
hechos junto a cada fix de backend a lo largo de las rondas anteriores. Dos hallazgos:

- **Middleware de rutas: `/cash-register` y `/rides` accesibles sin sesión.** Ninguna de las dos
  estaba en `KNOWN_PROTECTED_ROUTES`/`NEEDS_AUTH_ONLY` de `middleware/auth.ts` — un usuario sin
  sesión que navegara directo a esas rutas no era redirigido a `/login` (la API seguía
  rechazando con 401, así que no había fuga de datos real, pero la página quedaba renderizando
  en blanco en vez de mandar a login). Se eliminó también `AUTH_ROUTES`, una constante que
  listaba ambas rutas pero nunca se usaba en el chequeo real — daba la falsa impresión de que ya
  estaban cubiertas.
- **`/wallets-admin`: ajuste manual de saldo sin confirmación ni motivo obligatorio.** Un solo
  click ejecutaba el crédito/débito directo a la wallet de cualquier usuario, sin paso de
  confirmación, y el campo de motivo era opcional (backend lo reemplazaba por un texto genérico
  si venía vacío) — dificultando auditar después por qué un admin movió dinero manualmente.
  Corregido en ambas capas: backend rechaza con 400 si el motivo viene vacío/solo espacios;
  frontend deshabilita el botón sin motivo y agrega un paso de confirmación mostrando monto,
  tipo y usuario afectado antes de ejecutar.
- [x] Implementado — commits `fix(frontend): agregar /cash-register y /rides a rutas protegidas
  del middleware`, `fix(backend): exigir motivo obligatorio en ajuste manual de saldo`,
  `feat(frontend): confirmación y motivo obligatorio antes de ajustar saldo`
- 5 tests unitarios nuevos (`WalletsService.adjust`), **432/432 tests del backend pasan**.

### Segunda ronda de frontend — paneles admin de moderación/aprobación

Revisión de `wallet-deposit-requests-admin`, `freelancer-applications-admin` y `reports-admin`
(los tres paneles restantes que ejecutan acciones irreversibles sobre cuentas/contenido de
terceros). Los primeros dos ya estaban bien diseñados — rechazo con motivo obligatorio y
confirmación en dos pasos, aprobación de freelancer bloqueada visualmente si el KYC no está
`APPROVED` — sin hallazgos.

- **`reports-admin`: "Ocultar servicio" prometía una reactivación que no existía.** El botón sí
  tenía `confirm()`, pero el texto decía "el proveedor deberá reactivarlo manualmente" — falso:
  `moderateService(hide: true)` pone el `Service` en `INACTIVE`, y el `toggleStatus` que usa el
  propio dueño desde `/my-services` solo alterna `ACTIVE↔PAUSED`, nunca sale de `INACTIVE`. No
  existía ninguna vía en la UI (ni del proveedor ni de otro admin) para revertir la ocultación.
  Corregido: se agregó el botón "Reactivar servicio" en el mismo panel (visible incluso si el
  reporte ya se marcó resuelto/descartado, para no perder la vía de revertir una ocultación por
  error), y se corrigió el texto de confirmación para reflejar el comportamiento real.
- [x] Implementado — commit `fix(frontend): permitir reactivar un servicio oculto por
  moderación`
- **Alcance restante**: esta fue una segunda pasada dirigida a paneles de moderación/dinero. El
  resto del frontend (66 páginas, 82 componentes, 75 composables) sigue sin auditarse
  exhaustivamente — queda como trabajo futuro si se prioriza.
