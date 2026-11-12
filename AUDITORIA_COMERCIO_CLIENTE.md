# Auditoría: flujo comercio → cliente y billetera por rol

Fecha: 2026-11-01 · Base: `main` @ `2bd3dec`

Alcance: catálogo → pedido → pago (billetera, pago protegido, pago manual, BNPL) → cierre → comisión → estado de cuenta → reportes; billetera de cada rol comparada con el modelo Cashea.

Severidad:
- **C** pierde dinero o ingresos, o lo deja bloqueado.
- **A** datos o reglas incorrectas con impacto real.
- **M** fricción, inconsistencia o deuda técnica.

## Estado de los arreglos (actualizado 2026-11-07)

| Punto | Estado |
|---|---|
| C1 comisión de catálogo sin garantía | ✅ Resuelto: se cobra en todo pedido cerrado (PENDING al estado de cuenta sin garantía; retenida si la hay). |
| C2 comisión del cliente entregada al vendedor | ✅ Resuelto (PR #84 en catálogo con garantía y servicios; catálogo sin garantía en #92). POS ya no cobra comisión. |
| C3 retiro que borraba saldo | ✅ Resuelto en PR #84 (módulo wallet-withdrawals: retiro a banco con aprobación admin). |
| C4 pago con billetera huérfano | ✅ Resuelto en PR #84 (pagos y transferencias con saldo devuelven 410; se paga por operación). |
| C5 deuda vencida | ✅ Corregido el hallazgo: crear productos/servicios y reactivar servicios **ya** estaba bloqueado; faltaba volver a poner productos a la venta (edición, toggle, en bloque). Ahora también está bloqueado. |
| C6 garantías sin salida | ✅ El comprador cancela en PENDING/SEEN; cron con auto-reembolso (3 días) y auto-liberación (7 días), configurables. |
| A1 límites por rol | ✅ Se deducen del perfil (comercio / profesional). |
| A3 stock al cancelar | ✅ Se devuelve el stock y salesCount. |
| A4 totalSpent doble | ✅ Resuelto. |
| A6 comisión en ventas POS | ✅ Decisión del dueño: **no** se cobra comisión sobre las ventas del POS. Se quitó del código. |
| A7 tasas por defecto | ✅ Seed: CATALOG_ORDER 5 % (paga el comercio), SERVICE_REQUEST 10 %. Editables por SUPERADMIN. |
| A8 BNPL | ✅ Decisión: oculto hasta tener credenciales (`BNPL_ENABLED`, apagado por defecto). El webhook ya está endurecido: solo resuelve transacciones PENDING, de forma atómica, y compara el secreto en tiempo constante. |
| M2 KYC | ✅ Decisión: KYC para toda compra. Ya se exige en pedidos de catálogo, solicitudes de servicio y viajes. |
| A9 doble aprobación de depósito | ✅ Resuelto en PR #84. |
| A5 stock del POS | ✅ Vender descuenta el stock (los combos, sus componentes); sin stock suficiente la venta no se bloquea y el stock queda en 0; cancelar o borrar el pedido lo devuelve. |
| A2 conciliación / ingresos de plataforma | ✅ Parcial: la conciliación usa la tabla `Escrow` (servicios y catálogo; HELD + DISPUTED) y separa las comisiones retenidas (entrado − liberado − reembolsado de cada garantía cerrada), visibles en el panel de wallets. Sigue pendiente mover esas comisiones a una cuenta propia de ingresos. Garantías anteriores a la tabla `Escrow` (sep. 2026) no se cuentan: no hay datos de producción. |
| M1 idempotencia de garantías | ✅ Ya resuelto: retención, liberación y reembolso usan referencias deterministas `ESCROW-*` bajo bloqueo de la wallet de sistema y de la fila `Escrow`; un reintento devuelve el movimiento existente y el débito falla en vez de dejar saldo negativo. |
| M3 reportar productos/comercios | ✅ `ReportEntityType` suma `PRODUCT` y `COMMERCE`. Cualquier usuario autenticado reporta desde la tienda pública (no el dueño); un mismo usuario no duplica un reporte abierto. |
| M5 rótulos de garantía | ✅ Los movimientos de un pedido de catálogo dicen "pedido del catálogo" y llevan `metadata.catalogOrderId`. Las referencias `ESCROW-*` (clave de idempotencia) no cambian. |
| M6 usuario de sistema admin | ✅ Se crea con rol NORMAL y desactivado; una migración corrige el existente. |
| M7 pagar el estado de cuenta con saldo | ❌ Descartado: la plataforma no custodia fondos (SUDEBAN). El estado de cuenta se paga por transferencia o Pago Móvil a la cuenta de la plataforma, que es ingreso propio. Además la billetera queda oculta y cerrada (403) mientras `PROTECTED_PAYMENTS_ENABLED` esté apagado. |
| M8 empleados y pedidos | ⚠️ Premisa incorrecta: `Employee` no tiene cuenta de usuario (sin `userId`) y `commerceResolver` solo resuelve al dueño, así que hoy ningún empleado inicia sesión en el comercio. `GET orders/mine` ya usa el mismo resolvedor que `PATCH status`. Acceso de empleados = función nueva (cuentas por comercio), no un bug. |
| A2, M1, M3–M8 | Pendientes. |

---

## 1. El flujo hoy

| Etapa | Qué hace el código | Estado |
|---|---|---|
| Publicación | El comercio crea productos (`menu`) con `forSale`, stock y `bnplEligible`. Se ven en `/catalog/store/:slug`. | OK |
| Pedido (catálogo) | `POST /catalog/orders`: exige JWT + KYC aprobado. Toma precio y nombre del producto real y descuenta stock de forma atómica, packs incluidos. | OK, ver C6/A3/M2 |
| Pago | (a) **Pago protegido**: solo si el comercio activó `requiresEscrowForCatalogOrders`; retiene el saldo de la billetera al crear el pedido. (b) **Pago manual**: el comprador paga a la cuenta del vendedor, reporta la referencia y el vendedor confirma. (c) **BNPL**: solo en pedidos POS. | Parcial |
| Gestión | El comercio pasa el pedido a SEEN / CONTACTED / CANCELLED. Cancelar reembolsa la garantía. | Ver A3 |
| Cierre | Solo el comprador confirma (CONTACTED → CLOSED). Libera la garantía y habilita la reseña verificada. | Ver C6 |
| Disputa | Comprador o comercio, solo en CONTACTED. La resuelve un admin (liberar, reembolsar o dividir). | OK |
| Comisión | `PlatformFeeRate` por tipo, con override por usuario o plan. Payer PROVIDER → cargo en el estado de cuenta semanal (o retenido de la garantía). Payer CLIENT → se suma al precio. | **C1, C2, A7** |
| Facturación al vendedor | Estado de cuenta semanal (lunes). Vence a los 5 días; 48 h después se pausan las publicaciones. El vendedor paga a una cuenta de la plataforma y un admin confirma. | **C5** |
| Comprobantes | `Receipt` no fiscal, solo para pedidos POS. | M4 |
| Reportes | `Report`: pedido de catálogo, solicitud, servicio, pedido POS o general. Los reportes de negocio son estadísticas POS, gastos y empleados. | M3 |

---

## 2. Hallazgos

### Críticos

**C1. Los pedidos de catálogo sin pago protegido nunca generan comisión.**
- `confirmOrderCompletion` (`catalog.service.ts:956`) solo calcula y registra la comisión dentro de `if (order.escrowStatus === 'HELD')`.
- El pago protegido viene desactivado por defecto, así que la mayoría de las ventas del catálogo, incluidas las pagadas por pago manual, quedan sin comisión.
- El pago manual (`manual-payments.service.ts:59`) asume que la comisión "se registra al completar el pedido", y en catálogo eso no ocurre.
- Servicios sí la registra siempre (`services.service.ts:1235`). Catálogo debe hacer lo mismo.

**C2. La comisión que paga el cliente (payer=CLIENT) nunca llega a la plataforma.**
- Catálogo: `escrowAmount = total + fee`. Al liberar, `releaseAmount = escrowAmount` (`catalog.service.ts:976`), así que el comercio recibe también la comisión.
- Servicios: la comisión se suma a `price` (`services.service.ts:1050`) y al liberar se entrega el precio completo.
- POS: la comisión se suma al `total` que el comercio cobra en caja (`orders.service.ts:318`) y no genera ningún `SellerCommissionCharge`.
- En los tres casos, la comisión del cliente termina en manos del vendedor.

**C3. El retiro de billetera borra saldo sin crear una orden de pago.**
- `POST /wallets/me/withdraw` (`wallets.service.ts:273`) debita y registra "Retiro", y nada más.
- No hay solicitud de retiro, cola de admin, cuenta de destino ni estado (pendiente / pagado / rechazado).
- El usuario pierde el saldo y nadie sabe que hay que transferirle. Es la contraparte que falta de `WalletDepositRequest`.

**C4. El "pago con billetera" debita al usuario y no acredita a nadie.**
- `POST /wallets/me/payment` (`wallets.service.ts:453`) acepta `orderId` o `serviceRequestId` sin validarlos.
- Descuenta el saldo y no lo acredita al comercio, no marca el pedido como pagado y no comprueba que el monto coincida.
- El dinero sale del libro sin destino. Hay que eliminarlo o reemplazarlo por un pago contra un pedido real (garantía o transferencia comprador → comercio).

**C5. La deuda vencida no bloquea publicar, y la suspensión se puede deshacer a mano.**
- `hasBlockingDebt()` (`seller-billing.service.ts:352`) no se llama desde ningún otro módulo.
- La notificación promete "No puedes publicar ni activar servicios o productos hasta pagarlo", pero menú, servicios y catálogo no lo verifican.
- Tras la suspensión (`forSale=false` / `PAUSED`), el vendedor puede volver a activar sus productos desde el menú.

**C6. Las garantías pueden quedar retenidas para siempre.**
- Si el comercio nunca pasa el pedido a CONTACTED, el comprador no puede cancelarlo ni disputarlo (`disputeOrder` exige CONTACTED), y su dinero queda en la billetera de garantía.
- Al revés: si el comercio entregó y el comprador nunca confirma, el comercio nunca cobra.
- No hay cron de expiración ni de auto-liberación. Hace falta:
  - que el comprador pueda cancelar en PENDING/SEEN;
  - auto-reembolso si no hay respuesta en N días;
  - auto-liberación N días después de CONTACTED sin disputa.

### Altos

**A1. Los límites de billetera por rol no aplican a comercios ni profesionales.**
- `LIMITS_BY_ROLE` (`wallet-limits.service.ts:14`) usa las claves `FREELANCER` y `COMMERCE`.
- El enum `Role` solo tiene `SUPERADMIN | ADMIN | PROFESIONAL | NORMAL`, y comercio es un *perfil* (`ProfileType.BUSINESS`), no un rol.
- Resultado: comercios y profesionales usan los límites de NORMAL: saldo máximo 2.000, 500 por operación y 1.000 diarios.
- Un comercio no puede recibir depósitos que lo pasen de 2.000. Las liberaciones de garantía, en cambio, no revisan el tope.

**A2. No hay contabilidad de los ingresos de la plataforma.**
- La comisión retenida al liberar una garantía queda en la billetera del usuario de sistema de garantía, mezclada con fondos de terceros.
- La conciliación (`getEscrowReconciliation`, `wallets.service.ts:614`) solo suma `ServiceRequest` en HELD: ignora `CatalogOrder` y las comisiones retenidas, así que mostrará descuadre permanente.
- Falta una billetera o libro de "ingresos de plataforma" y una conciliación basada en la tabla `Escrow`, que ya incluye ambos tipos.

**A3. Cancelar un pedido de catálogo no repone el stock.**
- `updateOrderStatus(CANCELLED)` (`catalog.service.ts:902`) reembolsa la garantía, pero no devuelve el stock ni resta `salesCount`.
- Cada cancelación hace desaparecer inventario e infla "más vendidos".

**A4. Pedidos POS: el `totalSpent` del cliente se suma dos veces.** Se suma en `create` (`orders.service.ts:395`) y otra vez al pasar a DELIVERED (`orders.service.ts:515`).

**A5. Las ventas POS no descuentan inventario.** Solo el catálogo toca `Product.stock`, así que el stock queda desalineado en cuanto el comercio vende por mostrador.

**A6. Comisión de pedidos POS: falta una decisión de modelo e incoherencias de cálculo.**
- Se cobra comisión sobre las ventas propias del comercio en su POS, efectivo de mostrador incluido. Cashea solo cobra sobre las ventas que él financia u origina.
- La base cambia según quién paga: CLIENT se calcula sobre el `subtotal` y PROVIDER sobre el `total` (con impuesto y delivery).
- Al crear, la tasa se resuelve con el `userId` de quien opera (puede ser un empleado); al entregar, con el dueño del comercio.

**A7. Solo hay una tasa configurada por defecto.** El seed de producción solo crea `SERVICE_REQUEST 10% PROVIDER`. `ORDER` y `CATALOG_ORDER` no tienen tasa, así que la comisión es 0 hasta que un SUPERADMIN las configure.

**A8. BNPL (Cashea/Krece) no funciona de verdad.**
- `CasheaAdapter` y `KreceAdapter` delegan siempre al simulador, aunque `isSimulated=false`.
- En producción la resolución simulada está bloqueada, así que un pedido financiado queda PENDING hasta expirar.
- El webhook (`bnpl.service.ts:312`) tiene estos fallos:
  - `status` vacío se interpreta como APPROVED;
  - no hay máquina de estados (puede pasar APPROVED → REJECTED, o marcar PAID un pedido cancelado);
  - no valida el monto;
  - compara el secreto con `===` en vez de una comparación en tiempo constante.
- Solo existe para pedidos POS, no para el checkout del catálogo.

**A9. Aprobar un depósito tiene una condición de carrera.**
- `review()` (`wallet-deposit-requests.service.ts:99`) lee PENDING, acredita y después marca APPROVED, fuera de una transacción.
- Dos aprobaciones simultáneas acreditan dos veces: la referencia `DEPOSIT-REQ-<id>` no es única.
- Se arregla con un `updateMany where status=PENDING` como cerrojo, que es el mismo patrón que ya usa `settleReport`.

### Medios

- **M1. Las operaciones de garantía no son idempotentes ni atómicas con el pedido.**
  - `releaseEscrow` y `refundEscrow` no tienen referencia única, y el pedido se actualiza después, fuera de la transacción: un fallo intermedio seguido de un reintento libera dos veces.
  - `GREATEST(balance - x, 0)` en la billetera de sistema oculta sobregiros en vez de fallar.
- **M2. KYC obligatorio para comprar en el catálogo.** Es mucha fricción para un pedido sin pago o con pago manual. Cashea pide identidad al registrarse, pero no un KYC revisado por un admin. Se podría exigir KYC solo con pago protegido o por encima de un monto.
- **M3. No se puede reportar un producto ni un comercio.** `ReportEntityType` no tiene `PRODUCT` ni `COMMERCE`, así que el contenido publicado del catálogo no se puede moderar.
- **M4. Los documentos no son fiscales.**
  - Los pedidos de catálogo no generan comprobante.
  - El estado de cuenta de comisiones no es una factura.
  - Ningún documento es fiscal SENIAT (ya está documentado en el schema). Para cobrar comisiones formalmente hará falta una factura de la plataforma al comercio (imprenta digital homologada).
- **M5. Los movimientos de garantía de un pedido de catálogo se rotulan mal.** Aparecen como "Garantía retenida para solicitud de servicio", con `metadata.serviceRequestId`.
- **M6. El usuario de sistema de garantía tiene `Role.ADMIN`.** Aparece en los listados de admins y hereda límites y permisos de admin. Debería tener un tipo `APP` y un rol sin permisos.
- **M7. El estado de cuenta no se puede pagar con el saldo de la billetera.** El comercio tiene saldo en la plataforma y aun así debe transferir afuera para pagar sus comisiones. Cashea, en cambio, descuenta la comisión de lo que liquida.
- **M8. Los empleados no ven los pedidos del catálogo.**
  - `GET /catalog/orders/mine` busca el comercio por `userId` del dueño, así que un empleado no ve nada.
  - En cambio, `PATCH status` sí usa `commerceResolver`, que admite empleados.

---

## 3. Billetera por rol frente al modelo Cashea

**Cómo funciona Cashea (resumen):**
- **Cliente:** tiene una línea de compra según su nivel. Paga una inicial en la tienda y el resto en cuotas quincenales sin interés. Si paga a tiempo, sube de nivel.
- **Comercio:** recibe el 100 % de la venta menos una comisión (MDR), liquidado por Cashea. No asume el riesgo de impago.
- **Plataforma:** otorga el crédito, cobra las cuotas, asume el riesgo y cobra la comisión al comercio.

| Rol | Hoy en WorkPlace | Cashea | Brecha |
|---|---|---|---|
| Cliente (NORMAL) | Billetera **prepaga**: carga con comprobante y aprobación de admin; saldo máximo 2.000. Paga con garantía solo si el comercio la activa. Sin crédito, cuotas ni niveles. | Crédito por nivel, inicial + cuotas. | No hay línea de crédito, plan de cuotas, scoring del comprador ni cobranza. `ReputationScore` solo puntúa a vendedores. |
| Comercio (perfil BUSINESS) | Recibe las liberaciones de garantía en su billetera. Por A1 tiene límites de cliente. Solo puede sacar dinero con el retiro roto (C3). Paga comisiones por fuera, en un estado de cuenta semanal. | Liquidación automática neta de comisión. | Falta el retiro real (payout), los límites propios y la compensación de comisión contra saldo (M7). |
| Profesional (PROFESIONAL) | Igual que el comercio, para servicios. | — | Igual que A1 y C3. |
| Admin | Aprueba depósitos, ajusta, congela billeteras y resuelve disputas. | Back-office de riesgo y cobranza. | No tiene cola de retiros ni libro de ingresos (A2). |
| Plataforma | Intermedia garantías en una billetera de sistema. Las comisiones quedan mezcladas en ella. | Financia y asume riesgo. | Hay que decidir si financia o no (ver abajo). |

**Recomendación de modelo para la v1**
- No construir crédito propio todavía.
  - Prestar implica riesgo de impago, capital y posible regulación financiera. Hay que validarlo con un abogado antes de diseñarlo.
  - El esqueleto BNPL ya existe: lo correcto es **integrar a Cashea/Krece como proveedores** (A8) y llevar esa opción al checkout del catálogo.
  - Así el comercio cobra completo, el riesgo lo asume el proveedor y WorkPlace cobra su comisión de marketplace.
- La billetera queda como **prepaga + garantía**, con cuatro operaciones bien cerradas:
  1. Carga con aprobación (existe).
  2. Pago de un pedido con garantía (existe).
  3. **Retiro con solicitud y aprobación** (falta).
  4. Compensar comisiones contra el saldo (falta).
- Un crédito propio estilo Cashea queda como una fase 2, con su propio diseño:
  - límite por nivel;
  - plan de cuotas;
  - cobranza y mora;
  - provisión de pérdidas.

---

## 4. Orden de arreglo propuesto

1. **C3 + C4.** Crear solicitudes de retiro (con aprobación de admin) y eliminar el `me/payment` huérfano. Hoy borran dinero.
2. **C1 + C2 + A7.** Cobrar siempre la comisión de catálogo y separar la comisión CLIENT al liberar o registrar el cargo. Definir las tasas de `ORDER` y `CATALOG_ORDER`.
3. **C6.** Cancelación del comprador, expiración y auto-liberación de garantías (un cron).
4. **C5.** Bloquear publicar y activar productos con deuda vencida (`hasBlockingDebt` en menú y servicios).
5. **A1, A3, A4, A9.** Arreglos acotados con tests.
6. **A2 + M1.** Libro de ingresos de plataforma, conciliación sobre `Escrow` y referencias únicas.
7. **A8.** Ocultar BNPL en producción hasta tener la API real de Cashea, y endurecer el webhook.
8. **A5, A6, M\*.** Según las decisiones de producto.

## 5. Decisiones que necesito del dueño

- ¿Se cobra comisión sobre las ventas POS propias del comercio, o solo sobre las ventas originadas en el marketplace (catálogo, servicios)? (A6)
- Tasas iniciales de `ORDER` y `CATALOG_ORDER`, y quién las paga (cliente o comercio).
- ¿Pago protegido obligatorio en el catálogo, o opcional como hoy?
- Plazos de garantía: ¿cuántos días hasta el auto-reembolso si el comercio no responde, y hasta la auto-liberación si el comprador no confirma?
- ¿KYC obligatorio para comprar, o solo para pagar con garantía o por encima de un monto? (M2)
- ¿BNPL en la v1 (con credenciales reales de Cashea) o se oculta hasta tenerlas?
