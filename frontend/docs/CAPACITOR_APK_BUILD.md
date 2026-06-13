# Compilar el APK (Capacitor / Android)

Este documento describe los pasos para generar el APK de WorkPlace Manager a
partir del frontend Nuxt + Capacitor. El proyecto Android nativo vive en
`frontend/android/` (carpeta generada, **no versionada** — ver `.gitignore`).

## 1. Requisitos previos (en la máquina donde se compila)

- **Node.js + pnpm** (igual que para desarrollo web).
- **JDK 17** (Capacitor 8 / Android Gradle Plugin requieren JDK 17).
- **Android SDK** — vía [Android Studio](https://developer.android.com/studio)
  (recomendado, instala SDK + build-tools + platform-tools automáticamente) o
  el SDK command-line tools standalone.
- Variables de entorno: `ANDROID_HOME` (o `ANDROID_SDK_ROOT`) apuntando al SDK,
  y `JAVA_HOME` apuntando al JDK 17.
- Gradle no necesita instalarse manualmente: el wrapper (`gradlew` /
  `gradlew.bat`) descarga Gradle 8.14.3 automáticamente.

## 2. Generar el build web estático

Capacitor empaqueta un build **estático** (no el `node-server` que usa
`pnpm dev`/`nuxt build`). Hay que usar `nuxt generate`, y la URL de la API debe
ser la **URL pública absoluta del backend** (no `localhost`, porque el APK no
corre en la misma máquina que el backend):

```bash
cd frontend
NUXT_PUBLIC_API_URL="https://playrke.com/api" pnpm exec nuxt generate
```

En Windows / PowerShell:
```powershell
$env:NUXT_PUBLIC_API_URL="https://playrke.com/api"
pnpm exec nuxt generate
```

Esto genera `.output/public/` con `index.html` + assets estáticos (47 rutas
prerenderizadas). La URL de la API queda embebida en `index.html` dentro del
`<script>` de runtime config — verificar con:

```bash
grep -o "apiUrl:\"[^\"]*\"" .output/public/index.html
```

> Si cambia el dominio del backend en el futuro, hay que repetir este paso y
> volver a copiar/sincronizar (paso 3) antes de compilar el APK.

## 3. Sincronizar con el proyecto Android

```bash
npx cap copy android   # copia .output/public -> android/app/src/main/assets/public
npx cap sync android   # copy + actualiza plugins nativos (camera, app, etc.)
```

Si `frontend/android/` no existe (primera vez o se borró), antes de sincronizar
hay que crearlo:

```bash
npx cap add android
npx cap sync android
```

> ⚠️ Después de `cap add android` hay que volver a aplicar los permisos manuales
> descritos en la sección 9 (`AndroidManifest.xml`), ya que `cap sync` no los
> agrega automáticamente.

## 4. Iconos y splash screen

Ya generados a partir de `frontend/capacitor-assets/icon.png` y `splash.png`
(logo de la app, 512x512) usando `@capacitor/assets`. Si el logo cambia,
regenerar con:

```bash
npx --yes @capacitor/assets generate --android --assetPath capacitor-assets
npx cap sync android
```

## 5. Compilar el APK

### Opción A: Android Studio (recomendado para firmar / debug visual)

```bash
npx cap open android
```

Esto abre `frontend/android/` en Android Studio. Desde ahí:
- **Debug APK**: `Build → Build Bundle(s) / APK(s) → Build APK(s)`. El APK
  queda en `android/app/build/outputs/apk/debug/app-debug.apk`.
- **Release APK**: `Build → Generate Signed Bundle / APK`, elegir APK, crear o
  seleccionar un keystore, y completar el wizard.

### Opción B: línea de comandos (gradlew)

Desde `frontend/android/`:

```bash
# Debug (sin firmar con keystore de release, instalable para pruebas)
./gradlew assembleDebug
# APK en: android/app/build/outputs/apk/debug/app-debug.apk

# Release (requiere keystore configurado, ver sección 6)
./gradlew assembleRelease
# APK en: android/app/build/outputs/apk/release/app-release.apk
```

En Windows: `gradlew.bat assembleDebug` / `gradlew.bat assembleRelease`.

## 6. Firma para release (Play Store / distribución)

**Ya configurado** en este proyecto: existe `android/workplace-release.keystore`
(alias `workplace`, RSA 2048, válido hasta 2053) y `android/keystore.properties`
(ambos gitignored — no versionados). `android/app/build.gradle` carga
`keystore.properties` y define `signingConfigs.release`, usado automáticamente
por `buildTypes.release`. Si el archivo no existe, `assembleRelease` produce un
APK sin firmar (`app-release-unsigned.apk`) en vez de fallar.

Las contraseñas del keystore están guardadas fuera del repo (gestor de
contraseñas del usuario) — **sin ellas no se puede actualizar la app ya
publicada con el mismo `appId` (`com.workplace.app`)**.

**Backup**: el archivo binario `workplace-release.keystore` (sin contraseñas,
inútil sin ellas) está respaldado en `frontend/android-backup/` (sí versionado
en git, a diferencia de `frontend/android/`). Ver
[`android-backup/README.md`](../android-backup/README.md) para el flujo de
restauración tras `cap add android`.

Para regenerar desde cero (solo si se pierde el keystore actual y aún no se
publicó ninguna versión con él):

```bash
keytool -genkey -v -keystore workplace-release.keystore -alias workplace \
  -keyalg RSA -keysize 2048 -validity 10000
```

Y crear `android/keystore.properties`:
```properties
storePassword=...
keyPassword=...
keyAlias=workplace
storeFile=workplace-release.keystore
```

Nota: con keystores PKCS12 (formato por defecto en JDKs recientes), `keytool`
ignora `-keypass` si es distinto de `-storepass` — usar la misma contraseña
para `storePassword` y `keyPassword`.

## 7. CORS — backend debe aceptar el origen del WebView

El WebView de Capacitor usa `androidScheme: 'https'` (ver
`capacitor.config.ts`), por lo que las peticiones a la API salen con origen
`https://localhost`, distinto del dominio del frontend web
(`https://playrke.com`). Esto ya está manejado en
`backend/src/main.ts` (`allowedOrigins` incluye `https://localhost` además de
`FRONTEND_URL`) — no requiere configuración adicional en el backend desplegado,
solo asegurarse de desplegar esta versión actualizada.

## 8. Checklist rápido (resumen)

```bash
cd frontend
NUXT_PUBLIC_API_URL="https://playrke.com/api" pnpm exec nuxt generate
npx cap sync android
cd android
./gradlew assembleDebug   # o assembleRelease con keystore configurado
```

APK resultante en `android/app/build/outputs/apk/{debug,release}/`.

## 9. Permisos manuales en `AndroidManifest.xml`

`frontend/android/` no está versionado (ver `.gitignore`), así que estos
permisos se pierden si se regenera el proyecto con `cap add android`. Hay que
agregarlos a mano en `android/app/src/main/AndroidManifest.xml`, dentro de
`<manifest>` (fuera de `<application>`):

```xml
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.POST_NOTIFICATIONS" />
<uses-permission android:name="android.permission.CAMERA" />

<!-- La app funciona sin camara (CameraSource.Prompt permite elegir galeria) -->
<uses-feature android:name="android.hardware.camera" android:required="false" />
<uses-feature android:name="android.hardware.camera.autofocus" android:required="false" />
```

- `INTERNET`: ya lo agrega `cap add android` por defecto.
- `POST_NOTIFICATIONS`: requerido en Android 13+ (API 33+) para que
  `PushNotifications.requestPermissions()` (ver
  `frontend/plugins/push-notifications.client.ts`) pueda solicitar el permiso
  en runtime. Sin esto, las notificaciones push no se mostrarán en dispositivos
  con Android 13 o superior (el `targetSdkVersion` del proyecto es 36).
- `CAMERA` + `<uses-feature>`: declaración explícita recomendada por Capacitor
  para `CameraSource.Prompt` (ver `frontend/composables/useCamera.ts`). Se marca
  `required="false"` para no excluir de la Play Store a dispositivos sin cámara,
  ya que `CameraSource.Prompt` permite elegir galería como alternativa.
- El permiso `USE_BIOMETRIC` que requiere `@aparajita/capacitor-biometric-auth`
  (App Lock) lo agrega automáticamente el manifest del plugin durante el build
  (merge de manifests de Gradle); no requiere edición manual.
- El **intent-filter de deep links** (`autoVerify="true"` para
  `https://playrke.com/reset-password` y `/verify-email`) también se pierde al
  regenerar `android/` — está documentado y copiado en
  `android-backup/AndroidManifest.xml` junto con el resto. Ver sección 12.

## 10. `versionCode` / `versionName`

Definidos en `android/app/build.gradle` (`defaultConfig`), actualmente
`versionCode 1` / `versionName "1.0"`.

- `versionCode` (entero) **debe incrementarse en cada build que se suba a
  Play Store o que se instale sobre una versión anterior en el mismo
  dispositivo** — Android rechaza instalar un APK con `versionCode` igual o
  menor al ya instalado.
- `versionName` (string visible al usuario, ej. `"1.1"`, `"1.0.1"`) se
  actualiza junto con `versionCode` siguiendo semver o el esquema que se
  prefiera.
- Como `android/` se regenera (gitignored), este valor vuelve a `1`/`"1.0"`
  cada vez que se hace `cap add android`. Si ya existe una versión publicada,
  anotar aquí o en `android-backup/` cuál fue el último `versionCode` usado
  para no repetirlo.

## 11. Activar `minifyEnabled` (R8/ProGuard) — opcional

Actualmente `minifyEnabled false` en el build de release (`app-release.apk`
~9.4 MB sin shrinking). Para reducir el tamaño:

1. Copiar `android-backup/proguard-rules.pro` a
   `android/app/proguard-rules.pro` (contiene reglas para Capacitor core,
   plugins, `@aparajita/capacitor-biometric-auth` y
   `@capacitor/push-notifications`/Firebase).
2. Cambiar `minifyEnabled false` → `true` en
   `android/app/build.gradle` (`buildTypes.release`).
3. Compilar `assembleRelease` y **probar exhaustivamente en un dispositivo
   real**: cámara, App Lock (biometría), push notifications y WebView/Bridge.
   R8 puede eliminar clases usadas solo via reflection si las reglas no
   cubren algún plugin nuevo.

No se activó en esta sesión porque no hay forma de probar en dispositivo
real con el backend de producción accesible (`playrke.com`).

## 12. Deep links (Android App Links)

Los enlaces de `https://playrke.com/reset-password?token=...` y
`https://playrke.com/verify-email?token=...` (enviados por correo) abren la
app directamente en vez del navegador, gracias a:

1. **Intent-filter** en `AndroidManifest.xml` (sección 9, también en
   `android-backup/AndroidManifest.xml`):
   ```xml
   <intent-filter android:autoVerify="true">
       <action android:name="android.intent.action.VIEW" />
       <category android:name="android.intent.category.DEFAULT" />
       <category android:name="android.intent.category.BROWSABLE" />
       <data android:scheme="https" android:host="playrke.com" android:pathPrefix="/reset-password" />
       <data android:scheme="https" android:host="playrke.com" android:pathPrefix="/verify-email" />
   </intent-filter>
   ```
2. **`frontend/public/.well-known/assetlinks.json`** — verificación del
   dominio. Incluido en `.output/public/` por `nuxt generate` (Nuxt copia
   `public/` a la raíz del output), por lo que queda servido en
   `https://playrke.com/.well-known/assetlinks.json` tras el próximo deploy
   del frontend. Contiene los fingerprints SHA-256 de:
   - `workplace-release.keystore` (release): `5B:37:91:BD:A2:70:5B:91:EA:69:7E:B4:BD:B9:B6:A3:5C:57:6A:97:B0:A3:73:0C:87:31:1B:AF:72:8C:B7:14`
   - `debug.keystore` (debug, `~/.android/debug.keystore`, password `android`):
     `98:3B:F8:44:A9:A1:7D:83:1B:B0:22:5C:56:53:37:F2:43:63:7D:62:B1:0B:3B:64:2F:CD:7F:EB:26:85:0B:C1`

   Si se regenera el keystore release o se firma con uno nuevo, hay que
   recalcular el fingerprint (`keytool -list -v -keystore ... | grep SHA256`)
   y actualizar `assetlinks.json`.
3. **Listener `appUrlOpen`** en `frontend/plugins/capacitor-init.client.ts` —
   cuando Android abre la app vía App Link, Capacitor emite la URL completa
   (`https://playrke.com/reset-password?token=...`); el listener extrae
   `pathname + search` y navega el SPA con `navigateTo()`.

**Verificación**: Android revalida `assetlinks.json` al instalar la app (o
puede forzarse con `adb shell pm verify-app-links --re-verify
com.workplace.app`). Si el archivo no es accesible (404, redirect, etc.), el
sistema cae de vuelta al navegador — el flujo sigue funcionando, solo sin la
apertura directa en la app.

## 13. Crash/error tracking (Sentry) — opcional

`@sentry/capacitor` + `@sentry/vue` están instalados pero **desactivados por
defecto**: `frontend/plugins/sentry.client.ts` solo inicializa Sentry si
`NUXT_PUBLIC_SENTRY_DSN` no está vacío (import dinámico, no afecta el tamaño
del chunk de entrada si no se usa).

Para activarlo:

1. Crear un proyecto en [sentry.io](https://sentry.io) (plataforma "Vue" o
   "Capacitor").
2. Copiar el DSN del proyecto (`Settings → Client Keys (DSN)`).
3. Configurar `NUXT_PUBLIC_SENTRY_DSN=https://...@....ingest.sentry.io/...`
   al compilar (mismo mecanismo que `NUXT_PUBLIC_API_URL`, ver sección 2):
   ```bash
   NUXT_PUBLIC_API_URL="https://playrke.com/api" \
   NUXT_PUBLIC_SENTRY_DSN="https://...@....ingest.sentry.io/..." \
   pnpm exec nuxt generate
   ```
4. `npx cap sync android` + rebuild — el plugin nativo `sentry-capacitor` ya
   queda registrado (9 plugins) y agrega ~3-4 MB al APK (SDK nativo de
   crash-handling para Android).

Sin DSN, el código de Sentry permanece sin cargarse y el tamaño del APK no
incluye el SDK nativo no inicializado (pero las dependencias del proyecto
Gradle sí quedan instaladas tras `cap sync`, ya que Capacitor registra todos
los plugins instalados independientemente de si se usan en runtime).
