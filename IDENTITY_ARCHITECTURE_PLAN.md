# WorkPlace — Identity, Profiles & Taxonomy: Architecture Migration Plan

> Fecha: 2026-08-29. Entregable de **Fase 1 (Auditoría) + Fase 2/3 (Arquitectura objetivo y plan de migración)**, sin cambios de código todavía. Ver [[workplace-vision]], [[multi-profile-system]], [[rbac-security-hardening]] en memoria para el historial que llevó hasta acá.

> **Estado al 2026-10-03 — implementado.** Los pasos 1-7 de §10 están hechos, y la capa `Capability` (§3) existe como servicio derivado (`common/capabilities/`), no como tabla, tal como se recomendaba. Diferencias respecto a este plan, decididas durante la implementación:
> - **`role=PROFESIONAL` pasó de unión a base común** (intersección de los perfiles de negocio). Sin eso `ProfilePermission` no podía restringir nada y `can()` no distinguía comercio de profesional. Migración `invert_profesional_role_permissions`.
> - **`AccountTypeGuard`/`@RequireAccountType` y `MODULE_ACCOUNT_TYPE` se eliminaron**, reemplazados por `CapabilityGuard` (`HAS_COMMERCE`, `HAS_PROFESSIONAL_PROFILE`, `HAS_BUSINESS_PROFILE`) más la matriz de permisos. `effectiveModules` volvió a ser solo plan ∩ categoría.
> - **"Opción 2"**: un `PROFESSIONAL` puede vender producto con su propio `Commerce` (creado al aprobar si su categoría incluye `menu`/`inventory`/`orders`), sin perfil `BUSINESS`.
> - **`FreelancerApplication` quedó deprecado** (alta → 410), sin borrar la tabla.
> - El frontend ya no decide acceso con `accountType`: usa `can()`, módulos y `capabilities` (de `GET /auth/me` y `GET /navigation → routeCapabilities`).
>
> Resumen vigente del modelo: `WORKPLACE_STATUS_FEEDBACK.md` §3.

---

## 1. Current Architecture

WorkPlace ya está a mitad de camino de exactamente la migración que este documento propone — no arranca de cero. Estado real hoy:

```text
User
├── role: Role (SUPERADMIN | ADMIN | PROFESIONAL | NORMAL)   ← RBAC puro, YA limpio
├── kycStatus: KycStatus                                      ← denormalizado, fuente real = IdentityVerification
├── categoryId / subcategoryId → UserCategory / UserSubcategory
├── commerce?: Commerce (1:1 vía Commerce.userId)
├── profiles: UserProfile[]                                   ← multi-perfil, en construcción
└── driverProfile?: Driver (1:1 vía Driver.userId, opcional)

UserProfile (nuevo, aditivo)
├── type: ProfileType (CUSTOMER | PROFESSIONAL | JOB_SEEKER | BUSINESS)
├── subtype: ProfessionalSubtype (FREELANCER | SERVICE_PROVIDER)   ← solo si type=PROFESSIONAL
├── status: PENDING | ACTIVE | REJECTED | SUSPENDED
├── categoryId/subcategoryId (mismo UserCategory/UserSubcategory que User)
└── commerce?: Commerce (vía Commerce.profileId, opcional, paralelo a Commerce.userId)

AccountTypeResolver  → deriva 'COMMERCE' | 'FREELANCER' | null LEYENDO SOLO UserProfile (BUSINESS gana sobre PROFESSIONAL)
RoleResolverService  → sincroniza User.role = PROFESIONAL cuando hay un UserProfile BUSINESS/PROFESSIONAL activo
PermissionsService   → UserPermission override > RolePermission(role) OR UNION(ProfilePermission de cada UserProfile ACTIVE)
```

Puntos clave que cambian la lectura del brief original:

- **`User.accountType` como columna YA NO EXISTE.** Fue eliminado en el hardening del 2026-08-25 (ver [[rbac-security-hardening]]). Lo que el brief llama "accountType" hoy es un **valor calculado en caliente** por `AccountTypeResolver` (`backend/src/common/account-type/account-type.resolver.ts`), leyendo `UserProfile` — no hay fallback a `role` porque `role` nunca tuvo esa granularidad después de la fusión COMMERCE+FREELANCER→PROFESIONAL. Esto es **más avanzado** que lo que describe la sección 16/18 del brief, que asumía una columna legacy todavía viva.
- **`Role` ya solo significa nivel de acceso** (sección 5/17 del brief, ya logrado): `SUPERADMIN | ADMIN | PROFESIONAL | NORMAL`. Falta el refinamiento MODERATOR/SUPPORT que pide la sección 5, pero eso es aditivo y de bajo riesgo cuando se necesite — no hay urgencia funcional hoy (nadie lo pidió, no hay casos de uso pendientes).
- **`FreelancerApplication` sigue siendo un modelo paralelo a `UserProfile`**, no legacy puro: `FreelancerApplicationsService` sigue siendo la fuente que el frontend actual usa para el flujo de solicitud, y hace dual-write hacia `UserProfile` para que `AccountTypeResolver`/RBAC lo vean. `ProfileActivationsService` es el camino genérico nuevo (soporta los 4 `ProfileType`) y NO toca `FreelancerApplication` — es decir, ya es posible activar `PROFESSIONAL/FREELANCER` sin pasar por `FreelancerApplication`, lo cual es exactamente el riesgo de divergencia que el brief pide vigilar (sección 22).
- **`Commerce.userId` sigue siendo la FK real** (1:1), con `Commerce.profileId` opcional y sin usar activamente todavía como puente. `CommerceResolverService` ya consolidó ~12 implementaciones duplicadas de `getCommerceId`, pero quedan ~13 call sites que siguen golpeando `prisma.commerce.findUnique({where:{userId}})` directamente en vez de pasar por el resolver.
- **No existe capa de `Capability` en absoluto** (sección 13 del brief). Lo más cercano son las claves de `Permission` (module+action, ej. `orders.create`) y checks puntuales como `KycApprovedGuard`. No hay un catálogo de operaciones tipo `CAN_SELL`/`CAN_POST_JOB` desacoplado de permisos administrativos.
- **La taxonomía de categorías está fragmentada en 4 silos independientes** sin ningún modelo compartido real: `UserCategory/UserSubcategory` (perfil de negocio/profesional), `Category/Subcategory` (catálogo de productos de un Commerce), `ServiceCategory` (flat, para `Service`), `JobCategory` (flat, para `Job`). El único acoplamiento entre las cuatro es `ProposedCategory`, que es un flujo de aprobación genérico con un `switch` por `target`, no una jerarquía compartida.
- **Frontend va un paso atrás del backend**: `useAuth().User` no expone `profiles: UserProfile[]` en absoluto — solo `role` y `accountType`. La gating de UI (dashboards, middleware, componentes) es 100% `role`/`accountType`, nunca `UserProfile` directamente. El único lugar del frontend que ya habla el lenguaje de `UserProfile`/`ProfileType`/`subtype` es la administración de permisos (`permissions.vue`, `permissions/users.vue`, `useUserPermissions.ts`, `roles.config.ts::profileKindOf`) — todavía no llegó a onboarding, dashboard ni middleware de rutas.
- **`Driver` ya es, en la práctica, exactamente lo que pide la sección 14**: no es un perfil (`ProfileType`) ni pretende serlo — es una entidad operativa 1:1 opcional con `User` (vía `userId` nullable + `graceUntil`), con su propio ciclo de vida (`DriverInvitation`), que vive colgada de `Commerce`, no de `UserProfile`. Es decir: ya está modelado como "entidad operativa asociada a un usuario", que es la recomendación correcta según el brief — no requiere cambio estructural.

---

## 2. Source of Truth Matrix

| Concepto | Fuente actual | Fuente objetivo | Estado | Módulos afectados |
|---|---|---|---|---|
| **Nivel de acceso técnico/admin** | `User.role` (`SUPERADMIN/ADMIN/PROFESIONAL/NORMAL`) | Igual, sin cambios | ✅ Ya correcto | `RolesGuard`, ~90 usos de `@Roles()` (100% SUPERADMIN/ADMIN, confirmado en auditoría previa) |
| **Papel de negocio (perfil)** | `UserProfile.type` (CUSTOMER/PROFESSIONAL/JOB_SEEKER/BUSINESS) + `AccountTypeResolver` como vista simplificada | `UserProfile` — ya es la fuente correcta | 🟡 Correcto en backend nuevo, pero convive con 2 caminos de activación (`FreelancerApplication` vs `ProfileActivationsService`) | Ver Concepto siguiente |
| **Distinción Commerce vs Freelancer (accountType)** | `AccountTypeResolver` derivado de `UserProfile` en caliente, sin columna persistida | Igual — es correcto tal cual está, solo falta exponerlo bien en frontend | 🟡 Backend OK, frontend no usa `UserProfile`, usa el valor colapsado `accountType` en todos lados | `useAuth.ts`, `dashboard.config.ts`, middleware, casi todo el frontend de negocio |
| **Especialización profesional (subtype)** | `UserProfile.subtype` (FREELANCER / SERVICE_PROVIDER) | Igual | 🟡 Existe en el modelo pero el frontend **no lo consume en absoluto fuera de admin/permisos** — hoy todo "freelancer" en UI es en realidad `accountType==='FREELANCER'`, no distingue SERVICE_PROVIDER | `onboarding.vue`, dashboard, `ProfilePublicView.vue` |
| **Sector/rubro de negocio o profesión** | `UserCategory`/`UserSubcategory`, compartida entre `User`, `FreelancerApplication`, `UserProfile` | Igual — ya es compartida correctamente para este dominio | ✅ Ya correcto (un solo modelo, 3 consumidores coherentes) | `UsersService`, `FreelancerApplicationsService`, `ProfileActivationsService`, `PlansService` |
| **Categoría de catálogo de productos** | `Category`/`Subcategory` (Commerce-scoped o global) | Igual — dominio distinto, correctamente separado | ✅ Correcto (separación intencional, no fusionar con `UserCategory`) | `CatalogService`, `CategoriesGlobalService` |
| **Categoría de servicios (marketplace)** | `ServiceCategory` (flat) | Igual, evaluar si necesita subcategoría a futuro (hoy no la tiene) | ✅ Correcto por ahora, sin necesidad urgente de cambio | `ServicesService` |
| **Categoría de empleos** | `JobCategory` (flat) | Igual | ✅ Correcto por ahora | `JobsService` |
| **Solicitud de activación "quiero ser freelancer"** | `FreelancerApplication` (legacy, es lo que usa el frontend hoy) + dual-write a `UserProfile` | `ProfileActivationsService` / `UserProfile` como único camino | 🔴 Fuente doble activa — riesgo real de divergencia (ver auditoría §7) | `FreelancerApplicationsService`, `ProfileActivationsService`, frontend de onboarding/solicitud |
| **Comercio (entidad de negocio)** | `Commerce.userId` (FK 1:1 real) | Igual en el corto plazo; `Commerce.profileId` como puente hacia relación N:N futura | 🟡 Correcto no tocar ahora — es prematuro migrar sin caso de uso de "negocio con múltiples dueños" | ~13 call sites directos + `CommerceResolverService` (12 ya consolidados) |
| **Capacidad operativa (¿qué puede hacer?)** | No existe — inferida implícitamente combinando `role` + `accountType` + `KycStatus` + `Permission.module/action` | Nueva capa explícita `Capability` (ver §3) | 🔴 No existe, es el hueco real de la arquitectura actual | Guards nuevos, `PermissionsService` |
| **Verificación de identidad (KYC)** | `User.kycStatus` (denormalizado) + `IdentityVerification` (detalle) | Igual — ya es correcto, solo falta que las capacidades lean KYC en vez de que cada guard lo chequee ad-hoc | ✅ Modelo correcto, aplicación dispersa | `KycApprovedGuard` (ya centralizado, bien) |
| **Repartidor (driver)** | `Driver.userId` opcional 1:1, colgado de `Commerce`, con `graceUntil` | Igual — no es ni debe ser un `ProfileType` | ✅ Correcto, no tocar | `DeliveryService`, `DriverInvitationsController` |
| **Contexto activo de UX ("estoy usando WorkPlace como...")** | No existe | Nuevo campo `User.activeProfileId` o preferencia en `ProfileSettings` | 🔴 No existe todavía | Frontend (selector de contexto), `ProfileSettings` |

---

## 3. Target Architecture

```text
                              USER
                                │
        ┌───────────────────────┼───────────────────────┐
        ▼                       ▼                       ▼
   ACCESS ROLE              PROFILES[]              KYC STATUS
 (SUPERADMIN/ADMIN/          (múltiples,          (IdentityVerification,
  PROFESIONAL/NORMAL)       simultáneos)           denormalizado en User)
        │                       │
        │            ┌──────────┼──────────┬─────────────┐
        │            ▼          ▼          ▼             ▼
        │        CUSTOMER  PROFESSIONAL  BUSINESS    JOB_SEEKER
        │                       │            │
        │              ┌────────┴────┐       │
        │              ▼             ▼       ▼
        │        FREELANCER  SERVICE_PROVIDER │
        │              │             │        │
        │              ▼             ▼        ▼
        │          CATEGORY     CATEGORY  (Commerce vía
        │              │             │     profileId)
        │              ▼             ▼
        │         SUBCATEGORY   SUBCATEGORY
        │              │             │
        │              ▼             ▼
        │           SERVICE       SERVICE
        │
        └──────────► CAPABILITIES (derivadas, no persistidas como tabla nueva)
                      CAN_SELL, CAN_PROVIDE_SERVICE, CAN_POST_JOB, CAN_HIRE,
                      CAN_ACCEPT_ORDERS, CAN_ACCEPT_APPOINTMENTS, CAN_DELIVER
                      = f(perfil activo + subtype + KycStatus + Plan)
```

### Decisión de diseño: Capability como servicio derivado, NO como tabla nueva

Aplicando la regla anti-sobre-modelado (sección 24 del brief): una `Capability` no necesita persistencia propia hoy. Ninguna capacidad tiene reglas de negocio propias que no puedan expresarse como `f(UserProfile activo, subtype, KycStatus, Plan.enabledModules)`. Crear una tabla `Capability` + `UserCapability` sería una tabla más para representar algo 100% derivable de datos que ya existen.

**Recomendación**: un servicio `CapabilitiesService` (no un modelo Prisma) con métodos como:

```typescript
canSell(userId): boolean       // BUSINESS activo + KYC approved
canProvideService(userId): boolean  // PROFESSIONAL activo (cualquier subtype) + KYC approved
canPostJob(userId): boolean    // BUSINESS o PROFESIONAL con plan que incluya maxJobs > 0
canDeliver(userId): boolean    // Driver.userId === userId && driver.isActive
```

Si en el futuro una capacidad necesita estado propio (ej. "CAN_DELIVER suspendido temporalmente por incidente"), en ese momento sí se promueve a tabla — no antes (criterio de la sección 24: ¿necesita historial? ¿reglas propias? Hoy no).

### Decisión de diseño: taxonomía administrable vs enum

- `UserCategory`/`UserSubcategory`, `Category`/`Subcategory`, `ServiceCategory`, `JobCategory` — **ya son entidades administrables** (no enums), correcto según sección 23. No se propone unificarlas en un `CategoryDomain` genérico: los cuatro dominios tienen reglas de negocio distintas (nesting solo en `UserCategory`, scoping por Commerce solo en `Category`, ninguno en `ServiceCategory`/`JobCategory`) y unificarlas hoy sería una abstracción prematura sin caso de uso concreto que la pida — no hay señal de que un administrador necesite compartir categorías entre dominios.
- `ProfileType`/`ProfessionalSubtype` siguen siendo **enums**, correctamente: son conceptos estables (4 y 2 valores respectivamente), con reglas de negocio codificadas alrededor de cada valor (guards, resolvers, dashboards) — cambiarlos a tabla administrable rompería más de lo que resuelve, y el brief mismo pide reservar enums para "conceptos realmente estables" (sección 23).

### `activeProfile` (contexto activo, sección 20 del brief)

Agregar `User.activeProfileId String?` (FK opcional a `UserProfile`, `SetNull` on delete) — puramente de UX, no cambia permisos ni capacidades (esas siguen siendo la unión de todos los perfiles ACTIVE, no solo el activo). Sirve para: qué dashboard mostrar por defecto, qué tab de búsqueda destacar, qué "vista" usar en `/p/:username`. Null-safe: si no hay `activeProfileId`, se infiere el primero ACTIVE por prioridad (BUSINESS > PROFESSIONAL > JOB_SEEKER > CUSTOMER, mismo orden que ya usa `AccountTypeResolver`).

---

## 4. Migration Plan (Current → Transition → Target)

| Concepto | Current | Transition | Target |
|---|---|---|---|
| Activación de perfil PROFESSIONAL/FREELANCER | `FreelancerApplication` (frontend-facing) + dual-write a `UserProfile` | Frontend migra a endpoints de `ProfileActivationsService`; `FreelancerApplication` queda solo como tabla de lectura histórica (no se borra) | `ProfileActivationsService`/`UserProfile` único punto de entrada; `FreelancerApplication` deprecado, sin nuevos INSERTs |
| `accountType` en frontend | `useAuth().User.accountType` (string plano) | Agregar `profiles: UserProfile[]` al payload de `/auth/me` y al tipo `User`, MANTENIENDO `accountType` calculado igual que hoy (no romper nada) | Frontend lee `profiles[]` donde necesite subtype/categoría; `accountType` queda como helper de conveniencia derivado client-side de `profiles` (mismo cálculo que hoy hace el backend) |
| Gating de UI por tipo de negocio | `role === 'PROFESIONAL'` / `accountType === 'FREELANCER'` esparcido en ~15 archivos | Introducir composable `useProfileContext()` que exponga `hasProfile(type)`, `hasProfessionalType(subtype)`, sin tocar los checks existentes todavía | Reemplazar los checks directos uno por uno detrás de `useProfileContext()`, empezando por los de mayor riesgo (dashboard, onboarding) |
| `Commerce` ownership | `Commerce.userId` FK 1:1 real | Sin cambios — `Commerce.profileId` queda como está (opcional, sin nuevos consumidores todavía) | Solo si aparece un caso de uso real de "negocio con socios/empleados dueños" se diseña `CommerceOwner` N:N — no antes |
| Capacidades operativas | Implícitas (role+accountType+KYC dispersos) | Crear `CapabilitiesService` (sin tabla nueva) que centralice las reglas ya existentes, sin cambiar guards todavía | Guards nuevos (`RequireCapability('CAN_SELL')`) reemplazan gradualmente `@RequireAccountType` donde la semántica real es "puede vender", no "es de tipo Commerce" |
| Contexto activo | No existe | Agregar `User.activeProfileId` (migración aditiva, nullable, sin backfill obligatorio) | Frontend usa un selector de contexto que lee/escribe `activeProfileId` vía `PATCH /profiles/active` |
| `users.service.ts:853` (`isFreelancerProfile` heurística) | Re-deriva accountType desde `role + !user.commerce` | Reemplazar por una llamada directa a `AccountTypeResolver.isFreelancer(userId)` | Ya no queda lógica ad-hoc duplicando al resolver |

---

## 5. Breaking Risks

1. **Divergencia FreelancerApplication vs UserProfile** (ya documentado en auditoría): un usuario puede llegar a `PROFESSIONAL/FREELANCER` activo por `ProfileActivationsService` sin nunca tener fila en `FreelancerApplication`. Cualquier reporte/admin screen que siga usando `FreelancerApplication` como "lista de freelancers" quedará incompleto. **Mitigación**: antes de cualquier cambio, auditar específicamente qué pantallas admin leen `FreelancerApplication` directamente (fuera del scope de esta auditoría, pendiente para Fase 4).
2. **`users.service.ts:853`** duplica la lógica de `AccountTypeResolver` con una heurística distinta (`role==='PROFESIONAL' && !commerce`). Si un `PROFESIONAL` con `BUSINESS` activo pero sin `Commerce` creado todavía (estado transitorio real, ej. justo después de aprobar pero antes de crear la tienda) pasa por este código, se clasifica como freelancer incorrectamente. Bajo riesgo de romper algo hoy (es un cálculo de "perfil completo", no un guard de seguridad), pero es la primera corrección de bajo riesgo a aplicar.
3. **Frontend sin `profiles[]`**: agregar el array al tipo `User`/`/auth/me` es aditivo y no debería romper nada existente, pero cualquier código que haga `JSON.stringify(user)` para cache/comparación (ej. `localStorage`, watchers de Vue) puede comportarse distinto con un payload más grande — revisar `useAuth.ts` `setSession`/`updateLocalUser` antes de tocar el tipo.
4. **`SUBTYPE` invisible en frontend hoy**: introducir `SERVICE_PROVIDER` como distinción real de UI (hoy todo es "freelancer" visualmente) cambia copy/textos que los usuarios ya conocen — es un cambio de producto, no solo técnico, y debe validarse con el usuario/negocio antes de tocar `ProfilePublicView.vue` o el dashboard.
5. **No tocar `Commerce.userId`**: cualquier intento de migrar esa FK sin un caso de uso real de multi-ownership es la definición exacta de sobre-ingeniería que este documento debe evitar (sección 21/24 del brief) — se recomienda explícitamente NO hacerlo en esta ronda.
6. **KYC gating ya está bien separado** (`KycApprovedGuard` es su propio guard, independiente de role/profile) — no hay riesgo de romperlo si no se toca, y no requiere cambios en este plan.

---

## 6. Recommended Prisma Changes (esta ronda, incremental)

Cambios pequeños y aditivos, ninguno destructivo:

```prisma
model User {
  // ...existente sin cambios...
  activeProfileId String?
  activeProfile   UserProfile? @relation("ActiveProfile", fields: [activeProfileId], references: [id], onDelete: SetNull)
}

model UserProfile {
  // ...existente sin cambios...
  activeForUsers User[] @relation("ActiveProfile")
}
```

Ningún cambio a `Commerce`, `FreelancerApplication`, `Role`, `ProfileType`, `ProfessionalSubtype`, `Driver`, ni a las 4 taxonomías de categoría — todas están correctamente modeladas para el estado actual del producto. No se propone ninguna tabla `Capability` (ver §3, justificación de por qué no hace falta todavía).

---

## 7. Recommended Backend Changes

1. **`CapabilitiesService`** nuevo (`backend/src/common/capabilities/capabilities.service.ts`), consumido inicialmente solo internamente (no reemplaza guards todavía) — se construye y se valida contra los casos de uso reales antes de exponerlo como guard.
2. **Fix puntual**: `users.service.ts:853` → reemplazar heurística por `accountTypeResolver.isFreelancer(userId)`.
3. **`ProfileActivationsController`**: agregar endpoints equivalentes a los que hoy solo expone `FreelancerApplicationsController`, para que el frontend pueda migrar sin perder funcionalidad (listar mis solicitudes, cancelar solicitud pendiente).
4. **`AccountTypeResolver`**: agregar método `resolveDetailed(userId)` que devuelva `{ accountType, activeProfiles: UserProfile[] }` en una sola consulta, para que `/auth/me` pueda poblar `profiles[]` sin duplicar queries.
5. **`AuthService`/`UsersService`**: incluir `profiles` (activos) en el payload de `GET /auth/me` y en la respuesta de login — aditivo, no rompe consumidores que ignoren el campo nuevo.
6. **NO crear** `UserProfileResolver` como nombre nuevo — `AccountTypeResolver` + `RoleResolverService` ya cubren esa responsabilidad (sección 19 del brief); renombrar/fusionar sería solo costo de churn sin beneficio funcional. Si acaso, extenderlos.

---

## 8. Recommended Frontend Changes

1. **`useAuth.ts`**: agregar `profiles: UserProfile[]` al tipo `User` (aditivo). Agregar composable `useProfileContext()` con `hasProfile(type)`, `hasProfessionalType(subtype)`, `activeProfile` — construido sobre el array nuevo, sin tocar `accountType` existente.
2. **No migrar gating existente de golpe**: los ~15 sitios que chequean `role`/`accountType` directamente siguen funcionando (son correctos para lo que hoy representan). Se migran de a uno, empezando por `dashboard.config.ts` (mayor superficie, ya tiene la abstracción de `accountTypes?: AccountType[]` — extenderla a aceptar `profileTypes?`/`subtypes?` es el cambio de menor riesgo).
3. **Selector de contexto activo**: nuevo componente en el header/sidebar ("Estoy usando WorkPlace como: Cliente / Profesional / Mi negocio"), solo visible si `profiles.length > 1`. Llama a `PATCH /profiles/active`. No condiciona permisos, solo la vista por defecto.
4. **Onboarding**: mantener el flujo actual (categoría + plan) intacto; evaluar en una ronda futura si debe migrar a `ProfileActivationsService` en vez de solo setear `categoryId` en `User` — no es urgente porque hoy funciona y el riesgo de tocarlo sin necesidad de negocio clara es alto.

---

## 9. Tests Required

Antes de tocar código, falta cobertura para los escenarios de la sección 30 del brief. Estado actual (`plan-limits.service.test.ts` y suite general en [[testing-suite-status]]) no cubre explícitamente combinaciones multi-perfil. Se necesita, como mínimo, antes de cualquier cambio estructural:

- Usuario con `CUSTOMER` + `PROFESSIONAL/FREELANCER` activo simultáneo → verificar `hasEffectivePermission` devuelve la unión correcta.
- Usuario con `PROFESSIONAL/FREELANCER` activado vía `ProfileActivationsService` (sin `FreelancerApplication`) → verificar que `AccountTypeResolver` y `RoleResolverService` lo reconocen igual que el camino legacy.
- Usuario `PROFESIONAL` con `role` sincronizado pero sin `Commerce` creado (estado transitorio) → verificar que `users.service.ts:853` (post-fix) clasifica correctamente vía resolver.
- Usuario con `BUSINESS` + `PROFESSIONAL` simultáneos → verificar que `AccountTypeResolver` prioriza `BUSINESS` (comportamiento ya documentado, solo falta test explícito).

---

## 10. Implementation Order

1. Fix `users.service.ts:853` (bajo riesgo, corrige duplicación real, sin cambios de schema).
2. Tests de los 4 escenarios de la sección 9, sobre el código actual (deben pasar ya, documentan el comportamiento existente antes de tocar nada).
3. Migración Prisma aditiva: `User.activeProfileId`.
4. `CapabilitiesService` interno (sin exponer guards nuevos todavía).
5. `AccountTypeResolver.resolveDetailed()` + incluir `profiles[]` en `/auth/me`.
6. Frontend: `profiles[]` en tipo `User` + `useProfileContext()` (sin migrar gating existente).
7. Selector de contexto activo (UX, opcional/aditivo).
8. Recién en una ronda posterior, y solo si hay evidencia de necesidad real: migrar gating disperso a `useProfileContext()`, exponer `ProfileActivationsController` endpoints equivalentes a `FreelancerApplicationsController`, y decidir la deprecación formal de `FreelancerApplication`.

**No incluido en esta ronda** (deliberadamente, por falta de necesidad de negocio hoy): tabla `Capability` persistida, migración de `Commerce.userId` a relación N:N, roles `MODERATOR`/`SUPPORT`, unificación de las 4 taxonomías de categoría.

---

## Criterio de éxito (sección 31 del brief) — checklist

- [x] `User.role` responde solo "¿qué nivel de acceso tiene?" — ya logrado.
- [x] `UserProfile` responde "¿qué papel desempeña?" — ya logrado, con un flanco a cerrar (dual-write con `FreelancerApplication`).
- [x] `UserCategory/Subcategory` responde "¿en qué área trabaja/vende?" — ya logrado.
- [ ] `Capability` responde "¿qué puede hacer?" — no existe todavía, propuesto como servicio derivado en §3, no urgente.
- [x] `KycStatus` responde "¿está habilitado para operaciones que requieren verificación?" — ya logrado.

Este documento queda a la espera de aprobación antes de ejecutar cualquiera de los pasos de la sección 10.
