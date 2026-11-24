# Auditoría de endurecimiento de seguridad — noviembre de 2026

## Alcance

Revisión estática sobre `main` y cambios propuestos en la rama
`security/hardening-auth-ci-v1`. Esta auditoría no sustituye una prueba de
penetración ni confirma la configuración real del servidor de producción.

## Correcciones incluidas en esta rama

- El middleware de contexto ya no decodifica JWT sin verificar su firma para
  crear o restaurar sesiones. La autenticación y la revocación quedan en
  Passport/JwtStrategy.
- La IP se obtiene de `req.ip`, que respeta la cadena de proxies configurada
  por Express. No se confía directamente en `X-Forwarded-For`,
  `X-Real-IP` ni `CF-Connecting-IP` enviados por el cliente.
- La huella de dispositivo deja de incorporar la IP. Los cambios de red
  móvil, CGNAT o VPN no deben crear una identidad de dispositivo nueva.
- Un cambio de IP al renovar refresh token se registra como señal de riesgo,
  pero no bloquea por sí solo una sesión válida.
- El restablecimiento de contraseña consume el token de forma condicional
  dentro de la misma transacción que cambia la contraseña y revoca refresh
  tokens. Incrementa `User.authVersion` en esa misma transacción; las
  estrategias de access y refresh JWT comparan la versión firmada con la BD,
  por lo que la revocación no depende de que Redis acepte una blacklist.
- Las sesiones nuevas se identifican por el JTI firmado del par de tokens,
  evitando colisiones entre dispositivos que comparten User-Agent. Los JWT
  anteriores a `authVersion` conservan temporalmente la clave legacy de
  sesión mientras la cuenta siga en versión 0.
- Se crean sesiones explícitas al registrar y al iniciar sesión con Google;
  el middleware ya no intenta reparar sesiones a partir de JWT sin verificar.
- El endpoint de reset usa DTO validado (UUID, política de contraseña y límite
  compatible con bcrypt).
- Se agregan pruebas unitarias para reset concurrente, DTO, contexto de red
  y rechazo de JWT con una versión de autenticación obsoleta.
- La validación de PR ya no permite continuar manualmente ignorando fallos de
  auditoría de dependencias o de tests unitarios.

## Riesgos que requieren cierre antes de producción

### P0 — Protección de ramas y despliegue

La rama `main` estaba sin protección y sin checks obligatorios al momento de
la auditoría. Configurar en GitHub:

1. Require a pull request before merging.
2. Require status checks de `PR Validation` (todos los jobs requeridos que
   correspondan a la versión del workflow).
3. Require conversation resolution.
4. Block force pushes y deletion.
5. Restringir bypass de administradores.
6. Proteger environments de producción con aprobación y secretos separados.
7. Verificar que el deploy de producción solo ocurra desde `main` y que el
   SHA desplegado coincida con el SHA aprobado.

La integración disponible para esta auditoría no permite modificar las reglas
administrativas del repositorio; este paso debe configurarse en Settings.

### P0 — Autorización y aislamiento multi-comercio

Auditar cada controller y query que maneje `commerceId`, `userId`,
`profileId`, KYC, wallet, pagos, pedidos, archivos y conversaciones. La
autorización debe validar ownership en la consulta/servicio, no confiar en IDs
del body ni en que el frontend oculte botones. Añadir pruebas negativas
usuario A → recurso de usuario B y comercio A → recurso de comercio B.

### P0 — Tokens en aplicaciones web y móviles

El backend coloca tokens en cookies HttpOnly, pero login/registro/refresh y
2FA también devuelven access/refresh tokens en JSON. El frontend web los
mantiene en memoria; la app nativa persiste tokens en localStorage. Para una
frontera más fuerte:

- Web: responder sin tokens en JSON y autenticar exclusivamente con cookies
  HttpOnly, Secure, SameSite y protección CSRF/origin.
- Native: guardar refresh tokens en iOS Keychain / Android Keystore mediante
  almacenamiento seguro nativo, nunca localStorage.
- Migrar con pruebas de integración para no romper la sesión de Capacitor.
- No confiar en un header de cliente para decidir si se revela un token: ese
  header puede ser falsificado por JavaScript en el navegador.

### P1 — Política de sesión y recuperación

- Añadir pruebas de integración para refresh concurrente, replay, logout
  global, contraseña cambiada, cuenta suspendida y Redis no disponible.
- Revisar el bloqueo por intentos fallidos por cuenta e IP para evitar
  enumeración y denegación de servicio contra una cuenta objetivo.
- Exigir reautenticación reciente para desactivar 2FA, cambiar email, cambiar
  contraseña, modificar datos de cobro o realizar acciones financieras.
- Verificar consumo único de códigos de respaldo 2FA y rate limit distribuido.
- Revisar la política de expiración absoluta además del timeout de inactividad.

### P1 — Carga de archivos y contenido público

El filtro de avatar usa MIME declarado por el cliente y extensión derivada del
MIME. Confirmar validación por firma real del archivo, decodificación/re-encode
de imágenes, límites por usuario, nombres aleatorios, almacenamiento fuera del
webroot cuando corresponda y protección contra SVG/HTML activo. Aplicar la
misma política a todos los endpoints de upload.

### P1 — Secretos, dependencias y cadena de suministro

- Confirmar que `JWT_SECRET`, `JWT_REFRESH_SECRET`, claves de cifrado,
  Google OAuth, Redis y DB fallan al arrancar si faltan o son débiles.
- Usar secretos diferentes por ambiente y rotación documentada.
- Escanear dependencias de frontend y backend, incluyendo producción y
  desarrollo; revisar advisories no corregibles al actualizar lockfile.
- Fijar acciones de GitHub a SHA completo y mantener Dependabot.
- Revisar permisos mínimos de GITHUB_TOKEN, PAT y runner self-hosted.
- El runner self-hosted no debe ejecutar código no confiable de PRs ni tener
  secretos de producción disponibles durante validaciones de PR.

### P1 — CSRF, CORS y proxies

- Mantener allowlist exacta de orígenes y cookies HttpOnly.
- Probar CSRF real desde otro sitio contra POST/PUT/PATCH/DELETE con cookie.
- Confirmar que Traefik es el único proxy confiable y que el backend no es
  accesible directamente desde Internet.
- Si se agregan CDN/proxies, ajustar `trust proxy` a la topología real; no
  usar un número arbitrario de saltos.
- En producción, validar que `FRONTEND_URL` use HTTPS y que las cookies
  siempre tengan `Secure`.

## Pruebas de aceptación mínimas

- [ ] Un cliente no puede leer ni modificar datos de otro cliente.
- [ ] Un comercio no puede consultar ni modificar recursos de otro comercio.
- [ ] Un rol sin permiso recibe 403 en cada operación sensible.
- [ ] Un usuario suspendido no puede renovar sesión ni usar endpoints.
- [ ] Un reset token solo puede consumirse una vez incluso en solicitudes
      concurrentes.
- [ ] Reset y cambio de contraseña invalidan refresh y access tokens mediante
      versión de autenticación; comprobar también refresh concurrente.
- [ ] Un refresh token revocado/reutilizado no crea una nueva sesión.
- [ ] Un cambio de IP legítimo no bloquea al usuario móvil.
- [ ] Redis caído no hace que un JWT revocado sea aceptado.
- [ ] Cookies web no exponen tokens a JavaScript y CSRF está bloqueado.
- [ ] Archivos malformados, con MIME falso o contenido activo son rechazados.
- [ ] Los checks obligatorios bloquean merge y el deploy valida el SHA.

## Criterio de salida

No declarar WorkPlace listo para producción hasta completar los puntos P0,
ejecutar las pruebas automatizadas y verificar un despliegue real con smoke
tests. Las correcciones de esta rama son un endurecimiento parcial y
comprobable, no una certificación de seguridad.
