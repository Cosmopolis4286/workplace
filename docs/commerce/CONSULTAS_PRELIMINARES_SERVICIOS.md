# Consultas preliminares de servicios

## Validación de formato

El formato del backend se valida mediante Prettier en CI.

## Estado de esta entrega

La primera fase incluye alta, bandeja y respuesta de consultas. La conversión a contratación formal queda para la siguiente fase.

## Objetivo

Separar el primer contacto entre un cliente y un prestador de la contratación formal. Una consulta preliminar permite preguntar por disponibilidad, modalidad y alcance sin crear una ServiceRequest, cobrar comisiones, consumir créditos ni iniciar Pago Protegido.

## Política de acceso

- Requiere una sesión autenticada (JwtAuthGuard).
- No requiere KYC aprobado para consultar.
- No habilita pagos, retiros, escrow ni una contratación.
- La contratación formal continúa en POST /services/requests con JwtAuthGuard y KycApprovedGuard.
- El backend deriva el prestador del propietario real del servicio. Nunca confía en un providerId recibido del cliente.
- La contratación formal obtiene nombres, precio y unidad del catálogo y la identidad del cliente del usuario autenticado.

## API

| Método | Ruta | Uso |
|---|---|---|
| POST | /services/requests/inquiries | Crear consulta preliminar |
| GET | /services/requests/inquiries/mine?as=client | Consultas enviadas |
| GET | /services/requests/inquiries/mine?as=provider | Consultas recibidas |
| PATCH | /services/requests/inquiries/:id/respond | Responder como prestador propietario |
| PATCH | /services/requests/inquiries/:id/status | Cancelar (solicitante) o cerrar (cualquiera de los participantes) |

## Privacidad

El teléfono y la dirección exacta se guardan como datos privados. En la bandeja del prestador y en la respuesta HTTP de su endpoint de respuesta ambos se devuelven como null; la ciudad puede mostrarse como ubicación general. El cliente conserva sus propios datos. El mensaje y la respuesta rechazan datos de contacto mediante NoContactInfo, para mantener la conversación dentro de WorkPlace.

## Límites y validaciones

- Solo se puede consultar un servicio activo.
- No se puede consultar el propio servicio.
- La modalidad debe coincidir con las ofrecidas por el servicio.
- Una consulta abierta impide duplicar otra consulta para el mismo servicio. Un índice único parcial en PostgreSQL garantiza esta regla incluso ante altas simultáneas; los duplicados históricos se conservan como CANCELLED durante la migración. Después de una respuesta se puede iniciar una nueva consulta.
- Se limita a cinco consultas por usuario en diez minutos.
- Los parámetros de paginación se validan como enteros seguros y el límite permitido es de 1 a 100.
- La respuesta solo puede enviarla el propietario del servicio y se aplica mediante actualización condicional de estado para evitar respuestas simultáneas.
- El solicitante puede cancelar una consulta en estado OPEN o RESPONDED. Cualquiera de los dos participantes puede cerrarla en esos mismos estados.
- El endpoint recibe acciones explícitas CANCEL o CLOSE; nunca acepta un estado arbitrario del cliente.
- Las transiciones se aplican con updateMany condicional. Si una petición concurrente ya aplicó el mismo estado, la repetición responde idempotentemente y no vuelve a notificar.
- Se notifica al prestador al crear una consulta, al cliente cuando el prestador responde y al participante contrario cuando se cancela o cierra. Las notificaciones no incluyen teléfono, dirección ni contenido privado.

## Conversación preliminar

El chat de las consultas utiliza el sistema genérico existente `ConversationMessage` mediante el tipo `SERVICE_INQUIRY`; no crea una segunda infraestructura de mensajería. Solo pueden acceder el solicitante y el propietario real del servicio. Se bloquean teléfonos, correos y enlaces de contacto; los mensajes históricos también se muestran con datos de contacto redactados. Las consultas cerradas o canceladas conservan el historial en modo de solo lectura.

Las notificaciones llevan a la bandeja de consultas con el ámbito correcto (recibidas o enviadas). Esta conversación sigue siendo preliminar: no crea una contratación, no inicia pagos y no cambia los requisitos KYC.

## Flujo posterior

La conversión a contratación formal debe ser una operación explícita e idempotente. Debe verificar KYC aprobado en servidor, reconstruir los datos comerciales desde el catálogo, conservar la trazabilidad entre consulta y contratación y solo entonces habilitar el flujo de negociación/pagos. Esta conversión no forma parte de esta primera fase.

## SMS / OTP

No se activa ni se contrata un proveedor SMS en esta fase. El teléfono se mantiene privado y no verificado. La integración de verificación telefónica se tratará por separado cuando se decida el proveedor y las condiciones comerciales.