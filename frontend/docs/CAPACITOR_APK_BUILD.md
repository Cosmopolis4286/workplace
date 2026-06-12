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
```

- `INTERNET`: ya lo agrega `cap add android` por defecto.
- `POST_NOTIFICATIONS`: requerido en Android 13+ (API 33+) para que
  `PushNotifications.requestPermissions()` (ver
  `frontend/plugins/push-notifications.client.ts`) pueda solicitar el permiso
  en runtime. Sin esto, las notificaciones push no se mostrarán en dispositivos
  con Android 13 o superior (el `targetSdkVersion` del proyecto es 36).
