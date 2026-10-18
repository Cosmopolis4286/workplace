#!/usr/bin/env node
/**
 * Solo desarrollo (Dockerfile.dev): corre el seed cuando la base está vacía.
 *
 * Con un volumen de Postgres nuevo (primer arranque, o un proyecto de
 * Compose con otro nombre) las migraciones crean el esquema pero no hay
 * datos, y el login demo responde 403 "No se encontraron usuarios demo".
 * Si ya existe algún usuario no hace nada: nunca re-siembra una base con
 * datos.
 */
const { execFileSync } = require('child_process');
const path = require('path');
const { PrismaClient } = require('@prisma/client');

async function main() {
  const prisma = new PrismaClient();
  try {
    const users = await prisma.user.count();
    if (users > 0) {
      console.log(`🌱 Seed omitido: la base ya tiene ${users} usuario(s).`);
      return;
    }
  } finally {
    await prisma.$disconnect();
  }

  console.log('🌱 Base vacía: ejecutando el seed de desarrollo...');
  execFileSync('node', [path.join(__dirname, '..', 'prisma', 'seed.js')], {
    stdio: 'inherit',
  });
}

main().catch((err) => {
  // Un seed fallido no debe impedir que el backend arranque en desarrollo.
  console.error('⚠️  seed-if-empty falló:', err.message);
});
