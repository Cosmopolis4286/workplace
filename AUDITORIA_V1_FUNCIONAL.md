# Auditoría v1 funcional — qué falta para lanzar

Fecha: 2026-11-12 · Base: `main` en `edb46c7` (PR #105).

Objetivo: lista corta y priorizada de lo que falta **implementar, corregir o cerrar** para una
primera versión que funcione en producción. Separa lo que es código (lo puedo hacer yo) de lo
que es configuración o decisión del dueño.

Resumen: el código de los flujos de v1 está completo y probado. **Lo que impide lanzar no es
código: producción no se actualiza desde el 2 de noviembre** y faltan configuraciones y
revisiones legales.

---

## 🔴 Bloqueantes

### B1. Producción lleva 10 días sin desplegarse

Ningún deploy terminó desde el PR #84 (2-nov). Producción **no tiene** la billetera solo
retiro, el estado de cuenta con IVA, el interruptor de Pago Protegido, el chat, el filtro de
datos de contacto ni las demás correcciones de #84 a #105.

| Causa | Estado |
|---|---|
| Los E2E publicaban los puertos 3000/3001/5432/6379 en el host. El runner self-hosted es la misma PC donde corre producción: `Bind for 0.0.0.0:3001 failed: port is already allocated` (run 594). | **Corregido en este PR**: el compose de E2E ya no publica puertos; todo va por la red interna de Docker. |
| Runner `DESKTOP-40TQG6I-workplace` apagado o desconectado (PC suspendida, Docker Desktop cerrado). Los runs quedan en cola y se cancelan cuando entra el siguiente merge. | **Dueño**: dejar la PC, WSL y Docker Desktop encendidos durante el deploy (unos 40 min) y relanzar *Production Deploy* desde Actions. |

### B2. Al desplegar: migraciones y seed

- Las migraciones se aplican solas en el deploy. Son varias (estado de cuenta, garantías,
  créditos, conversaciones, ajustes de plataforma): **hacer backup antes**.
- Después: `seed:prod` (o `--production`) para crear la comisión por defecto `CATALOG_ORDER`
  5 % a cargo del comercio y los ajustes de plataforma.

### B3. Configuración de producción (dueño)

- **Cuentas de cobro de la plataforma** en `/billing-admin`. Sin ellas, los vendedores no
  tienen dónde pagar el estado de cuenta semanal, y el bloqueo por deuda los pausaría sin
  que puedan pagar.
- `MAIL_*`: verificación de correo, recuperación de contraseña y copias de avisos.
- `FIREBASE_*` en el backend y `google-services.json` en la APK, para push.
- `USE_DEMO=false`, `NUXT_PUBLIC_API_URL`, `TELEGRAM_WEBHOOK_SECRET`.
- Un SUPERADMIN creado por variable de entorno (bootstrap) y no con usuarios de demo.

### B4. Legal y fiscal (dueño, con abogado y contador)

- Términos v2.1: pagos directos, comisiones con IVA, Pago Protegido apagado, billetera solo
  retiro y, **nuevo en este PR**, la cláusula de comunicación dentro de la plataforma (prohíbe
  compartir datos de contacto y cerrar tratos por fuera).
- **Factura fiscal de las comisiones.** El estado de cuenta suma IVA, pero emitir factura
  válida en Venezuela requiere imprenta digital autorizada por el SENIAT. Hay que confirmar
  con el contador la alícuota, el IGTF según moneda y el proveedor de facturación **antes de
  cobrar el primer estado de cuenta**.
- Créditos de uso (`docs/legal/CREDITOS_DE_USO_BORRADOR.md`): siguen apagados hasta el
  dictamen. **No bloquean la v1.**

### B5. Prueba manual de humo en producción

Con dos cuentas reales (cliente y vendedor), recorrer:

1. Registro, verificación de correo y KYC.
2. Publicar un servicio y un producto. Pedir cuenta de cobro activa.
3. Solicitud de servicio: chat sin datos de contacto, propuesta de precio, pago directo
   reportado, confirmación y cierre a las 72 h.
4. Pedido de catálogo: chat, marcar entregado, autocierre y comisión en el estado de cuenta.
5. Generar un estado de cuenta (lunes), pagarlo a la cuenta de la plataforma y confirmarlo
   desde admin.
6. Reportar un problema y responder por chat desde `/reports-admin`.
7. Retiro de billetera (si hay saldo heredado) y aprobación por SUPERADMIN.
8. Borrar cuenta desde la app y desde la URL web (requisito de Google Play).

---

## 🟡 Importante (no bloquea, conviene antes o justo después del lanzamiento)

| # | Hallazgo | Tipo |
|---|---|---|
| I1 | **La suite E2E es solo un humo** (`e2e-tests/tests/basic.spec.ts`: carga de páginas y health). Ningún flujo de dinero o pedidos se prueba de punta a punta en CI. Agregar 3 flujos: login, pedido de catálogo y solicitud de servicio. | Código |
| I2 | **Bundle del frontend**: un chunk de 8,7 MB (`Cm1Vkz8y.js`) que la PWA no guarda en caché. Primera carga lenta en móvil y datos caros. Identificar la librería (probablemente PDF, Excel o IA) y cargarla bajo demanda. | Código |
| I3 | La **billetera** sigue en el menú aunque, con Pago Protegido apagado, los usuarios nuevos siempre la verán en 0. Mostrarla solo si hay saldo o si el interruptor está encendido. | Código |
| I4 | **Conciliación bancaria manual**: los admins confirman cada referencia a mano (pagos del estado de cuenta y créditos). Sirve para el volumen inicial; definir quién lo hace y en cuánto tiempo. | Operación |
| I5 | Decisión pendiente: exigir KYC para **cualquier** retiro o permitir retiros pequeños sin KYC. | Producto |
| I6 | Las acciones de GitHub usan Node 20, ya deprecado (`actions/setup-node@v4` en las acciones compuestas). Hoy solo es un aviso; actualizar a v5. | Código |
| I7 | Formato: `terms.vue` y el compose de E2E no pasan `prettier --check` (ya era así antes; CI no lo valida). | Código |

## 🟢 Apagado a propósito (post-v1)

Ninguno de estos aparece en la UI ni acepta operaciones nuevas mientras su interruptor esté
apagado:

- **Pago Protegido / custodia** (`PROTECTED_PAYMENTS_ENABLED`): necesita un aliado autorizado
  por SUDEBAN/BCV.
- **BNPL Cashea/Krece** (`BNPL_ENABLED`): adaptadores simulados; falta el contrato y las
  credenciales reales.
- **Créditos de uso y cobro por contacto** (`USAGE_CREDITS_ENABLED`): esperan el dictamen
  legal. Falta la aceptación explícita del cobro por contacto en el flujo de servicios.
- **Módulos de COMMERCE interno** (POS, caja, empleados, sucursales): activos y auditados, pero
  no son el foco de la v1.

## ✅ Verificado como cerrado

- Comisión de catálogo siempre, aun sin garantía. Sin comisión en ventas POS propias.
- Bloqueo por deuda del estado de cuenta y reactivación al pagar.
- Billetera: sin recargas ni transferencias; retiros con aprobación.
- KYC exigido en compras de catálogo, servicios, corridas y retiros (`KycApprovedGuard`).
- El proveedor no ve el teléfono ni el correo del cliente; la dirección solo desde
  `CONTACTED`. El chat rechaza datos de contacto y oculta los de mensajes viejos.
- Chat en pedidos, solicitudes y reportes. Contacto público de la tienda configurable por el
  admin y por el comercio.
- Cancelación por el comprador, devolución de stock y plazos automáticos de pedidos.
- Términos, privacidad, soporte y borrado de cuenta publicados.

> En delivery propio del comercio, el repartidor ve el teléfono del cliente. Es aceptable:
> son empleados del comercio y el dato es del comercio (POS), no un contacto que la plataforma
> intermedia.
