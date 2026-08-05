# 📱 Capacitor Mobile App Development

## 🎯 Objective
Convert the existing Nuxt.js frontend into a native Android app using Capacitor.

## 📋 Project Overview
- **Base Application**: WorkPlace Manager (Nuxt 3 + NestJS)
- **Target Platform**: Android APK
- **Framework**: Capacitor + Nuxt.js
- **Backend Integration**: Existing NestJS API

## 🚀 Development Progress

### Phase 1: Setup & Configuration ✅
- [x] Create feature branch `feature/capacitor-mobile-app`
- [x] Install Capacitor dependencies
- [x] Initialize Capacitor project
- [x] Configure Android platform
- [x] Build and sync frontend

### Phase 2: Frontend Adaptation ✅
- [x] Add PWA capabilities to Nuxt
- [x] Configure mobile-specific routing
- [x] Add mobile-specific meta tags and viewport
- [x] Optimize UI for mobile screens
- [x] Add touch gestures support

### Phase 3: Capacitor Integration ✅
- [x] Add Android platform
- [x] Configure app permissions
- [x] Set up native plugins
- [x] Test build process

### Phase 4: Native Features
- [x] Camera integration (avatar, productos, gastos via `useCamera()`)
- [~] Push notifications — cliente (`@capacitor/push-notifications` + `push-notifications.client.ts`) y backend (modelo `DeviceToken`, endpoints `POST/DELETE /api/notifications/device-token`, stub `sendPush()`) implementados; solo falta integración FCM real (proyecto Firebase, ver `frontend/docs/PUSH_NOTIFICATIONS.md`)
- [x] Local storage (Pinia + `pinia-plugin-persistedstate`)
- [x] Offline support (cola de acciones pendientes + reintento automático al reconectar)

### Phase 5: Build & Deploy
- [x] Android project regenerado (`npx cap add android` + `sync`) con build estático (`nuxt generate`) y `NUXT_PUBLIC_API_URL` de producción
- [x] Iconos y splash screen nativos generados (`@capacitor/assets`, ver `frontend/capacitor-assets/`)
- [x] CORS backend ajustado para aceptar el origen `https://localhost` del WebView (`backend/src/main.ts`)
- [x] Pasos de compilación documentados en `frontend/docs/CAPACITOR_APK_BUILD.md`
- [x] Generate debug APK — `frontend/android/app/build/outputs/apk/debug/app-debug.apk` (9.9 MB), generado con `NUXT_PUBLIC_API_URL=https://playrke.com/api` + `gradlew assembleDebug` (JDK del Android Studio embebido, `local.properties` apuntando al SDK en `%LOCALAPPDATA%\Android\Sdk`)
- [x] Test on Android device — instalado y probado en emulador `Medium_Phone_API_36.1` (AVD `android-36.1`): pantalla de login renderiza con estilos/branding/reCAPTCHA, formulario valida inputs (email/password). Intento de login (`commerce@demo.com`) muestra `[POST] "https://playrke.com/api/auth/login": <no response> Failed to fetch` — **no es un problema del APK**: `playrke.com:443` no responde (timeout TCP) también desde la máquina host, DNS resuelve OK (`190.9.40.235`). El manejo de error de red de la app funciona correctamente (mensaje visible al usuario). Pendiente: re-probar login cuando el backend de producción esté accesible
- [x] Optimize performance — lazy-load de `chart.js` (solo usado en `/analytics`): chunk de entrada reducido de 458 KB a 276 KB (gzip 162 KB → 99 KB); chart.js ahora vive en un chunk separado de 184 KB cargado on-demand vía `frontend/plugins/chart.client.ts`
- [x] Generate release APK — keystore `frontend/android/workplace-release.keystore` (alias `workplace`, válido hasta 2053, gitignored) + `frontend/android/keystore.properties` (gitignored); `signingConfigs.release` agregado a `frontend/android/app/build.gradle`; `gradlew assembleRelease` → `frontend/android/app/build/outputs/apk/release/app-release.apk` (7.96 MB), firmado y verificado con `apksigner verify`
- [x] Rebuild debug + release APK con safe-area, permiso `CAMERA` y App Lock — `nuxt generate` (prod API URL) + `cap sync android` + `gradlew assembleDebug`/`assembleRelease`. Resultado: `app-debug.apk` (14.7 MB) y `app-release.apk` (9.4 MB, firmado y verificado con `apksigner verify --print-certs`, mismo certificado que antes). `aapt dump permissions` confirma `CAMERA`, `USE_BIOMETRIC` y `USE_FINGERPRINT` (estos dos últimos agregados automáticamente por el plugin biométrico) en el manifest final
- [x] Rebuild debug + release APK con StatusBar dark-mode, Android App Links (deep links) y Sentry — `nuxt generate` (prod API URL) + `cap sync android` + `gradlew assembleDebug`/`assembleRelease`. Resultado: `app-debug.apk` (17.9 MB) y `app-release.apk` (13.1 MB, firmado y verificado con `apksigner verify --print-certs`, mismo certificado SHA-256 `5B:37:91:BD:A2:70:5B:91:EA:69:7E:B4:BD:B9:B6:A3:5C:57:6A:97:B0:A3:73:0C:87:31:1B:AF:72:8C:B7:14`). Aumento de tamaño (~3.7 MB) viene del SDK nativo de Sentry (`sentry-capacitor` + crash-handling Android)

## 🔧 Technical Configuration

### Dependencies Installed
```bash
@capacitor/core
@capacitor/cli
@capacitor/android
@capacitor/app
@capacitor/camera
@capacitor/haptics
@capacitor/keyboard
@capacitor/status-bar
@capacitor/splash-screen
@pinia/nuxt
pinia-plugin-persistedstate
@vite-pwa/nuxt
```

### Dependencies Installed (Phase 4 follow-up)
```bash
@capacitor/push-notifications   # cliente listo, ver frontend/docs/PUSH_NOTIFICATIONS.md
@aparajita/capacitor-biometric-auth   # App Lock (Face/Touch ID, huella, PIN del dispositivo)
@sentry/capacitor   # crash/error tracking (web + nativo), opcional vía NUXT_PUBLIC_SENTRY_DSN
@sentry/vue         # integración con la app Vue (sibling SDK de @sentry/capacitor)
```

### Pending (Phase 4 follow-up)
```bash
firebase-admin   # backend, pendiente credenciales Firebase — ver frontend/docs/PUSH_NOTIFICATIONS.md
```

### Key Commands
```bash
# Initialize Capacitor
npx cap init workplace-app com.workplace.app

# Add Android platform
npx cap add android

# Build and sync
pnpm --filter frontend build
npx cap sync android

# Open Android Studio
npx cap open android

# Run on device
npx cap run android
```

## 📱 Mobile Considerations

### UI Adaptations
- Responsive design for mobile screens
- Touch-friendly components
- Mobile navigation patterns
- Loading states optimization

### Performance
- Bundle size optimization
- Image compression
- Lazy loading implementation
- Caching strategies

### Native Integration
- [x] Camera access (avatar de perfil, imagen de producto, comprobante de gasto) — permiso `CAMERA` declarado explícitamente en `AndroidManifest.xml` (con `<uses-feature required="false">`)
- [~] Push notifications for appointments (cliente + backend listos, falta FCM/Firebase)
- [x] Biometric authentication — "App Lock": toggle en Configuración (`useBiometric.ts`, `@aparajita/capacitor-biometric-auth`), overlay de bloqueo (`AppLockScreen.vue`) al reanudar la app (`app-lock.client.ts`), preferencia solo local (localStorage, no sincronizada)
- [x] Offline data synchronization (cola `pendingActions` con reintento FIFO)
- [x] Safe-area / notch support — `viewport-fit=cover` + `env(safe-area-inset-*)` en `body` y en el drawer móvil de `AppSidebar.vue`
- [x] Deep links (Android App Links) — `/reset-password` y `/verify-email` desde `https://playrke.com` abren la app directamente (intent-filter `autoVerify` + `.well-known/assetlinks.json` + listener `appUrlOpen`)
- [x] Crash/error tracking — `@sentry/capacitor` + `@sentry/vue`, desactivado por defecto (requiere `NUXT_PUBLIC_SENTRY_DSN`)

## 🗂️ File Structure
```
frontend/
├── capacitor.config.ts
├── android/
├── ios/                             # generado 2026-08-05 (npx cap add ios), sin compilar aún (requiere macOS)
├── assets/
│   ├── icon.png
│   └── splash.png
├── public/
│   ├── icon-192.png
│   ├── icon-512.png
│   ├── downloads/
│   │   └── workplace-manager.apk   # NO versionado — ver public/downloads/README.md
│   └── .well-known/
│       ├── assetlinks.json                 # Android App Links: verifica el dominio playrke.com
│       └── apple-app-site-association      # iOS Universal Links: placeholder, falta Team ID real
├── stores/
│   └── offline.ts                  # Pinia store: isOnline, pendingActions (persist)
├── plugins/
│   ├── capacitor-init.client.ts    # StatusBar+darkmode, backButton, teclado, deep links (appUrlOpen)
│   ├── pinia-persist.client.ts
│   ├── offline-sync.client.ts      # reintento FIFO de pendingActions
│   ├── push-notifications.client.ts # registro/baja de token FCM + listeners
│   ├── app-lock.client.ts          # detecta resume y bloquea la app (App Lock)
│   └── sentry.client.ts            # crash/error tracking, no-op sin NUXT_PUBLIC_SENTRY_DSN
├── composables/
│   ├── useCamera.ts                 # Camera.getPhoto + fallback <input capture>
│   ├── useBiometric.ts              # wrapper de capacitor-biometric-auth + pref. App Lock
│   ├── useAppLock.ts                # estado reactivo compartido del bloqueo
│   └── usePlatformDetect.ts         # detecta android/ios/desktop por user agent (página /download)
├── components/
│   ├── PwaPrompt.vue                # install / update prompts
│   ├── AppLockScreen.vue            # overlay de bloqueo (App Lock)
│   └── AppDownloadButton.vue        # botón inteligente: APK directo (Android) o /download (iOS/desktop)
├── pages/
│   └── download.vue                 # página pública de descarga (QR en desktop, instrucciones iOS)
├── docs/
│   ├── PUSH_NOTIFICATIONS.md        # cliente/backend implementados, falta FCM
│   ├── CAPACITOR_APK_BUILD.md       # build APK + permisos manuales (sección 9)
│   └── CAPACITOR_IOS_BUILD.md       # estado iOS, checklist tras regenerar ios/, pendiente de macOS
└── nuxt.config.ts (modified)
```

## 📝 Notes & Issues
- ✅ **Backend API integration remains unchanged**
- ✅ **PWA manifest, service worker and icons configured**
- ✅ **Capacitor plugins initialized (camera, splash, status bar, keyboard, haptics)**
- ✅ **Camera integration: avatar, productos (ProductModal) y gastos (ExpenseModal)**
- ✅ **Offline: Pinia store con cola `pendingActions` + reintento FIFO al reconectar**
- ✅ **Push notifications: cliente (`push-notifications.client.ts`) y backend (`DeviceToken` + endpoints + stub `sendPush()`) implementados**
- ⚠️ **Push notifications: falta proyecto Firebase + `google-services.json` + credenciales backend (`firebase-admin`) para envío real**
- ✅ **App Lock (biometría): toggle en Configuración + overlay de bloqueo al reanudar la app, preferencia solo local**
- ✅ **Safe-area / notch: `viewport-fit=cover` + `env(safe-area-inset-*)` aplicado globalmente y en el drawer móvil**
- ✅ **Permiso `CAMERA` declarado explícitamente en `AndroidManifest.xml`**
- ✅ **StatusBar sincronizado con el modo oscuro**: `capacitor-init.client.ts` usa `useColorMode().isDark` (reactivo) para aplicar `StatusBar.setStyle`/`setBackgroundColor` al iniciar y cada vez que cambia el tema (`#ffffff`/`Style.Light` en claro, `#030712`/`Style.Dark` en oscuro, igual que `bg-gray-950` del layout)
- ✅ **Deep links (Android App Links)**: intent-filter `autoVerify="true"` en `AndroidManifest.xml` para `https://playrke.com/reset-password` y `/verify-email`, `frontend/public/.well-known/assetlinks.json` con los fingerprints SHA-256 del keystore release y debug, y listener `App.addListener('appUrlOpen', ...)` en `capacitor-init.client.ts` que navega el SPA a la ruta del enlace. **Pendiente de servidor**: verificar que `https://playrke.com/.well-known/assetlinks.json` responda 200 tras el próximo deploy del frontend (Android revalida automáticamente, puede tardar unos minutos tras instalar la app)
- ✅ **Crash/error tracking (Sentry)**: `@sentry/capacitor` + `@sentry/vue` añadidos, plugin `sentry.client.ts` con import dinámico (no añade peso al chunk de entrada). Desactivado por defecto — solo se activa si `NUXT_PUBLIC_SENTRY_DSN` está configurado (`.env`, vacío por defecto). **Pendiente del usuario**: crear proyecto en sentry.io y configurar el DSN para activarlo en producción
- ✅ **Bundle size revisado**: 2.7 MB en `.output/public/_nuxt`, chunk de entrada ~276-281 KB (sin cambios tras añadir Sentry gracias al import dinámico). Los demás chunks grandes son code-splitting normal por ruta (Nuxt) y chart.js (ya lazy-loaded) — no se identificaron más oportunidades de lazy-loading
- ⚠️ **Migración `20260612180000_add_device_tokens` escrita a mano (DB local no accesible); pendiente aplicar con `prisma migrate deploy`**
- ⚠️ **`versionCode 1` / `versionName "1.0"` (valor inicial) — incrementar antes de cada release a Play Store o reinstalación sobre versión anterior (ver `frontend/docs/CAPACITOR_APK_BUILD.md` sección 10)**
- ⚠️ **`minifyEnabled false` en release (~9.4 MB sin shrinking) — reglas ProGuard listas en `frontend/android-backup/proguard-rules.pro`, pendiente activar y probar en dispositivo real (sección 11)**
- ✅ **WebSocket connections (Socket.io) ready for testing**
- ✅ **PWA features as fallback for non-native**

## 🎯 Next Steps
1. ✅ Install Capacitor dependencies
2. ✅ Configure PWA in Nuxt
3. ✅ Initialize Capacitor project
4. ✅ Test basic Android build
5. ✅ Install Android Studio for APK generation
6. ✅ Camera integration (avatar, productos, gastos)
7. ✅ Offline support (cola de acciones pendientes + reintento)
8. ✅ **Push notifications (sin Firebase)**: modelo `DeviceToken` + migración, endpoints
   `POST/DELETE /api/notifications/device-token`, stub `sendPush()`, plugin
   `push-notifications.client.ts`. Pendiente (paso 14): crear proyecto Firebase,
   descargar `google-services.json`, configurar credenciales `FIREBASE_*` en backend
   y seguir la sección 3 de `frontend/docs/PUSH_NOTIFICATIONS.md`
9. ✅ Proyecto Android regenerado + iconos/splash + CORS para WebView (ver `frontend/docs/CAPACITOR_APK_BUILD.md`)
10. ✅ Compilar el APK debug — `frontend/android/app/build/outputs/apk/debug/app-debug.apk`
11. ✅ Test app en emulador (`Medium_Phone_API_36.1`) — login screen OK, sin errores de CORS/red
    hacia `playrke.com`. Pendiente: probar login completo, navegación interna, cámara
    (avatar/producto/gasto) y comportamiento offline en un dispositivo real
12. ✅ **Optimize performance**: lazy-load de chart.js (entry chunk -40% gzip)
13. ✅ **Release APK**: keystore generado, `signingConfigs` configurado en `build.gradle`,
    `app-release.apk` compilado y firmado correctamente. Pendiente: instalar/probar el
    release APK en un dispositivo real y, cuando `playrke.com` esté accesible, validar
    login + navegación + cámara + offline end-to-end
14. **Push notifications — FCM**: pendiente proyecto Firebase, `google-services.json`,
    credenciales `FIREBASE_*` y `firebase-admin` (ver paso 8 y sección 3 de
    `frontend/docs/PUSH_NOTIFICATIONS.md`)
15. **Plataforma iOS**: hasta el 2026-08-05 el proyecto solo tenía `@capacitor/android` —
    no existía `@capacitor/ios` ni carpeta `ios/`. `@capacitor/ios` instalado y proyecto
    `frontend/ios/` generado (`npx cap add ios`) el mismo día — ver
    `frontend/docs/CAPACITOR_IOS_BUILD.md`. **Compilar y probar el `.ipa` requiere Xcode
    en macOS**, no disponible en la máquina de desarrollo actual (Windows) — queda
    pendiente hasta tener acceso a un Mac (propio, CI tipo GitHub Actions `macos-latest`,
    o servicio de build en la nube como Codemagic/EAS). Mientras tanto, `pages/download.vue`
    sigue mostrando el mensaje de "app nativa iOS no disponible" + alternativa PWA.

---
**Created**: March 24, 2026
**Branch**: feature/capacitor-mobile-app
**Status**: In Progress — Phase 4 casi completa (cliente+backend de push notifications listos, solo falta integración FCM/Firebase), Phase 5 completa salvo prueba en dispositivo real con backend accesible. Plataforma iOS: proyecto generado (paso 15), compilación pendiente de acceso a macOS.
