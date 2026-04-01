const { PrismaClient, Role } = require('@prisma/client')
const bcrypt = require('bcrypt')

const prisma = new PrismaClient()

const DEMO_USERS = [
  {
    role: Role.SUPERADMIN,
    email: 'superadmin@demo.com',
    password: 'SuperAdmin123',
    firstName: 'Super',
    lastName: 'Admin',
  },
  {
    role: Role.ADMIN,
    email: 'admin@demo.com',
    password: 'Admin1234',
    firstName: 'Admin',
    lastName: 'Demo',
  },
  {
    role: Role.COMMERCE,
    email: 'commerce@demo.com',
    password: 'Commerce123',
    firstName: 'Comercio',
    lastName: 'Demo',
    commerceName: 'Restaurante Demo',
  },
  {
    role: Role.FREELANCER,
    email: 'freelancer@demo.com',
    password: 'Freelancer1',
    firstName: 'Freelancer',
    lastName: 'Demo',
  },
  {
    role: Role.NORMAL,
    email: 'normal@demo.com',
    password: 'Normal1234',
    firstName: 'Usuario',
    lastName: 'Normal',
  },
]

const PERMISSIONS = [
  { key: 'dashboard:view',           module: 'dashboard',     action: 'view',           label: 'Ver Dashboard' },
  { key: 'menu:view',                module: 'menu',          action: 'view',           label: 'Ver Menú' },
  { key: 'menu:create',              module: 'menu',          action: 'create',         label: 'Crear productos y categorías' },
  { key: 'menu:edit',                module: 'menu',          action: 'edit',           label: 'Editar productos y categorías' },
  { key: 'menu:delete',              module: 'menu',          action: 'delete',         label: 'Eliminar productos y categorías' },
  { key: 'inventory:view',           module: 'inventory',     action: 'view',           label: 'Ver Inventario' },
  { key: 'inventory:edit',           module: 'inventory',     action: 'edit',           label: 'Editar stock' },
  { key: 'orders:view',              module: 'orders',        action: 'view',           label: 'Ver Pedidos' },
  { key: 'orders:create',            module: 'orders',        action: 'create',         label: 'Crear Pedidos' },
  { key: 'orders:edit',              module: 'orders',        action: 'edit',           label: 'Editar Pedidos' },
  { key: 'orders:delete',            module: 'orders',        action: 'delete',         label: 'Cancelar / Eliminar Pedidos' },
  { key: 'orders:change_status',     module: 'orders',        action: 'change_status',  label: 'Cambiar estado de Pedidos' },
  { key: 'customers:view',           module: 'customers',     action: 'view',           label: 'Ver Clientes' },
  { key: 'customers:create',         module: 'customers',     action: 'create',         label: 'Crear Clientes' },
  { key: 'customers:edit',           module: 'customers',     action: 'edit',           label: 'Editar Clientes' },
  { key: 'customers:delete',         module: 'customers',     action: 'delete',         label: 'Eliminar Clientes' },
  { key: 'appointments:view',        module: 'appointments',  action: 'view',           label: 'Ver Agendamientos' },
  { key: 'appointments:create',      module: 'appointments',  action: 'create',         label: 'Crear Agendamientos' },
  { key: 'appointments:edit',        module: 'appointments',  action: 'edit',           label: 'Editar Agendamientos' },
  { key: 'appointments:delete',      module: 'appointments',  action: 'delete',         label: 'Eliminar Agendamientos' },
  { key: 'delivery:view',            module: 'delivery',      action: 'view',           label: 'Ver Delivery' },
  { key: 'delivery:create',          module: 'delivery',      action: 'create',         label: 'Crear entregas' },
  { key: 'delivery:edit',            module: 'delivery',      action: 'edit',           label: 'Editar entregas' },
  { key: 'delivery:manage_drivers',  module: 'delivery',      action: 'manage_drivers', label: 'Gestionar repartidores' },
  { key: 'expenses:view',            module: 'expenses',      action: 'view',           label: 'Ver Gastos' },
  { key: 'expenses:create',          module: 'expenses',      action: 'create',         label: 'Crear Gastos' },
  { key: 'expenses:edit',            module: 'expenses',      action: 'edit',           label: 'Editar Gastos' },
  { key: 'expenses:delete',         module: 'expenses',      action: 'delete',         label: 'Eliminar Gastos' },
  { key: 'analytics:view',           module: 'analytics',     action: 'view',           label: 'Ver Analytics' },
  { key: 'reports:view',             module: 'reports',       action: 'view',           label: 'Ver Reportes' },
  { key: 'sales:view',               module: 'sales',         action: 'view',           label: 'Ver Ventas' },
  { key: 'employees:view',           module: 'employees',     action: 'view',           label: 'Ver Empleados' },
  { key: 'employees:create',         module: 'employees',     action: 'create',         label: 'Crear Empleados' },
  { key: 'employees:edit',           module: 'employees',     action: 'edit',           label: 'Editar Empleados' },
  { key: 'employees:delete',         module: 'employees',     action: 'delete',         label: 'Eliminar Empleados' },
  { key: 'branches:view',            module: 'branches',      action: 'view',           label: 'Ver Sucursales' },
  { key: 'branches:create',          module: 'branches',      action: 'create',         label: 'Crear Sucursales' },
  { key: 'branches:edit',            module: 'branches',      action: 'edit',           label: 'Editar Sucursales' },
  { key: 'branches:delete',          module: 'branches',      action: 'delete',         label: 'Eliminar Sucursales' },
  { key: 'settings:view',            module: 'settings',      action: 'view',           label: 'Ver Configuración' },
  { key: 'settings:edit',            module: 'settings',      action: 'edit',           label: 'Editar Configuración' },
  { key: 'notifications:view',       module: 'notifications', action: 'view',           label: 'Ver Notificaciones' },
  { key: 'services:view',            module: 'services',      action: 'view',           label: 'Ver Servicios' },
  { key: 'services:create',          module: 'services',      action: 'create',         label: 'Crear Servicios' },
  { key: 'services:edit',            module: 'services',      action: 'edit',           label: 'Editar Servicios' },
  { key: 'services:delete',          module: 'services',      action: 'delete',         label: 'Eliminar Servicios' },
  { key: 'service_requests:view',    module: 'service_requests', action: 'view',        label: 'Ver Solicitudes de Servicio' },
  { key: 'catalog:view',             module: 'catalog',       action: 'view',           label: 'Ver Catálogo (marketplace)' },
  { key: 'users:view',               module: 'users',         action: 'view',           label: 'Ver Usuarios',                isSystem: true },
  { key: 'users:manage',             module: 'users',         action: 'manage',         label: 'Gestionar Usuarios',          isSystem: true },
  { key: 'permissions:manage',       module: 'permissions',   action: 'manage',         label: 'Gestionar Matriz de Permisos', isSystem: true },
  { key: 'audit:view',               module: 'audit',         action: 'view',           label: 'Ver Auditoría',               isSystem: true },
  { key: 'logs:view',                module: 'logs',          action: 'view',           label: 'Ver Logs del Sistema',        isSystem: true },
  { key: 'plans:view',               module: 'plans',         action: 'view',           label: 'Ver Planes y Suscripciones',  isSystem: true },
  { key: 'plans:manage',             module: 'plans',         action: 'manage',         label: 'Gestionar Planes',            isSystem: true },
  { key: 'exchange_rates:view',      module: 'exchange_rates', action: 'view',          label: 'Ver Tasas de Cambio',         isSystem: true },
  { key: 'exchange_rates:manage',    module: 'exchange_rates', action: 'manage',        label: 'Gestionar Tasas de Cambio',   isSystem: true },
  { key: 'search:view',              module: 'search',         action: 'view',          label: 'Ver Búsqueda' },
  { key: 'corridas:view',            module: 'corridas',       action: 'view',          label: 'Ver Corridas' },
  { key: 'corridas:create',          module: 'corridas',       action: 'create',        label: 'Solicitar Corrida' },
  { key: 'corridas:manage',          module: 'corridas',       action: 'manage',        label: 'Gestionar Corridas (Conductor)' },
]

const COMMERCE_KEYS = [
  'dashboard:view',
  'menu:view', 'menu:create', 'menu:edit', 'menu:delete',
  'inventory:view', 'inventory:edit',
  'orders:view', 'orders:create', 'orders:edit', 'orders:delete', 'orders:change_status',
  'customers:view', 'customers:create', 'customers:edit', 'customers:delete',
  'appointments:view', 'appointments:create', 'appointments:edit', 'appointments:delete',
  'delivery:view', 'delivery:create', 'delivery:edit', 'delivery:manage_drivers',
  'expenses:view', 'expenses:create', 'expenses:edit', 'expenses:delete',
  'analytics:view', 'reports:view', 'sales:view',
  'employees:view', 'employees:create', 'employees:edit', 'employees:delete',
  'branches:view', 'branches:create', 'branches:edit', 'branches:delete',
  'settings:view', 'settings:edit',
  'notifications:view',
  'services:view', 'services:create', 'services:edit', 'services:delete',
  'service_requests:view',
  'search:view',
  'corridas:view', 'corridas:create', 'corridas:manage',
]

const ADMIN_KEYS = COMMERCE_KEYS.filter(
  k => !k.startsWith('menu:') && !k.startsWith('inventory:') && !k.startsWith('services:') && !k.startsWith('service_requests:') && !k.startsWith('orders:')
)

const ROLE_DEFAULTS = {
  SUPERADMIN: PERMISSIONS.map(p => p.key).filter(k =>
    !k.startsWith('services:') && !k.startsWith('service_requests:') && !k.startsWith('orders:')
  ),
  ADMIN: [...ADMIN_KEYS, 'users:view', 'users:manage', 'plans:view', 'exchange_rates:view'],
  COMMERCE: COMMERCE_KEYS,
  FREELANCER: [
    ...COMMERCE_KEYS.filter(k => !k.startsWith('employees:') && !k.startsWith('branches:')),
    'catalog:view',
    'service_requests:view',
    'corridas:view', 'corridas:create',
  ],
  NORMAL: ['catalog:view', 'notifications:view', 'service_requests:view', 'dashboard:view', 'corridas:view', 'corridas:create'],
}

async function seedPermissions() {
  console.log('\n🔐 Seeding permission matrix...\n')

  for (const p of PERMISSIONS) {
    await prisma.permission.upsert({
      where: { key: p.key },
      create: {
        key: p.key,
        module: p.module,
        action: p.action,
        label: p.label,
        description: p.description,
        isSystem: p.isSystem ?? false,
      },
      update: {
        label: p.label,
        description: p.description,
        isSystem: p.isSystem ?? false,
      },
    })
  }
  console.log(`  📋 ${PERMISSIONS.length} permissions upserted`)

  const allPerms = await prisma.permission.findMany()
  const roles = ['SUPERADMIN', 'ADMIN', 'COMMERCE', 'FREELANCER', 'NORMAL']

  for (const role of roles) {
    const grantedKeys = new Set(ROLE_DEFAULTS[role])
    for (const perm of allPerms) {
      const granted = grantedKeys.has(perm.key)
      await prisma.rolePermission.upsert({
        where: { role_permissionId: { role, permissionId: perm.id } },
        create: { role, permissionId: perm.id, granted },
        update: { granted },
      })
    }
    console.log(`  ✅ [${role.padEnd(12)}] ${grantedKeys.size} permissions granted`)
  }

  console.log('\n✨ Permission matrix seeded.')
}

async function seedPlans() {
  console.log('\n📦 Seeding plans...\n')

  const plans = [
    {
      name: 'Gratis',
      description: 'Ideal para empezar y probar la plataforma',
      price: 0,
      priceAnnual: null,
      status: 'ACTIVE',
      isPopular: false,
      color: '#6b7280',
      sortOrder: 1,
      forCommerce: true,
      forFreelancer: true,
      maxProducts: 20,
      maxEmployees: 1,
      maxBranches: 1,
      maxOrders: 50,
      maxStorage: 100,
      features: ['20 productos', '1 empleado', '1 sucursal', '50 pedidos/mes', 'Soporte por email'],
      enabledModules: ['dashboard', 'menu', 'orders', 'customers'],
    },
    {
      name: 'Básico',
      description: 'Perfecto para pequeños negocios',
      price: 299,
      priceAnnual: 2990,
      status: 'ACTIVE',
      isPopular: false,
      color: '#3b82f6',
      sortOrder: 2,
      forCommerce: true,
      forFreelancer: true,
      maxProducts: 100,
      maxEmployees: 3,
      maxBranches: 1,
      maxOrders: 500,
      maxStorage: 500,
      features: ['100 productos', '3 empleados', '1 sucursal', '500 pedidos/mes', 'Soporte prioritario', 'Reportes básicos'],
      enabledModules: ['dashboard', 'menu', 'orders', 'customers', 'analytics', 'expenses'],
    },
    {
      name: 'Pro',
      description: 'Para negocios en crecimiento',
      price: 599,
      priceAnnual: 5990,
      status: 'ACTIVE',
      isPopular: true,
      color: '#8b5cf6',
      sortOrder: 3,
      forCommerce: true,
      forFreelancer: true,
      maxProducts: 500,
      maxEmployees: 10,
      maxBranches: 3,
      maxOrders: 2000,
      maxStorage: 2000,
      features: ['500 productos', '10 empleados', '3 sucursales', '2,000 pedidos/mes', 'Soporte 24/7', 'Reportes avanzados', 'Múltiples usuarios', 'API access'],
      enabledModules: ['dashboard', 'menu', 'orders', 'customers', 'analytics', 'expenses', 'employees', 'branches', 'delivery', 'appointments'],
    },
    {
      name: 'Enterprise',
      description: 'Solución completa para grandes empresas',
      price: 1499,
      priceAnnual: 14990,
      status: 'ACTIVE',
      isPopular: false,
      color: '#f59e0b',
      sortOrder: 4,
      forCommerce: true,
      forFreelancer: true,
      maxProducts: -1,
      maxEmployees: -1,
      maxBranches: -1,
      maxOrders: -1,
      maxStorage: 10000,
      features: ['Productos ilimitados', 'Empleados ilimitados', 'Sucursales ilimitadas', 'Pedidos ilimitados', 'Soporte dedicado', 'Personalización completa', 'SLA garantizado', 'Onboarding personalizado'],
      enabledModules: ['dashboard', 'menu', 'orders', 'customers', 'analytics', 'expenses', 'employees', 'branches', 'delivery', 'appointments', 'inventory', 'services'],
    },
  ]

  for (const plan of plans) {
    const existing = await prisma.plan.findFirst({ where: { name: plan.name } })
    if (existing) {
      await prisma.plan.update({ where: { id: existing.id }, data: plan })
    } else {
      await prisma.plan.create({ data: plan })
    }
    console.log(`  ✅ Plan: ${plan.name} ($${plan.price})`)
  }

  console.log('\n✨ Plans seeded.')
}

async function main() {
  console.log('🌱 Seeding demo users...\n')

  for (const demo of DEMO_USERS) {
    const existing = await prisma.user.findUnique({ where: { email: demo.email } })

    if (existing) {
      await prisma.user.update({
        where: { email: demo.email },
        data: { role: demo.role },
      })
      console.log(`✅ [${demo.role}] Already exists (role refreshed): ${demo.email}`)
      continue
    }

    const hashedPassword = await bcrypt.hash(demo.password, 12)

    const user = await prisma.user.create({
      data: {
        email: demo.email,
        password: hashedPassword,
        firstName: demo.firstName,
        lastName: demo.lastName,
        role: demo.role,
        ...(demo.commerceName
          ? { commerce: { create: { name: demo.commerceName } } }
          : {}),
      },
      include: { commerce: true },
    })

    console.log(`✅ [${demo.role}] Created: ${user.email}${user.commerce ? ` | Restaurant: ${user.commerce.name}` : ''}`)
    console.log(`   Password: ${demo.password}`)
  }

  console.log('\n✨ Seed complete.')
  await seedPermissions()
  await seedPlans()
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
