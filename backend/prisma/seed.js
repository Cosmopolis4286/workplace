const { PrismaClient, Role } = require('@prisma/client')
const bcrypt = require('bcrypt')

const prisma = new PrismaClient()

const DEMO_USERS = [
  {
    role: Role.SUPERADMIN,
    email: 'superadmin@demo.com',
    password: 'S4p3rAdm1n!#2026',
    firstName: 'Super',
    lastName: 'Admin',
    userType: 'APP',  // Usuario propio de la app, no demo
  },
  {
    role: Role.ADMIN,
    email: 'admin@demo.com',
    password: 'Adm1n@Sec#2026',
    firstName: 'Admin',
    lastName: 'Demo',
  },
  {
    role: Role.COMMERCE,
    email: 'commerce@demo.com',
    password: 'C0mm3rc3!Biz#26',
    firstName: 'Comercio',
    lastName: 'Demo',
    commerceName: 'Restaurante Demo',
    categoryName: 'Comida',
    subcategoryName: 'Restaurante',
  },
  {
    role: Role.COMMERCE,
    email: 'tecnologia@demo.com',
    password: 'T3ch@Biz#26',
    firstName: 'Tech',
    lastName: 'Demo',
    commerceName: 'Tech Solutions Demo',
    categoryName: 'Tecnología',
    subcategoryName: 'Desarrollo Web',
  },
  {
    role: Role.FREELANCER,
    email: 'freelancer@demo.com',
    password: 'Fr33lanc3r!#2026',
    firstName: 'Freelancer',
    lastName: 'Demo',
    categoryName: 'Diseño',
    subcategoryName: 'Diseño Gráfico',
  },
  {
    role: Role.FREELANCER,
    email: 'delivery@demo.com',
    password: 'D3l1v3ry@Fast#26',
    firstName: 'Carlos',
    lastName: 'Delivery',
    categoryName: 'Transporte',
    subcategoryName: 'Delivery',
  },
  {
    role: Role.FREELANCER,
    email: 'comidarapida@demo.com',
    password: 'C0m1d4R4p!d4#26',
    firstName: 'María',
    lastName: 'González',
    categoryName: 'Comida',
    subcategoryName: 'Comida Rápida',
  },
  {
    role: Role.NORMAL,
    email: 'normal@demo.com',
    password: 'N0rm4lUs3r!#2026',
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
  // 🌍 Categorías y Subcategorías Globales (solo superadmin/admin)
  { key: 'categories_global:view',   module: 'categories_global', action: 'view_categories',   label: 'Ver Categorías Globales', isSystem: true },
  { key: 'categories_global:create', module: 'categories_global', action: 'create_categories', label: 'Crear Categorías Globales', isSystem: true },
  { key: 'categories_global:edit',   module: 'categories_global', action: 'edit_categories',   label: 'Editar Categorías Globales', isSystem: true },
  { key: 'categories_global:delete', module: 'categories_global', action: 'delete_categories', label: 'Eliminar Categorías Globales', isSystem: true },
  { key: 'subcategories_global:view',   module: 'categories_global', action: 'view_subcategories',   label: 'Ver Subcategorías Globales', isSystem: true },
  { key: 'subcategories_global:create', module: 'categories_global', action: 'create_subcategories', label: 'Crear Subcategorías Globales', isSystem: true },
  { key: 'subcategories_global:edit',   module: 'categories_global', action: 'edit_subcategories',   label: 'Editar Subcategorías Globales', isSystem: true },
  { key: 'subcategories_global:delete', module: 'categories_global', action: 'delete_subcategories', label: 'Eliminar Subcategorías Globales', isSystem: true },
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
  { key: 'wallets:use',              module: 'wallets',        action: 'use',           label: 'Usar Billetera Digital' },
  { key: 'wallets:manage',           module: 'wallets',        action: 'manage',        label: 'Gestionar Billeteras (Admin)',  isSystem: true },
  { key: 'search_tabs:view',         module: 'search_tabs',    action: 'view',          label: 'Ver Tabs de Búsqueda',         isSystem: true },
  { key: 'search_tabs:manage',       module: 'search_tabs',    action: 'manage',        label: 'Gestionar Tabs de Búsqueda',   isSystem: true },
  { key: 'reviews:moderate',         module: 'reviews',        action: 'moderate',      label: 'Moderar Reseñas Reportadas',   isSystem: true },
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
  'wallets:use',
]

const ADMIN_KEYS = COMMERCE_KEYS.filter(
  k => !k.startsWith('menu:') && !k.startsWith('inventory:') && !k.startsWith('services:') && !k.startsWith('service_requests:') && !k.startsWith('orders:')
)

const ROLE_DEFAULTS = {
  SUPERADMIN: PERMISSIONS.map(p => p.key).filter(k =>
    !k.startsWith('services:') && !k.startsWith('service_requests:') && !k.startsWith('orders:')
  ),
  ADMIN: [
    ...ADMIN_KEYS, 
    'users:view', 'users:manage', 
    'plans:view', 'exchange_rates:view',
    // Permisos para categorías globales
    'categories_global:view',
    'categories_global:create',
    'categories_global:edit',
    'categories_global:delete',
    'subcategories_global:view',
    'subcategories_global:create',
    'subcategories_global:edit',
    'subcategories_global:delete',
    'wallets:use', 'wallets:manage',
    'search_tabs:view', 'search_tabs:manage',
    'reviews:moderate',
  ],
  COMMERCE: COMMERCE_KEYS,
  FREELANCER: [
    ...COMMERCE_KEYS.filter(k => !k.startsWith('employees:') && !k.startsWith('branches:')),
    'catalog:view',
    'service_requests:view',
    'corridas:view', 'corridas:create',
  ],
  NORMAL: ['catalog:view', 'notifications:view', 'service_requests:view', 'dashboard:view', 'corridas:view', 'corridas:create', 'orders:view'],
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

const CATEGORIES = [
  // 🍔 Restaurant / Comida
  {
    name: 'Comida Rápida',
    description: 'Hamburguesas, pizzas, hot dogs, etc.',
    icon: '🍔',
    color: '#ef4444',
    sortOrder: 1,
    subcategories: [
      { name: 'Hamburguesas', description: 'Clásicas, gourmet, vegetarianas' },
      { name: 'Pizzas', description: 'Napolitanas, americanas, vegetarianas' },
      { name: 'Hot Dogs', description: 'Clásicos, gourmet' },
      { name: 'Pollo Frito', description: 'Alitas, pechugas, combos' },
      { name: 'Tacos', description: 'Mexicanos, de carnitas, al pastor' }
    ]
  },
  {
    name: 'Comida Saludable',
    description: 'Ensaladas, bowls, jugos naturales',
    icon: '🥗',
    color: '#10b981',
    sortOrder: 2,
    subcategories: [
      { name: 'Ensaladas', description: 'Verdes, César, griegas' },
      { name: 'Bowls', description: 'Açaí, poké, buddha' },
      { name: 'Jugos Naturales', description: 'Verdes, detox, proteicos' },
      { name: 'Sandwiches Saludables', description: 'Integrales, vegetales' },
      { name: 'Comida Orgánica', description: 'Libre de pesticidas, local' }
    ]
  },
  {
    name: 'Postres y Dulces',
    description: 'Pasteles, helados, chocolates',
    icon: '🍰',
    color: '#ec4899',
    sortOrder: 3,
    subcategories: [
      { name: 'Pasteles', description: 'De chocolate, vainilla, frutas' },
      { name: 'Helados', description: 'Artesanales, sorbetes' },
      { name: 'Chocolates', description: 'Belgas, suizos, locales' },
      { name: 'Dulces Tradicionales', description: 'Cocadas, alfajores, queques' },
      { name: 'Postres Sin Azúcar', description: 'Diabéticos, keto' }
    ]
  },
  {
    name: 'Bebidas',
    description: 'Café, té, refrescos especiales',
    icon: '☕',
    color: '#8b5cf6',
    sortOrder: 4,
    subcategories: [
      { name: 'Café Especial', description: 'Gourmet, de origen, cold brew' },
      { name: 'Tés', description: 'Verdes, negros, hierbas' },
      { name: 'Refrescos Naturales', description: 'Limonadas, aguas frescas' },
      { name: 'Bebidas Energéticas', description: 'Naturales, sin químicos' },
      { name: 'Malteadas', description: 'De frutas, proteicas, clásicas' }
    ]
  },
  // 🛍️ Servicios
  {
    name: 'Belleza y Cuidado Personal',
    description: 'Peluquería, estética, spa',
    icon: '💅',
    color: '#f59e0b',
    sortOrder: 5,
    subcategories: [
      { name: 'Peluquería', description: 'Cortes, tintes, tratamientos' },
      { name: 'Manicura y Pedicura', description: 'Uñas acrílicas, gel, semipermanente' },
      { name: 'Tratamientos Faciales', description: 'Limpieza, hidratación, anti-age' },
      { name: 'Masajes', description: 'Relajantes, terapéuticos, descontracturantes' },
      { name: 'Spa', description: 'Paquetes completos, día de spa' }
    ]
  },
  {
    name: 'Salud y Bienestar',
    description: 'Medicina, terapia, fitness',
    icon: '🏥',
    color: '#06b6d4',
    sortOrder: 6,
    subcategories: [
      { name: 'Medicina General', description: 'Consultas, chequeos' },
      { name: 'Terapias', description: 'Física, ocupacional, lenguaje' },
      { name: 'Nutrición', description: 'Planes, consultas, coaching' },
      { name: 'Psicología', description: 'Terapia individual, familiar, de pareja' },
      { name: 'Entrenamiento Personal', description: 'Gimnasio, funcional, yoga' }
    ]
  },
  {
    name: 'Educación y Formación',
    description: 'Clases particulares, cursos, talleres',
    icon: '📚',
    color: '#3b82f6',
    sortOrder: 7,
    subcategories: [
      { name: 'Idiomas', description: 'Inglés, francés, chino, portugués' },
      { name: 'Música', description: 'Piano, guitarra, violín, canto' },
      { name: 'Artes', description: 'Pintura, dibujo, escultura, fotografía' },
      { name: 'Tecnología', description: 'Programación, diseño web, ofimática' },
      { name: 'Apoyo Escolar', description: 'Matemáticas, ciencias, historia' }
    ]
  },
  {
    name: 'Hogar y Mantenimiento',
    description: 'Reparaciones, limpieza, jardinería',
    icon: '🏠',
    color: '#84cc16',
    sortOrder: 8,
    subcategories: [
      { name: 'Plomería', description: 'Fugas, instalaciones, reparaciones' },
      { name: 'Electricidad', description: 'Instalaciones, reparaciones, automatización' },
      { name: 'Carpintería', description: 'Muebles, reparaciones, personalizaciones' },
      { name: 'Limpieza', description: 'Doméstica, profunda, post-obra' },
      { name: 'Jardinería', description: 'Diseño, mantenimiento, poda' }
    ]
  },
  {
    name: 'Transporte',
    description: 'Transporte de personas y logística',
    icon: '�',
    color: '#f97316',
    sortOrder: 9,
    subcategories: [
      { name: 'carros', description: 'Transporte en automóvil, taxi, privado' },
      { name: 'motos', description: 'Transporte en motocicleta, mototaxi' },
      { name: 'Mudanzas', description: 'Locales, nacionales, internacionales' },
      { name: 'Delivery', description: 'Documentos, paquetes, comida' },
      { name: 'Transporte de Personas', description: 'Taxi, privado, tours' },
      { name: 'Logística', description: 'Carga, almacenamiento, distribución' },
      { name: 'Mensajería', description: 'Urgente, programada, internacional' }
    ]
  },
  {
    name: 'Eventos y Entretenimiento',
    description: 'Fiestas, shows, organización',
    icon: '🎉',
    color: '#a855f7',
    sortOrder: 10,
    subcategories: [
      { name: 'Organización de Eventos', description: 'Bodas, cumpleaños, corporativos' },
      { name: 'Música en Vivo', description: 'Bandas, DJs, solistas' },
      { name: 'Fotografía y Video', description: 'Eventos, retratos, comerciales' },
      { name: 'Catering', description: 'Buffet, menú personalizado, bebidas' },
      { name: 'Decoración', description: 'Flores, temática, iluminación' }
    ]
  },
  {
    name: 'Tecnología',
    description: 'Software, hardware, servicios digitales',
    icon: '💻',
    color: '#0ea5e9',
    sortOrder: 11,
    subcategories: [
      { name: 'Desarrollo Web', description: 'Sitios web, aplicaciones, e-commerce' },
      { name: 'Desarrollo Móvil', description: 'Apps iOS, Android, híbridas' },
      { name: 'Soporte Técnico', description: 'Reparación de computadoras, redes' },
      { name: 'Ciberseguridad', description: 'Auditorías, protección, consultoría' },
      { name: 'Inteligencia Artificial', description: 'Machine learning, automatización' }
    ]
  },
  {
    name: 'Servicios Profesionales',
    description: 'Consultoría, legal, contabilidad',
    icon: '💼',
    color: '#6366f1',
    sortOrder: 12,
    subcategories: [
      { name: 'Consultoría', description: 'Negocios, estrategia, gestión' },
      { name: 'Servicios Legales', description: 'Asesoría, contratos, representación' },
      { name: 'Contabilidad', description: 'Impuestos, auditoría, bookkeeping' },
      { name: 'Marketing Digital', description: 'SEO, redes sociales, publicidad' },
      { name: 'Recursos Humanos', description: 'Reclutamiento, capacitación, consultoría' }
    ]
  },
  {
    name: 'Finanzas y Seguros',
    description: 'Servicios financieros, aseguradora',
    icon: '🏦',
    color: '#059669',
    sortOrder: 13,
    subcategories: [
      { name: 'Asesoría Financiera', description: 'Inversiones, planificación, jubilación' },
      { name: 'Préstamos', description: 'Personales, hipotecarios, comerciales' },
      { name: 'Seguros', description: 'Vida, salud, auto, hogar' },
      { name: 'Gestión de Patrimonio', description: 'Inversiones, activos, herencias' },
      { name: 'Criptomonedas', description: 'Trading, wallet, consultoría' }
    ]
  },
  // 🐾 Mascotas
  {
    name: 'Mascotas',
    description: 'Veterinaria, grooming, tiendas de mascotas',
    icon: '🐾',
    color: '#a16207',
    sortOrder: 14,
    subcategories: [
      { name: 'Veterinaria', description: 'Consultas, cirugías, emergencias' },
      { name: 'Grooming', description: 'Baño, corte de pelo, cuidado estético' },
      { name: 'Tienda de Mascotas', description: 'Alimentos, juguetes, accesorios' },
      { name: 'Adopción', description: 'Perros, gatos, otros animales' },
      { name: 'Entrenamiento', description: 'Obediencia, conducta, agility' },
      { name: 'Paseadores', description: 'Paseo de perros, cuidado temporal' }
    ]
  },
  // 🚗 Automotriz
  {
    name: 'Automotriz',
    description: 'Talleres mecánicos, lavado, venta de autos',
    icon: '🚗',
    color: '#1f2937',
    sortOrder: 15,
    subcategories: [
      { name: 'Taller Mecánico', description: 'Reparaciones, mantenimiento, diagnóstico' },
      { name: 'Lavado y Detailing', description: 'Lavado interior/exterior, pulido, encerado' },
      { name: 'Venta de Autos', description: 'Nuevos, usados, consignación' },
      { name: 'Accesorios', description: 'Audio, seguridad, personalización' },
      { name: 'Neumáticos', description: 'Venta, reparación, alineación' },
      { name: 'Electricidad Automotriz', description: 'Baterías, alternadores, diagnóstico' }
    ]
  },
  // 👕 Ropa y Moda
  {
    name: 'Ropa y Moda',
    description: 'Tiendas de ropa, accesorios, calzado',
    icon: '👕',
    color: '#e11d48',
    sortOrder: 16,
    subcategories: [
      { name: 'Ropa Casual', description: 'Camisetas, jeans, vestidos' },
      { name: 'Ropa Formal', description: 'Trajes, vestidos de gala, smoking' },
      { name: 'Calzado', description: 'Zapatos, zapatillas, sandalias' },
      { name: 'Accesorios', description: 'Bolsos, joyas, relojes, gafas' },
      { name: 'Ropa Deportiva', description: 'Gym wear, ropa técnica, outdoor' },
      { name: 'Moda Infantil', description: 'Ropa para bebés y niños' },
      { name: 'Ropa Interior', description: 'Lencería, pijamas, medias' }
    ]
  },
  // 🧸 Juguetes y Niños
  {
    name: 'Juguetes y Niños',
    description: 'Juguetes, ropa infantil, cuidado del bebé',
    icon: '🧸',
    color: '#f43f5e',
    sortOrder: 17,
    subcategories: [
      { name: 'Juguetes Educativos', description: 'STEM, puzzles, juegos de mesa' },
      { name: 'Juguetes Electrónicos', description: 'Videojuegos, tablets, robots' },
      { name: 'Muñecas y Figuras', description: 'Barbie, superhéroes, coleccionables' },
      { name: 'Cuidado del Bebé', description: 'Pañales, alimentación, higiene' },
      { name: 'Muebles Infantiles', description: 'Cunas, sillas, cajoneras' },
      { name: 'Paseo y Viaje', description: 'Coches, sillas de auto, portabebés' }
    ]
  },
  // 📚 Libros y Papelería
  {
    name: 'Libros y Papelería',
    description: 'Librerías, útiles escolares, artículos de oficina',
    icon: '📚',
    color: '#4338ca',
    sortOrder: 18,
    subcategories: [
      { name: 'Libros Físicos', description: 'Ficción, no ficción, bestsellers' },
      { name: 'Libros Digitales', description: 'E-books, audiolibros' },
      { name: 'Útiles Escolares', description: 'Cuadernos, lápices, mochilas' },
      { name: 'Arte y Dibujo', description: 'Pintura, marcadores, lienzos' },
      { name: 'Oficina', description: 'Papel, carpetas, impresión' },
      { name: 'Revistas y Cómics', description: 'Suscripciones, cómics, mangas' }
    ]
  },
  // 🎨 Arte y Manualidades
  {
    name: 'Arte y Manualidades',
    description: 'Suministros artísticos, talleres, galerías',
    icon: '🎨',
    color: '#7c3aed',
    sortOrder: 19,
    subcategories: [
      { name: 'Pintura', description: 'Óleo, acrílico, acuarela' },
      { name: 'Escultura', description: 'Arcilla, cerámica, modelado' },
      { name: 'Fotografía Artística', description: 'Retratos, paisajes, eventos' },
      { name: 'Manualidades', description: 'Scrapbooking, joyería, decoración' },
      { name: 'Talleres', description: 'Clases de arte para niños y adultos' },
      { name: 'Galería', description: 'Exposiciones, venta de obras' }
    ]
  },
  // 🏠 Inmobiliaria
  {
    name: 'Inmobiliaria',
    description: 'Bienes raíces, alquileres, construcción',
    icon: '🏠',
    color: '#0284c7',
    sortOrder: 20,
    subcategories: [
      { name: 'Venta de Casas', description: 'Nuevas, usadas, proyectos' },
      { name: 'Alquiler', description: 'Apartamentos, casas, locales comerciales' },
      { name: 'Proyectos Nuevos', description: 'Preventa, planes de pago' },
      { name: 'Gestión de Propiedades', description: 'Administración, mantenimiento' },
      { name: 'Terrenos', description: 'Urbana, rural, industrial' },
      { name: 'Remodelación', description: 'Renovación, ampliación, diseño' }
    ]
  },
  // ✈️ Turismo y Viajes
  {
    name: 'Turismo y Viajes',
    description: 'Agencias de viajes, hoteles, tours',
    icon: '✈️',
    color: '#0ea5e9',
    sortOrder: 21,
    subcategories: [
      { name: 'Agencia de Viajes', description: 'Paquetes, boletos, reservas' },
      { name: 'Hoteles', description: 'Hospedaje, resorts, boutique' },
      { name: 'Tours Guiados', description: 'City tours, excursiones, aventura' },
      { name: 'Transporte Turístico', description: 'Buses, vans, traslados' },
      { name: 'Viajes Corporativos', description: 'Eventos, conferencias, incentivos' },
      { name: 'Viajes de Aventura', description: 'Trekking, buceo, canopy' }
    ]
  },
  // 🌱 Agricultura
  {
    name: 'Agricultura',
    description: 'Productos agrícolas, maquinaria, servicios rurales',
    icon: '🌱',
    color: '#166534',
    sortOrder: 22,
    subcategories: [
      { name: 'Productos Frescos', description: 'Frutas, verduras, hortalizas' },
      { name: 'Ganadería', description: 'Carne, lácteos, derivados' },
      { name: 'Maquinaria Agrícola', description: 'Tractores, herramientas, equipos' },
      { name: 'Insumos Agrícolas', description: 'Semillas, fertilizantes, pesticidas' },
      { name: 'Vivero', description: 'Plantas, árboles, flores' },
      { name: 'Agroturismo', description: 'Fincas, granjas, experiencias rurales' }
    ]
  },
  // 💪 Deportes
  {
    name: 'Deportes',
    description: 'Gimnasios, academias, equipamiento deportivo',
    icon: '⚽',
    color: '#dc2626',
    sortOrder: 23,
    subcategories: [
      { name: 'Gimnasio', description: 'Pesas, cardio, clases grupales' },
      { name: 'CrossFit', description: 'Entrenamiento funcional, WODs' },
      { name: 'Artes Marciales', description: 'Karate, judo, boxeo, MMA' },
      { name: 'Yoga y Pilates', description: 'Flexibilidad, meditación, core' },
      { name: 'Deportes Acuáticos', description: 'Natación, surf, buceo' },
      { name: 'Tienda Deportiva', description: 'Equipamiento, ropa, accesorios' },
      { name: 'Escuelas Deportivas', description: 'Fútbol, baloncesto, tenis' }
    ]
  },
  // 🍷 Licores y Vinos
  {
    name: 'Licores y Vinos',
    description: 'Vinerías, cervecerías, licorerías',
    icon: '🍷',
    color: '#7f1d1d',
    sortOrder: 24,
    subcategories: [
      { name: 'Vinos', description: 'Tintos, blancos, rosados, espumantes' },
      { name: 'Cervezas', description: 'Artesanales, industriales, importadas' },
      { name: 'Licores', description: 'Whisky, ron, vodka, tequila' },
      { name: 'Cócteles', description: 'Preparados, ingredientes, mixología' },
      { name: 'Degustación', description: 'Catas, maridajes, eventos' },
      { name: 'Tienda de Licores', description: 'Botellas, gift sets, accesorios' }
    ]
  },
  // 🎮 Entretenimiento Digital
  {
    name: 'Entretenimiento Digital',
    description: 'Gaming, streaming, esports',
    icon: '🎮',
    color: '#581c87',
    sortOrder: 25,
    subcategories: [
      { name: 'Videojuegos', description: 'PC, consolas, móviles' },
      { name: 'Esports', description: 'Torneos, equipos, streaming' },
      { name: 'Streaming', description: 'Películas, series, música' },
      { name: 'Realidad Virtual', description: 'VR, AR, experiencias inmersivas' },
      { name: 'Cybercafé', description: 'Gaming center, internet, PC rental' }
    ]
  },
  // 🔧 Reparación de Dispositivos
  {
    name: 'Reparación de Dispositivos',
    description: 'Celulares, laptops, tablets, consolas',
    icon: '🔧',
    color: '#4b5563',
    sortOrder: 26,
    subcategories: [
      { name: 'Reparación de Celulares', description: 'Pantallas, baterías, placas' },
      { name: 'Reparación de Laptops', description: 'Hardware, software, upgrades' },
      { name: 'Reparación de Tablets', description: 'iPad, Android, accesorios' },
      { name: 'Reparación de Consolas', description: 'PlayStation, Xbox, Nintendo' },
      { name: 'Accesorios Tech', description: 'Cargadores, cables, fundas' },
      { name: 'Desbloqueo', description: 'Fábrica, iCloud, SIM' }
    ]
  },
  // 💊 Farmacia
  {
    name: 'Farmacia',
    description: 'Medicamentos, productos de salud, bienestar',
    icon: '💊',
    color: '#0369a1',
    sortOrder: 27,
    subcategories: [
      { name: 'Medicamentos', description: 'Recetados, OTC, genéricos' },
      { name: 'Suplementos', description: 'Vitaminas, proteínas, deportivos' },
      { name: 'Cuidado Personal', description: 'Higiene, cuidado de piel, cabello' },
      { name: 'Bebés', description: 'Fórmulas, pañales, cuidado infantil' },
      { name: 'Primeros Auxilios', description: 'Botiquines, vendajes, antisépticos' },
      { name: 'Órtesis', description: 'Soportes, muletas, audífonos' }
    ]
  },
  // 📦 Logística y Courier
  {
    name: 'Logística y Courier',
    description: 'Envíos, paquetería, almacenamiento',
    icon: '📦',
    color: '#ca8a04',
    sortOrder: 28,
    subcategories: [
      { name: 'Envíos Nacionales', description: 'Terrestre, aéreo, express' },
      { name: 'Envíos Internacionales', description: 'Importación, exportación' },
      { name: 'Courier Express', description: 'Mismo día, 24-48 horas' },
      { name: 'Almacenamiento', description: 'Bodegas, inventario, fulfillment' },
      { name: 'Embalaje', description: 'Cajas, protección, etiquetado' },
      { name: 'Rastreo', description: 'Tracking en tiempo real' }
    ]
  }
]

// 🏷️ Categorías de Usuarios (para clasificar usuarios en el sistema)
const USER_CATEGORIES = [
  {
    name: 'Comida',
    icon: '🍔',
    allowedModules: ['dashboard', 'profile', 'menu', 'inventory', 'orders', 'customers', 'analytics', 'expenses'],
    subcategories: [
      'Restaurante', 'Cafetería', 'Comida Rápida', 'Food Truck', 'Catering'
    ]
  },
  {
    name: 'Tecnología',
    icon: '💻',
    allowedModules: ['dashboard', 'profile', 'services', 'appointments', 'customers'],
    subcategories: [
      'Desarrollo Web', 'Apps Móviles', 'Soporte IT', 'Ciberseguridad', 'Data Science'
    ]
  },
  {
    name: 'Diseño',
    icon: '🎨',
    allowedModules: ['dashboard', 'profile', 'services', 'appointments', 'customers'],
    subcategories: [
      'Diseño Gráfico', 'UI/UX', 'Branding', 'Ilustración', 'Motion Graphics'
    ]
  },
  {
    name: 'Marketing',
    icon: '📢',
    allowedModules: ['dashboard', 'profile', 'services', 'appointments', 'customers', 'analytics'],
    subcategories: [
      'Marketing Digital', 'SEO/SEM', 'Redes Sociales', 'Email Marketing', 'Content Manager'
    ]
  },
  {
    name: 'Servicios Profesionales',
    icon: '💼',
    allowedModules: ['dashboard', 'profile', 'services', 'appointments', 'customers'],
    subcategories: [
      'Consultoría', 'Contabilidad', 'Legal', 'Recursos Humanos', 'Asesoría Financiera'
    ]
  },
  {
    name: 'Salud y Bienestar',
    icon: '🏥',
    allowedModules: ['dashboard', 'profile', 'services', 'appointments', 'customers'],
    subcategories: [
      'Medicina General', 'Nutrición', 'Psicología', 'Fisioterapia', 'Entrenamiento Personal'
    ]
  },
  {
    name: 'Belleza',
    icon: '💅',
    allowedModules: ['dashboard', 'profile', 'services', 'appointments', 'customers'],
    subcategories: [
      'Peluquería', 'Estética', 'Maquillaje', 'Manicura', 'Spa'
    ]
  },
  {
    name: 'Educación',
    icon: '📚',
    allowedModules: ['dashboard', 'profile', 'services', 'appointments', 'customers'],
    subcategories: [
      'Clases Particulares', 'Idiomas', 'Preparación Exámenes', 'Talleres', 'Coaching'
    ]
  },
  {
    name: 'Hogar',
    icon: '🏠',
    allowedModules: ['dashboard', 'profile', 'services', 'appointments', 'customers'],
    subcategories: [
      'Limpieza', 'Plomería', 'Electricidad', 'Carpintería', 'Jardinería'
    ]
  },
  {
    name: 'Transporte',
    icon: '🚗',
    allowedModules: ['dashboard', 'profile', 'services', 'delivery', 'customers'],
    subcategories: [
      'Taxi/Remis', 'Mudanzas', 'Delivery', 'Transporte Escolar', 'Logística'
    ]
  },
  {
    name: 'Eventos',
    icon: '🎉',
    allowedModules: ['dashboard', 'profile', 'services', 'appointments', 'customers'],
    subcategories: [
      'Organización', 'Fotografía', 'Video', 'DJ/Música', 'Catering Eventos'
    ]
  },
  {
    name: 'Turismo',
    icon: '✈️',
    allowedModules: ['dashboard', 'profile', 'services', 'appointments', 'customers'],
    subcategories: [
      'Agencia de Viajes', 'Guía Turístico', 'Alojamiento', 'Tours', 'Excursiones'
    ]
  },
  {
    name: 'Comercio',
    icon: '🛍️',
    allowedModules: ['dashboard', 'profile', 'inventory', 'orders', 'customers', 'analytics', 'expenses'],
    subcategories: [
      'Retail', 'Mayorista', 'Importación', 'Exportación', 'E-commerce'
    ]
  },
  {
    name: 'Automotriz',
    icon: '🔧',
    allowedModules: ['dashboard', 'profile', 'services', 'appointments', 'customers'],
    subcategories: [
      'Taller', 'Venta de Autos', 'Lavado', 'Accesorios', 'Neumáticos'
    ]
  },
  {
    name: 'Mascotas',
    icon: '🐾',
    allowedModules: ['dashboard', 'profile', 'services', 'appointments', 'customers'],
    subcategories: [
      'Veterinaria', 'Grooming', 'Tienda de Mascotas', 'Adiestramiento', 'Paseadores'
    ]
  }
]

async function seedServiceModalities() {
  console.log('\n📋 Seeding service modalities...\n')

  const modalities = [
    { name: 'Presencial', value: 'PRESENCIAL', emoji: '📍', sortOrder: 1 },
    { name: 'Remoto', value: 'REMOTO', emoji: '💻', sortOrder: 2 },
    { name: 'Cualquiera', value: 'CUALQUIERA', emoji: '🤝', sortOrder: 3 },
  ]

  for (const modality of modalities) {
    const existing = await prisma.serviceModality.findFirst({
      where: { value: modality.value }
    })

    if (existing) {
      await prisma.serviceModality.update({
        where: { id: existing.id },
        data: modality
      })
      console.log(`  ✅ Updated modality: ${modality.name}`)
    } else {
      await prisma.serviceModality.create({ data: modality })
      console.log(`  ✅ Created modality: ${modality.name}`)
    }
  }

  console.log('\n✨ Service modalities seeded.')
}

async function seedUserCategories() {
  console.log('\n🏷️ Seeding user categories and subcategories...\n')

  for (const category of USER_CATEGORIES) {
    // Crear categoría de usuario
    const existingCategory = await prisma.userCategory.findFirst({
      where: { name: category.name }
    })

    const categoryData = {
      name: category.name,
      icon: category.icon,
      allowedModules: category.allowedModules || ['dashboard', 'profile']
    }

    let savedCategory
    if (existingCategory) {
      savedCategory = await prisma.userCategory.update({
        where: { id: existingCategory.id },
        data: categoryData
      })
    } else {
      savedCategory = await prisma.userCategory.create({
        data: categoryData
      })
    }

    console.log(`  🏷️ ${category.icon} ${category.name}`)

    // Crear subcategorías
    for (const subName of category.subcategories) {
      const existingSub = await prisma.userSubcategory.findFirst({
        where: {
          name: subName,
          categoryId: savedCategory.id
        }
      })

      const subData = {
        name: subName,
        categoryId: savedCategory.id
      }

      if (existingSub) {
        await prisma.userSubcategory.update({
          where: { id: existingSub.id },
          data: subData
        })
      } else {
        await prisma.userSubcategory.create({ data: subData })
      }

      console.log(`    📄 ${subName}`)
    }
  }

  console.log('\n✨ User categories seeded.')
}

async function seedCategories() {
  console.log('\n📂 Seeding global categories and subcategories...\n')

  for (const category of CATEGORIES) {
    // Crear categoría global (sin commerceId)
    const existingCategory = await prisma.category.findFirst({ 
      where: { 
        name: category.name,
        isGlobal: true
      } 
    })
    
    const categoryData = {
      name: category.name,
      description: category.description,
      icon: category.icon,
      color: category.color,
      sortOrder: category.sortOrder,
      isGlobal: true,
      commerceId: null
    }

    let savedCategory
    if (existingCategory) {
      savedCategory = await prisma.category.update({
        where: { id: existingCategory.id },
        data: categoryData
      })
    } else {
      savedCategory = await prisma.category.create({
        data: categoryData
      })
    }

    console.log(`  📁 ${category.icon} ${category.name} (Global)`)

    // Crear subcategorías
    if (category.subcategories && category.subcategories.length > 0) {
      for (const sub of category.subcategories) {
        const existingSub = await prisma.subcategory.findFirst({
          where: { 
            name: sub.name,
            categoryId: savedCategory.id 
          }
        })

        const subData = {
          name: sub.name,
          description: sub.description,
          categoryId: savedCategory.id
        }

        if (existingSub) {
          await prisma.subcategory.update({
            where: { id: existingSub.id },
            data: subData
          })
        } else {
          await prisma.subcategory.create({
            data: subData
          })
        }

        console.log(`    📄 ${sub.name}`)
      }
    }
  }

  // También crear categorías de ejemplo para el comercio demo
  console.log('\n🏪 Creating sample commerce-specific categories...')
  
  let commerce = await prisma.restaurant.findFirst({ 
    where: { name: 'Restaurante Demo' } 
  })
  
  if (commerce) {
    const commerceCategories = [
      { name: 'Platos del Día', description: 'Especiales diarios del chef', icon: '🍽️', color: '#dc2626' },
      { name: 'Bebidas Caseras', description: 'Jugos y bebidas naturales', icon: '🥤', color: '#16a34a' },
      { name: 'Postres Caseros', description: 'Dulces hechos en casa', icon: '🧁', color: '#db2777' }
    ]

    for (const cat of commerceCategories) {
      const existing = await prisma.category.findFirst({
        where: {
          name: cat.name,
          commerceId: commerce.id
        }
      })

      const catData = {
        name: cat.name,
        description: cat.description,
        icon: cat.icon,
        color: cat.color,
        sortOrder: 100,
        isGlobal: false,
        commerceId: commerce.id
      }

      if (existing) {
        await prisma.category.update({
          where: { id: existing.id },
          data: catData
        })
      } else {
        await prisma.category.create({
          data: catData
        })
      }

      console.log(`  🏪 ${cat.icon} ${cat.name} (Commerce)`)
    }
  }

  console.log('\n✨ Categories and subcategories seeded.')
}

async function seedSearchTabs() {
  console.log('\n🔍 Seeding search tabs...\n')

  const DEFAULT_TABS = [
    {
      key: 'productos',
      label: 'Productos',
      icon: 'M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z',
      color: '#EF4444',
      isEnabled: true,
      sortOrder: 0,
    },
    {
      key: 'servicios',
      label: 'Servicios',
      icon: 'M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z',
      color: '#3B82F6',
      isEnabled: true,
      sortOrder: 1,
    },
    {
      key: 'empleos',
      label: 'Empleos',
      icon: 'M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z',
      color: '#10B981',
      isEnabled: true,
      sortOrder: 2,
    },
  ]

  for (const tab of DEFAULT_TABS) {
    await prisma.searchTab.upsert({
      where: { key: tab.key },
      create: tab,
      update: { label: tab.label, color: tab.color, sortOrder: tab.sortOrder },
    })
    console.log(`  🔍 ${tab.label} (${tab.key})`)
  }

  console.log('\n✨ Search tabs seeded.')
}

async function main() {
  console.log('🌱 Seeding demo users...\n')

  for (const demo of DEMO_USERS) {
    const existing = await prisma.user.findUnique({ where: { email: demo.email } })

    if (existing) {
      const hashedPassword = await bcrypt.hash(demo.password, 12)
      
      // Buscar categoryId y subcategoryId si se especificaron
      let categoryId = null
      let subcategoryId = null
      
      if (demo.categoryName) {
        const category = await prisma.userCategory.findFirst({
          where: { name: demo.categoryName }
        })
        if (category) {
          categoryId = category.id
          
          // Buscar subcategoría si también se especificó
          if (demo.subcategoryName) {
            const subcategory = await prisma.userSubcategory.findFirst({
              where: { 
                name: demo.subcategoryName,
                categoryId: category.id
              }
            })
            if (subcategory) {
              subcategoryId = subcategory.id
            }
          }
        }
      }

      await prisma.user.update({
        where: { email: demo.email },
        data: {
          role: demo.role,
          userType: demo.userType || 'DEMO',
          password: hashedPassword,
          categoryId: categoryId,
          subcategoryId: subcategoryId,
        },
      })
      const categoryInfo = categoryId ? ` | 📦 ${demo.categoryName}${demo.subcategoryName ? ' → ' + demo.subcategoryName : ''}` : ''
      console.log(`✅ [${demo.role}] Updated (role, userType, password & category refreshed): ${demo.email}${categoryInfo}`)
      continue
    }

    const hashedPassword = await bcrypt.hash(demo.password, 12)

    // Buscar categoryId y subcategoryId si se especificaron
    let categoryId = null
    let subcategoryId = null
    
    if (demo.categoryName) {
      const category = await prisma.userCategory.findFirst({
        where: { name: demo.categoryName }
      })
      if (category) {
        categoryId = category.id
        
        // Buscar subcategoría si también se especificó
        if (demo.subcategoryName) {
          const subcategory = await prisma.userSubcategory.findFirst({
            where: { 
              name: demo.subcategoryName,
              categoryId: category.id
            }
          })
          if (subcategory) {
            subcategoryId = subcategory.id
          }
        }
      }
    }

    const user = await prisma.user.create({
      data: {
        email: demo.email,
        password: hashedPassword,
        firstName: demo.firstName,
        lastName: demo.lastName,
        role: demo.role,
        userType: demo.userType || 'DEMO',  // Usar el tipo definido o default 'DEMO'
        categoryId: categoryId,
        subcategoryId: subcategoryId,
        ...(demo.commerceName
          ? { commerce: { create: { name: demo.commerceName } } }
          : {}),
      },
      include: { commerce: true, category: true, subcategory: true },
    })

    const categoryInfo = user.category ? ` | 📦 ${user.category.name}${user.subcategory ? ' → ' + user.subcategory.name : ''}` : ''
    console.log(`✅ [${demo.role}] Created: ${user.email}${user.commerce ? ` | Restaurant: ${user.commerce.name}` : ''}${categoryInfo}`)
    console.log(`   Password: ${demo.password}`)
  }

  console.log('\n✨ Seed complete.')
  await seedPermissions()
  await seedPlans()
  await seedCategories()
  await seedServiceModalities()
  await seedUserCategories()
  await seedSearchTabs()
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
