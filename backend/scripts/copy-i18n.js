// Copia los archivos de traduccion (src/i18n) a dist/i18n tras el build de tsc,
// que no copia assets que no sean .ts por defecto.
const fs = require('fs');
const path = require('path');

const src = path.join(__dirname, '..', 'src', 'i18n');
const dest = path.join(__dirname, '..', 'dist', 'i18n');

function copyDir(srcDir, destDir) {
  fs.mkdirSync(destDir, { recursive: true });
  for (const entry of fs.readdirSync(srcDir, { withFileTypes: true })) {
    const srcPath = path.join(srcDir, entry.name);
    const destPath = path.join(destDir, entry.name);
    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

copyDir(src, dest);
console.log(`i18n: copiados los archivos de traduccion a ${dest}`);
