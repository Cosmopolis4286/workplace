# Política de KYC progresivo — WorkPlace Venezuela

**Estado:** decisión de producto aprobada  
**Alcance:** toda Venezuela  
**Estrategia:** KYC progresivo (opción B)  
**Implementación:** por fases; esta política no habilita operaciones hasta que cada control backend y su prueba estén desplegados.

## 1. Principios

1. El KYC identifica a la persona y pertenece a la cuenta `User`, no a cada perfil, comercio o módulo.
2. Explorar el marketplace, consultar catálogos y comparar proveedores no requiere KYC.
3. Las consultas que impliquen iniciar contacto deben requerir cuenta autenticada y teléfono verificado. La verificación telefónica es un requisito nuevo: el modelo actual solo contiene `User.phone` y `User.emailVerified`; no existe un indicador fiable de teléfono verificado ni un flujo OTP/SMS identificado en el backend.
4. Formalizar una contratación, compra o compromiso transaccional requiere KYC aprobado antes de crear la operación.
5. Publicar/ofrecer servicios y aceptar trabajos remunerados requiere KYC aprobado del proveedor.
6. Operaciones monetarias (retiros, cobros, reembolsos manuales y cualquier operación equivalente) mantienen controles de identidad y de autorización reforzados. No se relajarán las guardas financieras como parte de esta migración.
7. Una verificación pendiente o rechazada no equivale a aprobada. La interfaz debe explicar el bloqueo y permitir corregir/reintentar según el estado.
8. El distintivo “Identidad verificada” confirma revisión de identidad; no garantiza calidad, solvencia ni ausencia de riesgo.

## 2. Matriz de acceso objetivo

| Acción | Requisito |
|---|---|
| Ver inicio, buscar, explorar servicios/productos y perfiles públicos | Público; sin KYC |
| Crear cuenta y consultar su estado | Cuenta autenticada; sin KYC |
| Enviar consulta preliminar a un proveedor | Cuenta autenticada + teléfono verificado |
| Responder/gestionar consultas preliminares | Proveedor autenticado; KYC aprobado para continuar hacia contratación remunerada |
| Crear solicitud formal de servicio | KYC aprobado del cliente |
| Crear pedido de catálogo | KYC aprobado del comprador |
| Publicar servicios/productos o activar capacidad de proveedor | KYC aprobado |
| Aceptar/ejecutar trabajos remunerados | KYC aprobado |
| Solicitar/ejecutar retiros y operaciones de saldo | KYC aprobado + controles financieros vigentes |
| Administración y revisión KYC | RBAC administrativo; auditoría de acciones |

## 3. Estado técnico auditado

### Reutilizar

- `User.kycStatus` como estado denormalizado para decisiones rápidas.
- `IdentityVerification` como expediente de verificación asociado a `User`.
- `KycApprovedGuard` como control backend reutilizable, sin crear una segunda fuente de verdad.
- `KycController` y `KycService` para presentación, revisión y consulta de estado.
- Revisión manual desde el panel administrativo existente.

### Hallazgos que condicionan la implementación

- `POST /services/requests` aplica hoy `JwtAuthGuard + KycApprovedGuard`. Crea una `ServiceRequest` con fecha preferida, datos del cliente, descripción, precio e ítems; por tanto no debe convertirse simplemente en una consulta ligera quitando la guarda.
- `POST /catalog/orders` aplica igualmente `KycApprovedGuard`.
- `User` tiene `phone` y `emailVerified`, pero no tiene `phoneVerified`/fecha de verificación ni se encontró un flujo OTP/SMS. No se debe tratar un teléfono escrito por el usuario como verificado.
- La carga de adjuntos de solicitud de servicio usa solo `JwtAuthGuard`; debe mantenerse sin capacidad de crear/comprometer una solicitud y revisarse por cuotas, tipos, tamaño, autorización y limpieza de archivos huérfanos.
- El KYC usa `private-uploads/kyc`, fuera del directorio estático público, y entrega imágenes mediante endpoint autenticado con autorización de propietario o administrador.
- La auditoría v1 anterior documentaba KYC obligatorio al crear solicitudes y pedidos. Esta política sustituye ese criterio de producto, pero los endpoints no deben relajarse hasta que exista el flujo de teléfono verificado y una operación separada de consulta preliminar.

## 4. Secuencia de implementación

### Fase 1 — Identidad telefónica

- Definir proveedor SMS, configuración y límites por teléfono/IP/usuario.
- Añadir estado verificable y fecha de verificación al modelo de usuario, con migración aditiva.
- Implementar emisión, expiración, hash/almacenamiento seguro, consumo único y rate limiting de OTP.
- Impedir enumeración de cuentas y abuso de reenvío; normalizar teléfonos E.164.
- Añadir pruebas unitarias e integración para expiración, intentos, reuso, concurrencia y cambio de número.
- No habilitar la política de consulta hasta completar esta fase.

### Fase 2 — Consulta preliminar separada de la contratación

- Diseñar un recurso/estado explícito de consulta preliminar; no reutilizar `ServiceRequest` con datos incompletos ni simular una contratación.
- Limitar campos y exposición de datos personales; mantener conversación interna y protección anti-contacto.
- Aplicar autenticación + teléfono verificado al crear la consulta.
- Exigir KYC aprobado al convertir/aceptar la consulta como contratación formal, antes de fijar condiciones económicas, agenda o ejecución.
- Definir caducidad, cancelación, rate limits, idempotencia y moderación.

### Fase 3 — Pedidos y operaciones

- Mantener KYC para `CatalogOrder` mientras no exista una consulta preliminar equivalente de catálogo.
- Mantener KYC para creación de operaciones transaccionales y acciones financieras.
- Revisar publicación de servicios/productos, conversión de perfiles profesionales y aceptación de trabajos para asegurar que el control vive en backend, no solo en UI.
- Revisar delivery/corridas, empleos, reembolsos y retiros individualmente según riesgo y exposición de identidad.

### Fase 4 — Experiencia y despliegue nacional

- Unificar mensajes de estado `NONE/PENDING/APPROVED/REJECTED` y acciones siguientes.
- No bloquear navegación por KYC; mostrar el requisito justo antes de la acción que lo necesita.
- Diseñar formularios móviles de baja conectividad, compresión de imágenes, reintentos y estados recuperables.
- Aplicar la misma política a todos los estados de Venezuela; ubicación geográfica no cambia el requisito de identidad.
- Medir conversión, abandono, tiempo de revisión, fraude y tasa de consultas abusivas.

## 5. Criterios de aceptación obligatorios

- No existe endpoint que permita crear una consulta sin autenticación y teléfono verificado.
- Un teléfono no verificado nunca se acepta como verificado por presencia de `User.phone`.
- La consulta preliminar no crea `ServiceRequest`, `CatalogOrder`, escrow, comisión, saldo ni compromiso de pago.
- No se puede convertir una consulta en contratación sin KYC aprobado de las partes que deban identificarse.
- Los endpoints de pedido, publicación, retiro y demás operaciones protegidas conservan validación backend, aunque el frontend oculte/bloquee botones.
- Los cambios de teléfono invalidan la verificación anterior.
- La carga de archivos no permite adjuntos huérfanos ilimitados ni acceso cruzado entre usuarios.
- Tests de autorización positiva/negativa, estados KYC, rate limiting, concurrencia e idempotencia pasan en CI.
- Documentación, mensajes frontend, OpenAPI y pruebas reflejan la misma matriz.

## 6. Decisión de seguridad para la transición

No retirar `KycApprovedGuard` de `POST /services/requests` ni de `POST /catalog/orders` hasta que la nueva consulta preliminar y la verificación telefónica estén implementadas, probadas y desplegadas. El cambio debe ser atómico desde el punto de vista de producto: no dejar una ventana en la que se puedan formalizar operaciones sin KYC.
