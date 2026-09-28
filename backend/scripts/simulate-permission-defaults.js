#!/usr/bin/env node
/**
 * Simulación de solo lectura: compara, para cada usuario role=PROFESIONAL,
 * sus permisos efectivos ACTUALES (RolePermission + ProfilePermission
 * vigentes en la DB) contra los que tendría con los defaults de
 * prisma/permission-defaults.js. Los overrides individuales (UserPermission)
 * se aplican igual en ambos lados — mismo orden que
 * PermissionsService.hasEffectivePermission.
 *
 * Correr ANTES de aplicar una migración que cambie la matriz, para ver quién
 * pierde qué. No escribe nada.
 *
 *   node scripts/simulate-permission-defaults.js          # resumen
 *   node scripts/simulate-permission-defaults.js --users  # detalle por usuario
 */
const { PrismaClient } = require('@prisma/client')
const { ROLE_DEFAULTS, PROFILE_PERMISSION_DEFAULTS } = require('../prisma/permission-defaults.js')

const prisma = new PrismaClient()
const profileKey = (type, subtype) => `${type}:${subtype ?? 'none'}`

async function main() {
  const showUsers = process.argv.includes('--users')

  const [rolePerms, profilePerms] = await Promise.all([
    prisma.rolePermission.findMany({ where: { role: 'PROFESIONAL', granted: true }, include: { permission: true } }),
    prisma.profilePermission.findMany({ where: { granted: true }, include: { permission: true } }),
  ])
  const currentRole = new Set(rolePerms.map(r => r.permission.key))
  const currentProfile = new Map()
  for (const pp of profilePerms) {
    const k = profileKey(pp.profileType, pp.subtype)
    if (!currentProfile.has(k)) currentProfile.set(k, new Set())
    currentProfile.get(k).add(pp.permission.key)
  }

  const nextRole = new Set(ROLE_DEFAULTS.PROFESIONAL)
  const nextProfile = new Map(
    PROFILE_PERMISSION_DEFAULTS.map(d => [profileKey(d.profileType, d.subtype), new Set(d.keys)]),
  )

  const users = await prisma.user.findMany({
    where: { role: 'PROFESIONAL' },
    select: {
      id: true, email: true,
      commerce: { select: { id: true } },
      category: { select: { name: true } },
      profiles: { where: { status: 'ACTIVE' }, select: { type: true, subtype: true } },
      userPermissions: { include: { permission: { select: { key: true } } } },
    },
  })

  const effective = (roleKeys, profileMap, user) => {
    const keys = new Set(roleKeys)
    for (const p of user.profiles) {
      for (const k of profileMap.get(profileKey(p.type, p.subtype)) ?? []) keys.add(k)
    }
    const now = new Date()
    for (const up of user.userPermissions) {
      if (up.expiresAt && up.expiresAt <= now) continue
      if (up.granted) keys.add(up.permission.key)
      else keys.delete(up.permission.key)
    }
    return keys
  }

  const lossesByKey = new Map()
  const gainsByKey = new Map()
  let affected = 0
  const noProfile = []

  for (const u of users) {
    const before = effective(currentRole, currentProfile, u)
    const after = effective(nextRole, nextProfile, u)
    const lost = [...before].filter(k => !after.has(k)).sort()
    const gained = [...after].filter(k => !before.has(k)).sort()
    const kinds = u.profiles.filter(p => p.type === 'BUSINESS' || p.type === 'PROFESSIONAL')
    if (kinds.length === 0) noProfile.push(u.email)
    if (lost.length || gained.length) affected++
    for (const k of lost) lossesByKey.set(k, (lossesByKey.get(k) ?? 0) + 1)
    for (const k of gained) gainsByKey.set(k, (gainsByKey.get(k) ?? 0) + 1)
    if (showUsers && (lost.length || gained.length)) {
      const label = kinds.map(p => p.subtype ? `${p.type}/${p.subtype}` : p.type).join('+') || 'SIN PERFIL'
      console.log(`\n${u.email} [${label}] categoría=${u.category?.name ?? '—'} commerce=${u.commerce ? 'sí' : 'no'}`)
      if (lost.length) console.log(`  - pierde: ${lost.join(' ')}`)
      if (gained.length) console.log(`  + gana:   ${gained.join(' ')}`)
    }
  }

  const fmt = m => [...m.entries()].sort((a, b) => b[1] - a[1]).map(([k, n]) => `  ${k.padEnd(28)} ${n}`).join('\n') || '  (ninguno)'
  console.log(`\nUsuarios PROFESIONAL: ${users.length} — afectados: ${affected}`)
  console.log(`\nPermisos perdidos (usuarios):\n${fmt(lossesByKey)}`)
  console.log(`\nPermisos ganados (usuarios):\n${fmt(gainsByKey)}`)
  if (noProfile.length) {
    console.log(`\n⚠️  PROFESIONAL sin UserProfile BUSINESS/PROFESSIONAL ACTIVE (${noProfile.length}) — quedan solo con la base del rol:`)
    for (const e of noProfile) console.log(`  ${e}`)
  }
}

main()
  .catch(e => { console.error(e); process.exitCode = 1 })
  .finally(() => prisma.$disconnect())
