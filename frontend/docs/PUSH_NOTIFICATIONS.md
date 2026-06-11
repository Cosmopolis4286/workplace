# Plan: Push Notifications (Firebase Cloud Messaging)

> Estado: **solo documentación**. No se instaló ninguna dependencia ni se escribió
> código de push en esta sesión. Este documento es la guía para implementarlo en
> una sesión futura, cuando se disponga de las credenciales de Firebase.

## Objetivo

Enviar notificaciones push nativas (Android, vía Capacitor) cuando ocurren eventos
relevantes para el comercio: nuevo pedido, cambio de estado de pedido/delivery,
stock bajo, etc. Estos eventos ya generan notificaciones in-app a través de
`NotificationsService` (`backend/src/notifications/notifications.service.ts`,
métodos `notifyNewOrder`, `notifyOrderStatusChange`, `notifyDeliveryStatusChange`,
`notifyLowStock`) y se emiten por WebSocket (`NotificationsGateway`, namespace
`/notifications`). El push FCM se añade como **canal adicional** sobre esos mismos
eventos, no como un sistema paralelo.

## 1. Cliente (Capacitor / Nuxt)

### 1.1 Dependencia
```bash
pnpm add @capacitor/push-notifications
```

### 1.2 Registro y permisos
Crear `frontend/plugins/push-notifications.client.ts` (solo se ejecuta si
`Capacitor.isNativePlatform()`, igual que el patrón usado en `useCamera.ts`):

- `PushNotifications.requestPermissions()` → si se concede, `PushNotifications.register()`.
- Listener `registration` → entrega el **token del dispositivo** (FCM token en Android).
  Este token se envía al backend (ver sección 2).
- Listener `registrationError` → loggear, no bloquear la app.
- Listener `pushNotificationReceived` → mostrar notificación local o actualizar el
  badge/`useNotifications` mientras la app está en foreground.
- Listener `pushNotificationActionPerformed` → navegar a la pantalla relevante
  (ej. tap en notificación de "Nuevo pedido" → `/pedidos` o `/dashboard`) cuando la
  app estaba en background.

### 1.3 Cuándo registrar
Registrar el token después del login exitoso (cuando `useAuth().user` está
disponible), y volver a enviarlo si cambia (Android puede rotar el token FCM).

## 2. Backend — nuevo endpoint y modelo

### 2.1 Modelo Prisma `DeviceToken`
Nueva migración con un modelo simple:

```prisma
model DeviceToken {
  id        String   @id @default(uuid())
  token     String   @unique
  platform  String   // "android" | "ios" | "web"
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

Agregar la relación inversa `deviceTokens DeviceToken[]` en `model User`.

### 2.2 Endpoint
En `backend/src/notifications/notifications.controller.ts`, agregar:

- `POST /api/notifications/device-token` — body `{ token: string, platform: string }`,
  protegido por `JwtAuthGuard` + `@CurrentUser()`. Hace upsert por `token` (si el
  mismo token ya existe para otro usuario — ej. reinstalación — se reasigna al
  usuario actual).
- `DELETE /api/notifications/device-token` — eliminar el token al hacer logout
  (opcional, evita enviar push a sesiones cerradas).

Ambos métodos van en `NotificationsService`, siguiendo el patrón existente de los
demás métodos (`create`, `notifyNewOrder`, etc.).

## 3. Envío real vía FCM

### 3.1 Credenciales (pendiente del usuario)
1. Crear proyecto en [Firebase Console](https://console.firebase.google.com/).
2. Descargar `google-services.json` y colocarlo en
   `frontend/android/app/google-services.json` (requerido por
   `@capacitor/push-notifications` para Android).
3. Generar una **cuenta de servicio** (Service Account) desde
   "Project Settings → Service Accounts → Generate new private key".
4. Agregar al `.env` del backend:
   ```
   FIREBASE_PROJECT_ID=...
   FIREBASE_CLIENT_EMAIL=...
   FIREBASE_PRIVATE_KEY="..."
   ```
   (o `FIREBASE_SERVICE_ACCOUNT_JSON` con el JSON completo en una sola variable).

### 3.2 SDK backend
```bash
pnpm add firebase-admin --filter backend
```

Inicializar una sola vez (ej. en un nuevo `FirebaseModule` o dentro de
`NotificationsModule`):

```ts
import * as admin from 'firebase-admin';

admin.initializeApp({
  credential: admin.credential.cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  }),
});
```

### 3.3 Integración con `NotificationsService`
En el método privado `create()` (usado por `notifyNewOrder`,
`notifyOrderStatusChange`, `notifyDeliveryStatusChange`, `notifyLowStock`), después
de persistir la notificación y emitirla por WebSocket, buscar los
`DeviceToken` del `commerceId` correspondiente y enviar:

```ts
await admin.messaging().sendEachForMulticast({
  tokens: deviceTokens.map(d => d.token),
  notification: { title, body: message },
  data: { type, /* ...payload para deep-link */ },
});
```

Manejar tokens inválidos (`messaging/registration-token-not-registered`) borrando
el `DeviceToken` correspondiente de la base.

## 4. Resumen de pendientes del usuario

- [ ] Crear proyecto Firebase y habilitar Cloud Messaging.
- [ ] Descargar `google-services.json` → `frontend/android/app/`.
- [ ] Generar credenciales de Service Account → variables `FIREBASE_*` en
      `backend/.env`.
- [ ] Confirmar el deep-link de cada tipo de notificación (a qué ruta navega el
      tap en cada caso: pedido nuevo, cambio de estado, stock bajo, etc.).

Una vez disponibles estas credenciales, la implementación de código (cliente +
backend) descrita arriba puede ejecutarse en una sesión dedicada.
