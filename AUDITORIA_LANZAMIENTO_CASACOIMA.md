# Lanzamiento v1: trabajador autónomo y pequeño comercio en Casacoima (Delta Amacuro)

Primera versión: 2026-11-15. **Revisada: 2026-11-21**, sobre `main` en `3ffc028` (PR #146).

## El contexto que manda

Supuestos de diseño, por validar en campo con 10 o 20 emprendedores reales:

- **Conectividad débil e intermitente** (datos lentos, señal que va y viene) y **cortes de
  luz**. El teléfono es el único dispositivo: Android de gama baja con poco espacio.
- **Se paga con Pago Móvil y con efectivo** (bolívares y dólares). Pocos usan Zelle o tarjeta.
- **WhatsApp es el canal de todo**: los clientes ya compran por WhatsApp y estados.
- Direcciones informales; muchas comunidades se mueven por río (curiara o lancha) entre
  Sierra Imataca, Piacoa, Santa Catalina y las parroquias del municipio.
- Mercado pequeño: lo que importa es que el emprendedor **venda más y lleve sus cuentas**.

## Estado de los bloqueantes

| # | Bloqueante | Estado |
|---|---|---|
| L1 | Producción se despliega | 🔴 **Abierto y más grave de lo que parecía.** El último deploy exitoso del workflow es del **14 de abril de 2026** (run 385). Desde entonces, todos fallaron o se cancelaron. El último (run 634, 18-nov) falló en "Ejecutar E2E" en 48 s, y el runner se cortó antes de subir los logs. Ver R1 y R2. |
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
| M1 | Modo sin conexión | La PWA guarda las pantallas, no los datos ni las acciones. | Catálogo, pedidos y caja legibles sin señal; ventas POS y "marcar entregado" en cola local que se envía al volver la señal. |
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
   - R3: límite de pedidos sin pagar;
   - M2: precio doble;
   - botón de WhatsApp e imagen para el estado;
   - M8: teléfono verificado;
   - panel de métricas.
3. **Piloto**: 20 negocios y 2 promotores durante 4 semanas.
4. **Después del piloto:**
   - M1: modo sin conexión;
   - M3: fiado en Gratis;
   - M4: entrega por río (en una versión posterior);
   - M5: rol promotor;
   - M7: plan fundador;
   - avisos por Telegram.
