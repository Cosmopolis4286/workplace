# Consultas preliminares de servicios

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

## Privacidad

El teléfono proporcionado en la consulta se guarda como dato privado y el endpoint de consultas recibidas lo devuelve como null. No se comparte con el prestador en esta etapa y todavía no se considera verificado. El mensaje y la respuesta rechazan datos de contacto mediante NoContactInfo, para mantener la conversación dentro de WorkPlace.

## Límites y validaciones

- Solo se puede consultar un servicio activo.
- No se puede consultar el propio servicio.
- La modalidad debe coincidir con las ofrecidas por el servicio.
- Una consulta abierta o respondida impide duplicar otra consulta para el mismo servicio.
- Se limita a cinco consultas por usuario en diez minutos.
- La respuesta solo puede enviarla el propietario del servicio y se aplica mediante actualización condicional de estado para evitar respuestas simultáneas.

## Flujo posterior

La conversión a contratación formal debe ser una operación explícita e idempotente. Debe verificar KYC aprobado en servidor, reconstruir los datos comerciales desde el catálogo, conservar la trazabilidad entre consulta y contratación y solo entonces habilitar el flujo de negociación/pagos. Esta conversión no forma parte de esta primera fase.

## SMS / OTP

No se activa ni se contrata un proveedor SMS en esta fase. El teléfono se mantiene privado y no verificado. La integración de verificación telefónica se tratará por separado cuando se decida el proveedor y las condiciones comerciales.