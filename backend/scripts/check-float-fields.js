#!/usr/bin/env node
/**
 * Trinquete de Float → Decimal en schema.prisma.
 *
 * Float no representa bien los centavos (0.1 + 0.2 = 0.30000000000000004), así
 * que todo campo NUEVO de dinero, tasa o porcentaje tiene que ser Decimal:
 *   - montos:              Decimal @db.Decimal(20, 2)
 *   - tasas / porcentajes: Decimal @db.Decimal(20, 8)
 *
 * Los Float existentes están listados en scripts/known-float-fields.json:
 *   - keepFloat: medidas que no son dinero (coordenadas, ratings, distancia).
 *   - rate / money: deuda pendiente de migrar a Decimal.
 *
 * Falla (exit 1) si:
 *   1. aparece un campo Float que no está en la lista → usar Decimal, o
 *      agregarlo a keepFloat con su motivo si de verdad no es dinero;
 *   2. un campo de la lista ya no es Float (se migró o se borró) → quitarlo
 *      de la lista, para que la deuda solo pueda achicarse.
 *
 * Uso: node scripts/check-float-fields.js
 */
const path = require('path');
const fs = require('fs');

const schemaPath = path.resolve(__dirname, '../prisma/schema.prisma');
const knownPath = path.resolve(__dirname, 'known-float-fields.json');

function floatFieldsInSchema() {
  const fields = new Set();
  let model = null;
  for (const line of fs.readFileSync(schemaPath, 'utf8').split(/\r?\n/)) {
    const header = line.match(/^model\s+(\w+)\s*\{/);
    if (header) {
      model = header[1];
      continue;
    }
    if (/^\}/.test(line)) {
      model = null;
      continue;
    }
    const field = model && line.match(/^\s+(\w+)\s+Float(\?|\[\])?(\s|$)/);
    if (field) fields.add(`${model}.${field[1]}`);
  }
  return fields;
}

function run() {
  const known = JSON.parse(fs.readFileSync(knownPath, 'utf8'));
  const allowed = new Set([
    ...Object.keys(known.keepFloat || {}),
    ...(known.rate || []),
    ...(known.money || []),
  ]);
  const actual = floatFieldsInSchema();

  const added = [...actual].filter((f) => !allowed.has(f));
  const stale = [...allowed].filter((f) => !actual.has(f));

  if (added.length > 0) {
    console.error('❌ Campos Float nuevos en schema.prisma:\n');
    for (const f of added) console.error(`  ${f}`);
    console.error(
      '\nDinero → Decimal @db.Decimal(20, 2). Tasas/porcentajes → Decimal @db.Decimal(20, 8).' +
        '\nSi NO es dinero (coordenada, rating, distancia), agregalo a keepFloat en' +
        ' scripts/known-float-fields.json con su motivo.'
    );
  }
  if (stale.length > 0) {
    console.error(
      '❌ Campos de scripts/known-float-fields.json que ya no son Float — quitarlos de la lista:\n'
    );
    for (const f of stale) console.error(`  ${f}`);
  }
  if (added.length > 0 || stale.length > 0) process.exit(1);

  const debt = (known.rate || []).length + (known.money || []).length;
  console.log(
    `✅ Sin campos Float nuevos (${actual.size} existentes, ${debt} pendientes de migrar a Decimal).`
  );
}

run();
