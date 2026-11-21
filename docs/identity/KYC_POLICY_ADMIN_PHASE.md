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
| Contactar proveedor | PHONE_VERIFIED |
| Solicitud formal de servicio | KYC_APPROVED |
| Pedido de catálogo | KYC_APPROVED |
| Publicar servicios/productos | KYC_APPROVED |
| Aceptar trabajos remunerados | KYC_APPROVED |
| Crear/aceptar corridas | KYC_APPROVED |
| Solicitar retiros | KYC_APPROVED + controles financieros existentes |

## Importante: límites de activación

Esta fase no retira ni reemplaza `KycApprovedGuard` en endpoints existentes, ni afirma que la verificación telefónica esté operativa en `main`. La política es configurable y evaluable, pero la asociación de cada ruta al evaluador se hará en la fase siguiente, después de integrar y verificar el flujo OTP de teléfono. Los controles financieros existentes permanecen intactos.
