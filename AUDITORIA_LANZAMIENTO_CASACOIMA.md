# Lanzamiento v1: trabajador autónomo y pequeño comercio en Casacoima (Delta Amacuro)

Fecha: 2026-11-15. Base: `main` en `b6c44ae` (PR #116).

## El contexto que manda

Supuestos de diseño, por validar en campo con 10 o 20 emprendedores reales:

- **Conectividad débil e intermitente** (datos móviles lentos, señal que va y viene) y
  **cortes de luz**. El teléfono es el único dispositivo; Android de gama baja con poco
  espacio.
- **Se paga con Pago Móvil y con efectivo** (bolívares y dólares). Pocos usan Zelle o tarjeta.
- **WhatsApp es el canal de todo**: los clientes ya compran por WhatsApp y estados.
- Direcciones informales; muchas comunidades se mueven por río (curiara o lancha) entre
  Sierra Imataca, Piacoa, Santa Catalina y las parroquias del municipio.
- Mercado pequeño: lo que importa es que el emprendedor **venda más y lleve sus cuentas**,
  no un marketplace con miles de vendedores.

## 🔴 Bloqueantes para lanzar en Casacoima

| # | Problema | Por qué bloquea | Solución propuesta |
|---|---|---|---|
| L1 | **Producción no se despliega**: los deploys fallan en los E2E. | Nada de lo hecho está en línea. | **Corregido en este PR**: el arreglo de puertos ya funcionó y el nuevo fallo era `EACCES` en `/app/test-results`. Falta que el runner esté encendido. |
| L2 | ✅ **Corregido.** **No existía "efectivo" como forma de cobro** (`SellerPaymentMethod`: Pago Móvil, transferencia, Zelle). Publicar exige una cuenta de cobro activa. | Quien solo cobra en efectivo **no puede publicar**, y el cliente no puede elegir "pago al recibir". | Agregar **Efectivo (Bs/USD) al entregar**, que no requiere cuenta bancaria. La comisión se registra igual cuando el vendedor confirma. |
| L3 | **KYC obligatorio para cualquier compra** (foto de cédula y selfie). | Es la mayor fricción para un cliente rural que solo quiere pedir una arepa o un servicio: subir fotos con mala señal. | KYC obligatorio para **vendedores** y para retiros. Para compradores, solo con teléfono verificado hasta un monto, y KYC por encima. Requiere tu decisión. |
| L4 | ✅ **Corregido** (el bloque más grande quedó en 473 KB). **Bundle de 8,7 MB** (`country-state-city`, catálogo mundial de países y ciudades) que la app no guarda en caché. | Con datos lentos, abrir el perfil o el buscador descarga 8,7 MB **cada vez** que no está en caché. | Usar solo las ubicaciones de Venezuela que ya están en la base (52 KB, incluye las parroquias de Casacoima). |
| L5 | ✅ **Corregido** (Estado → Municipio → Ciudad del catálogo VE). **El buscador filtraba por ciudades del catálogo mundial**, no por las parroquias venezolanas. | "Piacoa" o "Santa Catalina" probablemente no aparecen, y la búsqueda local es el centro del producto. | Filtro por estado → municipio → parroquia con `ve-locations`. |
| L6 | **Configuración pendiente**: push (Firebase), correo y cuentas de cobro de la plataforma. | Sin push, el vendedor no se entera de un pedido con la app cerrada. Sin cuentas de cobro, no puede pagar su estado de cuenta. | Tú: configurar `FIREBASE_*`, `MAIL_*` y cargar las cuentas en `/billing-admin`. |

## 🟡 Importante para que funcione en la zona

| # | Mejora | Detalle |
|---|---|---|
| M1 | **Modo sin conexión básico** | Ver mi catálogo, mis pedidos y mi caja sin señal; las acciones (venta POS, marcar entregado) se guardan en el teléfono y se envían al volver la señal. Hoy la PWA guarda las pantallas pero no los datos ni las acciones. |
| M2 | **Precio doble USD/Bs a tasa BCV** | La tasa BCV ya se sincroniza (`bcv-sync`). Mostrar los dos precios en el catálogo y en el ticket, con redondeo configurable. |
| M3 | **Fiado / cuentas por cobrar simple en el plan Gratis** | El módulo `accounts` existe pero solo está en Pro y Enterprise. En bodegas, el fiado es el día a día. |
| M4 | **Entrega por zona y por río** | Delivery y corridas piensan en calles y GPS. Agregar "lancha/curiara" como vehículo, costo por parroquia o sector, y "punto de encuentro" (muelle, plaza) en vez de dirección exacta. |
| M5 | **Registro asistido** | Un "promotor" local registra al emprendedor en 5 minutos y la verificación se revisa después. Sin esto, la adopción depende de que cada persona se las arregle sola. |
| M6 | **APK liviano y distribución directa** | Revisar el tamaño del APK. Además de Play Store, permitir descargarlo desde la web y compartirlo por WhatsApp (muchos teléfonos no tienen cuenta de Google al día). |
| M7 | **Plan fundador** | 5 % de comisión puede pesar en márgenes chicos. Ofrecer 0 % o 2 % los primeros 3 meses a los primeros 50 negocios de Casacoima y medir. |

## ¿WhatsApp o Telegram?

**Sí, apoyarse en los dos, pero para cosas distintas, y no como reemplazo del chat.**

| | WhatsApp | Telegram |
|---|---|---|
| Uso en la zona | El canal principal: todos lo tienen. | Minoritario. |
| Costo | La API oficial (Cloud API de Meta) cobra por conversación iniciada por la empresa y exige verificar el negocio y aprobar plantillas. | Bot gratis e ilimitado; ya hay un bot en el código (avisos a clientes del POS). |
| Datos | Liviano. | Muy liviano. |
| Riesgo | Si la conversación de venta se va a WhatsApp, se pierde la comisión y la protección (por eso se bloquean los teléfonos en el chat). | El mismo. |

**Recomendación:**

1. **WhatsApp para crecer, no para conversar.** Botón "Compartir mi tienda/servicio por
   WhatsApp" con un enlace a la tienda pública y una imagen lista para el estado. Es
   marketing gratis: el cliente entra a WorkPlace y pide por ahí, y la comisión queda
   registrada.
2. **Avisos por WhatsApp (opcional, de pago)** solo para eventos clave ("tienes un pedido
   nuevo", "tu pedido fue entregado"), cuando el push no llegue. Empezar con plantillas
   aprobadas y medir el costo por aviso.
3. **Telegram como canal de avisos gratis** para el vendedor que lo use: generalizar el bot
   actual para que cualquier usuario reciba sus avisos (pedidos, estado de cuenta). Cuesta
   poco y funciona con mala señal.
4. **La conversación y el pago se quedan dentro de la app** (chat interno con datos de
   contacto bloqueados), como ya está.

## Funciones que harían la app valiosa para el emprendedor

En orden de impacto estimado:

1. **"Mi tienda en un enlace"** para compartir por WhatsApp: catálogo con precios en $ y Bs,
   pedido en 2 toques y "pago al recibir". Es lo que más se parece a como ya venden.
2. **Caja del día en una pantalla**: cuánto vendí hoy en efectivo, en Pago Móvil y fiado, y
   cuánto gasté.
3. **Fiado con recordatorio**: quién me debe y cuánto, con recordatorio al cliente por
   WhatsApp o Telegram.
4. **Inventario simple con alerta de "se está acabando"** (ya existe el stock mínimo).
5. **Agenda de servicios** para autónomos (técnicos, belleza, transporte), con recordatorio
   al cliente.
6. **Reputación local**: reseñas y "verificado" para generar confianza en un pueblo donde
   todos se conocen.
7. **Precios mayoristas y compras agrupadas** entre bodegas: traer mercancía desde Tucupita
   o Barrancas entre varios (el módulo de compra agrupada existe).
8. **Directorio por parroquia**: "¿quién repara motores fuera de borda en Piacoa?".

## Orden sugerido

1. **Ya:** desplegar (L1) y configurar (L6).
2. **Código, antes del piloto:**
   - Efectivo (L2);
   - KYC proporcional (L3), según tu decisión;
   - quitar los 8,7 MB (L4);
   - buscador por parroquia (L5);
   - "Mi tienda en un enlace" con botón de WhatsApp.
3. **Piloto** con 20 negocios y 2 promotores en Casacoima durante 4 semanas: medir pedidos
   por negocio, abandono en el registro y fallos por conexión.
4. **Después del piloto:**
   - modo sin conexión (M1);
   - fiado en Gratis (M3);
   - entrega por río (M4);
   - avisos por Telegram y WhatsApp;
   - plan fundador (M7).
