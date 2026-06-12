# Android backup

`frontend/android/` es un proyecto **generado** por Capacitor (`npx cap add android`
+ `npx cap sync android`) y por eso está en `.gitignore` — se reconstruye desde
`capacitor.config.ts`, `frontend/capacitor-assets/` y el build web. Esta carpeta
contiene lo que **no** es regenerable y que de otra forma se perdería.

## Contenido

- **`workplace-release.keystore`** — keystore de firma para release
  (alias `workplace`, RSA 2048, válido hasta 2053). Sin él no se puede actualizar
  la app ya publicada con `appId` `com.workplace.app`.
- **`keystore.properties.example`** — estructura de `android/keystore.properties`.
  Las contraseñas reales **NO están en git** — guardarlas en el gestor de
  contraseñas del usuario y completar este archivo localmente como
  `android/keystore.properties` (gitignored).
- **`AndroidManifest.xml`** — copia de referencia de
  `android/app/src/main/AndroidManifest.xml` con los permisos manuales ya
  aplicados (`POST_NOTIFICATIONS`, `CAMERA` + `<uses-feature>`, además del
  `INTERNET` que agrega Capacitor por defecto). Ver
  `frontend/docs/CAPACITOR_APK_BUILD.md` sección 9.
- **`proguard-rules.pro`** — reglas ProGuard/R8 recomendadas para cuando se
  active `minifyEnabled true` en release (actualmente `false`). Cubre
  Capacitor core/plugins, biometric-auth y push-notifications/Firebase.
  Ver `frontend/docs/CAPACITOR_APK_BUILD.md` sección 10.

## Restaurar después de `cap add android`

```bash
cd frontend
npx cap add android
npx cap sync android

# Restaurar keystore
cp android-backup/workplace-release.keystore android/workplace-release.keystore

# Crear android/keystore.properties con las contraseñas reales
# (copiar android-backup/keystore.properties.example y completar)

# Aplicar permisos manuales (comparar/copiar desde android-backup/AndroidManifest.xml)

# Si se activa minifyEnabled true, copiar las reglas ProGuard:
# cp android-backup/proguard-rules.pro android/app/proguard-rules.pro
```

Ver `frontend/docs/CAPACITOR_APK_BUILD.md` para el flujo completo de build.
