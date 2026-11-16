# Verificación telefónica con Messangi

## Estado

La integración inicial está preparada detrás de una configuración explícita. No se activa por defecto y no debe habilitarse en producción hasta que el equipo tenga credenciales válidas, un remitente aprobado y pruebas de entrega satisfactorias en Movilnet, Movistar y Digitel.

## Arquitectura

- `PhoneVerificationService` genera códigos aleatorios de seis dígitos.
- El código no se almacena en texto plano: Redis conserva un HMAC-SHA256 ligado al usuario y al teléfono.
- El desafío vence a los cinco minutos.
- Se permiten cinco intentos de validación por desafío.
- Se limita el envío a tres códigos por usuario y hora y cinco por teléfono y hora; además se aplican límites por IP en el controlador.
- El teléfono se escribe en `User.phone` y `User.phoneVerifiedAt` únicamente después de validar el código.
- La API de Messangi se consume con Bearer token mediante `POST https://elastic.messangi.me/raven/v3/messages`, con `from`, `to` E.164, `text` y `type: MT`.
- Los errores del proveedor no exponen credenciales, códigos ni números completos en logs o respuestas.

## Variables de entorno

Configurar únicamente en el gestor de secretos del entorno:

| Variable | Uso |
| --- | --- |
| `MESSANGI_SMS_ENABLED` | Interruptor explícito; mantener `false` hasta completar las pruebas |
| `MESSANGI_API_KEY` | API key de Messangi |
| `MESSANGI_SMS_FROM` | Remitente/shortcode aprobado por Messangi |
| `PHONE_OTP_SECRET` | Secreto aleatorio independiente, mínimo 32 caracteres |

No guardar credenciales reales en el repositorio ni en archivos de ejemplo compartidos.

## Endpoints autenticados

- `POST /auth/phone/send-verification` con `{ "phone": "+584121234567" }`
- `POST /auth/phone/verify` con `{ "code": "123456" }`

Se aceptan números móviles venezolanos normalizados a E.164. La respuesta de envío devuelve un destino parcialmente enmascarado y el tiempo de expiración.

## Migración

Ejecutar `pnpm prisma:migrate:deploy` desde `backend` para agregar `users.phoneVerifiedAt`, y regenerar Prisma Client durante el proceso habitual de build/deploy.

## Antes de activar en producción

1. Obtener y guardar la API key y el remitente asignado por Messangi.
2. Confirmar con Messangi rutas y entrega para Movilnet, Movistar y Digitel, incluidos números portados.
3. Probar recepción real, latencia, reintentos y recibos de entrega con números de prueba autorizados.
4. Confirmar tarifas por segmento; el texto OTP debe mantenerse corto y en alfabeto GSM para evitar segmentos Unicode más costosos.
5. Configurar límites y alertas de gasto.
6. Revisar duplicados históricos en `User.phone` antes de introducir una restricción única a nivel de base de datos.

## Límites de esta fase

- La verificación telefónica no sustituye KYC y no modifica los guards existentes de contratación, pedidos, retiros ni otras operaciones.
- No se ha conectado todavía `phoneVerifiedAt` a la política de acceso progresivo ni al panel administrativo.
- La API solicita recibo de entrega (`requestDR: true`), pero el webhook de estados de Messangi aún no está implementado.
- La unicidad de teléfonos se comprueba en la aplicación; antes de exigirla como invariante global hay que auditar y sanear duplicados preexistentes.
