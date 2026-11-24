# Auditoría de aislamiento multi-comercio y diseño de BusinessMembership

**Fecha:** 24/11/2026  
**Estado:** auditoría de arquitectura; no habilita acceso de miembros todavía.  
**Dependencias:** PR #161 (autenticación), PR #162 (integridad de perfiles), PR #163 (contexto RBAC).  
**Regla de seguridad:** no fusionar ni habilitar multi-comercio hasta cerrar las fases de autorización y pruebas negativas.

## Resumen ejecutivo

El backend actual implementa un modelo de **un propietario por comercio**. No existe todavía una identidad de miembro vinculada a User, ni una autorización de recursos por membresía. Employee es un registro de personal/recursos humanos y no representa una cuenta de WorkPlace: no tiene userId y no debe reutilizarse como mecanismo de autenticación.

La relación Commerce.userId debe permanecer como propietario canónico durante la primera versión de BusinessMembership. No se migra a una relación N:N de propietarios ni se cambia la semántica histórica de facturación, titularidad o pagos.

El riesgo principal no es que hoy exista un acceso multi-comercio parcialmente soportado: **hoy no está soportado**. El riesgo sería introducir membresías y permitir que estas hereden el acceso del propietario sin resolver contexto, permisos, plan, titularidad y filtros de recursos de forma coherente.

## Hallazgos verificados en código

### 1. Resolución del comercio: propietario 1:1

- Commerce.userId es String @unique y FK a User.
- CommerceResolverService.find/resolve(userId) consulta exclusivamente Commerce.userId.
- Los módulos de operaciones y comercio usan este resolvedor para obtener commerceId antes de consultar datos.
- BranchesService y EmployeesService filtran listados por commerceId y verifican que el recurso solicitado pertenezca al comercio resuelto.
- ServicesService es otro dominio: sus servicios se poseen por Service.userId; no debe migrarse mecánicamente al modelo de membresía de Commerce.

**Conclusión:** el resolvedor central es el punto de integración más importante, pero no basta con cambiar su consulta. El contexto de comercio debe estar seleccionado y validado, y cada operación debe conservar su filtro por commerceId.

### 2. Permisos globales no equivalen a permisos de comercio

Actualmente PermissionsService combina RolePermission, ProfilePermission y UserPermission. Estas fuentes describen permisos globales del usuario/plataforma o de sus perfiles, no la relación del usuario con un comercio concreto.

ProfileContextGuard de PR #163 resuelve un UserProfile del propio usuario. No acredita que ese usuario pertenezca a un Commerce como empleado o colaborador. Por tanto, no debe usarse como sustituto de BusinessMembership.

**Conclusión:** los permisos de membresía deben tener alcance commerceId y evaluarse junto al contexto validado. No se deben añadir permisos globales a UserPermission para simular permisos por comercio: un permiso global podría filtrarse a otros comercios del mismo usuario.

### 3. Plan, rubro y capacidades

Hay tres supuestos actuales que cambiarían al introducir miembros:

- CapabilitiesService.resolve() considera que existe comercio cuando user.commerce existe; no reconoce membresías.
- ModuleAccessGuard tiene bypass para Role.NORMAL, ADMIN y SUPERADMIN. Un miembro con rol global NORMAL no puede heredar ese bypass para saltarse el plan del comercio.
- PlanLimitsService resuelve suscripción, categoría y preferencias de módulos usando el userId autenticado. Para un miembro, el plan y las preferencias deben proceder del comercio/propietario, mientras que sus permisos deben proceder de su membresía.

**Conclusión:** la membresía no debe cambiar User.role ni convertir a un colaborador en propietario. El contexto debe exponer al menos commerceId, ownerUserId, rol/estado de membresía y alcance; los límites comerciales se calculan desde el propietario/comercio.

### 4. Consultas directas al propietario

Se encontraron lecturas directas de Commerce.userId fuera del resolvedor, entre ellas:

- PlanLimitsService (plan, configuración de módulos).
- CommerceSettingsStrategy.
- FreelancerSettingsStrategy.
- WalletLimitsService.
- MenuService.assertOwnerCanPublish.
- NotificationsGateway.
- ConversationsService.
- BusinessReportsService.
- resolutores de pagos y procesos de perfiles.

No todas deben convertirse en consultas de membresía: algunas representan titularidad, pagos, cobros, creación del comercio o destinatario legal. Cada una debe clasificarse como:
1. **resolución de acceso** (debe usar contexto/membresía),
2. **titularidad/facturación** (debe conservar Commerce.userId),
3. **notificación** (debe decidir destinatarios según el evento),
4. **provisión/migración** (debe seguir usando propietario canónico).

No hacer reemplazos globales de where userId.

### 5. Sucursales: no habilitar alcance por sucursal todavía

Branch solo tiene commerceId. Los recursos operativos principales (pedidos, productos, caja, gastos, empleados, entregas, etc.) no tienen una relación de sucursal uniforme que permita imponer un scope real de punta a punta. Employee tampoco tiene branchId.

**Conclusión:** la primera implementación de membresías debe operar a nivel de comercio completo. No ofrecer roles limitados a sucursales ni aceptar un branchId como frontera de autorización hasta que cada dominio que lo necesite tenga FK/relación, filtros de consulta y pruebas propios.

## Diseño propuesto

### Identidad y titularidad

- Mantener Commerce.userId como propietario canónico y único.
- Añadir CommerceMembership para usuarios colaboradores; no crear una segunda fila de propietario.
- La membresía debe incluir commerceId, userId, rol de comercio, estado, quién la concedió y marcas de tiempo de aceptación/revocación.
- Employee continúa como expediente laboral. Una cuenta puede tener o no un registro Employee; ambos conceptos no se sincronizan implícitamente.
- Un miembro revocado o suspendido no debe poder resolver el comercio ni siquiera si conserva un activeCommerceId antiguo.

### Invitaciones

- Invitación vinculada a commerceId, correo normalizado, rol propuesto, actor invitador, hash de token, expiración y estado.
- Token aleatorio de un solo uso; almacenar solo su hash. No devolver el token en respuestas de listado.
- Aceptación autenticada: el correo de la cuenta debe coincidir con el correo invitado y estar verificado.
- Aceptar y crear la membresía en una transacción; consumir la invitación de forma condicional para impedir doble aceptación concurrente.
- Cancelar, expirar, reenviar y revocar deben ser operaciones auditables e idempotentes.
- El invitador debe ser propietario o miembro con permiso explícito para administrar miembros.

### Contexto activo de comercio

- El usuario puede pertenecer a más de un comercio; por tanto, no se debe escoger el primero arbitrariamente.
- Añadir una preferencia activeCommerceId solo si se valida en backend contra propiedad o membresía ACTIVE en cada resolución.
- Si el usuario tiene exactamente un comercio accesible y no seleccionó contexto, se puede inferirlo sin persistirlo.
- Si tiene varios y no hay contexto válido, responder HTTP 409 y exigir selección.
- Nunca confiar en un commerceId enviado por body/query/header sin verificar la relación del usuario con ese comercio.

### Autorización y plan

- Separar RBAC de plataforma de permisos por comercio.
- Definir roles de membresía y una matriz explícita de permisos de comercio. Los overrides individuales deben estar ligados a la membresía, no solo al userId.
- Resolver primero el contexto; luego comprobar permiso para esa membresía y ese comercio.
- El plan, límites y preferencias comerciales se calculan desde el comercio/propietario, nunca desde el plan gratuito o el rol global del miembro.
- Acciones de titularidad (transferir propiedad, cerrar comercio, cambiar facturación/cuenta de cobro) permanecen exclusivas del Commerce.userId hasta diseñar un flujo explícito de transferencia.

## Fases de implementación

### Fase A — membresía e invitación (sin acceso operativo todavía)

- Modelos CommerceMembership y CommerceInvitation.
- Estados y restricciones únicas para impedir membresías duplicadas e invitaciones pendientes duplicadas por comercio/correo.
- Invitaciones con token hash, expiración, aceptación transaccional y verificación de correo.
- API del propietario para listar, invitar, cancelar, cambiar rol y revocar.
- API del invitado para previsualizar y aceptar.
- Auditoría de actor, comercio, miembro, rol anterior/nuevo y operación.
- La membresía creada no concede acceso a módulos hasta completar la Fase B.

### Fase B — contexto y permisos por comercio

- Contexto activo validado y CommerceResolverService consciente de membresías.
- Capacidad HAS_COMMERCE derivada del contexto autorizado, no de user.commerce solamente.
- Permisos por membresía y guard que falle cerrado si falta contexto o membresía.
- Integración con ModuleAccessGuard y PlanLimitsService para no saltarse plan/categoría ni aplicar el plan personal del miembro.
- Mantener Commerce.userId como propietario para cobros, plan y titularidad.

### Fase C — aislamiento de recursos

- Revisar cada controlador/servicio que lee o muta recursos con id.
- Preferir consultas compuestas (where id + commerceId) frente a findUnique(id) seguido de una validación tardía.
- En creación, tomar commerceId del contexto del servidor; ignorar cualquier commerceId libre del DTO.
- En actualizaciones relacionadas, validar que todos los IDs asociados (producto, sucursal, cliente, empleado, conductor, caja) pertenecen al mismo comercio.
- Cubrir listados, detalle, mutación, borrado, exportación, métricas, adjuntos, websockets y notificaciones.

### Fase D — sucursales (posterior)

- No activar hasta que los dominios operativos elegidos tengan una relación branchId consistente.
- Diseñar asignaciones de miembros a sucursales y definir explícitamente si el alcance es una, varias o todas.
- Aplicar filtros de sucursal en cada query y mutación, además de filtros por comercio.
- Probar que un miembro de A1 no puede leer ni mutar recursos de A2, y que ningún miembro de A puede acceder a B.

## Pruebas obligatorias antes de habilitar acceso multi-comercio

1. Usuario sin membresía no puede seleccionar ni resolver un comercio ajeno.
2. Membresía INVITED, SUSPENDED o REVOKED no concede acceso.
3. Revocación inmediata: un miembro pierde acceso en la siguiente petición, incluso con contexto activo cacheado.
4. Miembro de A no puede leer, crear, editar, borrar, exportar ni obtener métricas de B.
5. IDs cruzados en DTO (producto A + comercio B, cliente A + pedido B, etc.) se rechazan.
6. Dos membresías activas requieren selección explícita; no se elige por orden de base de datos.
7. Role.NORMAL con membresía no obtiene bypass de plan ni de permisos.
8. El plan del comercio se aplica a todos sus miembros; el miembro no usa su plan personal para alterar límites del comercio.
9. El propietario mantiene acceso aunque no exista una fila CommerceMembership.
10. Concurrencia: dos aceptaciones de una invitación, revocación frente a petición activa e invitaciones duplicadas.
11. WebSocket y notificaciones no permiten entrar a commerce:<id> ni recibir datos sin membresía vigente.
12. Las operaciones de titularidad/facturación siguen limitadas al propietario canónico.

## Criterio de salida

No declarar multi-comercio listo ni retirar la advertencia de propietario 1:1 hasta que las Fases A, B y C estén implementadas, todas las pruebas negativas pasen y la auditoría de los call sites directos de Commerce.userId esté documentada. La Fase D permanece deshabilitada hasta que los recursos soporten sucursal real.
