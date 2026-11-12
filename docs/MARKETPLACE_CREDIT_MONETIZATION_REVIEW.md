# Evaluación técnica: monetización Marketplace y créditos de uso

Fecha: 2026-11-07  
Rama: `docs/marketplace-credit-monetization-review`  
Base: `main`

## Estado de implementación (2026-11-12)

Implementado detrás de `USAGE_CREDITS_ENABLED` (apagado por defecto, pendiente del dictamen legal):

- `GET /services/requests/:id/lead-fee-quote`: el proveedor ve el cargo por oportunidad (tramos de `leadFeeUnits`), la comisión estimada, el total y su saldo de créditos.
- `POST /services/requests/:id/accept` con `{ policyVersion, leadFee }`:
  - exige que coincidan con la cotización vigente;
  - exige saldo para el cargo más la comisión estimada.
  - En una sola transacción:
    - reclama la solicitud (`PENDING|SEEN → CONTACTED`, con `updateMany` condicionado);
    - registra el historial;
    - guarda el consentimiento en `ServiceLeadAcceptance` (versión, importes, base, referencia única);
    - descuenta `LEAD-SVC-{id}` en créditos.
- Con el interruptor encendido, el PATCH genérico ya no puede pasar a `CONTACTED`. Devuelve `LEAD_FEE_ACCEPTANCE_REQUIRED`.
- Al cerrar, si la solicitud tiene aceptación y no hay garantía retenida:
  - la comisión real (`FEE-SVC-{id}`) se registra `COLLECTED` y se descuenta en créditos (`SUCCESS-SVC-{id}`), en la misma transacción;
  - sin saldo suficiente, cae al estado de cuenta semanal: al cliente no se le bloquea el cierre.
- Frontend: "Aceptar solicitud" abre la cotización con consentimiento explícito y un enlace para comprar créditos.

Pendiente de producto y legal antes de encenderlo:
- devolución del cargo por oportunidad (contacto inválido, duplicado, fraude); `reverse` ya existe en la fachada;
- texto de términos del cargo;
- validar la economía unitaria (cargo + comisión).

## Objetivo

Evaluar cómo incorporar a WorkPlace una monetización para servicios originados en el marketplace, con cargos por adquisición/asignación de oportunidades, comisión por servicio completado y recompensas de fidelización, sin duplicar los dominios financieros existentes ni mezclar dinero de terceros con ingresos de la plataforma.

Este documento es una decisión técnica preliminar, no una opinión legal, tributaria ni regulatoria.

## 1. Hallazgos del código actual

WorkPlace ya dispone de infraestructura relevante:

- `PlatformFeesService`: resuelve tasas globales, overrides por usuario/plan y calcula comisiones con `Decimal`.
- `SellerBillingService`: registra cargos idempotentes por referencia, emite estados de cuenta semanales y gestiona pagos/deuda del vendedor.
- `ExternalPaymentIntent`: orquesta pagos externos y mantiene separados importe base, comisión y neto del vendedor. Incluye clave de idempotencia, estados, comisiones, reembolsos, liquidaciones y webhooks.
- `ManualPaymentsService`: contempla pago directo a una cuenta del vendedor; WorkPlace no recibe ni custodia el importe del servicio.
- `ServiceRequest` y `CatalogOrder`: ya tienen sus propios ciclos de vida, pagos y reglas de comisión.
- `Review` / WorkPlace Score: ya existe infraestructura de reputación.

Por tanto, no se debe crear una segunda wallet, un segundo ledger monetario, otro motor de comisiones ni otro sistema de órdenes.

### Decisión previa documentada que debemos preservar

La auditoría `AUDITORIA_COMERCIO_CLIENTE.md` recomienda no construir crédito propio en la v1. La billetera existente tiene funciones de prepago/garantía y antecedentes de conciliación; el estado de cuenta semanal es el mecanismo actual para cobrar comisiones a proveedores. La arquitectura de pagos externos, además, declara expresamente que no constituye una wallet ni autoriza a WorkPlace a custodiar fondos de terceros.

El nuevo modelo debe partir de estas decisiones y solo cambiarlas mediante una decisión de producto y revisión legal explícitas.

## 2. Evaluación del modelo propuesto

### 2.1 Pago del servicio directamente al proveedor

Es compatible técnicamente con el flujo de pago manual/directo existente, siempre que:

- el proveedor sea el beneficiario real y verificado del pago;
- la plataforma no presente como recibido un pago que no haya verificado;
- el cliente vea claramente quién presta el servicio, quién cobra y quién responde por el comprobante/factura del servicio;
- los eventos y referencias de pago se registren sin contabilizar el importe del proveedor como ingreso propio de WorkPlace.

El hecho de que el dinero no pase por una cuenta de WorkPlace no determina por sí solo la clasificación legal, fiscal o regulatoria de la actividad.

### 2.2 Créditos prepagados de uso

No implementar todavía paquetes cobrados por adelantado ni afirmar que son automáticamente «licencias de software», dinero no regulado o una actividad fuera del alcance de Sudeban.

Antes de habilitarlos, obtener un dictamen venezolano que responda, como mínimo:

1. Si la compra anticipada de unidades consumibles para pagar cargos variables de marketplace puede considerarse saldo, instrumento de pago, valor almacenado, captación u otra actividad regulada, atendiendo a su funcionamiento real y no solo al nombre contractual.
2. Tratamiento de saldos no utilizados, caducidad, cancelación de cuenta, errores de cobro, contracargos, fraude y reembolsos obligatorios.
3. Momento de causación del ingreso, reconocimiento contable, emisión de factura, base imponible e IVA aplicable a cada componente.
4. Retenciones, ISLR, deberes formales y obligaciones municipales que correspondan.
5. Requisitos de identificación, prevención de legitimación de capitales, protección al consumidor, publicidad y contratos de adhesión que resulten aplicables.

La cláusula «no reembolsable» no debe contradecir derechos imperativos del consumidor ni utilizarse para eliminar obligaciones legales.

### 2.3 Cargo por oportunidad/lead y comisión de éxito

El plan plantea dos cargos diferentes. Deben tener conceptos, reglas y comprobantes separados:

- **Cargo por oportunidad aceptada:** solo se devenga cuando el proveedor acepta explícitamente una solicitud que le fue asignada y recibe los datos/posibilidad de contacto definidos en las condiciones. Una asignación fallida, rechazada, expirada, duplicada o retirada antes de la aceptación no debe consumir el cargo.
- **Comisión por servicio completado:** se devenga una sola vez cuando la orden alcanza un estado final verificable de éxito, sujeto a cancelaciones, disputas, fraude y reversos definidos.

No cobrar ambos por defecto sin validar la economía unitaria y mostrar al proveedor el costo total antes de aceptar. La suma de ambos cargos puede convertirse en una comisión efectiva mucho mayor que la tasa anunciada.

La implementación deberá usar referencias únicas por evento y transacciones atómicas para impedir dobles cargos ante reintentos, webhooks concurrentes o cambios de estado repetidos.


### 2.3.1 Ciclo real de ServiceRequest y punto correcto del cargo

La implementación actual no tiene un estado `ASSIGNED` ni `ACCEPTED`. Su máquina de estados es:

```text
PENDING ──> SEEN ──> CONTACTED ──> CLOSED
   │          │          │
   ├──────────┴──> REJECTED
   └─────────────> CANCELLED
```

- `PENDING`: la solicitud ya fue creada y notificada al proveedor. No equivale a una aceptación.
- `SEEN`: el proveedor abrió/visualizó la solicitud. Tampoco equivale a aceptar el trabajo.
- `CONTACTED`: el proveedor inició contacto y el sistema considera que existe un trato abierto. Es el primer candidato a representar la aceptación comercial, pero hoy no exige una confirmación explícita y separada del proveedor sobre una tarifa de lead.
- `CLOSED`: el cliente confirma que el servicio terminó; es el punto donde hoy se registra la comisión de éxito.
- `REJECTED` / `CANCELLED`: salidas tempranas, antes de `CONTACTED`.

**Conclusión:** no debemos cobrar un lead en `PENDING` ni en `SEEN`. Tampoco debemos asumir que `CONTACTED` es consentimiento suficiente para un nuevo cargo sin ajustar la UX y los términos. La solución correcta es introducir una aceptación explícita e informada de la tarifa de oportunidad, registrada con timestamp, versión de tarifa y referencia de solicitud. Solo después de esa aceptación se podrá devengar el cargo.

El flujo actual de precio puede retener garantía al actualizar la solicitud, y la finalización confirma la comisión existente. El nuevo cargo no debe alterar ni duplicar esos efectos secundarios. La aceptación del cargo de oportunidad y su registro deben ser una operación atómica/idempotente, separada de la comisión de éxito.

**Hallazgo de consistencia en el cierre actual:** la inspección de `confirmServiceRequestCompletion` muestra que hoy se registra la comisión mediante `chargeProviderFee` antes de ejecutar `escrow.release`, y solo después se actualizan `ServiceRequest.status=CLOSED` y su historial. Esas operaciones no forman una única transacción. Si la liberación falla, el cargo puede quedar registrado mientras la solicitud sigue en `CONTACTED`; si falla la actualización posterior, la garantía puede haberse liberado sin que la solicitud quede cerrada. La referencia idempotente evita duplicar el cargo, pero no resuelve estos estados parciales.

El PR de infraestructura transaccional de billing (#94) añade la posibilidad de escribir el cargo con un `Prisma.TransactionClient` y notificar después del commit; **no vuelve atómico por sí solo el flujo completo de escrow + wallet + solicitud**. Antes de cambiar la comisión de éxito o habilitar cargos por lead, hace falta diseñar una orquestación recuperable (estados intermedios/outbox y reconciliación) que coordine la liberación de fondos, el cargo y el cierre, con pruebas de fallos entre cada paso. No se debe describir el flujo actual como atómico.

### 2.4 Recompensas y cupones

- Los puntos de reputación deben permanecer separados de cualquier saldo monetario o crédito de consumo.
- Una racha puede conceder visibilidad, beneficios de tarifa o unidades promocionales sujetas a reglas claras; no debe crear un derecho de retiro o conversión a dinero.
- Los cupones deben tener emisor, patrocinador, presupuesto, vigencia, ámbito, límite de uso y responsable del descuento. Un cupón cofinanciado por un comercio debe reflejar esa financiación y su conciliación.
- No registrar el valor nominal de un cupón como efectivo recibido ni como ingreso hasta que el tratamiento contable correspondiente lo permita.

## 3. Arquitectura recomendada por etapas

### Etapa 0 — Revisión legal y de producto (bloqueante para vender créditos)

Entregables:
- dictamen legal/regulatorio venezolano;
- matriz fiscal y contable validada por contador venezolano;
- términos de servicio y política de cancelación/reembolsos revisados;
- definición comercial de quién es el proveedor contractual del servicio;
- decisión aprobada sobre si el producto puede vender unidades prepagadas y bajo qué límites.

No activar cobros reales de créditos antes de cerrar esta etapa.

### Etapa 1 — Monetización sin saldo prepagado (compatible con el diseño actual)

1. Mantener pago del servicio directamente al proveedor cuando ese sea el método elegido.
2. Reutilizar `PlatformFeesService` y `SellerBillingService` para la comisión de éxito; no crear otro motor.
3. Diseñar el cargo por oportunidad como un tipo de cargo de marketplace separado, con una referencia idempotente y reglas de aceptación/rechazo/expiración.
4. Mostrar al proveedor la tarifa efectiva y el importe estimado antes de aceptar.
5. Separar cargos devengados, facturados, pagados, disputados y reversados.
6. Mantener el importe del servicio, la comisión de plataforma y los impuestos en conceptos separados.

### Etapa 2 — Créditos de uso, solo si existe aprobación legal

Si el dictamen confirma que el producto es viable, diseñar un módulo de derechos de uso (entitlements), no una wallet monetaria genérica:

- paquetes/versiones con precio, moneda, unidades, vigencia y condiciones publicadas;
- lotes de unidades adquiridas y promocionales separados;
- libro inmutable de concesiones, consumos, expiraciones y reversos;
- consumo atómico e idempotente asociado a una obligación concreta;
- prohibición técnica de transferir, retirar, convertir o usar unidades para pagar a otro usuario, salvo que el dictamen autorice expresamente otro alcance;
- trazabilidad entre orden, cargo, lote consumido y comprobante fiscal;
- reglas explícitas para fallos de asignación, cancelaciones, disputas y errores de plataforma.

La separación de unidades adquiridas y promocionales es necesaria para auditar promociones, vencimientos y obligaciones, no para atribuirles automáticamente un tratamiento fiscal distinto.

### Etapa 3 — Fidelización

Reutilizar reputación/reviews donde corresponda y agregar un dominio de promociones/cupones solo después de definir presupuesto, emisor, cofinanciación, caducidad y contabilización.

## 4. Reglas técnicas no negociables

- No modificar ni reutilizar la wallet actual como si fuera un monedero de créditos de marketplace.
- No mezclar importes de terceros con ingresos de plataforma.
- No usar `Float` para importes, tasas o porcentajes; usar `Decimal` y reglas de redondeo existentes.
- Toda operación de consumo/cargo debe ser atómica e idempotente.
- No permitir saldos negativos ni correcciones silenciosas.
- Guardar snapshots de tarifa, moneda, base de cálculo y versión de condiciones al crear el cargo.
- Toda reversión debe crear un movimiento compensatorio auditable; nunca editar o borrar el movimiento original.
- No activar cobros reales mediante flags por defecto ni introducir cargos retroactivos.
- Mantener compatibilidad con RBAC, perfiles múltiples, KYC y límites de dominio actuales.
- Añadir pruebas de concurrencia, duplicados, reintentos, cancelaciones, disputas, reversos y reconciliación.

## 5. Orden de implementación propuesto

1. Documentar y aprobar el modelo comercial/legal (este documento).
2. Auditar los puntos exactos donde `ServiceRequest` asigna, acepta, completa, cancela y disputa.
3. Diseñar el cargo por oportunidad como concepto separado del cargo de éxito, reutilizando billing y sin modificar aún el flujo de pagos.
4. Implementar tests unitarios e integración para idempotencia, concurrencia y transiciones válidas.
5. Implementar el cargo de oportunidad detrás de un feature flag apagado, sin habilitarlo para producción hasta aprobar tarifas, términos y pruebas.
6. Implementar paquetes de créditos únicamente tras la aprobación legal de Etapa 0.
7. Incorporar promociones/cupones con conciliación y presupuesto.

## 6. Criterios de aceptación antes de producción

- El proveedor conoce y acepta cada tarifa antes de que se devengue.
- Un evento de asignación/aceptación repetido no genera cargos duplicados.
- Una orden completada repetidamente solo genera una comisión.
- Una cancelación o disputa aplica la política publicada y deja trazabilidad.
- Los reportes distinguen GMV/importe del proveedor, ingresos de plataforma, impuestos, cargos pendientes, cargos cobrados y reversos.
- La conciliación puede reconstruir cada saldo/cargo desde sus movimientos.
- Los comprobantes y facturas reflejan el servicio y la comisión según el criterio validado por asesoría venezolana.
- La función permanece desactivada si falta configuración legal, fiscal o comercial obligatoria.


## 8. Especificación de implementación del cargo por oportunidad

La inspección del código confirma que hoy el proveedor puede pasar de `PENDING` o `SEEN` directamente a `CONTACTED` mediante `PATCH /services/requests/:id` o `PATCH /services/requests/:id/status`. Ese salto no registra aceptación de una tarifa nueva.

### Contrato de API propuesto

No reutilizar el PATCH genérico como consentimiento implícito. Incorporar un comando explícito:

- `GET /services/requests/:id/lead-fee-quote`: solo proveedor propietario; devuelve si la función está habilitada, política/versionado, moneda, importe y explicación del cargo. No crea cargos.
- `POST /services/requests/:id/accept-lead-fee`: solo proveedor propietario; exige confirmación explícita y una versión de política vigente. Devuelve la aceptación persistida y la transición a `CONTACTED`.
- El PATCH genérico no podrá realizar `PENDING|SEEN -> CONTACTED` cuando la política de lead fees esté habilitada, salvo que exista una aceptación válida para esa solicitud. Con la función desactivada, se conserva el comportamiento actual.

### Persistencia requerida

La aceptación debe guardar como mínimo:

- solicitud y proveedor;
- fecha/hora del consentimiento;
- identificador y versión de política;
- importe y moneda exactos presentados;
- snapshot de la base/tarifa usada para el cálculo;
- referencia única del cargo y estado de facturación.

No basta un booleano mutable en `ServiceRequest`: el consentimiento y el cargo necesitan trazabilidad auditable. La restricción única debe impedir más de un cargo por solicitud y tipo de evento.

### Cobro y consistencia

El cargo debe usar `SellerBillingService.recordCharge` (estado de cuenta semanal) y no la wallet. La referencia de idempotencia propuesta es `LEAD-SVC-{serviceRequestId}`; la comisión de éxito conserva su referencia actual `FEE-SVC-{serviceRequestId}`. El reporte debe distinguir ambos conceptos aunque compartan el ciclo de facturación del proveedor.

**Bloqueo técnico antes de activar cobros:** `recordCharge` realiza una lectura y creación idempotente, pero no acepta un cliente transaccional de Prisma. La aceptación de consentimiento, la transición de estado y el registro del cargo no deben componerse como tres escrituras independientes: un fallo intermedio puede dejar una solicitud aceptada sin cargo o un cargo sin aceptación. Antes de habilitar el cobro se debe incorporar una operación transaccional en el límite de dominio (o un patrón outbox con consumidor idempotente), con unicidad en base de datos y pruebas de concurrencia. No se debe resolver con compensaciones silenciosas.

### Requisitos de producto aún no definidos

- importe fijo del lead y moneda de referencia;
- reglas de conversión cuando el estado de cuenta se pague en otra moneda;
- si se cobra al aceptar el contacto o solo cuando el cliente confirma que recibió respuesta;
- cancelación/reembolso del lead ante contacto inválido, datos incorrectos, duplicado o fraude;
- texto de consentimiento y pantalla que muestre el cargo antes de aceptarlo.

Hasta resolver estos puntos, el endpoint y el cobro no deben desplegarse como activos. No se debe inferir el precio del lead a partir de la comisión de éxito ni reutilizar automáticamente el mismo porcentaje.

## 9. Decisión de alcance para el siguiente PR de código

1. Primero extraer una operación transaccional de facturación para poder registrar cargos desde el mismo `Prisma.TransactionClient`, conservando la idempotencia y notificación posterior al commit.
2. Agregar pruebas para referencia duplicada, dos aceptaciones concurrentes, fallo entre persistencia y transición, y reintento después de timeout.
3. Agregar el comando de aceptación explícita y el feature flag apagado por defecto.
4. Habilitar el cargo solo cuando exista importe aprobado, consentimiento visible y revisión legal/contable.
5. Mantener los créditos prepagados fuera de esta entrega. La Etapa 2 requiere su propio modelo de lotes/ledger y aprobación jurídica previa.

## 7. Fuentes internas revisadas

- `README.md`: arquitectura del monorepo y dominios existentes.
- `CONTRIBUTING.md`: reglas de migraciones, tests y límites de dominio.
- `WORKPLACE_VISION.md`: perfiles, marketplace y modelo de ecosistema.
- `AUDITORIA_COMERCIO_CLIENTE.md`: estado de wallet, comisiones, pagos directos, escrow y recomendación de no construir crédito propio en v1.
- `backend/src/domains/money/platform-fees/platform-fees.service.ts`.
- `backend/src/domains/money/seller-billing/seller-billing.service.ts`.
- `backend/src/domains/money/payments/payments.service.ts`.
- `backend/src/domains/money/payments/manual/manual-payments.service.ts`.
- `backend/prisma/schema.prisma`: pagos externos, comisiones, liquidaciones y estados relacionados.
