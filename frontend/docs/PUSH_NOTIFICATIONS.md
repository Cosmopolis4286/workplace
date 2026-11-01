# Push Notifications (Firebase Cloud Messaging)

> Estado: **implementado en código (app y backend)**. Solo falta configurar
> Firebase (sección "Pasos para activarlo"). Sin credenciales el backend no
> envía push y todo lo demás funciona igual.

## Cómo funciona

- **App (APK)**: `frontend/plugins/push-notifications.client.ts` pide permiso,
  crea el canal Android `default` (prioridad alta, con sonido), registra el token
  del dispositivo en `POST /api/notifications/device-token` y, al tocar la
  notificación, navega a `data.link`. Al cerrar sesión borra el token.
- **Backend**: toda notificación de usuario (`NotificationsService.createForUser`)
  y de comercio (`create`, al dueño) sale también por push vía
  `PushService` (`backend/src/domains/engagement/notifications/push.service.ts`,
  `firebase-admin`). Envía a todos los dispositivos del usuario y borra los
  tokens que FCM ya no acepta (app desinstalada, token rotado).
- **Email**: las notificaciones que piden una acción de la otra parte (solicitud
  nueva, cambios de estado, garantía por pagar, disputas, aumento de precio,
  corrida aceptada, perfil revisado) además se envían por correo.

## Pasos para activarlo

1. Crear un proyecto en [Firebase Console](https://console.firebase.google.com/)
   y agregar una **app Android** con el `appId` de `capacitor.config.ts`.
2. Descargar `google-services.json` y copiarlo en
   `frontend/android/app/google-services.json` (la carpeta `android/` se genera
   con `npx cap add android` y no se versiona). Recompilar la APK.
3. En Firebase: *Configuración del proyecto → Cuentas de servicio → Generar nueva
   clave privada*. Descarga un JSON.
4. En el `.env` del backend (servidor), una de las dos opciones:
   - `FIREBASE_SERVICE_ACCOUNT_JSON` con el contenido completo del JSON en una
     sola línea; o
   - `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL` y `FIREBASE_PRIVATE_KEY`
     (con los saltos de línea como `\n`).
5. Reiniciar el backend. En el log debe aparecer `Push FCM activado`.
6. Probar: iniciar sesión en la APK, cerrarla, y desde otra cuenta crear una
   solicitud de servicio. Debe llegar la notificación y abrir `/service-requests`.

## Historial del plan original

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
