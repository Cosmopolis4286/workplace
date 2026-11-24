# Auditoría RBAC y alcance multi-comercio

## Estado actual

WorkPlace mantiene tres fuentes de permisos de plataforma:

- `RolePermission`: permisos por rol global.
- `ProfilePermission`: permisos heredados por perfiles activos.
- `UserPermission`: excepción individual con expiración opcional.

Esta fase no introduce una fuente adicional ni cambia la precedencia que aplica `PermissionsGuard`.

## Historial estructurado de cambios

Las operaciones administrativas de RBAC generan eventos en `AuditLog` con:

- Actor autenticado (`userId`).
- Módulo `permisos` y alcance `role`, `profile`, `user` o `permission`.
- Objetivo afectado (rol, perfil, usuario o permiso).
- Estado anterior y posterior, incluyendo concesión, revocación, motivo y expiración cuando corresponde.
- Identificador único de operación (`operationId`) para correlacionar el evento.

Se registran cambios individuales y masivos, overrides de usuario, creación y eliminación de permisos personalizados. Los cambios rechazados por las reglas existentes no generan eventos de cambio exitoso.

Los eventos se escriben en el JSON `AuditLog.details`; no se guardan contraseñas, tokens ni credenciales. El registro general de auditoría existente sigue funcionando sin cambios.

### Garantías y limitaciones actuales

`AuditService.log()` es actualmente best-effort: captura errores de persistencia para no interrumpir operaciones de negocio. Por tanto, esta fase mejora el detalle y la trazabilidad, pero **no convierte el historial en un registro transaccional o a prueba de manipulación**. Antes de usarlo como evidencia de cumplimiento o como registro financiero/legal, debe implementarse una escritura atómica con el cambio RBAC o un outbox transaccional, además de controles de retención y acceso de solo lectura.

## Autorización contextual por perfil

Los endpoints que representan una operación de un perfil concreto pueden declarar
`@RequireProfileContext(ProfileType.PROFESSIONAL)` junto con
`@RequirePermission(...)`.

- `PermissionsGuard` conserva los permisos base de `RolePermission` y los
  overrides globales de `UserPermission`, pero limita la parte heredada de
  `ProfilePermission` al perfil exacto resuelto para la petición.
- `ProfileContextGuard` vuelve a leer `User.activeProfileId` desde PostgreSQL
  y comprueba que apunta a un perfil del propio usuario, de tipo permitido y
  en estado `ACTIVE`. El ID resuelto se pasa a `PermissionsGuard`, que vuelve a
  filtrar por `userId + profileId + ACTIVE`; no une otros perfiles del mismo tipo.
  No acepta IDs de perfil enviados en body, query o headers.
- Si no se ha elegido contexto y existe exactamente un perfil compatible, se
  usa ese perfil sin mutar la preferencia persistida. Si hay varios perfiles
  compatibles o el contexto seleccionado apunta a otro tipo, la operación
  responde HTTP 409 y exige elegir el contexto correcto.
- Si no existe ningún perfil compatible, responde HTTP 403.

La primera aplicación está en `settings/freelancer/*`, que exige contexto
`PROFESSIONAL`, y en la gestión propia de servicios (`services/mine`, métricas,
CRUD y medios), que exige contexto `PROFESSIONAL` o `BUSINESS`. Los demás
dominios se migrarán de forma incremental, después de revisar sus reglas y
consumidores; no se cambia el comportamiento de rutas no marcadas.

Esta protección contextual **no equivale a aislamiento multi-tenant**. No
autoriza empleados ni varios usuarios sobre un mismo comercio, ni reemplaza
la futura `BusinessMembership`, ni añade filtros `commerceId/branchId` a
consultas. Hasta implementar esa capa, el modelo sigue siendo propietario
1:1 y no debe anunciarse como RBAC multi-comercio.

## Alcance por comercio y sucursal: decisión de arquitectura

El esquema actual permite afirmar lo siguiente:

- `Commerce.userId` representa una relación 1:1 entre el comercio y su propietario actual.
- `Branch.commerceId` vincula cada sucursal a un comercio.
- `Employee` también pertenece a un comercio, pero no está vinculado a `User` ni a una sucursal concreta.
- `RolePermission`, `ProfilePermission` y `UserPermission` son globales; no contienen `commerceId` ni `branchId`.

Por estas razones, **no se habilitan permisos por sucursal en esta fase**. Un filtro de interfaz o un nuevo campo opcional no constituirían aislamiento real y podrían permitir acceso cruzado entre comercios.

## Diseño requerido antes de habilitar RBAC multi-tenant

1. Definir una identidad de miembro de comercio vinculada a `User`, con estado, invitación, revocación y relación explícita con `Commerce`.
2. Definir asignación a una o varias sucursales; distinguir alcance de comercio completo de alcance limitado a sucursales.
3. Resolver el contexto de comercio desde una membresía validada en backend, nunca desde un `commerceId` libre enviado por el cliente.
4. Aplicar el scope en cada consulta y mutación de recursos, verificando que la sucursal pertenece al comercio activo.
5. Mantener los permisos globales de plataforma separados de las capacidades del miembro del comercio.
6. Añadir pruebas negativas de aislamiento: usuario de comercio A no puede leer, modificar, exportar ni inferir recursos de comercio B; sucursal A1 no puede acceder a datos de A2 cuando su membresía sea limitada.
7. Auditar invitaciones, cambios de rol, asignaciones de sucursal, suspensiones y revocaciones.

## Implementación incremental de BusinessMembership

La rama de fundación añade el modelo de datos y un resolver aislado, pero **todavía no habilita acceso de miembros a endpoints operativos**:

- `Commerce.userId` sigue siendo el propietario canónico e implícito (`OWNER`); no se crea una membresía duplicada para el propietario.
- `BusinessMembership` representa usuarios adicionales y evita duplicados por comercio/usuario. Los estados `SUSPENDED` y `REVOKED` conservan la relación sin conceder acceso.
- Roles iniciales: `ADMIN`, `MANAGER`, `STAFF` y `VIEWER`. Esta fase solo almacena el rol; el siguiente paso debe mapear cada rol a permisos concretos, separados del RBAC global.
- `BusinessMembershipScope.COMMERCE` representa acceso a todas las sucursales. `SELECTED_BRANCHES` limita el acceso a las asignaciones explícitas; una lista vacía se deniega (fail closed).
- `BusinessMembershipBranch` usa claves foráneas compuestas (`membershipId`, `commerceId`) y (`branchId`, `commerceId`). PostgreSQL impide asignar una sucursal de otro comercio a una membresía.
- `BusinessMembershipService.resolve(userId, commerceId)` comprueba propiedad o membresía ACTIVE. No confía en `commerceId` como prueba de autorización. `assertBranchAccess` limita sucursales cuando el alcance es `SELECTED_BRANCHES`.

Hasta completar la integración de guard y migración de los controladores/servicios, los módulos actuales siguen resolviendo el comercio mediante `CommerceResolverService` y el propietario. No se debe invitar miembros ni mostrar estos roles como operativos todavía. La siguiente etapa debe integrar el resolver, aplicar el scope a cada lectura/escritura, y añadir invitaciones de un solo uso con token hasheado, expiración, revocación y auditoría.
## Criterio de aceptación de esta fase

- Cada cambio RBAC exitoso identifica al actor, alcance, objetivo, estado anterior y estado posterior.
- Las operaciones masivas generan un evento con el conjunto completo de cambios.
- La expiración y el motivo de overrides individuales quedan en el historial.
- Se mantiene la precedencia efectiva existente: UserPermission (override) → RolePermission → ProfilePermission; el filtro contextual limita únicamente ProfilePermission al ID exacto del perfil validado cuando el endpoint lo declara.
- Los endpoints contextuales validan el perfil activo desde PostgreSQL y rechazan perfiles incompatibles.
- No se presenta el RBAC global actual como si ya ofreciera aislamiento por comercio o sucursal.
