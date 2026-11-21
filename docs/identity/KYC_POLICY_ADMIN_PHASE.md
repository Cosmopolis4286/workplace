# Política KYC progresiva configurable — fase de administración

## Alcance de esta fase

- Añade una política versionada en `PlatformSetting`, sin migración de base de datos.
- Permite configurar requisitos por operación desde Ajustes de la plataforma.
- Mantiene mínimos de seguridad codificados: el panel no puede rebajar requisitos de contratación, pedidos, publicación, trabajos, corridas ni retiros.
- Solo SUPERADMIN puede editar; ADMIN puede consultar.
- Los cambios KYC exigen motivo y generan un evento de auditoría con actor, clave, valor anterior, valor nuevo y motivo.
- Si el valor persistido no cumple el esquema, se devuelve el default seguro.
- Añade un evaluador backend puro respecto al sujeto que recibe, para comparar autenticación, teléfono verificado y estado KYC.

## Niveles

`PUBLIC < AUTHENTICATED < PHONE_VERIFIED < KYC_APPROVED < ENHANCED_REVIEW`

`ENHANCED_REVIEW` no se concede por el mero hecho de tener KYC aprobado: requiere un mecanismo de revisión reforzada que se implementará aparte.

## Operaciones iniciales

| Operación | Mínimo |
|---|---|
| Explorar marketplace | PUBLIC |
| Contactar proveedor | AUTHENTICATED (el admin puede exigir PHONE_VERIFIED si el SMS está activo) |
| Solicitud formal de servicio | AUTHENTICATED |
| Pedido de catálogo | AUTHENTICATED |
| Publicar servicios/productos | KYC_APPROVED |
| Aceptar trabajos remunerados | KYC_APPROVED |
| Crear/aceptar corridas | KYC_APPROVED |
| Solicitar retiros | KYC_APPROVED + controles financieros existentes |
| Crear entregas | KYC_APPROVED |
| Publicar vacantes / postular a empleos | KYC_APPROVED |
| Comprar créditos de uso | KYC_APPROVED |
| Registrar o modificar cuentas de cobro | KYC_APPROVED |

## Importante: límites de activación

La guarda aplica la política en los endpoints clasificados. Los endpoints aún no clasificados conservan la comprobación KYC anterior. La política no permite reducir los mínimos codificados. El nivel `PHONE_VERIFIED` se acredita exclusivamente con `User.phoneVerifiedAt`, escrito por el flujo OTP de Messangi; no se infiere a partir de `User.phone` ni de flags del cliente. Al confirmar el OTP se invalida el caché de usuario para que la nueva marca se refleje en la siguiente petición autenticada. `ENHANCED_REVIEW` sigue fallando de forma segura mientras no exista una aprobación reforzada persistida y auditable. Los controles financieros existentes permanecen intactos.

## Integración de guardas

La política se aplica en backend mediante `@RequireKycOperation` a publicación de servicios, solicitudes formales, pedidos, corridas, entregas, publicación y postulación a empleos, compra de créditos, cuentas de cobro, confirmación con IA y retiros. La consulta preliminar para contactar proveedores (`POST /services/requests/inquiries`) usa `provider.contact`: por defecto basta la sesión y el SUPERADMIN puede exigir `PHONE_VERIFIED` desde Ajustes de la plataforma. Ese nivel solo se puede guardar si el envío de SMS está listo en el servidor (`MESSANGI_SMS_ENABLED=true`, `MESSANGI_API_KEY`, `MESSANGI_SMS_FROM` y `PHONE_OTP_SECRET`; ver `GET /platform-settings/capabilities`); así una configuración incompleta no bloquea a todos los usuarios. Los usuarios verifican su teléfono en Mi perfil (`GET /auth/phone/status`, `POST /auth/phone/send-verification`, `POST /auth/phone/verify`). Las rutas que aún no tienen clasificación conservan la guarda KYC anterior.


## Revisión reforzada — flujo operativo

- Un usuario solo puede solicitarla después de tener `KycStatus.APPROVED`; debe explicar el motivo (20–500 caracteres).
- Existe una solicitud vigente por usuario. No se permiten duplicados pendientes ni nuevas solicitudes mientras haya una aprobación activa.
- La bandeja, aprobación, rechazo y revocación están restringidas a `SUPERADMIN`; `ADMIN` puede seguir gestionando el KYC ordinario, pero no elevar ni revocar este nivel.
- Toda decisión exige un motivo (10–500 caracteres). La aprobación vence por defecto a los 90 días; se puede fijar otra fecha futura hasta un máximo de 365 días.
- Una aprobación se puede revocar con motivo. Rechazos, revocaciones y vencimientos permiten una nueva solicitud.
- Las escrituras de estado y su evento `AuditLog` se realizan en la misma transacción. Si el registro de auditoría falla, la transacción completa se revierte y la decisión no queda aplicada. El registro identifica actor, usuario objetivo, estado anterior/nuevo, motivo y vigencia.
- `KycPolicyService` consulta la fila persistida en cada evaluación protegida. Solo concede `ENHANCED_REVIEW` cuando el estado es `APPROVED`, no ha vencido y el KYC base continúa aprobado. No consume claims JWT ni flags del cliente.
- El usuario gestiona la solicitud desde Mi perfil → Verificación de identidad; SUPERADMIN revisa y revoca desde Administración → Verificaciones de identidad.
