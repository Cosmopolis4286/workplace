#!/usr/bin/env node
/**
 * Fase 3 del refactor arquitectónico: reescribe los import specifiers
 * relativos de todo backend/src después de mover una o más carpetas de
 * módulo a su nueva ubicación bajo src/domains/<categoria>/.
 *
 * Uso: node scripts/codemods/update-imports-after-domain-move.js <move-map.json>
 * move-map.json: { "src/menu": "src/domains/commerce-core/menu", ... }
 * (rutas relativas a la raíz del repo `backend/`, con o sin barra final)
 *
 * Corre DESPUÉS de mover físicamente las carpetas (git mv), no antes. Los
 * archivos en su ubicación NUEVA todavía tienen import specifiers escritos
 * para su ubicación VIEJA (son solo texto, `git mv` no los toca) — este
 * script encuentra, para cada import relativo, a qué archivo apuntaba
 * ANTES del movimiento, ve si ese archivo se movió, y si sí, recalcula el
 * specifier relativo correcto entre las ubicaciones NUEVAS de ambos lados.
 */
const fs = require('fs');
const path = require('path');
const ts = require('typescript');

const repoRoot = path.resolve(__dirname, '..', '..'); // backend/
const srcRoot = path.join(repoRoot, 'src');
const testRoot = path.join(repoRoot, 'test'); // test/ vive fuera de src/, tiene sus propios imports a src/

function loadMoveMap(moveMapPath) {
  const raw = JSON.parse(fs.readFileSync(moveMapPath, 'utf8'));
  return Object.entries(raw).map(([from, to]) => ({
    from: path.resolve(repoRoot, from).replace(/[\\/]+$/, ''),
    to: path.resolve(repoRoot, to).replace(/[\\/]+$/, ''),
  }));
}

/** Si `absPath` (ubicación NUEVA) cae dentro del destino de algún movimiento, devuelve su ubicación VIEJA equivalente. */
function toOldPath(absPath, moves) {
  for (const { from, to } of moves) {
    if (absPath === to || absPath.startsWith(to + path.sep)) {
      return from + absPath.slice(to.length);
    }
  }
  return null;
}

/** Si `absPath` (ubicación VIEJA) cae dentro del origen de algún movimiento, devuelve su ubicación NUEVA equivalente. */
function toNewPath(absPath, moves) {
  for (const { from, to } of moves) {
    if (absPath === from || absPath.startsWith(from + path.sep)) {
      return to + absPath.slice(from.length);
    }
  }
  return null;
}

function listTsFiles(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...listTsFiles(full));
    } else if (entry.isFile() && /\.ts$/.test(entry.name) && !entry.name.endsWith('.d.ts')) {
      out.push(full);
    }
  }
  return out;
}

function toPosixRelative(fromDir, toFile) {
  let rel = path.relative(fromDir, toFile).replace(/\\/g, '/');
  rel = rel.replace(/\.ts$/, '');
  rel = rel.replace(/\/index$/, '');
  if (!rel.startsWith('.')) rel = './' + rel;
  return rel;
}

/** Prueba extensiones/index.ts contra un directorio real dado. */
function existsAsModule(basePathNoExt) {
  const candidates = [basePathNoExt + '.ts', basePathNoExt + '.tsx', path.join(basePathNoExt, 'index.ts')];
  return candidates.some((c) => fs.existsSync(c));
}

function rewriteFile(currentFilePath, moves) {
  const source = fs.readFileSync(currentFilePath, 'utf8');
  const sourceFile = ts.createSourceFile(currentFilePath, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);

  // Ubicación de ESTE archivo antes del movimiento (para resolver el specifier
  // tal como estaba escrito originalmente); si este archivo no se movió, es la misma.
  const oldSelfPath = toOldPath(currentFilePath, moves) ?? currentFilePath;
  const oldSelfDir = path.dirname(oldSelfPath);

  const edits = [];

  function visit(node) {
    let specifierNode = null;
    if (
      (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) &&
      node.moduleSpecifier &&
      ts.isStringLiteral(node.moduleSpecifier)
    ) {
      specifierNode = node.moduleSpecifier;
    }
    if (specifierNode) {
      const specifier = specifierNode.text;
      if (specifier.startsWith('.')) {
        // A qué archivo apuntaba este import ANTES de mover nada.
        const oldTargetBase = path.resolve(oldSelfDir, specifier);
        const newTargetPath = toNewPath(oldTargetBase, moves);

        if (newTargetPath) {
          // El archivo importado SÍ se movió: recalcular relativo a las
          // ubicaciones ACTUALES (post-mv) de origen y destino.
          const currentSelfDir = path.dirname(currentFilePath);
          const newSpecifier = toPosixRelative(currentSelfDir, newTargetPath);
          if (newSpecifier !== specifier) {
            edits.push({
              start: specifierNode.getStart(sourceFile) + 1,
              end: specifierNode.getEnd() - 1,
              newText: newSpecifier,
            });
          }
        } else if (oldSelfPath !== currentFilePath) {
          // Este archivo (el que hace el import) SÍ se movió, pero el
          // archivo importado NO — el specifier relativo cambia igual
          // porque cambió el punto de partida.
          if (existsAsModule(oldTargetBase)) {
            const currentSelfDir = path.dirname(currentFilePath);
            const newSpecifier = toPosixRelative(currentSelfDir, oldTargetBase);
            if (newSpecifier !== specifier) {
              edits.push({
                start: specifierNode.getStart(sourceFile) + 1,
                end: specifierNode.getEnd() - 1,
                newText: newSpecifier,
              });
            }
          }
        }
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(sourceFile);

  if (edits.length === 0) return false;

  edits.sort((a, b) => b.start - a.start);
  let out = source;
  for (const e of edits) {
    out = out.slice(0, e.start) + e.newText + out.slice(e.end);
  }
  fs.writeFileSync(currentFilePath, out, 'utf8');
  return true;
}

function main() {
  const moveMapPath = process.argv[2];
  if (!moveMapPath) {
    console.error('Uso: node update-imports-after-domain-move.js <move-map.json>');
    process.exit(1);
  }
  const moves = loadMoveMap(moveMapPath);

  const allFiles = [
    ...listTsFiles(srcRoot),
    ...(fs.existsSync(testRoot) ? listTsFiles(testRoot) : []),
  ];
  let changedCount = 0;
  for (const file of allFiles) {
    const changed = rewriteFile(file, moves);
    if (changed) changedCount++;
  }
  console.log(`Reescritos ${changedCount} archivo(s) de ${allFiles.length} analizados.`);
}

main();
