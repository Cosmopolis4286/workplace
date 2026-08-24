# WorkPlace — Visión del ecosistema y evolución del producto

## 1. Concepto general

WorkPlace ya es una plataforma funcional de gestión, pero la visión futura es convertirla en un ecosistema integral de productos, comercios, servicios, profesionales y oportunidades, donde el usuario pueda resolver sus necesidades desde un único lugar.

La idea no es crear simplemente otro marketplace, ERP, app de delivery o portal de freelancers.

El concepto central es:

> El usuario expresa una necesidad, un objetivo o un presupuesto, y WorkPlace encuentra y coordina la mejor forma de resolverlo utilizando los recursos disponibles dentro del ecosistema.

Ejemplo:

> "Tengo $50 para esta semana. Necesito comida, productos de limpieza y quiero hacer algo el sábado."

WorkPlace analiza la necesidad, presupuesto, preferencias y disponibilidad, busca productos/servicios en uno o varios proveedores y puede coordinar las operaciones.

## 2. Actores del ecosistema

Una misma persona NO debe necesitar cuentas diferentes para cada actividad.

La identidad principal es:

**User**

Y puede activar diferentes perfiles/roles:

```
User
│
├── Customer
│
├── Professional
│     ├── Freelancer
│     └── Service Provider
│
├── Job Seeker
│
└── Business
```

Una misma persona puede tener varios perfiles simultáneamente.

Ejemplo:

```
Usuario
├── Cliente
├── Freelancer
└── Candidato
```

Esto permite que una persona pueda:

- comprar productos;
- contratar servicios;
- buscar empleo;
- ofrecer servicios;
- trabajar como freelancer;
- tener un negocio.

No debe ser necesario "convertirse" en otra cuenta. Simplemente activa un nuevo perfil.

## 3. Diferencia entre Freelancer y Service Provider

No tratar "freelancer" y "profesional/proveedor de servicios" como exactamente lo mismo.

**Freelancer**

Trabajo independiente basado principalmente en proyectos o encargos profesionales.

Ejemplos:

- Programador
- Diseñador
- Marketing
- Redactor
- Fotógrafo
- Editor de vídeo
- Consultor

**Service Provider / Profesional**

Servicios concretos que pueden depender de ubicación, disponibilidad y ejecución física.

Ejemplos:

- Técnico de refrigeración
- Electricista
- Plomero
- Limpieza
- Jardinero
- Mecánico
- Técnico de celulares
- Instalador de aire acondicionado

Para la interfaz pública se puede utilizar principalmente el término:

**Profesional**

y clasificar internamente el tipo de profesional.

## 4. Función disruptiva principal: AI Agent

La IA no debe ser simplemente un chatbot.

Debe funcionar como un agente capaz de interpretar necesidades y ejecutar acciones mediante herramientas de WorkPlace.

Ejemplo:

Usuario:

> "Necesito reparar mi aire acondicionado hoy y no quiero gastar más de $100."

El agente debería:

1. Interpretar la necesidad.
2. Detectar el tipo de servicio.
3. Buscar profesionales compatibles.
4. Consultar disponibilidad.
5. Consultar precios.
6. Considerar distancia.
7. Considerar reputación.
8. Encontrar opciones.
9. Presentar/recomendar una solución.
10. Solicitar confirmación cuando sea necesario.
11. Crear la operación.
12. Coordinar el servicio.
13. Gestionar el pago.
14. Registrar el resultado y reputación.

El objetivo final:

> Necesidad → búsqueda → selección → coordinación → operación → pago → resultado

## 5. Compra/servicio compuesto

Una necesidad puede involucrar múltiples proveedores.

Ejemplo:

> "Quiero organizar una fiesta para 20 personas."

WorkPlace podría crear una única necesidad compuesta:

```
Evento
│
├── Comida       → Comercio A
├── DJ           → Profesional B
├── Fotografía   → Profesional C
├── Decoración   → Comercio D
└── Limpieza     → Profesional E
```

Para el usuario debe sentirse como una única experiencia, aunque internamente existan múltiples órdenes/operaciones.

Esto puede generar múltiples ingresos por una sola necesidad del usuario.

## 6. Presupuesto inteligente

El usuario puede definir:

> "Tengo $300 para este mes."

WorkPlace debe poder analizar:

```
Presupuesto: $300

Necesidades básicas: $180
Servicios:            $50
Ocio:                 $30
Reserva:              $40
```

El sistema debe poder:

- analizar gastos;
- prever gastos futuros;
- advertir sobre exceso de presupuesto;
- detectar oportunidades de ahorro;
- recomendar alternativas;
- agrupar compras;
- optimizar operaciones.

La idea es que WorkPlace no solamente venda cosas, sino que ayude al usuario a administrar cómo utiliza su dinero.

## 7. Necesidades recurrentes y predicción

WorkPlace puede aprender patrones de consumo con consentimiento del usuario.

Ejemplo:

```
Detergente
Última compra: 28 días
Promedio: 30 días

→ Probablemente necesitas comprarlo pronto.
```

También servicios:

```
Mantenimiento de aire acondicionado
Último servicio: 6 meses
Patrón: cada 6 meses

→ ¿Quieres programarlo?
```

Esto permite crear un sistema de:

> Necesidades recurrentes + predicción + automatización.

## 8. "Mi mes"

Crear una experiencia donde el usuario pueda visualizar:

```
MI MES

Presupuesto       $600
Gastado           $380
Comprometido       $90
Previsto           $95
Disponible         $35

Próximas necesidades:
- Detergente
- Alimento mascota
- Mantenimiento AC

Oportunidades:
- Ahorrar $12 agrupando compras
- Comprar producto habitual en promoción
```

Esta funcionalidad puede ser una de las principales razones para que el usuario final pague una suscripción.

## 9. Suscripción del usuario final

La suscripción Premium debe vender ahorro + automatización + conveniencia, no simplemente funcionalidades adicionales.

Posibles beneficios:

- Agente personal con ejecución automática.
- Análisis financiero/consumo.
- Predicción de necesidades.
- Automatización de compras recurrentes.
- Automatización de contratación de servicios.
- Optimización de presupuesto.
- Menores tasas por operaciones.
- Protección de pagos.
- Soporte prioritario.
- Historial y análisis avanzado.

Concepto de valor:

> "WorkPlace te ayuda a ahorrar tiempo y dinero."

Incluso podría mostrar:

> "Este mes WorkPlace te ahorró $87 y 4h 20min."

## 10. WorkPlace Score

Crear un sistema de reputación más profundo que simplemente estrellas.

Ejemplo:

```
WorkPlace Score: 94/100

127 servicios
98% puntualidad
96% finalización
4.91/5 satisfacción
2 cancelaciones
23 clientes recurrentes
```

El score puede utilizarse para matching y confianza.

Los profesionales construyen reputación dentro del ecosistema.

## 11. Pago protegido

Para operaciones entre clientes y profesionales:

```
Cliente paga
      ↓
Pago protegido
      ↓
Profesional realiza servicio
      ↓
Cliente confirma
      ↓
Pago liberado
```

Con sistema de disputas y reglas de protección.

Esto aumenta la confianza y puede ser otra fuente de monetización.

## 12. Matching inteligente

El matching no debe basarse únicamente en precio.

Puede considerar:

- distancia;
- disponibilidad;
- experiencia;
- WorkPlace Score;
- precio;
- historial;
- especialidad;
- tasa de cancelación;
- preferencias del usuario;
- tiempo estimado de respuesta.

La IA puede combinar todos estos factores para encontrar la mejor solución.

## 13. Modelo de negocio

WorkPlace puede tener múltiples fuentes de ingresos:

**Comercios**
- Plan mensual.
- Tasas por operación.

**Profesionales/Freelancers**
- Plan mensual.
- Tasas por operación/trabajo.

**Usuarios finales**
- Plan gratuito.
- Plan Premium.
- Posiblemente tasas reducidas o beneficios adicionales para Premium.

**Otras posibilidades futuras**
- Promoción de profesionales/comercios.
- Servicios premium.
- Protección de operaciones.
- Herramientas empresariales.
- Automatización avanzada.

El objetivo inicial es llegar a aproximadamente:

> $500/mes

combinando:

> Suscripciones + Tasas por operaciones + Freelancer/servicios

No depender exclusivamente del SaaS.

## 14. Diferencial estratégico

No competir directamente como:

- Uber
- iFood
- Fiverr
- GetNinjas
- Mercado Livre
- portal de empleo
- ERP tradicional.

WorkPlace debe integrar las categorías.

La visión es:

> "Dile a WorkPlace qué necesitas y cuánto puedes gastar; WorkPlace encuentra y coordina cómo resolverlo."

Puede tratarse de:

- comprar;
- contratar;
- vender;
- trabajar;
- buscar empleo;
- contratar profesionales;
- ocio;
- mantenimiento;
- servicios cotidianos;
- servicios técnicos.

## 15. Arquitectura técnica actual

Actualmente WorkPlace está planteado como monorepo:

```
workplace/
│
├── frontend/
│   └── Nuxt 3
│       ├── Vue 3
│       ├── Tailwind CSS
│       ├── Pages
│       ├── Components
│       ├── Composables
│       └── Middleware
│
└── backend/
    └── NestJS
        ├── Auth
        ├── Users
        ├── Menu
        ├── Customers
        └── Orders
```

El backend utiliza:

- NestJS
- REST API
- WebSocket
- JWT
- Refresh tokens
- Google OAuth
- Roles/autorización
- Arquitectura modular

## 16. Arquitectura futura de IA

No reemplazar NestJS por Python.

NestJS debe seguir siendo el núcleo transaccional y de negocio.

Arquitectura propuesta:

```
Nuxt 3
   ↓
NestJS
   ↓
AI Orchestrator
   ↓
LLM
   ↓
WorkPlace Tools
```

Las herramientas del agente podrían ser:

- `searchProducts()`
- `searchServices()`
- `searchProviders()`
- `getProviderAvailability()`
- `getPrices()`
- `getUserBudget()`
- `getUserPreferences()`
- `calculateDelivery()`
- `optimizeBudget()`
- `createOrder()`
- `createServiceRequest()`
- `scheduleService()`
- `requestPayment()`

El agente NO debería escribir directamente en la base de datos.

Flujo:

```
AI
 ↓
NestJS API
 ↓
validación
 ↓
reglas de negocio
 ↓
transacción
 ↓
DB
```

Para el MVP se puede utilizar TypeScript/NestJS para el orquestador de IA, aprovechando la arquitectura existente. Python puede introducirse posteriormente para modelos específicos, ML, optimización o procesamiento que lo justifique.

## 17. Objetivo de producto

La evolución de WorkPlace debería ser:

```
ERP / Gestión
      ↓
Marketplace
      ↓
Marketplace de productos + servicios
      ↓
Ecosistema de usuarios + comercios + profesionales
      ↓
AI Agent
      ↓
Plataforma que entiende y resuelve necesidades
```

El objetivo final no es tener más funcionalidades.

Es conseguir que WorkPlace se convierta en una plataforma que el usuario abra y diga:

> "Esto es lo que necesito. Resuélvelo."

Y WorkPlace se encargue de encontrar, coordinar y ejecutar la solución dentro de su ecosistema.

---

# Estado actual vs. visión

Esta sección ancla la visión de arriba a la arquitectura real del código, a partir de una revisión de `backend/prisma/schema.prisma` y `backend/src/common/account-type/`. Se centra en el punto más fundacional de la visión — la sección 2, "Actores del ecosistema" — porque es el bloqueante estructural del que dependen casi todas las demás secciones (un AI Agent, un pago protegido o un matching inteligente necesitan saber "qué perfiles tiene activos este usuario", y hoy esa pregunta no se puede responder de forma flexible).

## Lo que ya existe hoy

- **`User.role: Role`** (`SUPERADMIN | ADMIN | COMMERCE | FREELANCER | NORMAL`) es el campo de RBAC/nivel de acceso — controla permisos, no "qué puede hacer este usuario en el ecosistema".
- **`User.accountType: AccountType?`** (`COMMERCE | FREELANCER`) es la fuente de verdad actual de "tipo de cuenta de negocio". Es un **enum mutuamente excluyente**: un usuario es COMMERCE *o* FREELANCER, nunca ambos. Se resuelve vía `AccountTypeResolver.resolve()`, que hace fallback a `role` para las filas que aún no fueron migradas — el propio código ya documenta que esto fue una migración progresiva (`role` → `accountType`), lo cual es un precedente útil de que el proyecto ya sabe hacer este tipo de transición sin downtime.
- **`Commerce` es 1:1 estricto con `User`** (`userId` único en `Commerce`). Un usuario no puede tener más de un comercio, ni ser comercio y freelancer a la vez.
- **`FreelancerSettings`** también es 1:1 con `User`.
- Ya existe un precedente muy cercano a "un usuario activa un perfil adicional sin crear otra cuenta": **`Driver`** (repartidor de delivery) pertenece a un `Commerce` vía `commerceId`, pero además tiene `userId String? @unique` — un campo opcional que vincula al repartidor con su propia cuenta de `User` (con su propio KYC), activada mediante invitación (`DriverInvitationsController`). Los drivers legado sin cuenta propia tienen un período de gracia (`graceUntil`) antes de perder la posibilidad de recibir nuevas asignaciones.
- Ya existe un precedente de **flujo de solicitud + aprobación para desbloquear un perfil de negocio**: `FreelancerApplication` (`userId`, `categoryId`, `subcategoryId`, `status: ProposalStatus`, `reviewedBy`) — el usuario solicita convertirse en freelancer y un admin aprueba o rechaza.
- **No existe** hoy el concepto de "Job Seeker" como perfil separado: `Job` y `JobApplication` cuelgan directamente de `User`; cualquier usuario ya puede postular a un empleo sin "activar" nada.
- **KYC** (`User.kycStatus`, `IdentityVerification[]`) está modelado **por `User`**, no por perfil — es un campo denormalizado en `User` pensado para checks rápidos en guards (`KycApprovedGuard`). Esto es coherente con la visión: el KYC identifica a la persona, no el rol que está jugando en un momento dado.

## El bloqueante estructural

El mayor cambio necesario para la sección 2 de la visión ("una persona puede tener varios perfiles simultáneamente") es **romper la exclusividad de `accountType` y la relación 1:1 de `Commerce`↔`User`**, reemplazándolos por un modelo de perfiles activables en paralelo (N por usuario), sin tocar `role` (que sigue siendo RBAC puro).

## Estado de la implementación (paso 1, 2026-08-24)

El diseño de abajo ya se implementó parcialmente — ver detalle en el changelog. Resumen de lo que existe hoy en el código:

- Tabla `UserProfile` (`user_profiles`): `userId`, `type: ProfileType` (`CUSTOMER | PROFESSIONAL | JOB_SEEKER | BUSINESS`), `subtype: ProfessionalSubtype?` (`FREELANCER | SERVICE_PROVIDER`, solo para PROFESSIONAL), `status: ProfileStatus` (`PENDING | ACTIVE | REJECTED | SUSPENDED`), `categoryId`/`subcategoryId` opcionales, y campos de revisión (`reviewedBy`, `reviewedAt`, `rejectionReason`). Un `User` puede tener N filas — reemplaza la exclusividad de `accountType` sin tocar ese campo.
- `Commerce` **no** migró su FK real: `Commerce.userId` sigue siendo la fuente de verdad 1:1 que usan ~15 servicios vía `where: { userId }`. Se agregó `Commerce.profileId` **opcional y aditivo**, vinculado al `UserProfile` de tipo BUSINESS del dueño — decisión tomada tras encontrar que `getCommerceId(userId)` está duplicado en 13+ servicios (orders, cash, expenses, appointments, delivery, branches, employees, customers, bnpl, menu, receipts, analytics...) y migrar la FK real habría roto todos esos call sites a la vez. Ese desacoplamiento completo queda para una migración futura y separada, con un helper compartido que reemplace las 13 copias de `getCommerceId`.
- `AccountTypeResolver.resolve()` ahora lee primero `UserProfile` ACTIVE (BUSINESS→COMMERCE, PROFESSIONAL→FREELANCER), con fallback a `accountType` y luego a `role` — mismo patrón de cascada que ya usaba. Los 7 call sites existentes no cambiaron.
- Backfill ejecutado sobre la base de datos de desarrollo: un `UserProfile` por cada `Commerce`/usuario COMMERCE/usuario FREELANCER/usuario NORMAL existente (script en `backend/prisma/migrations/20260824120646_add_user_profiles/backfill.sql`, no se ejecuta automáticamente por Prisma).
- Endpoint nuevo `POST /api/profile-activations` (+ `GET mine`, `GET admin/pending`, `PATCH admin/:id/review`) en `backend/src/domains/identity-access/profile-activations/`, calcado del patrón de `FreelancerApplication`: CUSTOMER/JOB_SEEKER se activan directo; PROFESSIONAL/BUSINESS quedan PENDING y requieren aprobación de ADMIN/SUPERADMIN + KYC aprobado del solicitante. Al aprobar, sincroniza `User.categoryId`/`subcategoryId` (varios módulos aún leen la categoría desde `User`, no desde `UserProfile`).

Pendiente explícito (no incluido en este paso): endpoints/UI de frontend, migrar `FreelancerApplication` para que escriba en `UserProfile` en vez de (o además de) `Role`/`accountType`, y la migración real de la FK de `Commerce`.

---

# Changelog

### 2026-08-24

- Se incorpora este documento de visión del ecosistema al repositorio como referencia de producto a largo plazo, cubriendo: perfiles múltiples por usuario (Customer/Professional/Job Seeker/Business), un AI Agent orquestador que interpreta necesidades y coordina operaciones entre comercios y profesionales, presupuesto inteligente + "Mi mes", WorkPlace Score y pago protegido, y el modelo de negocio objetivo.
- Se agrega la sección "Estado actual vs. visión", que mapea la sección 2 de la visión (Actores del ecosistema) contra el `schema.prisma` real, identifica los precedentes ya existentes en el código (`Driver.userId`, `FreelancerApplication`, `AccountTypeResolver`) y propone un diseño incremental de tabla `UserProfile` para reemplazar el `accountType` mutuamente excluyente actual.
- **Se implementa el paso 1 del diseño de perfiles múltiples** (mismo día, sesión siguiente): modelo `UserProfile` + migraciones aplicadas a la base de datos de desarrollo, backfill de perfiles para usuarios/comercios existentes, `AccountTypeResolver` actualizado con fallback en cascada, y endpoint `POST /api/profile-activations` con flujo de aprobación (módulo `backend/src/domains/identity-access/profile-activations/`). Decisión de alcance tomada en el camino: `Commerce.userId` (la FK real que usan ~15 servicios) **no** se migró — se agregó `Commerce.profileId` opcional en paralelo, para no romper los 13+ call sites que duplican `getCommerceId(userId)`. Verificado con `tsc --noEmit` limpio y los 453 tests unitarios existentes en verde; sin prueba end-to-end con servidor real (bloqueada por un conflicto de puerto de Redis con otro proyecto Docker en la máquina de desarrollo, no por el código). Ver "Estado de la implementación" arriba para el detalle completo y lo que queda pendiente.
