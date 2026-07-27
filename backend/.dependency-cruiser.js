/**
 * Fase 0 del refactor arquitectónico: modo solo-reporte.
 * Los módulos de negocio todavía viven planos bajo src/*, sin la estructura
 * src/domains/<categoria>/ de la Fase 3, así que ninguna regla es `error`
 * todavía — bloquear ahora generaría falsos positivos constantes.
 *
 * Esta config se reemplaza en la Fase 5 por reglas `error` reales
 * (no-cross-domain-service-imports, no-business-module-imports-permissions-service)
 * una vez completada la Fase 3.
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
      comment: 'Dependencia circular entre módulos — dificulta separar dominios más adelante.',
      severity: 'warn',
      from: {},
      to: { circular: true },
    },
    {
      name: 'cross-business-module-service-import',
      comment:
        'Import directo de un archivo interno de otro módulo de negocio (fuera de common/, guards/, decorators/, prisma/, redis/, config/, interceptors/). ' +
        'Reportado en modo warn para medir la línea base de acoplamiento antes de mover a src/domains/* (Fase 3) ' +
        'y de introducir facades (Fase 4). No bloquea el build todavía.',
      severity: 'warn',
      from: {
        path: '^src/(?!common/|guards/|decorators/|prisma/|redis/|config/|interceptors/|i18n/|database/|test/).+\\.(service|controller)\\.ts$',
      },
      to: {
        path: '^src/(?!common/|guards/|decorators/|prisma/|redis/|config/|interceptors/|i18n/|database/).+\\.(service)\\.ts$',
        pathNot: '^src/$1',
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
