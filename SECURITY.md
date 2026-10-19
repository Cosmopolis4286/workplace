# Política de seguridad

## Reportar una vulnerabilidad

**No abras un issue público** para reportar una vulnerabilidad.

Usá el reporte privado de GitHub: pestaña **Security → Report a vulnerability** de este repositorio. Incluí, en lo posible:

- descripción del problema y su impacto (qué datos o dinero quedan expuestos);
- pasos para reproducirlo, endpoint o pantalla afectada;
- versión/commit donde lo observaste.

Compromiso de respuesta: acuse de recibo en 72 h y una evaluación inicial en 7 días. Te avisaremos cuando el fix esté desplegado y, si querés, te daremos crédito en el `CHANGELOG.md`.

## Versiones soportadas

Solo la rama `main` (producción) recibe parches de seguridad.

## Alcance prioritario

Por manejar dinero e identidad, nos interesan especialmente:

- autenticación y sesiones (JWT, refresh tokens, Google OAuth, 2FA);
- escalada de privilegios entre roles/perfiles (RBAC, `ModuleAccessGuard`, `CapabilityGuard`, `CategoryScopeGuard`);
- acceso a datos de otro comercio o usuario (IDOR sobre `commerceId`/`userId`);
- wallets, Pago Protegido (escrow), disputas, PIN de wallet y comisiones;
- KYC y datos personales;
- carga de archivos y XSS en contenido público (catálogo `/loja/[slug]`, reseñas).

Fuera de alcance: ataques de denegación de servicio volumétricos, ingeniería social, y hallazgos que requieren acceso físico al dispositivo o una cuenta SUPERADMIN ya comprometida.

## Controles existentes

| Área | Control |
|------|---------|
| Autenticación | Access token 15 min + refresh 7 días con rotación; blacklist de tokens revocados en Redis; 2FA |
| Contraseñas / PIN | Hash con bcrypt; PIN de wallet separado de la contraseña |
| Autorización | RBAC en base de datos con caché Redis; guards por permiso, módulo, capacidad y rubro; ownership verificado por `commerceId` en cada consulta |
| Transporte y cabeceras | Helmet, CORS con lista de orígenes permitidos, TLS terminado en Traefik |
| Abuso | Rate limiting global (`ThrottlerGuard`) y límites más estrictos en auth y endpoints públicos; fail2ban en el servidor (`security/fail2ban`) |
| Dinero | Operaciones de wallet atómicas en transacción; escrow con proyección auditable; historial de tasas de cambio con autor |
| Auditoría | Módulo `audit` y logs centralizados (Loki) |
| Dependencias | `pnpm audit` en cada PR y Dependabot semanal |

## Vulnerabilidades conocidas sin parche

`pnpm audit` reporta dos avisos `high` para los que no existe versión corregida.
Se revisaron y no son explotables en este proyecto; revisar de nuevo cuando
aparezca un parche:

| Paquete | Aviso | Por qué no aplica |
|---------|-------|-------------------|
| `node-forge` ≤ 1.4.0 | [GHSA-86w9-cpqp-85rv](https://github.com/advisories/GHSA-86w9-cpqp-85rv) (verificación de firmas RSA) | Solo lo usa `listhen`, del CLI de desarrollo de Nuxt, para certificados locales. No entra en el build de producción. |
| `braces` ≤ 3.0.3 | [GHSA-vfj7-8cjw-p6xm](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm) (DoS con patrones) | Llega por `chokidar` (`nestjs-i18n`, `@nestjs/cli`). Los patrones son rutas fijas del proyecto, nunca entrada de usuarios, y el watcher de i18n solo corre en desarrollo. |

Los avisos de herramientas de desarrollo con parche (`glob`, `minimatch`,
`picomatch`, `tmp`) se corrigen con `pnpm.overrides` en el `package.json` raíz,
acotados al rango vulnerable.

## Buenas prácticas para contribuidores

- Nunca commitees secretos: usá `.env.dev` / `.env.local.prod` (ignorados por git) a partir de los `*.example`.
- Todo endpoint nuevo que toque datos de un comercio debe filtrar por `commerceId` en el `where`, no solo validar después.
- Todo endpoint nuevo que mueva dinero debe ejecutarse dentro de una transacción y tener tests.
- Si descubrís un secreto expuesto en el historial, rotalo primero y avisá por el canal privado de arriba.
