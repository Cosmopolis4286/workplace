# Lanzamiento v1: trabajador autónomo y pequeño comercio en Casacoima (Delta Amacuro)

Primera versión: 2026-11-15. **Revisada: 2026-11-21**, sobre `main` en `6407b66` (PR #147), con
investigación del contexto local (El Triunfo y Sierra Imataca).

## El contexto que manda (investigado el 2026-11-21)

> Fuentes: prensa regional, Wikipedia y estudios publicados. Varias notas son de años
> distintos y los censos no coinciden entre sí: **todo esto se valida en campo** con 10 o 20
> emprendedores y 2 promotores antes del piloto. Las fuentes están al final del documento.

### Quién vive y qué hace

- **Dos poblados casi pegados concentran el municipio.** El Triunfo (unos 11.000 hab.) y
  Sierra Imataca, la capital (unos 10.000), sumaban dos tercios de los ~31.700 habitantes
  de Casacoima en el censo de 2011. Están a unos 10 minutos entre sí.
- **Es una "ciudad dormitorio" de Ciudad Guayana.** Mucha gente trabaja en las empresas
  básicas de Bolívar y viaja a diario a San Félix o Puerto Ordaz. El Triunfo queda a unos
  22 km de Ciudad Guayana, por carretera pavimentada. Buena parte de la población llegó
  desde Sucre.
- **El Triunfo es el "pulmón comercial":** abastos, ferreterías, un mercado de comida
  rápida y una sucursal bancaria. El municipio depende bastante del empleo público.
- **Ingreso frágil.** En noviembre de 2026 hubo protestas y huelgas de hambre de
  trabajadores de la CVG por el pago de utilidades, con jubilados del Delta solidarizados.
  En Venezuela el 88 % de los emprendedores empieza **por necesidad** (GEM Venezuela 2025,
  UCAB).
- **Otras actividades:**
  - ganadería de doble propósito y bufalina;
  - cacao, arroz y plátano;
  - pesca (comercial en las "trojas", de subsistencia en comunidades warao);
  - palmito de manaca;
  - turismo ligado a la Reserva Forestal Imataca.

### Dos segmentos muy distintos

| | **El Triunfo / Sierra Imataca** (núcleo urbano) | **Comunidades del río** (Piacoa, Santa Catalina, caños) |
|---|---|---|
| Acceso | Carretera a Ciudad Guayana; rutas de TransDelta a Tucupita y Maturín. | Por río. Piacoa queda a 63 km de Sierra Imataca, con un embarcadero que funciona como mercado los fines de semana. Santa Catalina no tiene transporte fluvial público: se paga bote privado. |
| Servicios | Los vecinos dicen tener luz, agua y seguridad; hay banco. | Santa Catalina lleva años con fallas de luz, agua y todos los servicios (2026). |
| Combustible | Colas para cargar (en Tucupita, más de 4 h). | La escasez de gasolina y aceite fuera de borda las deja casi aisladas. |
| Población | Mestiza, migrantes de Sucre, gente que viaja a diario. | Muchas comunidades warao, con economía de pesca, moriche y conuco. |

**Conclusión: la v1 es para El Triunfo y Sierra Imataca.** Las comunidades del río (y la
entrega por río) quedan para una versión posterior, como ya se decidió.

### Infraestructura que golpea a la app

- **Cortes de luz más frecuentes y largos**, de 4 a 6 horas seguidas en Tucupita
  (noviembre de 2026). Sin luz también se cae el agua, porque depende de bombas.
- **Telecomunicaciones frágiles.** En febrero de 2026, Movilnet estuvo más de 7 días caída
  en Tucupita. En marzo de 2026, un incendio en Temblador cortó la fibra óptica que lleva
  internet (Meganext) al Delta.
- **Combustible**: colas de más de 4 horas para cargar, lo que encarece el delivery en moto
  y en carro.

### Cómo se paga y cómo se vende

- **Pago Móvil es el medio dominante**: 63 % de las operaciones comerciales según
  Cavecom-e. Según Ecoanalítica, más del 80 % de las operaciones se hacen en bolívares, y el
  uso de divisas bajó a cerca del 10 %, sobre todo en efectivo.
- Los precios se piensan en dólares, pero se cobran en bolívares a la tasa del día.
- **Se vende por redes y mensajería**: Instagram, TikTok y estados de WhatsApp como
  vitrina; el pago se acuerda por chat (efectivo, transferencia o Pago Móvil).

### Qué cambia para la app

1. **El sin conexión pasa de "después" a "antes del piloto" (M1).** Con cortes de luz de
   4–6 h y caídas de días de la operadora, la app tiene que dejar ver catálogo, pedidos y
   caja sin señal, y encolar ventas y "marcar entregado".
2. **Pago Móvil primero, efectivo segundo.** Ambos ya existen. Conviene que el Pago Móvil
   aparezca primero y que el precio en Bs se vea siempre (M2 ya lo muestra en la tienda).
3. **El comprador también está en Ciudad Guayana.** Quien trabaja en San Félix o Puerto
   Ordaz puede pedir en El Triunfo y recoger al volver. Y al revés: **"encargos"**, donde
   alguien que viaja a diario trae mercancía de Guayana, con el módulo de fletes como base.
   El buscador debe poder filtrar Caroní (Bolívar) además de Casacoima.
4. **Comisión y planes para emprendedores por necesidad.** El plan fundador (M7) y el fiado
   en Gratis (M3) pesan más de lo que parecía.
5. **WhatsApp e Instagram como vitrina.** Ya existe "Enviar por WhatsApp" con QR; falta la
   imagen para el estado y un enlace pensado para la bio de Instagram.
6. **Delivery con costo configurable por zona** (El Triunfo ↔ Sierra Imataca ↔ Guayana),
   porque el combustible cambia de precio y de disponibilidad.
7. **Avisos que no dependan de una sola red.** Push cuando hay datos; Telegram o SMS como
   respaldo para "pedido nuevo".

## Estado de los bloqueantes

| # | Bloqueante | Estado |
|---|---|---|
| L1 | Producción se despliega | 🔴 **Abierto y más grave de lo que parecía.** El último deploy exitoso del workflow es del **14 de abril de 2026** (run 385). Desde entonces, todos fallaron o se cancelaron. El último (run 634, 18-nov) falló en "Ejecutar E2E" en 48 s, y el runner se cortó antes de subir los logs. Desde el PR #147 el mismo E2E **pasa en GitHub**: el problema es la máquina del runner. Ver R1 y R2. |
| L2 | Efectivo como forma de cobro | ✅ PR #118: efectivo en Bs o USD al entregar, sin cuenta bancaria. |
| L3 | KYC para cualquier compra | ✅ PR #146: pedir no exige KYC; al pagar, solo por encima de 50 USD (editable). Vender, retirar y las corridas lo siguen exigiendo. |
| L4 | Bundle de 8,7 MB | ✅ PR #118: el bloque más grande bajó a 473 KB y toda la app entra en la caché. |
| L5 | Buscador por catálogo mundial | ✅ PR #118: Estado → Municipio → Ciudad del catálogo venezolano. |
| L6 | Configuración (Firebase, correo, cuentas de cobro de la plataforma) | 🟠 Pendiente de ti. |

## 🔴 Refuerzos críticos (antes del piloto)

### R1. Producción no puede depender de una PC en casa

El deploy corre en el runner `DESKTOP-40TQG6I` (WSL + Docker Desktop). Si la PC se
suspende, se corta la luz o se cae el internet, el deploy se cancela y, peor, **si la PC
también sirve la producción, la app se cae para todos**. En Venezuela los cortes de luz son
justamente el riesgo de fondo.

- **Recomendación:** un VPS (Hetzner, DigitalOcean, Contabo) de 2 vCPU / 4 GB, que cuesta
  entre 5 y 20 USD/mes. Producción y runner van ahí, no en la PC.
- Mínimo inmediato: confirmar dónde corre hoy producción y qué versión tiene.

### R2. ✅ E2E visible y reproducible (PR #147)

Ya corre en GitHub (`ubuntu-latest`) en cada PR, con el reporte de Playwright guardado. **Resultado: en una máquina limpia el E2E pasa**, así que el fallo del deploy viene del entorno del runner en la PC (contenedores viejos, disco, Docker Desktop), no del código. Eso refuerza R1.

#### Contexto original

Hoy los E2E solo corren en el runner self-hosted. Cuando falla, no hay logs (404 al
descargarlos).

- **Propuesta:** correr el mismo E2E en GitHub Actions (`ubuntu-latest`, con Docker) en cada
  PR y subir el reporte de Playwright como artefacto. Un fallo se ve en el PR, antes de
  fusionar, y no en el deploy.
- Las 6 pruebas actuales son de humo (carga de páginas y health). Agregar 3 flujos: pedido
  de catálogo con pago en efectivo, solicitud de servicio y registro.

### R3. ✅ Abuso de pedidos sin verificación (PR #147)

Ya limitado: máximo 3 pedidos sin atender por comercio y 10 en total por comprador. Falta que el comercio pueda bloquear a un comprador.

#### Contexto original

Desde el PR #146, pedir no exige KYC. El catálogo no tiene límite propio de pedidos (solo
el límite global por usuario), así que una cuenta nueva puede inundar a un comercio de
pedidos falsos.

- **Propuesta:** máximo 3 pedidos pendientes sin pagar por comprador y por comercio, y
  máximo 10 en total. El comercio puede bloquear a un comprador.

### R4. Respaldo de la base fuera de la máquina, probado

Ya existen el respaldo (`scripts/database/backup-postgres.sh`) y la copia a Google Drive con
rclone (`scripts/backup/rclone-sync.sh`, configurada con `scripts/setup/setup-google-drive.sh`).
Falta confirmar que rclone esté configurado en la máquina de producción y que la copia corra
a diario, y **hacer una prueba de restauración** en una base vacía antes del piloto. Un
respaldo que nunca se restauró no es un respaldo.

## 🟡 Para que funcione en la zona

| # | Mejora | Estado hoy | Qué falta |
|---|---|---|---|
| M1 | Modo sin conexión (**sube a antes del piloto**: cortes de 4–6 h y caídas de días de Movilnet) | La PWA guarda las pantallas, no los datos ni las acciones. | Catálogo, pedidos y caja legibles sin señal; ventas POS y "marcar entregado" en cola local que se envía al volver la señal. |
| M2 | Precio doble USD/Bs | ✅ PR #147: la tienda pública y el modal del pedido muestran $ y Bs. De paso, los comercios ya no nacen en MXN (no podían cobrar) sino en USD. | Falta mostrarlo también en el ticket del POS. |
| M3 | Fiado en el plan Gratis | El módulo `accounts` solo está en Pro y Enterprise. | Fiado básico en Gratis, sin cuentas por pagar. |
| M4 | Entrega por río (**fuera de esta versión**) | Vehículos de delivery y corridas: moto, bici, carro, pickup, camión, a pie. **No hay lancha ni curiara.** | Agregar "lancha/curiara", costo por parroquia o sector y "punto de encuentro" (muelle, plaza). |
| M5 | Registro asistido | No existe. | Rol "promotor": registra al emprendedor en 5 minutos y la verificación se revisa después. |
| M6 | APK y distribución | `/download` existe. | Medir el tamaño del APK; descarga directa desde la web para compartir por WhatsApp. |
| M7 | Plan fundador | No existe. | 0 % o 2 % de comisión 3 meses para los primeros 50 negocios del municipio. |
| M8 | Teléfono verificado | No hay verificación de teléfono (solo correo y KYC). | OTP por SMS o WhatsApp al registrarse: frena cuentas falsas sin pedir KYC. |

## WhatsApp y Telegram

**Apoyarse en los dos, pero para cosas distintas, y no como reemplazo del chat.**

| | WhatsApp | Telegram |
|---|---|---|
| Uso en la zona | El canal principal. | Minoritario. |
| Costo | La API oficial cobra por conversación iniciada por la empresa y exige verificar el negocio. | Bot gratis; ya existe uno en el código (avisos a clientes del POS). |
| Riesgo | Si la venta se cierra por WhatsApp, se pierden la comisión y la protección. | El mismo. |

1. **WhatsApp para crecer.** ✅ PR #147: `ShareStoreModal` tiene "Enviar por WhatsApp" con un
   texto listo y "Descargar QR". Falta una imagen para el estado con nombre, tres productos y QR.
2. **Avisos por WhatsApp (opcional, de pago)** solo para eventos clave (pedido nuevo, pedido
   entregado) cuando el push no llegue.
3. **Telegram como aviso gratis**: generalizar el bot para que cualquier vendedor reciba ahí
   sus pedidos y su estado de cuenta.
4. **La conversación y el pago se quedan en la app** (chat interno con datos de contacto
   bloqueados, ya extendido a consultas preliminares).

## Funciones de más valor para el emprendedor

1. **"Mi tienda en un enlace"**: ya hay enlace y QR. Falta precio doble (M2), pago al
   recibir visible en la tienda y botón de WhatsApp.
2. **Caja del día en una pantalla**: vendido en efectivo, en Pago Móvil y fiado, y gastado.
3. **Fiado con recordatorio** (M3).
4. **Inventario simple con aviso de "se está acabando"**: el stock mínimo ya existe.
5. **Agenda para autónomos**, con recordatorio al cliente.
6. **Reseñas y "verificado"** para dar confianza local.
7. **Compras agrupadas** entre bodegas (el módulo existe).
8. **Directorio por parroquia.** Hoy el buscador llega a ciudad; los perfiles ya guardan la
   parroquia, falta filtrar por ella.

## Cómo medir el piloto

Las búsquedas sin resultado ya se registran (`recordUnmetSearch`). Antes del piloto, un
panel de admin con:

- negocios activos y pedidos por negocio por semana;
- abandono del registro (registrados sin perfil aprobado);
- búsquedas sin resultado por zona (qué hace falta en cada parroquia);
- pagos en efectivo frente a Pago Móvil, y tiempo hasta confirmar;
- errores de red por usuario (para dimensionar el modo sin conexión).

## Orden sugerido

1. **Esta semana:**
   - R1: dónde corre producción y plan de VPS;
   - R2: E2E con logs en GitHub;
   - R4: confirmar la copia a Google Drive y probar una restauración;
   - L6: configuración.
2. **Antes del piloto (código):**
   - M1: modo sin conexión básico (subió de prioridad por los cortes de luz y de operadora);
   - R3: límite de pedidos sin pagar;
   - M2: precio doble;
   - botón de WhatsApp e imagen para el estado;
   - M8: teléfono verificado;
   - panel de métricas.
3. **Piloto en El Triunfo y Sierra Imataca**: 20 negocios (abastos, comida, ferreterías,
   servicios) y 2 promotores durante 4 semanas. Las comunidades del río quedan fuera.
4. **Después del piloto:**
   - M1 completo (sincronizar POS y caja sin conexión);
   - "encargos" desde Ciudad Guayana con el módulo de fletes;
   - M3: fiado en Gratis;
   - M4: entrega por río (en una versión posterior);
   - M5: rol promotor;
   - M7: plan fundador;
   - avisos por Telegram.

## Fuentes

- Municipio Casacoima: [Wikipedia (es)](https://es.wikipedia.org/wiki/Municipio_Casacoima),
  [Wikipedia (en)](https://en.wikipedia.org/wiki/Casacoima_Municipality),
  [gelvez.com.ve](https://gelvez.com.ve/delta/casacoima/).
- Población por localidad:
  [El Triunfo](https://www.citypopulation.de/en/venezuela/deltaamacuro/casacoima/100204__el_triunfo/),
  [Sierra Imataca](https://citypopulation.de/en/venezuela/deltaamacuro/casacoima/100201__sierra_imataca/)
  (citypopulation.de, censos 2001 y 2011).
- [El Triunfo y Sierra Imataca: el corazón de la "ciudad dormitorio" del Delta Amacuro](https://soynuevaprensadigital.com/npd/el-triunfo-y-sierra-imataca-el-corazon-de-la-ciudad-dormitorio-del-delta-amacuro/) — Soy Nueva Prensa Digital.
- [Sierra Imataca](https://en.wikipedia.org/wiki/Sierra_Imataca,_Delta_Amacuro) — Wikipedia.
- [Hay más apagones y la gente se está molestando en Tucupita](https://www.elmaraisa.com/2026/11/04/hay-mas-apagones-y-la-gente-se-esta-molestando-en-tucupita/) — El Maraisa, 2026-11-04.
- [Los apagones también dejan sin agua a los sectores de Tucupita](https://tanetanae.com/los-apagones-tambien-dejan-sin-agua-a-los-sectores-de-tucupita/) y
  [caída total de Movilnet en Tucupita](https://www.tanetanae.com/usuarios-de-tucupita-reportan-caida-total-del-servicio-de-servicio-de-movilnet/) — Tane Tanae.
- [Santa Catalina tiene 25 años con fallas en luz y agua](https://correodelcaroni.com/region/santa-catalina-de-delta-amacuro-tiene-25-anos-con-fallas-en-luz-y-agua/) — Correo del Caroní;
  [Fallan todos los servicios públicos en Santa Catalina](https://www.costadelsolfm.org/2026/04/fallan-todos-los-servicios-publicos-en-santa-catalina-estado-delta-amacuro/) — Costa del Sol FM, 2026-04.
- [Delta Amacuro quedó abandonado a su suerte: sin agua, combustible ni telecomunicaciones](https://lapatilla.com/2023/04/17/delta-amacuro-quedo-abandonado-a-su-suerte-sin-agua-combustible-ni-telecomunicaciones/) — La Patilla, 2023.
- [Casacoima en emergencia por falta de servicios](https://periodicodeldelta.com/2020/08/03/casacoima-en-emergencia-real-por-falta-de-servicios-y-atencion-verdadera/) — El Periódico del Delta, 2020.
- [Surtir gasolina en Tucupita puede tardar más de cuatro horas](https://confirmado.com.ve/surtir-gasolina-en-tucupita-puede-tardar-mas-de-cuatro-horas/) — Confirmado;
  [Transdelta amplía sus rutas](https://ultimasnoticias.com.ve/delta-amacuro/transdelta-amplia-sus-rutas-en-delta-amacuro/) — Últimas Noticias.
- [Jubilados de la CVG en Delta Amacuro se solidarizan con Puerto Ordaz](https://eldeltano.com/2026/11/04/jubilados-de-la-cvg-en-delta-amacuro-se-solidarizan-con-sus-companeros-de-puerto-ordaz-video/) — El Deltano, 2026-11-04.
- Economía warao y producción en Casacoima: [Proyecto Warao a Ina](https://cissocial.org.ve/wp-content/uploads/2022/06/FormasProductWaraos.pdf),
  [GEO Venezuela, cap. Delta Amacuro](https://bibliofep.fundacionempresaspolar.org/media/1045/gv_t6_c45_p126_197_lres_single_preview.pdf),
  [Catálogo del Patrimonio Cultural](https://albaciudad.org/wp-content/uploads/2017/01/Delta_Amacuro-antoniodiaz-casacoima-pedernales.pdf).
- Pagos en Venezuela: [Pago Móvil, 63 % de las operaciones](https://criptonoticias.com/comunidad/adopcion/pagomovil-63-operaciones-venezuela-compite-usdt),
  [rebolivarización y uso del dólar](https://www.bloomberglinea.com/latinoamerica/venezuela-esta-realmente-ante-una-rebolivarizacion-de-su-economia-el-dolar-sigue-fuerte/),
  [casi el 100 % de las transacciones son digitales](https://lapatilla.com/2026/04/22/casi-el-100-de-las-transacciones-comerciales-que-se-efectuan-en-venezuela-son-digitales/).
- Emprendimiento: [Emprender en redes sociales en Venezuela (GEM 2025, UCAB)](https://eldiario.com/2026/10/18/emprender-en-redes-sociales-vitrinas-comerciales-en-venezuela/) — El Diario, 2026-10-18.
