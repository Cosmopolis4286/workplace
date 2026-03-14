import { PrismaClient, Role } from '@prisma/client'
import * as bcrypt from 'bcrypt'

const prisma = new PrismaClient()

interface DemoUser {
  role: Role
  email: string
  password: string
  firstName: string
  lastName: string
  commerceName?: string
}

const DEMO_USERS: DemoUser[] = [
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

// ─── Permission Matrix ────────────────────────────────────────────────────────

interface PermissionDef {
  key: string
  module: string
  action: string
  label: string
  description?: string
  isSystem?: boolean
}

const PERMISSIONS: PermissionDef[] = [
  // Dashboard
  { key: 'dashboard:view',           module: 'dashboard',     action: 'view',           label: 'Ver Dashboard' },

  // Menú
  { key: 'menu:view',                module: 'menu',          action: 'view',           label: 'Ver Menú' },
  { key: 'menu:create',              module: 'menu',          action: 'create',         label: 'Crear productos y categorías' },
  { key: 'menu:edit',                module: 'menu',          action: 'edit',           label: 'Editar productos y categorías' },
  { key: 'menu:delete',              module: 'menu',          action: 'delete',         label: 'Eliminar productos y categorías' },

  // Inventario
  { key: 'inventory:view',           module: 'inventory',     action: 'view',           label: 'Ver Inventario' },
  { key: 'inventory:edit',           module: 'inventory',     action: 'edit',           label: 'Editar stock' },

  // Pedidos
  { key: 'orders:view',              module: 'orders',        action: 'view',           label: 'Ver Pedidos' },
  { key: 'orders:create',            module: 'orders',        action: 'create',         label: 'Crear Pedidos' },
  { key: 'orders:edit',              module: 'orders',        action: 'edit',           label: 'Editar Pedidos' },
  { key: 'orders:delete',            module: 'orders',        action: 'delete',         label: 'Cancelar / Eliminar Pedidos' },
  { key: 'orders:change_status',     module: 'orders',        action: 'change_status',  label: 'Cambiar estado de Pedidos' },

  // Clientes
  { key: 'customers:view',           module: 'customers',     action: 'view',           label: 'Ver Clientes' },
  { key: 'customers:create',         module: 'customers',     action: 'create',         label: 'Crear Clientes' },
  { key: 'customers:edit',           module: 'customers',     action: 'edit',           label: 'Editar Clientes' },
  { key: 'customers:delete',         module: 'customers',     action: 'delete',         label: 'Eliminar Clientes' },

  // Agendamientos
  { key: 'appointments:view',        module: 'appointments',  action: 'view',           label: 'Ver Agendamientos' },
  { key: 'appointments:create',      module: 'appointments',  action: 'create',         label: 'Crear Agendamientos' },
  { key: 'appointments:edit',        module: 'appointments',  action: 'edit',           label: 'Editar Agendamientos' },
  { key: 'appointments:delete',      module: 'appointments',  action: 'delete',         label: 'Eliminar Agendamientos' },

  // Delivery
  { key: 'delivery:view',            module: 'delivery',      action: 'view',           label: 'Ver Delivery' },
  { key: 'delivery:create',          module: 'delivery',      action: 'create',         label: 'Crear entregas' },
  { key: 'delivery:edit',            module: 'delivery',      action: 'edit',           label: 'Editar entregas' },
  { key: 'delivery:manage_drivers',  module: 'delivery',      action: 'manage_drivers', label: 'Gestionar repartidores' },

  // Gastos
  { key: 'expenses:view',            module: 'expenses',      action: 'view',           label: 'Ver Gastos' },
  { key: 'expenses:create',          module: 'expenses',      action: 'create',         label: 'Crear Gastos' },
  { key: 'expenses:edit',            module: 'expenses',      action: 'edit',           label: 'Editar Gastos' },
  { key: 'expenses:delete',          module: 'expenses',      action: 'delete',         label: 'Eliminar Gastos' },

  // Analytics
  { key: 'analytics:view',           module: 'analytics',     action: 'view',           label: 'Ver Analytics' },

  // Reportes
  { key: 'reports:view',             module: 'reports',       action: 'view',           label: 'Ver Reportes' },

  // Ventas
  { key: 'sales:view',               module: 'sales',         action: 'view',           label: 'Ver Ventas' },

  // Empleados
  { key: 'employees:view',           module: 'employees',     action: 'view',           label: 'Ver Empleados' },
  { key: 'employees:create',         module: 'employees',     action: 'create',         label: 'Crear Empleados' },
  { key: 'employees:edit',           module: 'employees',     action: 'edit',           label: 'Editar Empleados' },
  { key: 'employees:delete',         module: 'employees',     action: 'delete',         label: 'Eliminar Empleados' },

  // Sucursales
  { key: 'branches:view',            module: 'branches',      action: 'view',           label: 'Ver Sucursales' },
  { key: 'branches:create',          module: 'branches',      action: 'create',         label: 'Crear Sucursales' },
  { key: 'branches:edit',            module: 'branches',      action: 'edit',           label: 'Editar Sucursales' },
  { key: 'branches:delete',          module: 'branches',      action: 'delete',         label: 'Eliminar Sucursales' },

  // Configuración
  { key: 'settings:view',            module: 'settings',      action: 'view',           label: 'Ver Configuración' },
  { key: 'settings:edit',            module: 'settings',      action: 'edit',           label: 'Editar Configuración' },

  // Notificaciones
  { key: 'notifications:view',       module: 'notifications', action: 'view',           label: 'Ver Notificaciones' },

  // Servicios
  { key: 'services:view',            module: 'services',      action: 'view',           label: 'Ver Servicios' },
  { key: 'services:create',          module: 'services',      action: 'create',         label: 'Crear Servicios' },
  { key: 'services:edit',            module: 'services',      action: 'edit',           label: 'Editar Servicios' },
  { key: 'services:delete',          module: 'services',      action: 'delete',         label: 'Eliminar Servicios' },

  // Solicitudes de Servicio (recibidas por freelancers)
  { key: 'service_requests:view',    module: 'service_requests', action: 'view',        label: 'Ver Solicitudes de Servicio' },

  // Catálogo / Marketplace
  { key: 'catalog:view',             module: 'catalog',       action: 'view',           label: 'Ver Catálogo (marketplace)' },

  // Usuarios — isSystem: no puede desactivarse desde la UI
  { key: 'users:view',               module: 'users',         action: 'view',           label: 'Ver Usuarios',                isSystem: true },
  { key: 'users:manage',             module: 'users',         action: 'manage',         label: 'Gestionar Usuarios',          isSystem: true },

  // Permisos — isSystem
  { key: 'permissions:manage',       module: 'permissions',   action: 'manage',         label: 'Gestionar Matriz de Permisos', isSystem: true },

  // Auditoría — isSystem (solo SUPERADMIN)
  { key: 'audit:view',               module: 'audit',         action: 'view',           label: 'Ver Auditoría',               isSystem: true },
  { key: 'logs:view',                module: 'logs',          action: 'view',           label: 'Ver Logs del Sistema',        isSystem: true },

  // Planes — isSystem
  { key: 'plans:view',               module: 'plans',         action: 'view',           label: 'Ver Planes y Suscripciones',  isSystem: true },
  { key: 'plans:manage',             module: 'plans',         action: 'manage',         label: 'Gestionar Planes',            isSystem: true },

  // Tasas de Cambio — isSystem
  { key: 'exchange_rates:view',      module: 'exchange_rates', action: 'view',          label: 'Ver Tasas de Cambio',         isSystem: true },
  { key: 'exchange_rates:manage',    module: 'exchange_rates', action: 'manage',        label: 'Gestionar Tasas de Cambio',   isSystem: true },
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
]

// Permisos ADMIN: igual que COMMERCE pero sin menu/inventory (no son módulos de su rol)
const ADMIN_KEYS = COMMERCE_KEYS.filter(
  k => !k.startsWith('menu:') && !k.startsWith('inventory:')
)

const ROLE_DEFAULTS: Record<Role, string[]> = {
  SUPERADMIN: PERMISSIONS.map(p => p.key).filter(
    k => !k.startsWith('menu:') && !k.startsWith('inventory:')
  ),
  ADMIN: [...ADMIN_KEYS, 'users:view', 'users:manage', 'plans:view', 'exchange_rates:view'],
  COMMERCE: COMMERCE_KEYS,
  FREELANCER: [
    ...COMMERCE_KEYS.filter(k => !k.startsWith('employees:') && !k.startsWith('branches:')),
    'catalog:view',
    'service_requests:view',
  ],
  NORMAL: ['catalog:view', 'notifications:view'],
}

// SUPERADMIN already gets PERMISSIONS.map(p => p.key) so audit:view + logs:view are included automatically

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
  const roles: Role[] = ['SUPERADMIN', 'ADMIN', 'COMMERCE', 'FREELANCER', 'NORMAL']

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

async function fixFreelancersWithoutBusiness() {
  console.log('\n🔧 Fixing FREELANCER users without a business...\n')

  const freelancers = await prisma.user.findMany({
    where: { role: 'FREELANCER', commerce: null },
    select: { id: true, firstName: true, lastName: true, email: true },
  })

  if (freelancers.length === 0) {
    console.log('  ✅ All FREELANCER users already have a business.')
    return
  }

  for (const user of freelancers) {
    const name = `Negocio de ${user.firstName} ${user.lastName}`
    await prisma.restaurant.create({ data: { name, userId: user.id } } as any)
    console.log(`  ✅ Created business "${name}" for ${user.email}`)
  }

  console.log(`\n  ✨ Fixed ${freelancers.length} FREELANCER(s).`)
}

async function seedPlans() {
  console.log('\n💳 Seeding default plans...\n')

  const PLANS = [
    {
      name: 'Gratuito',
      description: 'Para empezar sin costo. Funciones básicas.',
      price: 0,
      priceAnnual: 0,
      status: 'ACTIVE' as const,
      isPopular: false,
      color: '#6b7280',
      sortOrder: 0,
      forCommerce: true,
      forFreelancer: true,
      maxProducts: 10,
      maxEmployees: 1,
      maxBranches: 1,
      maxOrders: 30,
      maxStorage: 0,
      features: ['Dashboard básico', 'Hasta 10 productos', 'Hasta 30 pedidos/mes'],
      enabledModules: ['dashboard', 'menu', 'orders', 'customers', 'settings', 'notifications'],
    },
    {
      name: 'Básico',
      description: 'Ideal para negocios pequeños que quieren crecer.',
      price: 199,
      priceAnnual: 1990,
      status: 'ACTIVE' as const,
      isPopular: false,
      color: '#3B82F6',
      sortOrder: 1,
      forCommerce: true,
      forFreelancer: false,
      maxProducts: 50,
      maxEmployees: 5,
      maxBranches: 1,
      maxOrders: -1,
      maxStorage: 1,
      features: ['Todo el plan Gratuito', 'Hasta 50 productos', '5 empleados', 'Gestión de clientes', 'Agendamientos'],
      enabledModules: ['dashboard', 'menu', 'inventory', 'orders', 'customers', 'appointments', 'employees', 'settings', 'notifications'],
    },
    {
      name: 'Profesional',
      description: 'Para negocios en crecimiento. Analíticas y delivery.',
      price: 499,
      priceAnnual: 4990,
      status: 'ACTIVE' as const,
      isPopular: true,
      color: '#8B5CF6',
      sortOrder: 2,
      forCommerce: true,
      forFreelancer: false,
      maxProducts: 200,
      maxEmployees: 20,
      maxBranches: 3,
      maxOrders: -1,
      maxStorage: 5,
      features: ['Todo el plan Básico', 'Hasta 200 productos', '20 empleados', '3 sucursales', 'Delivery', 'Analytics avanzado', 'Reportes'],
      enabledModules: ['dashboard', 'menu', 'inventory', 'orders', 'customers', 'appointments', 'delivery', 'expenses', 'analytics', 'reports', 'employees', 'branches', 'settings', 'notifications'],
    },
    {
      name: 'Empresarial',
      description: 'Sin límites. Para cadenas y franquicias.',
      price: 999,
      priceAnnual: 9990,
      status: 'ACTIVE' as const,
      isPopular: false,
      color: '#F59E0B',
      sortOrder: 3,
      forCommerce: true,
      forFreelancer: false,
      maxProducts: -1,
      maxEmployees: -1,
      maxBranches: -1,
      maxOrders: -1,
      maxStorage: 20,
      features: ['Todo el plan Profesional', 'Productos ilimitados', 'Empleados ilimitados', 'Sucursales ilimitadas', 'Acceso API', 'Soporte prioritario', 'Onboarding personalizado'],
      enabledModules: ['dashboard', 'menu', 'inventory', 'orders', 'customers', 'appointments', 'delivery', 'expenses', 'analytics', 'reports', 'sales', 'employees', 'branches', 'settings', 'notifications'],
    },
    {
      name: 'Freelancer Básico',
      description: 'Para freelancers que ofrecen servicios.',
      price: 149,
      priceAnnual: 1490,
      status: 'ACTIVE' as const,
      isPopular: false,
      color: '#10B981',
      sortOrder: 4,
      forCommerce: false,
      forFreelancer: true,
      maxProducts: 20,
      maxEmployees: 0,
      maxBranches: 0,
      maxOrders: 50,
      maxStorage: 1,
      features: ['Perfil público', 'Hasta 20 servicios', '50 solicitudes/mes', 'Catálogo en marketplace'],
      enabledModules: ['dashboard', 'services', 'service_requests', 'catalog', 'settings', 'notifications'],
    },
    {
      name: 'Freelancer Pro',
      description: 'Para freelancers con mayor demanda.',
      price: 349,
      priceAnnual: 3490,
      status: 'ACTIVE' as const,
      isPopular: true,
      color: '#06B6D4',
      sortOrder: 5,
      forCommerce: false,
      forFreelancer: true,
      maxProducts: -1,
      maxEmployees: 0,
      maxBranches: 0,
      maxOrders: -1,
      maxStorage: 5,
      features: ['Todo el plan Freelancer Básico', 'Servicios ilimitados', 'Solicitudes ilimitadas', 'Analytics', 'Reportes', 'Soporte prioritario'],
      enabledModules: ['dashboard', 'services', 'service_requests', 'catalog', 'analytics', 'reports', 'settings', 'notifications'],
    },
  ]

  for (const plan of PLANS) {
    const existing = await prisma.plan.findFirst({ where: { name: plan.name } })
    if (!existing) {
      await prisma.plan.create({ data: { ...plan, features: plan.features } })
      console.log(`  ✅ Plan creado: ${plan.name}`)
    } else {
      // Update enabledModules on existing plans (migration from booleans)
      await prisma.plan.update({
        where: { id: existing.id },
        data: { enabledModules: plan.enabledModules },
      })
      console.log(`  🔄 Plan actualizado (módulos): ${plan.name}`)
    }
  }

  console.log('\n✨ Plans seeded.')
}

async function seedExchangeRates() {
  console.log('\n💱 Seeding default exchange rates...\n')

  const DEFAULT_RATES = [
    {
      code: 'VES',
      name: 'Bolívar Venezolano',
      symbol: 'Bs.',
      rateToUsd: 36.5,
      isActive: true,
      isDefault: true,
      source: 'BCV',
      notes: 'Tasa oficial BCV',
    },
    {
      code: 'COP',
      name: 'Peso Colombiano',
      symbol: 'COP',
      rateToUsd: 4100,
      isActive: true,
      isDefault: false,
      source: 'Manual',
      notes: null,
    },
    {
      code: 'EUR',
      name: 'Euro',
      symbol: '€',
      rateToUsd: 0.92,
      isActive: true,
      isDefault: false,
      source: 'Manual',
      notes: null,
    },
  ]

  for (const rate of DEFAULT_RATES) {
    const existing = await prisma.exchangeRate.findUnique({ where: { code: rate.code } })
    if (!existing) {
      await prisma.exchangeRate.create({ data: rate })
      console.log(`  ✅ Tasa creada: ${rate.code} (${rate.name})`)
    } else {
      console.log(`  ⏭️  Tasa ya existe: ${rate.code}`)
    }
  }

  console.log('\n✨ Exchange rates seeded.')
}

async function assignFreePlanToAll() {
  console.log('\n🎁 Assigning free plan to users without subscription...\n')

  const freePlan = await prisma.plan.findFirst({ where: { name: 'Gratuito' } })
  if (!freePlan) {
    console.log('  ⚠️  Plan Gratuito not found, skipping.')
    return
  }

  const usersWithoutSub = await prisma.user.findMany({
    where: {
      role: { in: ['COMMERCE', 'FREELANCER'] },
      subscriptions: { none: { status: { in: ['ACTIVE', 'TRIAL'] } } },
    },
    select: { id: true, email: true, role: true },
  })

  if (usersWithoutSub.length === 0) {
    console.log('  ✅ All users already have an active subscription.')
    return
  }

  for (const user of usersWithoutSub) {
    await prisma.subscription.create({
      data: {
        userId: user.id,
        planId: freePlan.id,
        status: 'ACTIVE',
        interval: 'MONTHLY',
        pricePaid: 0,
        startAt: new Date(),
      },
    })
    console.log(`  ✅ [${user.role}] Free plan assigned: ${user.email}`)
  }

  console.log(`\n  ✨ ${usersWithoutSub.length} user(s) assigned to free plan.`)
}

// Modules available per business category.
// Values must match Permission.module strings in the PERMISSIONS array above.
async function seedUserCategories() {
  console.log('\n🏷️  Seeding user categories with allowed modules...\n')

  const CATEGORIES = [
    {
      name: 'Alimentos y Bebidas',
      icon: '🍔',
      allowedModules: [
        'dashboard', 'menu', 'inventory', 'orders', 'customers',
        'appointments', 'delivery', 'expenses', 'analytics', 'reports',
        'sales', 'employees', 'branches', 'settings', 'notifications',
      ],
    },
    {
      name: 'Tecnología',
      icon: '💻',
      allowedModules: [
        'dashboard', 'services', 'service_requests', 'catalog',
        'customers', 'orders', 'expenses', 'analytics', 'reports',
        'employees', 'branches', 'settings', 'notifications',
      ],
    },
    {
      name: 'Salud y Bienestar',
      icon: '🏥',
      allowedModules: [
        'dashboard', 'services', 'service_requests', 'customers',
        'appointments', 'expenses', 'analytics', 'reports',
        'employees', 'branches', 'settings', 'notifications',
      ],
    },
    {
      name: 'Moda y Belleza',
      icon: '👗',
      allowedModules: [
        'dashboard', 'menu', 'inventory', 'orders', 'customers',
        'appointments', 'expenses', 'analytics', 'reports',
        'employees', 'branches', 'settings', 'notifications',
      ],
    },
    {
      name: 'Educación',
      icon: '📚',
      allowedModules: [
        'dashboard', 'services', 'service_requests', 'customers',
        'appointments', 'expenses', 'analytics', 'reports',
        'employees', 'settings', 'notifications',
      ],
    },
    {
      name: 'Hogar y Construcción',
      icon: '🏠',
      allowedModules: [
        'dashboard', 'services', 'service_requests', 'catalog',
        'customers', 'orders', 'expenses', 'analytics', 'reports',
        'employees', 'branches', 'settings', 'notifications',
      ],
    },
    {
      name: 'Arte y Entretenimiento',
      icon: '🎨',
      allowedModules: [
        'dashboard', 'services', 'service_requests', 'catalog',
        'customers', 'appointments', 'expenses', 'analytics',
        'employees', 'settings', 'notifications',
      ],
    },
    {
      name: 'Transporte y Logística',
      icon: '🚚',
      allowedModules: [
        'dashboard', 'delivery', 'orders', 'customers',
        'expenses', 'analytics', 'reports', 'employees',
        'branches', 'settings', 'notifications',
      ],
    },
    {
      name: 'Finanzas y Consultoría',
      icon: '💼',
      allowedModules: [
        'dashboard', 'services', 'service_requests', 'customers',
        'expenses', 'analytics', 'reports', 'employees',
        'settings', 'notifications',
      ],
    },
    {
      name: 'Otro',
      icon: '🏢',
      allowedModules: [
        'dashboard', 'menu', 'inventory', 'orders', 'customers',
        'appointments', 'delivery', 'services', 'service_requests',
        'catalog', 'expenses', 'analytics', 'reports', 'sales',
        'employees', 'branches', 'settings', 'notifications',
      ],
    },
  ]

  for (const cat of CATEGORIES) {
    const existing = await prisma.userCategory.findUnique({ where: { name: cat.name } })
    if (!existing) {
      await prisma.userCategory.create({ data: cat })
      console.log(`  ✅ Categoría creada: ${cat.icon} ${cat.name}`)
    } else {
      await prisma.userCategory.update({
        where: { id: existing.id },
        data: { allowedModules: cat.allowedModules, icon: cat.icon },
      })
      console.log(`  🔄 Categoría actualizada: ${cat.icon} ${cat.name}`)
    }
  }

  console.log('\n  ✨ User categories seeded.')
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
          ? { restaurant: { create: { name: demo.commerceName } } }
          : {}),
      },
      include: { restaurant: true },
    })

    console.log(`✅ [${demo.role}] Created: ${user.email}${user.restaurant ? ` | Restaurant: ${user.restaurant.name}` : ''}`)
    console.log(`   Password: ${demo.password}`)
  }

  console.log('\n✨ Seed complete.')

  await fixFreelancersWithoutBusiness()
  await seedPermissions()
  await seedPlans()
  await seedExchangeRates()
  await assignFreePlanToAll()
  await seedUserCategories()
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
