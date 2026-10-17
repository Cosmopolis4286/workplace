#!/usr/bin/env node
/**
 * Trinquete del typecheck del frontend: el número de errores de tipos solo
 * puede BAJAR. Corre `nuxi typecheck`, cuenta los errores por archivo y los
 * compara contra typecheck-baseline.json:
 *
 *   - un archivo con MÁS errores que su línea base (o un archivo nuevo con
 *     errores) → falla, mostrando esos errores;
 *   - menos errores → pasa y avisa que conviene bajar la línea base.
 *
 * Por archivo (no un total global) a propósito: corregir 5 errores en un
 * archivo y meter 5 nuevos en otro deja el total igual, pero es regresión.
 * Por archivo y no por línea: editar código arriba de un error existente le
 * cambia el número de línea sin que sea un error nuevo.
 *
 *   node scripts/typecheck-ratchet.mjs           # verificar (CI)
 *   node scripts/typecheck-ratchet.mjs --update  # reescribir la línea base
 */
import { spawnSync } from 'node:child_process'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const baselinePath = join(root, 'typecheck-baseline.json')
const update = process.argv.includes('--update')

const run = spawnSync('npx', ['nuxi', 'typecheck'], { cwd: root, shell: true, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 })
const output = `${run.stdout ?? ''}\n${run.stderr ?? ''}`

// Formato de vue-tsc: "ruta(linea,col): error TS1234: mensaje"
const ERROR_LINE = /^(.+?)\((\d+),(\d+)\): error (TS\d+): (.*)$/
const errors = []
for (const raw of output.split(/\r?\n/)) {
  const m = raw.trim().match(ERROR_LINE)
  if (m) errors.push({ file: m[1].replace(/\\/g, '/'), line: m[2], code: m[4], message: m[5] })
}

// Un typecheck que falla sin reportar errores TS (config rota, crash) no es
// "0 errores": no se puede dar por bueno.
if (run.status !== 0 && errors.length === 0) {
  console.error('❌ nuxi typecheck falló sin reportar errores de tipos — revisar la salida:\n')
  console.error(output.slice(-4000))
  process.exit(1)
}

const counts = {}
for (const e of errors) counts[e.file] = (counts[e.file] ?? 0) + 1
const total = errors.length

if (update) {
  const sorted = Object.fromEntries(Object.entries(counts).sort(([a], [b]) => a.localeCompare(b)))
  writeFileSync(baselinePath, `${JSON.stringify({ total, files: sorted }, null, 2)}\n`)
  console.log(`✅ Línea base actualizada: ${total} errores en ${Object.keys(sorted).length} archivos.`)
  process.exit(0)
}

if (!existsSync(baselinePath)) {
  console.error('❌ Falta typecheck-baseline.json — generarla con: node scripts/typecheck-ratchet.mjs --update')
  process.exit(1)
}

const baseline = JSON.parse(readFileSync(baselinePath, 'utf8'))
const regressions = Object.entries(counts)
  .filter(([file, n]) => n > (baseline.files[file] ?? 0))
  .map(([file, n]) => ({ file, n, before: baseline.files[file] ?? 0 }))

if (regressions.length > 0) {
  console.error(`❌ Errores de tipos NUEVOS (total ${total}, línea base ${baseline.total}):\n`)
  for (const r of regressions) {
    console.error(`  ${r.file}: ${r.before} → ${r.n}`)
    for (const e of errors.filter((x) => x.file === r.file)) {
      console.error(`    ${e.file}:${e.line}  ${e.code}  ${e.message}`)
    }
  }
  console.error('\nCorregí los errores nuevos. (Si el archivo ya tenía errores, se listan todos: los nuevos son los que no estaban.)')
  process.exit(1)
}

if (total < baseline.total) {
  console.log(`✅ Typecheck: ${total} errores (línea base ${baseline.total}). Bajaron — actualizá la línea base:`)
  console.log('   node scripts/typecheck-ratchet.mjs --update')
} else {
  console.log(`✅ Typecheck: ${total} errores, sin errores nuevos (línea base ${baseline.total}).`)
}
