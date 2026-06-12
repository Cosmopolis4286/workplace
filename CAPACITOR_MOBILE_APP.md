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
- [ ] Push notifications (plan documentado en `frontend/docs/PUSH_NOTIFICATIONS.md`, pendiente credenciales Firebase)
- [x] Local storage (Pinia + `pinia-plugin-persistedstate`)
- [x] Offline support (cola de acciones pendientes + reintento automático al reconectar)

### Phase 5: Build & Deploy
- [x] Android project regenerado (`npx cap add android` + `sync`) con build estático (`nuxt generate`) y `NUXT_PUBLIC_API_URL` de producción
- [x] Iconos y splash screen nativos generados (`@capacitor/assets`, ver `frontend/capacitor-assets/`)
- [x] CORS backend ajustado para aceptar el origen `https://localhost` del WebView (`backend/src/main.ts`)
- [x] Pasos de compilación documentados en `frontend/docs/CAPACITOR_APK_BUILD.md`
- [ ] Generate debug APK (requiere JDK 17 + Android SDK locales, no disponibles en este entorno)
- [ ] Test on Android device
- [ ] Optimize performance
- [ ] Generate release APK (requiere keystore de firma)

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

### Pending (Phase 4 follow-up)
```bash
@capacitor/push-notifications   # ver frontend/docs/PUSH_NOTIFICATIONS.md
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
- [x] Camera access (avatar de perfil, imagen de producto, comprobante de gasto)
- [ ] Push notifications for appointments (plan listo, falta Firebase)
- [ ] Biometric authentication
- [x] Offline data synchronization (cola `pendingActions` con reintento FIFO)

## 🗂️ File Structure
```
frontend/
├── capacitor.config.ts
├── android/
├── assets/
│   ├── icon.png
│   └── splash.png
├── public/
│   ├── icon-192.png
│   └── icon-512.png
├── stores/
│   └── offline.ts                  # Pinia store: isOnline, pendingActions (persist)
├── plugins/
│   ├── capacitor-init.client.ts
│   ├── pinia-persist.client.ts
│   └── offline-sync.client.ts      # reintento FIFO de pendingActions
├── composables/
│   └── useCamera.ts                 # Camera.getPhoto + fallback <input capture>
├── components/
│   └── PwaPrompt.vue                # install / update prompts
├── docs/
│   └── PUSH_NOTIFICATIONS.md        # plan FCM (sin código aún)
└── nuxt.config.ts (modified)
```

## 📝 Notes & Issues
- ✅ **Backend API integration remains unchanged**
- ✅ **PWA manifest, service worker and icons configured**
- ✅ **Capacitor plugins initialized (camera, splash, status bar, keyboard, haptics)**
- ✅ **Camera integration: avatar, productos (ProductModal) y gastos (ExpenseModal)**
- ✅ **Offline: Pinia store con cola `pendingActions` + reintento FIFO al reconectar**
- ⚠️ **Push notifications: solo plan documentado, falta proyecto Firebase + `google-services.json` + credenciales backend**
- ⚠️ **Android Studio not detected - need to install or configure path**
- ⚠️ **Gradle wrapper missing - need Android Studio for proper setup**
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
8. **Push notifications**: crear proyecto Firebase, descargar `google-services.json`,
   configurar credenciales `FIREBASE_*` en backend y seguir `frontend/docs/PUSH_NOTIFICATIONS.md`
9. ✅ Proyecto Android regenerado + iconos/splash + CORS para WebView (ver `frontend/docs/CAPACITOR_APK_BUILD.md`)
10. **Compilar el APK** (en una máquina con JDK 17 + Android SDK) siguiendo `frontend/docs/CAPACITOR_APK_BUILD.md`:
    - File → Open → `c:\Users\Eisker\Documents\projects\workplace\frontend\android` en Android Studio, o `./gradlew assembleDebug`
11. **Test app on Android device/emulator**
12. **Optimize UI components for mobile**

---
**Created**: March 24, 2026
**Branch**: feature/capacitor-mobile-app
**Status**: In Progress — Phase 4 casi completa (falta push notifications), Phase 5 lista para compilar (falta entorno con JDK/Android SDK)
