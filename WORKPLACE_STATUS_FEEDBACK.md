# WorkPlace Manager — Estado actual y flujo (para feedback externo)

> Generado 2026-08-24. Pensado como input para pedir feedback (ej. a ChatGPT) sobre arquitectura, producto o próximos pasos. Refleja el estado real del código en este momento, no aspiracional.

## 1. Qué es

WorkPlace Manager es un marketplace/directorio multi-rubro para Venezuela: comercios (restaurantes, tiendas, farmacias, etc.), profesionales/freelancers, delivery, empleos, rides. No es solo una app de delivery — cubre gestión de negocio (ERP básico) + marketplace + búsqueda de empleo en una sola plataforma.

Hay un documento de visión de largo plazo (`WORKPLACE_VISION.md`) que describe hacia dónde se quiere llevar el producto: un ecosistema donde el usuario expresa una necesidad y un AI Agent la resuelve coordinando comercios/profesionales, con perfiles múltiples por usuario, presupuesto inteligente, reputación unificada ("WorkPlace Score") y pagos protegidos. Este documento (`WORKPLACE_STATUS_FEEDBACK.md`) describe el **estado actual real**, no la visión.

## 2. Stack técnico

- **Backend**: NestJS + Prisma ORM + PostgreSQL + Redis. Puerto 3001.
- **Frontend**: Nuxt 3 (SPA) + Tailwind CSS + @headlessui/vue. Puerto 3000.
- **Package manager**: pnpm, monorepo (workspace con `backend/` y `frontend/`).
- **Auth**: JWT (access 15min / refresh 7d, o 1d + cookie de sesión si no se marca "mantener sesión"), blacklist de tokens en Redis, 2FA (TOTP) opcional, reCAPTCHA v3 en login/register, OAuth con Google.
- **Infra dev**: Docker Compose (`docker-compose.lite.dev.yml`), Traefik como router, contenedores separados para backend/frontend/postgres/redis/mailhog/adminer. El backend en modo dev **no** corre sin Docker (depende de que Compose inyecte las variables de entorno; no hay carga de `.env` en el script npm).

## 3. Modelo de identidad y RBAC actual

- `User.role`: `SUPERADMIN | ADMIN | COMMERCE | FREELANCER | NORMAL`. Es el nivel de acceso (RBAC) — controla permisos vía `RolesGuard` + matriz de permisos (`PermissionsGuard`).
- `User.accountType`: `COMMERCE | FREELANCER | null`. Históricamente separado de `role` por una migración incremental; hoy es la fuente de verdad preferida para "tipo de cuenta de negocio", resuelta vía `AccountTypeResolver` (con fallback a `role` para compatibilidad).
- **Es un enum mutuamente excluyente**: un usuario es COMMERCE *o* FREELANCER, nunca ambos, y no puede ser cliente + profesional a la vez sin "convertirse" de un tipo a otro.
- `Commerce` es 1:1 con `User` (un usuario tiene como máximo un comercio).
- KYC (`kycStatus`) es por usuario, no por rol — bloquea operaciones de negocio (publicar empleo, pedido, corrida, envío, solicitud de servicio) hasta que la identidad esté verificada.

### Cambio recién implementado: perfiles múltiples (paso 1)

Se agregó un modelo `UserProfile` en paralelo, que permite que un mismo usuario tenga **varios perfiles activos simultáneamente** (`CUSTOMER`, `PROFESSIONAL` con subtipo `FREELANCER`/`SERVICE_PROVIDER`, `JOB_SEEKER`, `BUSINESS`), sin romper el modelo `accountType`/`role` existente:

- Tabla nueva `user_profiles`, N filas por usuario.
- `AccountTypeResolver` ahora lee `UserProfile` primero, con fallback a `accountType` → `role` (mismo patrón de cascada que ya existía).
- Endpoint `POST /api/profile-activations` (+ `GET mine`, admin `pending`/`review`): activación instantánea para CUSTOMER/JOB_SEEKER, con aprobación de admin + KYC para PROFESSIONAL/BUSINESS — mismo flujo que ya existía para "convertirme en freelancer" (`FreelancerApplication`), que ahora también escribe en `UserProfile` en paralelo (dual-write, sin romper el flujo real que usa el frontend hoy).
- UI nueva en `/profile` (card "Mis perfiles") y `/profile-activations-admin` (revisión de solicitudes).
- **Deliberadamente no se tocó** la FK real `Commerce.userId` (1:1 con User): se encontró que la resolución "userId → commerceId" estaba duplicada (copy-pasted) en 12 servicios distintos del backend. Se consolidó primero ese código en un `CommerceResolverService` compartido — trabajo previo necesario antes de poder migrar la FK real en el futuro sin romper 12 archivos a la vez.

## 4. Flujo de uso actual (usuario final)

1. **Registro**: email+password o Google OAuth. Usuario nace con `role=NORMAL` (cliente).
2. **Verificación de identidad (KYC)**: requerida antes de poder publicar/contratar/vender — no antes de solo navegar o comprar como invitado limitado.
3. **Como cliente (NORMAL)**: navega comercios/profesionales por categoría, compra en catálogo, contrata servicios, agenda citas, pide delivery, pide rides, postula a empleos.
4. **Convertirse en negocio o profesional**: hoy es un cambio de `role`/`accountType` (excluyente) vía solicitud + aprobación de admin (`FreelancerApplication` para freelancer; alta directa por admin para `COMMERCE`). Con el cambio reciente, en paralelo ya existe la infraestructura para que esto sea "activar un perfil adicional" en vez de "convertir la cuenta", pero el frontend real (lo que ve el usuario) todavía usa el flujo viejo — el nuevo es aditivo, no reemplaza al viejo todavía.
5. **Como comercio**: gestiona catálogo/menú, categorías, empleados, sucursales, caja (apertura/cierre de turno con arqueo), gastos, pedidos, delivery (con repartidores propios o invitados con cuenta propia), citas, clientes, analytics, notificaciones en tiempo real (WebSocket), comprobantes de venta (no fiscales — ver sección 6), planes/suscripciones con límites por plan.
6. **Como profesional/freelancer**: publica servicios, recibe y gestiona solicitudes de servicio (con mensajería), analytics propios.
7. **Empleos**: cualquier usuario puede publicar una oferta o postular, sin necesidad de un perfil "Job Seeker" separado hoy (aunque el modelo `UserProfile` ya contempla ese tipo para el futuro).
8. **Delivery**: comercios asignan pedidos a repartidores (`Driver`); un repartidor puede tener cuenta propia vinculada (con su propio KYC) vía invitación, con periodo de gracia de 30 días para los repartidores "legado" sin cuenta.
9. **Wallets / pagos**: sistema de wallet interno con solicitudes de depósito (con comprobante), y BNPL (compra ahora paga después) con adaptadores por proveedor (Cashea, Krece, simulado para dev).
10. **Admin**: gestiona categorías propuestas por usuarios, solicitudes de freelancer/perfiles, solicitudes de depósito de wallet, reportes, tasas de la plataforma, permisos/roles granulares (matriz de permisos), planes.

## 5. Módulos implementados (backend + frontend, con CRUD y tests)

Menu, Customers, Settings, Appointments, Analytics, Delivery, Orders, Expenses, Dashboard, Notifications (WebSocket), Employees, Branches, RBAC/Roles, Permission Matrix, Plans & Subscriptions, Plan Limits, Cash (caja/arqueo), Receipts (comprobantes no-fiscales), KYC, Wallets, Wallet Deposit Requests, BNPL, Exchange Rates, Rides, Jobs, Reports, Proposed Categories, Telegram (notificaciones), Locations, Landing, Search, 2FA, Auditoría (interceptor global que registra operaciones).

## 6. Decisiones de producto/negocio relevantes ya tomadas

- **No es facturación fiscal SENIAT**: Venezuela exige desde 2025 un sistema de facturación homologado (Providencias SNAT/2024/000102 y 121) con transmisión automática al SENIAT. WorkPlace construyó en su lugar un "Comprobante de Venta" no-fiscal, rotulado explícitamente como tal. Cumplimiento fiscal real es una decisión de negocio pendiente, no un bug.
- Guest checkout fue eliminado en catálogo/servicios — KYC es obligatorio antes de operar como no-admin.
- El nombre de dominio interno para "comercio" (`Commerce`) reemplazó a un legado `Restaurant` — ya no es solo para restaurantes.

## 7. Deuda técnica y advertencias conocidas

- Sin reporte financiero exportable.
- Paginación en memoria en 4 módulos (no en DB).
- Archivos `.env` trackeados en git (riesgo de secretos versionados).
- Sin Sentry/logging estructurado en backend.
- Sin backup de base de datos automatizado.
- La FK real `Commerce.userId` sigue siendo 1:1 estricta — bloquea que un mismo usuario tenga comercio + otro perfil de negocio simultáneo hasta que se complete la migración (ver sección 3).
- El flujo de "convertirse en freelancer" (`FreelancerApplication`) y el nuevo sistema de `UserProfile` coexisten sin estar unificados en el frontend todavía — riesgo de confusión de producto si no se decide cuál es la fuente de verdad a mediano plazo.

## 8. Testing y calidad

- 453 tests unitarios backend, todos pasando (`npx jest`).
- `tsc --noEmit` limpio en backend.
- No hay `vue-tsc`/type-check configurado para el frontend en este entorno (falla por incompatibilidad de versión al invocarlo vía npx; no está declarado como dependencia del proyecto).
- Exception filter global de errores implementado.

## 9. Roadmap de producto (visión, no implementado aún)

Ver `WORKPLACE_VISION.md` para el detalle completo. Resumen de las piezas más grandes que faltan:

- **AI Agent orquestador**: interpretar necesidades del usuario en lenguaje natural y coordinar automáticamente búsqueda, selección, operación y pago entre comercios/profesionales del ecosistema. Arquitectura propuesta: Nuxt → NestJS → AI Orchestrator (TypeScript, no Python para el MVP) → LLM → herramientas que llaman a la API de NestJS (el agente no escribe directo a la DB).
- **Compra/servicio compuesto**: una necesidad del usuario resuelta por múltiples proveedores a la vez (ej. organizar un evento), sentido como una sola experiencia aunque sean varias órdenes internamente.
- **Presupuesto inteligente + "Mi mes"**: análisis de gasto, predicción de necesidades recurrentes, alertas de exceso de presupuesto, oportunidades de ahorro.
- **WorkPlace Score**: reputación más profunda que estrellas (puntualidad, finalización, cancelaciones, clientes recurrentes), usada para matching y confianza.
- **Pago protegido**: retención de pago hasta confirmación del cliente, con sistema de disputas.
- **Matching inteligente**: no solo por precio — distancia, disponibilidad, reputación, historial, especialidad.
- **Modelo de negocio objetivo**: combinación de suscripciones (comercios, profesionales, usuarios finales) + tasas por operación, apuntando a ~$500/mes iniciales sin depender solo de SaaS.
- **Diferencial estratégico**: no competir como un vertical más (Uber, iFood, Fiverr, portal de empleo) sino integrar las categorías bajo una sola experiencia de "decime qué necesitás y cuánto podés gastar".
