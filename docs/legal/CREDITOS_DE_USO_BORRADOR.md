# Créditos de uso: borrador de condiciones y preguntas para el abogado

> **Borrador para revisión legal.** No es una opinión jurídica ni está listo para publicar. Debe revisarlo un abogado venezolano (regulación bancaria/de pagos, consumidor y tributario) y un contador antes de usarlo o de encender `USAGE_CREDITS_ENABLED`.

Contexto técnico: `docs/MARKETPLACE_CREDIT_MONETIZATION_REVIEW.md`.

## 1. Cómo funcionaría (descripción fáctica para el dictamen)

- El prestador o comercio compra un paquete de **créditos de uso** pagando a una cuenta de la empresa (pago móvil o transferencia). Un administrador confirma el pago.
- La empresa emite factura por la venta. Concepto propuesto: "servicios de intermediación tecnológica prepagados".
- Los créditos se consumen automáticamente al aceptar una oportunidad (cargo por oportunidad) y al completar un servicio (comisión de éxito).
- **El cliente paga el servicio directo al prestador.** La empresa no recibe ni retiene ese dinero (el Pago Protegido está desactivado).
- Los créditos no se transfieren a otros usuarios, no se retiran ni se convierten en dinero, y solo sirven para pagar cargos de la propia plataforma.
- Puede haber créditos promocionales (bonos). Se llevan separados de los comprados, se consumen primero y vencen.

## 2. Preguntas que debe responder el dictamen

1. **Calificación regulatoria:** con el funcionamiento descrito, ¿la venta anticipada de créditos puede considerarse captación de fondos, instrumento de pago, valor almacenado o servicio de pago sujeto a Sudeban o a la normativa del BCV para proveedores no bancarios de servicios de pago? ¿Qué límites de diseño evitan esa calificación (montos máximos, vigencia, uso exclusivo)?
2. **Reembolsos:** ¿es válida una cláusula de no reembolso frente a la legislación de protección al consumidor y de contratos de adhesión? Cubrir:
   - cierre de cuenta por la plataforma;
   - errores de cobro;
   - suspensión del servicio;
   - fallecimiento;
   - créditos comprados y no usados.
3. **Vencimiento:** ¿pueden vencer los créditos **comprados**, o solo los promocionales? ¿Qué plazo y qué aviso hacen falta?
4. **Tributario:**
   - momento de causación del IVA (venta del paquete o consumo);
   - base imponible cuando hay bono;
   - ISLR y retenciones;
   - facturación digital homologada (Providencias SNAT/2024/000102 y 000121);
   - patente municipal.
5. **Relación con el prestador:** cómo dejar claro que el prestador es independiente y es responsable de sus propias obligaciones tributarias por lo que cobra.
6. **Prevención de legitimación de capitales:**
   - identificación (KYC);
   - límites por compra y por mes;
   - conservación de registros.

## 3. Borrador de cláusulas (para editar con el abogado)

**Naturaleza.** Los créditos de uso son unidades de cuenta interna de la plataforma WorkPlace que permiten pagar exclusivamente los cargos de intermediación definidos en estas condiciones (cargo por oportunidad aceptada y comisión por servicio completado). No constituyen dinero, depósito, saldo bancario, medio de pago frente a terceros ni instrumento de inversión.

**Uso exclusivo.** Los créditos solo pueden usarse dentro de la plataforma para los cargos indicados. No pueden transferirse a otros usuarios, venderse, cederse ni usarse para pagar a otros usuarios.

**Sin conversión a dinero.** Los créditos no pueden retirarse ni canjearse por dinero, *salvo en los supuestos de reembolso previstos en la sección "Reembolsos" o exigidos por la ley aplicable*.

**Reembolsos.** *[A definir con el abogado. Propuesta mínima para que la cláusula no sea abusiva:]* la empresa reembolsará el valor pagado por los créditos comprados no consumidos cuando (a) la empresa cierre la cuenta sin causa imputable al usuario, (b) haya un cobro duplicado o erróneo, o (c) la ley lo exija. Los créditos promocionales nunca son reembolsables.

**Créditos promocionales.** Los créditos de regalo (bonos, recompensas) no tienen valor monetario, se consumen antes que los comprados, vencen en el plazo indicado al otorgarse y pueden retirarse si se obtuvieron con fraude.

**Cargos y aceptación.** Antes de aceptar cada oportunidad, la plataforma muestra el cargo por oportunidad y la comisión estimada. El cargo por oportunidad solo se descuenta cuando el prestador acepta expresamente. La comisión se descuenta cuando el servicio se cierra como completado.

**Precio del servicio.** El precio del servicio lo acuerdan el cliente y el prestador, y el cliente lo paga directamente al prestador. WorkPlace no recibe ni custodia ese pago y no es parte de esa compraventa. El prestador es responsable de sus obligaciones legales y tributarias por lo que cobra.

**Facturación.** WorkPlace emite factura por la venta de cada paquete de créditos, conforme a la normativa vigente.

**Errores y disputas.** Si un cargo se descontó por error (oportunidad no recibida, servicio cancelado por causa del cliente, falla de la plataforma), el usuario puede reclamarlo en *[plazo]* y, si procede, se le devuelven los créditos mediante un movimiento compensatorio.

**Cambios.** Los cambios de precios o de condiciones se avisan con *[N]* días de antelación y no afectan los créditos ya comprados ni los cargos ya aceptados.

## 4. Decisiones de producto ya tomadas (para el dictamen)

- Pago Protegido (retención de dinero del cliente): **desactivado** (`PROTECTED_PAYMENTS_ENABLED=false`).
- Recargas a la billetera: cerradas. Los saldos existentes solo pueden retirarse a banco.
- Financiamiento Cashea/Krece: oculto hasta tener integración real.
- KYC obligatorio para comprar en la plataforma.
