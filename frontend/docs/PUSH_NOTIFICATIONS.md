# Plan: Push Notifications (Firebase Cloud Messaging)

> Estado: **cliente y backend (sin FCM) implementados**. Lo único pendiente es
> la sección 3 (credenciales Firebase + envío real). El resto de este documento
> describe lo ya implementado y lo que falta.

## Implementado (sin credenciales Firebase)

- **Backend**: modelo `DeviceToken` (migración `20260612180000_add_device_tokens`),
  endpoints `POST /api/notifications/device-token` (upsert por token) y
  `DELETE /api/notifications/device-token` en `notifications.controller.ts` /
  `notifications.service.ts`. `NotificationsService.create()` y `.createForUser()`
  llaman a un stub privado `sendPush()` (no-op) — punto de integración listo para
  cuando exista `firebase-admin`.
- **Frontend**: `@capacitor/push-notifications` instalado;
  `frontend/plugins/push-notifications.client.ts` — solo corre en nativo
  (`Capacitor.isNativePlatform()`), pide permisos, registra el token FCM del
  dispositivo vía `POST /notifications/device-token` cuando el usuario está
  autenticado, navega via `pushNotificationActionPerformed` usando
  `notification.data.link`, y elimina el token (`DELETE /notifications/device-token`)
  al hacer logout (`watch(isAuthenticated)` dentro del propio plugin).

## Objetivo

Enviar notificaciones push nativas (Android, vía Capacitor) cuando ocurren eventos
relevantes para el comercio: nuevo pedido, cambio de estado de pedido/delivery,
stock bajo, etc. Estos eventos ya generan notificaciones in-app a través de
`NotificationsService` (`backend/src/notifications/notifications.service.ts`,
métodos `notifyNewOrder`, `notifyOrderStatusChange`, `notifyDeliveryStatusChange`,
`notifyLowStock`) y se emiten por WebSocket (`NotificationsGateway`, namespace
`/notifications`). El push FCM se añade como **canal adicional** sobre esos mismos
eventos, no como un sistema paralelo.

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
