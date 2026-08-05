# Compilar el IPA (Capacitor / iOS)

Este documento describe el estado de la plataforma iOS y los pasos que faltan
para compilar y publicar la app. A diferencia de Android, **compilar para iOS
requiere Xcode, que solo corre en macOS** — no es posible completar el build
desde una máquina Windows/Linux.

## Estado actual (2026-08-05)

- ✅ `@capacitor/ios` instalado (misma major que el resto de Capacitor, `^8.2.0`).
- ✅ Proyecto nativo generado: `frontend/ios/` (`npx cap add ios` + `npx cap sync ios`).
  Al igual que `android/`, **no está versionado en git** (ver `.gitignore`) — se
  regenera con los mismos comandos.
- ✅ Los 9 plugins de Capacitor ya instalados para Android quedaron registrados
  también para iOS tras el sync (`@capacitor/camera`, `@capacitor/app`,
  `@capacitor/push-notifications`, `@aparajita/capacitor-biometric-auth`,
  `@sentry/capacitor`, etc.) vía `Package.swift` (Swift Package Manager).
- ✅ `Info.plist` (`frontend/ios/App/App/Info.plist`) actualizado con las
  descripciones de uso que iOS exige (a diferencia de Android, sin esto Apple
  rechaza la app en review, o el permiso falla silenciosamente en runtime):
  - `NSCameraUsageDescription` — requerido por `@capacitor/camera`.
  - `NSPhotoLibraryUsageDescription` — requerido por `CameraSource.Prompt`
    (selección desde galería).
  - `NSFaceIDUsageDescription` — requerido por
    `@aparajita/capacitor-biometric-auth` (App Lock) para poder usar Face ID.
- ✅ `App.entitlements` creado (`frontend/ios/App/App/App.entitlements`) con
  `applinks:playrke.com` para Universal Links — pero **no está enlazado al
  target todavía** (ver sección 3, requiere Xcode).
- ⚠️ `frontend/public/.well-known/apple-app-site-association` creado con un
  **placeholder** (`TEAMID.com.workplace.app`) — no funcional hasta reemplazar
  `TEAMID` por el Apple Team ID real (ver sección 2).
- ❌ Sin cuenta de Apple Developer todavía (necesaria para Team ID, certificados
  y publicar en App Store / TestFlight).
- ❌ Sin build, sin prueba en simulador/dispositivo, sin firma.

## 0. Checklist al regenerar `ios/` (`npx cap add ios`)

`frontend/ios/` no está versionado (gitignored, igual que `android/`), así que
`Info.plist` y `App.entitlements` se pierden si se borra la carpeta y se
regenera. Tras `npx cap add ios` + `npx cap sync ios`, reaplicar a mano:

1. Agregar a `ios/App/App/Info.plist` las tres claves `NS*UsageDescription`
   listadas arriba (copiar de este documento o del `Info.plist` respaldado en
   el historial de git si ya se commiteó una vez).
2. Volver a crear `ios/App/App/App.entitlements` con `applinks:playrke.com`.
3. En Xcode, agregar la capability **Associated Domains** (ver sección 2,
   paso 4) — sin esto, el `.entitlements` del repo no tiene efecto.

Considerar copiar estos tres archivos a un `frontend/ios-backup/` versionado
(mismo patrón que `frontend/android-backup/` para `AndroidManifest.xml` y el
keystore) la primera vez que se pruebe el build en una Mac real.

## 1. Requisitos (solo posibles en macOS)

- **Mac** con Xcode instalado (App Store, gratis) — física, o en la nube
  (MacStadium, servicios CI como GitHub Actions `macos-latest`, o build
  services tipo Codemagic/EAS Build que no requieren tener la Mac tú mismo).
- **Cuenta de Apple Developer** (99 USD/año) — requerida para:
  - Firmar builds para dispositivo físico (el simulador no la necesita).
  - Obtener el **Team ID**, necesario para Universal Links y distribución.
  - Publicar en App Store o TestFlight.
- **CocoaPods** (`sudo gem install cocoapods`) — Capacitor 8 usa Swift Package
  Manager por defecto (`Package.swift`, ya generado), pero algunos plugins de
  terceros todavía pueden requerir CocoaPods como fallback; instalarlo evita
  sorpresas al abrir el proyecto en Xcode.

## 2. Team ID y Universal Links

1. Obtener el Team ID desde
   [developer.apple.com/account](https://developer.apple.com/account) →
   Membership.
2. Reemplazar `TEAMID` en
   `frontend/public/.well-known/apple-app-site-association` por el valor real
   (formato final: `ABCDE12345.com.workplace.app`).
3. Desplegar el frontend para que
   `https://playrke.com/.well-known/apple-app-site-association` responda 200
   (Nuxt ya copia `public/.well-known/` al output, igual que hace con
   `assetlinks.json` para Android — no requiere cambios adicionales).
4. En Xcode, abrir el target `App` → **Signing & Capabilities** → **+
   Capability** → **Associated Domains** → agregar `applinks:playrke.com`.
   Esto vincula el `App.entitlements` ya presente en el repo (generado en esta
   sesión) al proyecto — actualmente el archivo existe pero Xcode no lo va a
   usar hasta que se agregue la capability desde la UI, que además regenera
   las referencias correctas dentro de `project.pbxproj`.

## 3. Compilar y probar

Desde una Mac, una vez sincronizado el proyecto:

```bash
cd frontend
NUXT_PUBLIC_API_URL="https://playrke.com/api" pnpm exec nuxt generate
npx cap sync ios
npx cap open ios   # abre ios/App/App.xcworkspace (o .xcodeproj) en Xcode
```

Desde Xcode:
- **Simulador**: seleccionar un simulador (ej. iPhone 15) y ▶ Run — no
  requiere cuenta de pago ni dispositivo físico.
- **Dispositivo físico**: requiere cuenta Apple Developer, un
  provisioning profile (Xcode lo gestiona automáticamente con "Automatically
  manage signing" si la cuenta está logueada en Xcode → Settings → Accounts).
- **Archive / IPA**: `Product → Archive`, luego `Distribute App` para exportar
  un `.ipa` (ad-hoc, TestFlight, o App Store) o subirlo directamente a
  TestFlight.

## 4. Pendientes conocidos al momento de compilar

- **CORS**: ya resuelto de antemano — `capacitor.config.ts` agrega
  `iosScheme: 'https'` (mismo valor que `androidScheme`), así que el WebView de
  iOS también sale con origen `https://localhost`, ya aceptado por
  `allowedOrigins` en `backend/src/main.ts`. Igual conviene confirmarlo en el
  primer test en simulador.
- **Push notifications**: mismo estado que Android — cliente y backend listos,
  falta proyecto Firebase (`google-services.json` es Android-only; iOS necesita
  además un **APNs Auth Key** desde developer.apple.com, configurado en el
  proyecto Firebase). Ver `frontend/docs/PUSH_NOTIFICATIONS.md`.
- **Iconos y splash screen**: generados para Android con
  `@capacitor/assets --android`; falta correr el equivalente `--ios` (mismo
  comando, agregar el flag) una vez haya Mac disponible para verificar el
  resultado visualmente.
- **Versión mínima de iOS**: por definir — Capacitor 8 soporta iOS 14+ por
  defecto; ajustar `IPHONEOS_DEPLOYMENT_TARGET` en Xcode si se necesita un
  mínimo distinto.
- **App Store**: además del build, publicar requiere ficha en App Store
  Connect (capturas de pantalla, descripción, política de privacidad — ya
  existe `/privacy` — y revisión de Apple, que puede tardar días).

## 5. Actualizar `pages/download.vue` cuando iOS esté disponible

Mientras no haya un `.ipa` publicado, `frontend/pages/download.vue` muestra un
aviso de "app nativa iOS no disponible" con alternativa de instalar la PWA
desde Safari (ver `download.ios.*` en `frontend/i18n/locales/{es,en}.json`).
Cuando exista un link de App Store, actualizar esa sección para mostrar el
botón de descarga real en vez del aviso.
