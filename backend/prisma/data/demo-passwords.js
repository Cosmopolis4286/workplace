/**
 * Contraseñas de los usuarios demo: fuente única para el seed (prisma/seed.js)
 * y para GET /api/auth/demo-credentials (AuthService.getDemoCredentials), que
 * las muestra en la pantalla de login en desarrollo. Antes el endpoint tenía
 * su propia lista con 'Demo123' por defecto y no coincidía con lo sembrado.
 *
 * Cada una se puede sobrescribir con DEMO_PWD_<NOMBRE> (p.ej. DEMO_PWD_ADMIN).
 */
const DEMO_PASSWORDS = {
  'superadmin@demo.com': process.env.DEMO_PWD_SUPERADMIN || 'S4p3rAdm1n!#2026',
  'admin@demo.com': process.env.DEMO_PWD_ADMIN || 'Adm1n@Sec#2026',
  'commerce@demo.com': process.env.DEMO_PWD_COMMERCE || 'C0mm3rc3!Biz#26',
  'tecnologia@demo.com': process.env.DEMO_PWD_TECNOLOGIA || 'T3ch@Biz#26',
  'freelancer@demo.com': process.env.DEMO_PWD_FREELANCER || 'Fr33lanc3r!#2026',
  'delivery@demo.com': process.env.DEMO_PWD_DELIVERY || 'D3l1v3ry@Fast#26',
  'comidarapida@demo.com': process.env.DEMO_PWD_COMIDARAPIDA || 'C0m1d4R4p!d4#26',
  'costura@demo.com': process.env.DEMO_PWD_COSTURA || 'C0stur4T3c!#2026',
  'normal@demo.com': process.env.DEMO_PWD_NORMAL || 'N0rm4lUs3r!#2026',
}

module.exports = { DEMO_PASSWORDS }
