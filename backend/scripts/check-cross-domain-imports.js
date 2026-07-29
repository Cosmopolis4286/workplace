#!/usr/bin/env node
/**
 * Fase 5 del refactor arquitectónico: envuelve `depcruise` para el
 * enforcement real de límites entre dominios (src/domains/<categoria>/).
 *
 * dependency-cruiser no soporta comparar from.path y to.path entre sí en su
 * DSL declarativo (no hay backreferences), así que las reglas
 * 'no-cross-domain-service-import' y 'no-business-module-imports-permissions-service'
 * en .dependency-cruiser.js quedan en modo `warn` y reportan de más a
 * propósito (incluyen accesos intra-dominio legítimos). Este script hace el
 * filtrado real en JS:
 *   1. Para 'no-cross-domain-service-import', solo cuenta el par si
 *      domainOf(from) !== domainOf(to) (dominios realmente distintos).
 *   2. Para 'no-business-module-imports-permissions-service', cuenta
 *      cualquier caso (ya viene acotado por la regla de depcruise).
 *   3. De los pares resultantes, descarta los ya documentados en
 *      scripts/known-cross-domain-edges.json.
 * Lo que sobra son violaciones NUEVAS → build rojo.
 *
 * Uso: node scripts/check-cross-domain-imports.js
 * Exit code 0 si no hay violaciones nuevas, 1 si las hay (para CI).
 */
const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

function domainOf(filePath) {
  const m = filePath.match(/^src\/domains\/([^/]+)\//);
  return m ? m[1] : null;
}

function loadKnownEdges() {
  const jsonPath = path.resolve(__dirname, 'known-cross-domain-edges.json');
  const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
  return new Set([...(data.permanent || []), ...(data.debt || [])]);
}

function run() {
  const knownEdges = loadKnownEdges();

  let raw;
  try {
    raw = execSync('npx depcruise --config .dependency-cruiser.js --output-type json src', {
      cwd: path.resolve(__dirname, '..'),
      encoding: 'utf8',
      maxBuffer: 1024 * 1024 * 50,
    });
  } catch (err) {
    // depcruise sale con código != 0 si hay violaciones `error` en su propia
    // config — igual queremos su stdout (el reporte JSON) para filtrarlo acá.
    raw = err.stdout;
  }

  const report = JSON.parse(raw);
  const violations = report.summary.violations || [];

  const realCrossDomain = violations.filter((v) => {
    if (v.rule.name === 'no-cross-domain-service-import') {
      const fromDomain = domainOf(v.from);
      const toDomain = domainOf(v.to);
      return fromDomain && toDomain && fromDomain !== toDomain;
    }
    return v.rule.name === 'no-business-module-imports-permissions-service';
  });

  const newViolations = realCrossDomain.filter((v) => {
    const key = `${v.from} -> ${v.to}`;
    return !knownEdges.has(key);
  });

  if (newViolations.length > 0) {
    console.error(`\n✗ ${newViolations.length} import(s) cruzado(s) entre dominios NO documentado(s):\n`);
    for (const v of newViolations) {
      console.error(`  [${v.rule.name}] ${v.from}\n    -> ${v.to}`);
    }
    console.error(
      '\nUn import cruzado entre dominios debe resolverse con una facade ' +
        '(ver PlanLimitsFacade/PlatformFeesFacade), no agregarse a scripts/known-cross-domain-edges.json ' +
        '— esa lista es la deuda ya existente, no un mecanismo para nueva deuda.\n'
    );
    process.exit(1);
  }

  console.log(
    `✓ Sin imports cruzados nuevos entre dominios (${realCrossDomain.length} excepción(es) documentada(s), sin cambios).`
  );
  process.exit(0);
}

run();
