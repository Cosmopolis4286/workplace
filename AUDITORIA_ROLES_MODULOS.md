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

## Decisiones tomadas e implementadas

| # | Decisión | Implementación |
|---|---|---|
| D1 | Módulos por subcategoría | `UserSubcategory.allowedModules`: vacío = hereda del rubro, con valor lo reemplaza. Una sola regla (`rubroModuleCeiling`) decide qué módulos ve el usuario y si se le crea comercio interno. Editor en Usuarios → Categorías ("Módulos propios"). Tienda de Mascotas, Accesorios, Neumáticos y Venta de Autos venden producto; la migración crea el comercio interno a los autónomos que ya están en ellas. |
| D2 | Catering y Food Truck con servicios | Sus subcategorías suman Servicios y Solicitudes; restaurantes y cafeterías no cambian. |
| D3 | Inventario en todos los planes | Es otra vista del stock que ya se maneja en Menú. Los planes se diferencian por límites (productos/pedidos), no escondiendo la vista. |
| D4 | "Menú" en Comida, "Productos" en el resto | `labelByCategory` en el sidebar; el título de la página y del encabezado usan la misma etiqueta. |
| D5 | Sin suscripción = plan Gratis | Sin suscripción se usa el plan gratuito activo de la base (precio 0), editable por el admin. Los límites fijos en código quedan solo de respaldo. |
| D6 | Proteger las APIs de gestión | Servicios (las 6 rutas del proveedor; el catálogo público sigue abierto), Empleos (publicar, editar y borrar) y Reportes. Analytics queda sin guard porque es la misma API del dashboard de todos los planes; Ventas usa la API de Pedidos, que ya estaba protegida. |
| D7 | Pedir corridas sin módulo | Cualquier usuario puede pedir corridas y fletes. Conducir sigue exigiendo rubro Transporte y conductor aprobado. |
| D8 | Retirar el rol `PROFESIONAL` | Se hace ahora, en un PR aparte porque toca autenticación y permisos. |

## Después de desplegar

- La migración aplica los arreglos 1, 2, 5 y 6 en producción sin tocar más datos.
- Si un admin ya había editado el plan Básico, conserva sus módulos y solo se le suman
  `services`, `service_requests` y `wallets`.
