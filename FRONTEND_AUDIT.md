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

- [x] Extraído a `composables/users/useRoleHierarchy.ts` (`canManage`/`isSuperAdmin`), compartido
      entre `users.vue` (reemplaza su `canManage` local, y corrige de paso que la fila completa se
      abría con `openEdit(u)` sin pasar por `canManage`) y `UserPermissionsModal.vue` (banner de aviso
      + los 4 botones de acción — grant/deny/quitar personalización/resetear — deshabilitados cuando
      `!canManageThisUser`). No se oculta el botón "Gestionar Permisos" en el listado: el modal se
      puede seguir abriendo en modo solo-lectura para auditoría, solo las acciones de escritura quedan
      bloqueadas.

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
- [x] **`pages/expenses.vue`** — `markPaid` (marca un gasto como pagado, afecta reportes financieros)
      se ejecutaba sin confirmación ni loading, a diferencia de "Eliminar gasto" que sí las tenía.
      Corregido: se agregó un modal de confirmación (mismo patrón `TransitionRoot`/`Dialog` que ya
      usaba "Eliminar gasto") con guard de reentrada y estado de carga.
- [x] **`pages/commissions.vue`** — eliminar un override de comisión (afecta cuánto se cobra a un
      usuario/plan) era la única acción destructiva del archivo sin ningún tipo de confirmación.
      Corregido con `confirm()` nativo (no había ningún modal custom en este archivo del que
      partir), mostrando a quién afecta y qué tasa aplicará después.
- [x] **`pages/cash-register.vue`** — revisado, sin cambio. El modal de cierre ya exige ingresar el
      monto contado, muestra el diferencial calculado en vivo antes de enviar, y el botón dice
      explícitamente "Confirmar cierre" — hay fricción real. Agregar un segundo paso de confirmación
      encima sería redundante sin beneficio claro; se prioriza otros hallazgos con impacto real.

### Moderación / aprobación
- [x] **`pages/kyc-admin.vue`** — "Rechazar" ya tenía confirmación de dos pasos con motivo
      obligatorio; "Aprobar" ejecutaba directo y ninguna de las dos tenía `catch` (errores de red se
      perdían en silencio). Corregido: "Aprobar" ahora tiene el mismo patrón de confirmación inline
      (mostrando a quién se aprueba), y ambas acciones muestran un banner de error si fallan.
- [x] **`pages/proposed-categories-admin.vue`** — mismo patrón exacto que `kyc-admin.vue`, mismo fix
      aplicado.
- [x] **`pages/landing-admin.vue`** — ningún handler (`saveStats`, `moderate`, `moderateUserReport`,
      CRUD de testimonios/features/pasos) tenía manejo de error visible; era el único panel admin de
      todo el audit sin ese mecanismo. Corregido, **y además refactorizado**: las 3 secciones de CRUD
      (testimonios/funciones/pasos) tenían la misma lógica de listar/crear/editar/eliminar/reordenar
      triplicada casi al carácter — se extrajo a un composable genérico nuevo,
      `composables/useLandingCrudSection.ts`, que unifica las tres. Cada sección ahora tiene manejo
      de error consistente por construcción (viene del composable, no se puede olvidar en una
      sección y no en otra). `stats`/`reportedReviews`/`userReports` no comparten esa forma (no
      tienen modal de crear/editar) así que se les agregó `try/catch` con su propio `ref` de error
      directamente, sin pasar por el composable. Verificado levantando el dev server y solicitando
      la ruta — compila y sirve 200 sin errores (no hay `vue-tsc` funcional en este entorno para un
      typecheck automatizado real, ver nota de tooling).
- [x] **`pages/service-categories-admin.vue`** — eliminar categoría/modalidad y toggle de modalidad
      sin `try/catch` ni loading state; además el banner de error solo se mostraba dentro del
      formulario de crear/editar, invisible si el error venía de eliminar/toggle (acciones que no
      abren el formulario). Corregido: loading state por fila (`deletingCategoryId`/
      `togglingModalityId`/`deletingModalityId`) y el banner de error movido fuera del formulario
      para que se muestre siempre que haya un error activo.

### Otros
- [x] **`pages/onboarding.vue`** — claves de `localStorage` (`onboarding_step`, `onboarding_completed`,
      etc.) sin namespace por usuario/sesión. En un dispositivo compartido, si el Usuario A completaba
      el onboarding y luego el Usuario B iniciaba sesión sin haber completado el suyo, el wizard se
      saltaba para B porque `onboarding_completed` seguía en `'true'` de la sesión anterior. Corregido:
      las 5 claves se namespacean con el `userId` (`onboarding_<campo>_<userId>`), `middleware/auth.ts`
      actualizado para usar la misma convención en su propio chequeo, y `useAuth.logout()` las limpia
      al cerrar sesión.
- [x] **`pages/p/[username].vue`** — múltiples operaciones (`handleFollow`, `handleUnfollow`,
      `handleToggleLike`, `loadComments`, `handleSendComment`, `handleDeleteComment`, `confirmDeletePost`,
      `onCoverFileSelected`) sin `catch` ni feedback de error visible; `confirmDeletePost` además cerraba
      el modal *antes* de confirmar que el borrado tuvo éxito. Corregido: `alert.error()` en cada
      `catch`, y `confirmDeletePost` ahora cierra el modal solo tras un `deletePost` exitoso. De paso:
      `trackSvcEvent` ya no puede romper el flujo de abrir el modal de solicitud si `sessionStorage`
      lanza `SecurityError` (Safari privado estricto), y `getAssetUrl` se extrae una sola vez en vez de
      re-invocar `useAssetUrl()` en cada función auxiliar (`avatarSrc`/`mediaSrc`/`coverSrc`).
- [x] **`composables/auth/useDemoCredentials.ts`** — `console.log` con el nombre del contenedor
      Docker interno y el comando exacto de seed (`docker exec backend-hybrid ...`) se ejecutaba sin
      gate de `process.dev` — en cualquier entorno donde el endpoint respondiera "Demo users not
      found", exponía detalles de infraestructura en la consola del navegador de cualquier usuario.
      Corregido: ambos `console.log` ahora están condicionados a `process.dev`, mismo criterio ya
      usado en el `console.error` de la rama de error genérico del mismo archivo.

---

## 🟢 Mejoras y duplicación de código

- [x] **`formatPrice`/`formatLimit`** duplicados con lógica divergente en `usePlans.ts` (MXN, `0` →
      "No incluido") y `pricing.vue` (USD, no distingue `0`). Resuelto: extraído
      `composables/core/useMoneyFormat.ts` compartido (USD nominal, `0` → "Gratis"/"No incluido" según
      contexto, `-1`/`null`/`undefined` → "Ilimitado"). `pricing.vue` usaba `'∞'` para límite sin tope
      en vez de "Ilimitado" — se agregó el parámetro opcional `unlimitedLabel` a `formatLimit` para que
      cada consumidor preserve su propio texto sin cambiar UX visible.
- [x] **`timeAgo`** duplicado carácter por carácter en `service-requests.vue` y
      `ServiceRequestDetailModal.vue`. Resuelto para `service-requests.vue`: la otra sesión en
      paralelo ya había creado `composables/core/useDateFormat.ts` (compartido) mientras se trabajaba
      esta ronda — se enriqueció su `timeAgo` con la granularidad de semanas/meses/años que tenía la
      versión local (para no cambiar el texto visible al usuario) y se migró el archivo.
      **Pendiente**: `ServiceRequestDetailModal.vue` sigue con su propio `timeAgo` sin migrar — tiene
      trabajo activo de la otra sesión (propuestas de cambio de precio), se evita tocarlo hasta que
      se estabilice.
- [x] **`formatPrice`** local en `service-requests.vue` usaba locale `es-CO` (Colombia) en vez de
      `es-VE` — corregido. `ServiceRequestDetailModal.vue` queda pendiente por el mismo motivo que
      el punto anterior.
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
- [x] Timers no limpiados en `onUnmounted`: `usernameDebounce` y `successTimer` en `profile.vue`.
      Resuelto: agregado `onUnmounted` que limpia ambos timers.
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

## Nota de tooling

`npx nuxt typecheck` (que internamente usa `vue-tsc`) falla en este entorno con
`ERR_PACKAGE_PATH_NOT_EXPORTED` al resolver `typescript/lib/tsc` — incompatibilidad entre la versión
de `vue-tsc` que trae `npx` y la versión de `typescript` del proyecto, no relacionada a ningún cambio
de esta ronda. No hay forma de correr un typecheck real de los `.vue` (`tsc` plano no entiende SFCs).
Verificación usada en su lugar para cambios de frontend: revisión manual línea por línea + levantar
`npx nuxt dev` y solicitar la ruta afectada para confirmar que compila y sirve 200. Si se prioriza,
vale la pena fijar la versión de `vue-tsc` en `devDependencies` para tener typecheck real en CI.
