/**
 * Fase 5 del refactor arquitectónico: enforcement real en CI.
 *
 * Tras completar la Fase 3 (mover los ~40 módulos a src/domains/<categoria>/)
 * y la Fase 4 (PlanLimitsFacade/PlatformFeesFacade), esta config marca
 * `error` cualquier import de un archivo interno de un dominio desde otro
 * dominio distinto (no-cross-domain-service-import) o de PermissionsService
 * fuera de identity-access (no-business-module-imports-permissions-service).
 *
 * dependency-cruiser no permite excluir pares (origen, destino) específicos
 * en su DSL — solo patrones de path. Por eso el CI no corre `depcruise`
 * directo: corre `node scripts/check-cross-domain-imports.js`, que ejecuta
 * depcruise con ESTA config y filtra las violaciones ya documentadas en
 * scripts/known-cross-domain-edges.json antes de decidir el exit code.
 * Un import cruzado NUEVO que no esté en ese JSON rompe el build de
 * inmediato; los pares ya listados no bloquean nada pero tampoco crecen
 * sin que alguien los agregue explícitamente.
 */
module.exports = {
  forbidden: [
    {
      name: 'no-orphans',
      comment: 'Módulo sin imports ni exports usados — puede ser código muerto.',
      severity: 'warn',
      from: {
        orphan: true,
        pathNot: [
          '(^|/)\\.[^/]+\\.(js|cjs|mjs|ts|json)$',
          '\\.d\\.ts$',
          '(^|/)tsconfig\\.json$',
          '(^|/)(jest|prettier)\\.config\\.(js|cjs|mjs|ts|json)$',
          '\\.spec\\.ts$',
          '\\.test\\.ts$',
        ],
      },
      to: {},
    },
    {
      name: 'no-circular',
      comment:
        'Dependencia circular entre módulos. Excepción conocida: ' +
        'domains/money/plans/plan-limits.service.ts <-> domains/platform/system-modules/system-modules.service.ts ' +
        '(vía la constante ALL_MODULES) — deuda documentada, requiere un rediseño ' +
        'fuera del alcance de PlanLimitsFacade (Fase 4).',
      severity: 'warn',
      from: {},
      to: { circular: true },
    },
    {
      // dependency-cruiser no soporta backreferences entre from.path y
      // to.path en su DSL declarativo, así que esta regla por sí sola NO
      // distingue "mismo dominio" de "dominio distinto" — reporta TODO
      // acceso a un archivo .service.ts desde otro archivo de dominio,
      // intra o inter-dominio. Se deja en 'warn' (informativa) a propósito:
      // quien decide qué es realmente cross-domain y bloquea el build es
      // scripts/check-cross-domain-imports.js, que sí compara los
      // segmentos domains/<A>/ vs domains/<B>/ con JS y aplica la baseline
      // de scripts/known-cross-domain-edges.json. Correr `depcruise` a
      // secas para esta regla es ruidoso por diseño — usar `pnpm deps:check`.
      name: 'no-cross-domain-service-import',
      comment:
        'Acceso a un archivo .service.ts de otro archivo dentro de domains/. Filtrado real ' +
        '(intra vs inter-dominio) y enforcement en scripts/check-cross-domain-imports.js.',
      severity: 'warn',
      from: {
        path: '^src/domains/[^/]+/.+\\.(service|controller)\\.ts$',
      },
      to: {
        path: '^src/domains/[^/]+/.+\\.service\\.ts$',
      },
    },
    {
      name: 'no-business-module-imports-permissions-service',
      comment:
        'PermissionsService es infraestructura transversal de RBAC: solo guards/controllers ' +
        'en el borde (o el propio domains/identity-access/permissions/) pueden usarlo directo. ' +
        'El resto de los dominios debe recibir el resultado ya resuelto vía @CurrentUser()/@RequirePermission(), ' +
        'no consultar permisos ellos mismos dentro de un service. ' +
        'Excepción conocida (ver scripts/known-cross-domain-edges.json): ' +
        'domains/platform/navigation/navigation.service.ts necesita permisos por rol para construir ' +
        'el árbol de navegación completo — no hay borde HTTP que se lo resuelva antes. ' +
        'Enforcement real vía scripts/check-cross-domain-imports.js, no esta regla sola.',
      severity: 'warn',
      from: {
        path: '^src/domains/(?!identity-access/).*\\.service\\.ts$',
      },
      to: {
        path: 'domains/identity-access/permissions/permissions\\.service\\.ts$',
      },
    },
  ],
  options: {
    doNotFollow: {
      path: 'node_modules',
    },
    tsPreCompilationDeps: true,
    tsConfig: {
      fileName: 'tsconfig.json',
    },
    enhancedResolveOptions: {
      exportsFields: ['exports'],
      conditionNames: ['import', 'require', 'node', 'default'],
    },
    reporterOptions: {
      dot: {
        collapsePattern: 'node_modules/[^/]+',
      },
      archi: {
        collapsePattern:
          '^(node_modules|src/(common|guards|decorators|prisma|redis|config|interceptors|i18n|database|test))/[^/]+',
      },
    },
  },
};
