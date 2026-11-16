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

## Criterio de aceptación de esta fase

- Cada cambio RBAC exitoso identifica al actor, alcance, objetivo, estado anterior y estado posterior.
- Las operaciones masivas generan un evento con el conjunto completo de cambios.
- La expiración y el motivo de overrides individuales quedan en el historial.
- Se mantiene intacta la fuente de verdad y la lógica efectiva de autorización existente.
- No se presenta el RBAC global actual como si ya ofreciera aislamiento por comercio o sucursal.
