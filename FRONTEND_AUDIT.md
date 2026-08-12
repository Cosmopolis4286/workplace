# 🔍 Auditoría de Frontend — Changelog

## Contexto

Auditoría dedicada al frontend (Nuxt 3 SPA, `ssr:false`) tras cerrar la ronda de auditoría de
backend documentada en [`V1_LAUNCH_READINESS.md`](./V1_LAUNCH_READINESS.md). Se cubrieron 66
páginas, 82 componentes y 75 composables mediante 4 agentes de exploración en paralelo (auth/perfil,
wallet/planes/BNPL/service-requests, módulos operativos COMMERCE, admin/permisos/catálogos), más el
trabajo previo ya hecho sobre `middleware/auth.ts`, `wallets-admin.vue`, `wallet-deposit-requests-admin.vue`,
`freelancer-applications-admin.vue` y `reports-admin.vue` (ver `V1_LAUNCH_READINESS.md`).

Este documento se actualiza a medida que se corrige cada hallazgo — marca `[x]` cuando esté
implementado y verificado.

**Convención de severidad:**
- 🔴 **Seguridad** — control de acceso ausente o incompleto (verificar si el backend ya lo cubre).
- 🟠 **Bug funcional** — algo se muestra o calcula mal, visible para el usuario.
- 🟡 **UX rota** — falta confirmación/loading/feedback de error en una acción irreversible o de dinero.
- 🟢 **Mejora/duplicación** — código repetido, inconsistencias menores, sin impacto funcional directo.

---

## 🔴 Seguridad (verificado backend vs. frontend)

### 1. `/permissions/users` sin control de jerarquía de roles en el frontend
Un ADMIN puede abrir `UserPermissionsModal` para cualquier usuario, incluido otro ADMIN o el propio
SUPERADMIN, y ejecutar `grant`/`deny` de permisos individuales sin ningún chequeo de jerarquía en el
cliente (a diferencia de `users.vue`, que sí tiene `canManage()`).

**Verificado en el backend**: `PermissionsService.validateUserAccess()` (usado en `updateUserPermission`,
`removeUserPermission` y las rutas de lectura de permisos de usuario) ya bloquea esto con 403 — un
ADMIN no puede tocar permisos de otro ADMIN/SUPERADMIN, y un SUPERADMIN no puede tocar los de otro
SUPERADMIN. **No es una vulnerabilidad explotable de punta a punta.**

- [ ] Replicar `canManage()` (o extraerlo a un composable `useRoleHierarchy()` compartido con
      `users.vue`) en `permissions/users.vue` y `UserPermissionsModal.vue`, para ocultar la opción en
      vez de dejar que el usuario la intente y reciba un 403 confuso.

---

## 🟠 Bugs funcionales (prioridad alta)

- [x] **`components/ProductCard.vue` / `pages/menu.vue`** — mismatch de valores de `status`.
      `ProductCard.vue` comparaba contra `'disponible'`/`'agotado'`/`'bajo-stock'`/`'no-disponible'`
      (español, minúsculas), pero `useMenu.ts` usa `ProductStatus = 'AVAILABLE' | 'OUT_OF_STOCK' |
      'LOW_STOCK' | 'UNAVAILABLE'`. El badge de estado y el botón "Activar/Desactivar" de cada
      producto en `/menu` mostraban siempre el estado por defecto — nunca el real. Corregido:
      `ProductCard.vue` ahora compara contra los valores reales del enum. Verificado que
      `ProductCard.vue` solo lo consume `menu.vue` (no hay otros consumidores que dependieran de los
      valores en español).
- [x] **`pages/my-plan.vue`** — "Uso del plan" mostraba `used: 0` hardcodeado para
      productos/empleados/sucursales/pedidos en vez de consumir `/plans/usage`, que ya existía en
      `usePlans.ts` (`fetchUsage()`/`PlanUsage`) pero nunca se llamaba desde esta página. Corregido:
      ahora llama `fetchUsage()` en `onMounted` y usa los conteos reales. El backend retorna
      `usage: null` para cuentas sin `Commerce` (FREELANCER, donde productos/empleados/sucursales no
      aplican conceptualmente) — la sección completa se oculta en ese caso en vez de mostrar ceros
      falsos. Se corrigió también el tipo `PlanUsage.usage` en el composable para reflejar `| null`.
- [x] **`composables/usePlans.ts` vs `pages/pricing.vue`** — inconsistencia de moneda. `usePlans.ts`
      formateaba precios en **MXN**, `pricing.vue` ya usaba **USD** (moneda real de todo el sistema:
      wallets, escrow, planes). Corregido: `usePlans.ts.formatPrice` ahora usa `currency: 'USD'`,
      igual que `pricing.vue`. Nota: sigue habiendo 3 locales distintos en el proyecto (`es-MX`,
      `es-CO`, `es-ES`) para formatear USD — no se tocó, es una mejora de consistencia visual
      separada (ver sección de mejoras).
- [x] **`pages/sales.vue`** — si `createOrder` tenía éxito pero `initiateBnpl` fallaba, el modal se
      cerraba igual sin avisar que el pedido se creó pero el link de financiamiento no se generó (el
      composable sí seteaba `error.value`, y `sales.vue` sí tiene un banner de error, pero el mensaje
      genérico perdía sentido una vez cerrado el modal de "Nueva Venta"). Corregido: el mensaje ahora
      deja explícito que el pedido se creó y solo falló el link BNPL.
- [x] **`pages/auth/2fa-verify.vue`** — `onCodeInput` dispara `handleVerify()` sin guard de
      reentrada. Pegar un código de 6 dígitos y editar rápido podía disparar una segunda verificación
      en paralelo con el mismo OTP de un solo uso. Corregido: `handleVerify` ahora también retorna
      temprano si `isLoading.value` ya es `true`.

---

## 🟡 UX rota — acciones de dinero/irreversibles sin confirmación, loading o feedback de error

### Dinero
- [x] **`pages/wallet.vue`** — retiro y transferencia se ejecutaban directo al enviar el formulario,
      sin paso de confirmación con resumen. Corregido: ambos ahora muestran un paso de confirmación
      (monto, y en transferencia también el ID del destinatario) antes de ejecutar, con guard de
      reentrada (`loading.value`) agregado a `handleWithdraw`/`handleTransfer`. También se eliminó el
      bloque "Administración" que solo listaba rutas de API como texto estático sin funcionalidad
      real (el panel admin real ya existe en `/wallets-admin`, corregido en una ronda anterior).
      **No resuelto** (requiere backend nuevo, fuera de alcance de un fix de UX): la transferencia
      sigue pidiendo un UUID tecleado a mano sin resolver/mostrar el nombre del destinatario — no
      existe ningún endpoint de "buscar usuario por ID" accesible desde este composable. Si se
      prioriza, requiere un endpoint nuevo tipo `GET /users/:id/public` (nombre + avatar, sin PII).
- [x] **`components/modals/ServiceRequestDetailModal.vue`** — `confirmCompletion` (libera el escrow
      al proveedor) y `doStatusChange` no tenían guard de reentrada. Corregido con un early-return de
      una línea en cada función. **Aplicado en el working tree, sin commitear todavía**: este archivo
      tiene ~280 líneas de trabajo en curso sin commitear de otra sesión en paralelo (feature de
      propuestas de cambio de precio, que además depende de un modelo Prisma aún no migrado —
      `serviceRequestPriceChangeProposal` no existe todavía en el cliente generado, el backend no
      compila en este momento). Commitear el modal solo, sin el composable/DTOs nuevos que también
      están sin trackear, dejaría el repo en un estado roto — se espera a que esa sesión estabilice
      su feature para que ambos cambios viajen juntos.
      **No resuelto**: "Rechazar solicitud" (`doStatusChange('REJECTED')`) sigue sin confirmación —
      separarlo del `v-for` genérico de `nextActions` requiere un cambio más grande en la misma zona
      del template donde la otra sesión está trabajando activamente.
- [ ] **`pages/expenses.vue`** — `markPaid` (marca un gasto como pagado, afecta reportes financieros)
      sin confirmación ni loading, a diferencia de "Eliminar gasto" que sí las tiene.
- [ ] **`pages/commissions.vue`** — eliminar un override de comisión (afecta cuánto se cobra a un
      usuario/plan) es la única acción destructiva del archivo sin ningún tipo de confirmación.
- [ ] **`pages/cash-register.vue`** — cierre de caja (acción de fin de turno, irreversible) sin paso
      de confirmación adicional más allá de rellenar el formulario.

### Moderación / aprobación
- [ ] **`pages/kyc-admin.vue`** — aprobar/rechazar verificación de identidad sin confirmación ni
      `catch` (errores de red no se muestran al usuario).
- [ ] **`pages/proposed-categories-admin.vue`** — mismo patrón: aprobar/rechazar sin confirmación ni
      manejo de error visible.
- [ ] **`pages/landing-admin.vue`** — **ningún** handler del archivo (`saveStats`, `moderate`,
      `moderateUserReport`, CRUD de testimonios/features/pasos) tiene manejo de error visible al
      usuario; es el único panel admin de todo el audit sin ese mecanismo. Además usa `confirm()`
      nativo (inconsistente) y ningún botón de eliminar tiene loading state.
- [ ] **`pages/service-categories-admin.vue`** — eliminar categoría/modalidad y toggle de modalidad
      sin `try/catch` ni loading state.

### Otros
- [ ] **`pages/onboarding.vue`** — claves de `localStorage` (`onboarding_step`, `onboarding_completed`,
      etc.) sin namespace por usuario/sesión. En un dispositivo compartido, si el Usuario A completa
      el onboarding y luego el Usuario B inicia sesión sin haber completado el suyo, el wizard se
      salta para B porque `onboarding_completed` sigue en `'true'` de la sesión anterior. `logout()`
      en `useAuth.ts` no limpia estas claves.
- [ ] **`pages/p/[username].vue`** — múltiples operaciones (`handleFollow`, `handleToggleLike`,
      `handleDeleteComment`, `confirmDeletePost`, `onCoverFileSelected`) sin `catch` ni feedback de
      error visible; `confirmDeletePost` además cierra el modal *antes* de confirmar que el borrado
      tuvo éxito.
- [ ] **`composables/auth/useDemoCredentials.ts`** — `console.log` con el nombre del contenedor
      Docker interno y el comando exacto de seed (`docker exec backend-hybrid ...`), sin gate de
      `process.dev` — se ejecuta en cualquier entorno donde el endpoint responda "Demo users not
      found", exponiendo detalles de infraestructura en la consola del navegador de cualquier usuario.

---

## 🟢 Mejoras y duplicación de código

- [ ] **`formatPrice`/`formatLimit`** duplicados con lógica divergente en `usePlans.ts` (MXN, `0` →
      "No incluido") y `pricing.vue` (USD, no distingue `0`).
- [ ] **`timeAgo`** duplicado carácter por carácter en `service-requests.vue` y
      `ServiceRequestDetailModal.vue` — candidato a `~/utils/timeAgo.ts`.
- [ ] **`formatPrice`** local en `service-requests.vue`/`ServiceRequestDetailModal.vue` usa locale
      `es-CO` (Colombia) en vez de `es-VE`, pese a ser un marketplace venezolano.
- [ ] Patrón `e?.data?.message` (forma de error tipo Axios/`$fetch` antiguo) repetido en ~18 archivos
      — `ApiError` (definido en `useApi.ts`) no tiene propiedad `.data`, el mensaje ya viene en
      `.message`. No rompe nada (cae al fallback `e.message`), pero es código muerto/confuso.
- [ ] Modal de confirmación de borrado reutilizado como HTML casi idéntico en 6+ archivos
      (`exchange-rates.vue`, `locations.vue`, `search-tabs.vue`, `categories.vue` — este último ya
      tiene el patrón bien encapsulado localmente vía `deleteModal`, buen candidato a promover a
      componente global `<ConfirmDeleteModal>`).
- [ ] Toast/notificación reimplementado de forma ligeramente distinta en `categories.vue`,
      `exchange-rates.vue`, `search-tabs.vue`, `commissions.vue` — `search-tabs.vue` específicamente
      no limpia el timer anterior (bug menor: un toast puede ocultarse antes de tiempo si se disparan
      dos seguidos).
- [ ] `menu.vue` e `inventory.vue` duplican CRUD de categorías/productos contra dos composables
      paralelos (`useMenu` vs `useInventory`) sobre el mismo dominio de datos — el bug de status
      (arriba) es consecuencia directa de esta duplicación.
- [ ] Falta `AbortController` en búsquedas con debounce (`expenses.vue`, `sales.vue`,
      `analytics.vue`) — una respuesta lenta de un filtro antiguo puede sobrescribir resultados de
      uno más reciente.
- [ ] Timers no limpiados en `onUnmounted`: `usernameDebounce` y `successTimer` en `profile.vue`.
- [ ] Botones de cambio de estado por fila sin `disabled` durante el request en múltiples páginas
      (`orders.vue`, `appointments.vue`, `branches.vue`, `customers.vue`, `delivery.vue`,
      `employees.vue`) — permite doble-submit por doble-click, bajo impacto si el backend es
      idempotente pero no hay garantía visible desde el frontend.
- [ ] `useBnplSettings.ts` — `error`/`successMsg` son singletons compartidos entre proveedores
      (CASHEA/KRECE); si se editan casi simultáneamente, el mensaje puede mostrarse para el
      proveedor equivocado.

---

## Fuera de alcance / ya verificado correcto (no re-auditar)

- `kyc-admin.vue` / `KycImagePreview.vue`: blob URLs se revocan correctamente en `onBeforeUnmount` —
  el memory leak reportado en una ronda anterior no se pudo confirmar con lectura real del código.
- `ServiceRequestDetailModal.vue`: manejo de blob URLs de media (`mediaBlobUrls`/`loadGeneration`)
  correctamente implementado.
- `employees.vue`: la fuga de salario ya corregida en el backend está correctamente reflejada — el
  listado no expone `salary` y el modal de edición usa `fetchEmployee(id)` para el detalle completo.
- `appointments.vue`: el error 400 de solapamiento de mesa (backend) sí se propaga y se muestra al
  usuario vía el banner de error — solo falta asociarlo visualmente al modal (ver mejora arriba).
- `exchange-rates.vue`, `locations.vue`, `search-tabs.vue`, `modules.vue`, `audit-log.vue`,
  `logs.vue`, `categories.vue`: patrones de confirmación/loading/error bien implementados, usados
  como referencia de "cómo debería verse" para corregir el resto.
- `useAuth.ts`, `useKyc.ts`, `useBnplSettings.ts` (claves privadas), páginas de login/registro/
  recuperación de contraseña: sin fugas de tokens/contraseñas en `console.log`.

---

## Orden de ejecución

De mayor a menor impacto: 🟠 Bugs funcionales → 🟡 UX rota (dinero primero, luego moderación, luego
otros) → 🟢 Mejoras/duplicación. La sección 🔴 ya está mitigada por el backend; se corrige como parte
del trabajo de UX (ocultar en vez de solo confiar en el 403).
