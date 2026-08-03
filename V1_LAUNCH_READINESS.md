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
- [ ] **Sigue pendiente**: endpoint de reconciliación financiera (saldo total en la wallet del
  usuario-sistema de escrow vs. lo debido a proveedores). No es urgente para el lanzamiento en sí,
  pero conviene tenerlo antes de operar con volumen — sin esto, un admin no puede auditar que la
  plataforma no está "perdiendo" dinero en escrow retenido.

### 5. Cobertura de tests del código de dinero
`wallets.service.ts`, `wallet-deposit-requests.service.ts` y `freelancer-applications.service.ts`
no tenían ningún test. Se agregaron 23 tests nuevos cubriendo escrow (incluida la regresión que
se corrigió en esta misma ronda — `holdEscrow` distinguiendo saldo insuficiente de otros errores),
aprobación/rechazo de depósitos, y el requisito de KYC para freelancer.
- [x] Implementado — commit `test(money): cobertura de escrow, depositos y solicitudes de freelancer`
- 337/337 tests del backend pasan.

---

## 🟡 Importante — pendiente

### 6. No existe chat/mensajería interna
Todo el contacto cliente-proveedor se resuelve exponiendo `clientPhone` en el modal de solicitud
— contacto fuera de plataforma. No bloqueante, pero sin esto no hay registro de la conversación
ni forma de mediar disputas. No se abordó en esta ronda (cambio de alcance grande).

---

## Checklist de verificación antes de dar por lista la v1

- [ ] Prueba manual end-to-end de conversión NORMAL → FREELANCER (ver ítem 1)
- [ ] Prueba manual end-to-end de depósito con comprobante (ver ítem 2)
- [ ] Prueba manual del ciclo completo de escrow con dos usuarios reales (cliente con saldo,
      proveedor con `hasEscrow: true`): crear solicitud → fijar precio → retención → confirmar
      finalización → liberación neta de comisión; y un segundo caso con cancelación → reembolso
- [ ] Prueba manual del límite de plan gratuito: 4to servicio activo debe devolver 403 con
      mensaje claro
- [ ] `NUXT_PUBLIC_API_URL` de producción confirmado apuntando a la URL pública real (no
      `localhost`) en el pipeline de build del APK — ver `CAPACITOR_MOBILE_APP.md`
- [ ] Migraciones de Prisma de esta ronda aplicadas en la base de datos de producción
      (`add_freelancer_applications`, `add_wallet_deposit_requests`, además de las de
      `add_service_plan_limits`/`add_service_escrow` de la ronda anterior)
- [ ] Endpoint de reconciliación financiera de escrow (ítem 4, pendiente — no bloqueante)
- [ ] Chat/mensajería interna (ítem 6, pendiente — no bloqueante, cambio de alcance mayor)
