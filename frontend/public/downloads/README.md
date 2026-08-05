# APK público

La página `/download` y el componente `AppDownloadButton.vue` enlazan a:

```
/downloads/workplace-manager.apk
```

Este archivo **no está versionado en git** (ver `.gitignore` — la carpeta
`android/` de Capacitor tampoco lo está). Para publicar una nueva versión:

1. Compilar el APK release siguiendo `frontend/docs/CAPACITOR_APK_BUILD.md`.
2. Copiar el resultado aquí, renombrado exactamente `workplace-manager.apk`:
   ```bash
   cp android/app/build/outputs/apk/release/app-release.apk public/downloads/workplace-manager.apk
   ```
3. Desplegar el frontend (el archivo se sirve como estático desde este mismo dominio).

Recordar incrementar `versionCode`/`versionName` en `android/app/build.gradle`
antes de generar un APK que reemplace a uno ya instalado en dispositivos
(ver sección 10 de `CAPACITOR_APK_BUILD.md`).
