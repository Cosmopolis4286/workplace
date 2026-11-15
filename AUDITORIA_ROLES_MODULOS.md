# Auditoría: roles, perfiles, rubros, planes, módulos y sidebar

Fecha: 2026-11-15. Base: `main` en `ad33af8`.

## Cómo se decide qué ve cada usuario

Un ítem del sidebar (y su API) aparece solo si se cumplen **cuatro capas**:

1. **Permiso**: lo da el perfil activo (`ProfilePermission`). Ejemplos: `BUSINESS` (comercio)
   o `PROFESSIONAL` (trabajador autónomo). Un usuario con varios perfiles suma los permisos.
2. **Módulo**: `plan.enabledModules ∩ rubro.allowedModules`. Un `PROFESSIONAL` suma siempre
   `services`, `service_requests` y `jobs` aunque su rubro no los traiga.
3. **Capacidad**: si tiene un comercio interno (`Commerce`). Hace falta para productos,
   pedidos, clientes y delivery. A un `PROFESSIONAL` se le crea solo si su rubro vende
   producto (`menu`, `inventory` u `orders`).
4. **Interruptores globales**: `system_modules.enabled` y `/features`.

Los rubros son `UserCategory`; las subcategorías no cambian módulos.

## ¿Un autónomo de comida rápida puede usar el Menú?

**Sí, y el diseño ya lo contempla** (decisión "opción 2" del 2026-09-28). El perfil
`PROFESSIONAL` tiene `menu:*`. El rubro **Comida** incluye `menu`, así que al aprobarse se le
crea su comercio interno.

Matriz real con los datos del seed:

| Rubro Comida, perfil PROFESSIONAL | Ve en el sidebar |
|---|---|
| Plan Gratis | Menú, Servicios, Solicitudes, Pedidos, Clientes |
| Básico | Menú, Pedidos, Clientes, Ventas (antes **sin** Servicios: corregido) |
| Pro | + Delivery, Servicios, Solicitudes |
| Enterprise | + Inventario |

Requisito: que al pedir el perfil elija el rubro **Comida**. Si elige otro rubro (por ejemplo
"Eventos" para catering), no tendrá Menú.

## Corregido en este PR

| # | Problema | Impacto | Corrección |
|---|---|---|---|
| 1 | El rubro **Comercio** (Retail, Mayorista, E-commerce...) no tenía `menu`. | Las tiendas **no podían crear ni ver productos**: `/menu/*` exige el módulo. Inventario salía vacío. | Se agregó `menu` a Comercio (seed + migración) y un test que impide que un rubro que vende quede sin `menu`. |
| 2 | El plan **Básico** (de pago) no incluía `services` ni `service_requests`, que sí trae el Gratis. | Un proveedor que **pasaba de Gratis a Básico perdía Servicios y Solicitudes**. | Se agregaron al Básico. Va como migración porque en producción el seed no modifica planes existentes. |
| 3 | **Caja** exigía un módulo `cash` que no existe en ningún plan ni rubro. | **Caja no le aparecía a ningún comercio.** | Ahora se muestra con el módulo de Pedidos (POS). Incluye test. |
| 4 | Empleados, Sucursales, Agendamientos, Proveedores, Compras, Cuentas y Compra agrupada solo se ocultaban en el sidebar; la API no validaba el plan. | Un plan Gratis podía usarlos llamando a la API: la venta de planes no se respetaba. | `ModuleAccessGuard` + `@RequireModule` en esos 8 controladores, con test. |
| 5 | `suppliers`, `purchases` y `accounts` no tenían fila en `system_modules`. | El admin no podía apagarlos ni elegirlos al editar un plan. | La migración crea las filas. |
| 6 | Rubro **Comida** sin `appointments`. | El módulo de reservas de mesa (`tableNumber`, `partySize`) no lo podían usar los restaurantes, pero sí diseñadores y abogados. | Se agregó `appointments` a Comida. |

La migración `20261115100000_fix_category_and_plan_modules` es idempotente. Se probó en
Postgres sobre una base vacía, con datos, y ejecutándola dos veces.

## Pendiente: decisiones de producto

| # | Inconsistencia | Opciones |
|---|---|---|
| D1 | **Los módulos se definen por rubro, no por subcategoría.** "Tienda de Mascotas" (Mascotas), "Accesorios", "Neumáticos" y "Venta de Autos" (Automotriz) venden producto, pero su rubro solo trae servicios: no tienen Menú ni Pedidos. | **(a, recomendada)** `allowedModules` opcional por subcategoría, que reemplaza al del rubro (migración + seed + panel de categorías). (b) Agregar `menu`/`orders` a esos rubros completos: a todo mecánico o veterinario se le crearía un comercio y vería Menú. |
| D2 | Un negocio (`BUSINESS`) de Comida no tiene Servicios: Catering y Food Truck no pueden publicar servicios para eventos. Un autónomo de Comida sí los tiene. | Agregar `services`/`service_requests` a Comida, o resolverlo con D1 solo para Catering. |
| D3 | **Inventario** solo existe en Enterprise, aunque el stock se maneja en Menú desde el Gratis. | Dejarlo como valor de Enterprise o bajarlo a Pro. |
| D4 | El ítem se llama **"Menú"** también para tiendas, ferreterías o farmacias. | Renombrarlo a "Productos", o "Menú" solo en Comida. |
| D5 | **Sin suscripción ≠ plan Gratis**: el respaldo `FREE_LIMITS` da 10 productos, 30 pedidos y 3 empleos; el plan "Gratis" da 20 productos, 50 pedidos y empleos ilimitados. | Unificar: que "sin suscripción" use el plan Gratis de la base. |
| D6 | Servicios, Empleos, Analytics, Reportes, Ventas, Caja y Recibos tampoco validan el módulo en la API. Servicios y Empleos sí validan los límites de cantidad del plan. | Extender el guard después de revisar cada flujo: Analytics y Ventas alimentan el dashboard de todos. |
| D7 | "Corridas y Fletes" exige el módulo `corridas`, que solo trae el rubro Transporte. Un comercio de otro rubro no puede **pedir** un flete desde el sidebar. Un usuario normal sí. | Separar "pedir" (sin módulo) de "conducir" (módulo `corridas`). |
| D8 | El rol `PROFESIONAL` (legado) convive con los perfiles: 17 usos en código. Funciona porque `RoleResolver` lo recalcula, pero son dos fuentes de verdad. | Retirarlo de a poco después de la v1. |

## Después de desplegar

- La migración aplica los arreglos 1, 2, 5 y 6 en producción sin tocar más datos.
- Si un admin ya había editado el plan Básico, conserva sus módulos y solo se le suman
  `services`, `service_requests` y `wallets`.
