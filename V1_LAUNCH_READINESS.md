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

## 🟡 Importante — pendiente

### 13. No existe chat/mensajería interna
Todo el contacto cliente-proveedor se resuelve exponiendo `clientPhone` en el modal de solicitud
— contacto fuera de plataforma. No bloqueante, pero sin esto no hay registro de la conversación
ni forma de mediar disputas. No se abordó (cambio de alcance grande).

### 14. Endpoint de reconciliación financiera de escrow
Sin esto, un admin no puede auditar que el saldo de la wallet del usuario-sistema de escrow
coincide con lo efectivamente debido a proveedores en solicitudes `HELD`. No urgente para
lanzar, conviene antes de operar con volumen.

### 15. Push notifications (FCM) es un no-op — feature incompleta, no un bug
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
- [ ] Todas las migraciones de Prisma de ambas rondas aplicadas en la base de datos de producción
- [ ] Endpoint de reconciliación financiera de escrow (ítem 14, pendiente — no bloqueante)
- [ ] Chat/mensajería interna (ítem 13, pendiente — no bloqueante, cambio de alcance mayor)
- [ ] Firebase/FCM configurado si se quiere push real antes de lanzar (ítem 15)
