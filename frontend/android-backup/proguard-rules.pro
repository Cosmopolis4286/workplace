# Reglas ProGuard/R8 recomendadas para activar minifyEnabled en release.
#
# `frontend/android/` se regenera con `cap add android` y por defecto trae
# `proguard-rules.pro` vacio. Si en el futuro se activa `minifyEnabled true`
# en `android/app/build.gradle`, copiar este archivo a
# `android/app/proguard-rules.pro` (sobrescribiendo el vacio) ANTES de
# compilar el release, y probar bien en un dispositivo real: los plugins
# de Capacitor usan reflection para registrarse y pueden fallar en
# silencio si R8 elimina sus clases.

# Capacitor core y plugins: evita que R8 elimine/renombre las clases que
# se registran via reflection (Bridge, PluginMethod, etc.)
-keep class com.getcapacitor.** { *; }
-keep @com.getcapacitor.annotation.CapacitorPlugin class * { *; }
-keepclassmembers class * extends com.getcapacitor.Plugin {
    @com.getcapacitor.annotation.PermissionCallback <methods>;
    @com.getcapacitor.PluginMethod <methods>;
}

# @aparajita/capacitor-biometric-auth (BiometricPrompt / AndroidX Biometric)
-keep class androidx.biometric.** { *; }

# @capacitor/push-notifications (Firebase Cloud Messaging)
-keep class com.google.firebase.** { *; }
-keep class com.google.android.gms.** { *; }
-dontwarn com.google.firebase.**
-dontwarn com.google.android.gms.**

# WebView JS interface (Capacitor Bridge) — necesario para que el WebView
# pueda invocar metodos nativos desde JS
-keepclassmembers class com.getcapacitor.Bridge {
    public *;
}
