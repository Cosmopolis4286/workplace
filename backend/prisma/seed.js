const { PrismaClient, Role, VeLocationType, ProfileType, ProfessionalSubtype, ProfileStatus, KycStatus } = require('@prisma/client')
const bcrypt = require('bcrypt')
const Redis = require('ioredis')
const veLocationsData = require('./data/ve-locations.json')
const { USER_CATEGORIES, SERVICE_CATEGORIES, JOB_CATEGORIES } = require('./data/catalog-categories.js')
const { DEMO_PASSWORDS } = require('./data/demo-passwords.js')

const prisma = new PrismaClient()

// `node prisma/seed.js --production` (pnpm seed:prod): solo datos de
// referencia que la plataforma necesita para funcionar — permisos, catálogos,
// ubicaciones, planes y comisiones — sin usuarios demo. Planes y comisiones se
// crean solo si no existen: en producción los edita un admin y el seed no
// debe pisarlos. El primer SUPERADMIN sale de SUPERADMIN_EMAIL/PASSWORD.
const PRODUCTION_SEED =
  process.argv.includes('--production') || process.env.SEED_MODE === 'production'

// El seed demo crea superadmin@demo.com y otros usuarios con contraseñas que
// están en este repositorio (y resetea las existentes): jamás en producción.
if (!PRODUCTION_SEED && process.env.APP_ENV === 'production') {
  console.error(
    '❌ El seed demo no puede correr con APP_ENV=production: crea usuarios con contraseñas públicas.\n' +
      '   Usa `pnpm seed:prod` (node prisma/seed.js --production).'
  )
  process.exit(1)
}

const DEMO_USERS = [
  {
    role: Role.SUPERADMIN,
    email: 'superadmin@demo.com',
    password: DEMO_PASSWORDS['superadmin@demo.com'],
    firstName: 'Super',
    lastName: 'Admin',
    userType: 'APP',  // Usuario propio de la app, no demo
    country: 'Venezuela', state: 'Distrito Capital', municipality: 'Libertador', city: 'Caracas', parish: 'Catedral',
  },
  {
    role: Role.ADMIN,
    email: 'admin@demo.com',
    password: DEMO_PASSWORDS['admin@demo.com'],
    firstName: 'Admin',
    lastName: 'Demo',
    country: 'Venezuela', state: 'Distrito Capital', municipality: 'Libertador', city: 'Caracas', parish: 'Altagracia',
  },
  {
    role: Role.PROFESIONAL,
    profileType: ProfileType.BUSINESS,
    email: 'commerce@demo.com',
    password: DEMO_PASSWORDS['commerce@demo.com'],
    firstName: 'Comercio',
    lastName: 'Demo',
    commerceName: 'Restaurante Demo',
    categoryName: 'Comida',
    subcategoryName: 'Restaurante',
    country: 'Venezuela', state: 'Miranda', municipality: 'Chacao', city: 'Chacao', parish: 'Chacao',
  },
  {
    role: Role.PROFESIONAL,
    profileType: ProfileType.BUSINESS,
    email: 'tecnologia@demo.com',
    password: DEMO_PASSWORDS['tecnologia@demo.com'],
    firstName: 'Tech',
    lastName: 'Demo',
    commerceName: 'Tech Solutions Demo',
    categoryName: 'Tecnología',
    subcategoryName: 'Desarrollo Web',
    country: 'Venezuela', state: 'Miranda', municipality: 'Baruta', city: 'Baruta', parish: 'El Cafetal',
  },
  {
    role: Role.PROFESIONAL,
    profileType: ProfileType.PROFESSIONAL,
    subtype: ProfessionalSubtype.FREELANCER,
    email: 'freelancer@demo.com',
    password: DEMO_PASSWORDS['freelancer@demo.com'],
    firstName: 'Freelancer',
    lastName: 'Demo',
    categoryName: 'Diseño',
    subcategoryName: 'Diseño Gráfico',
    country: 'Venezuela', state: 'Carabobo', municipality: 'Valencia', city: 'Valencia', parish: 'Urbana San José',
  },
  {
    role: Role.PROFESIONAL,
    profileType: ProfileType.PROFESSIONAL,
    subtype: ProfessionalSubtype.SERVICE_PROVIDER,
    email: 'delivery@demo.com',
    password: DEMO_PASSWORDS['delivery@demo.com'],
    firstName: 'Carlos',
    lastName: 'Delivery',
    categoryName: 'Transporte',
    subcategoryName: 'Delivery',
    country: 'Venezuela', state: 'Zulia', municipality: 'Maracaibo', city: 'Maracaibo', parish: 'Bolívar',
  },
  {
    // SERVICE_PROVIDER (no FREELANCER): prepara y entrega comida — trabajo
    // presencial, no remoto. Mismo criterio que costura@demo.com/
    // delivery@demo.com (ver esos registros).
    role: Role.PROFESIONAL,
    profileType: ProfileType.PROFESSIONAL,
    subtype: ProfessionalSubtype.SERVICE_PROVIDER,
    email: 'comidarapida@demo.com',
    password: DEMO_PASSWORDS['comidarapida@demo.com'],
    firstName: 'María',
    lastName: 'González',
    categoryName: 'Comida',
    subcategoryName: 'Comida Rápida',
    country: 'Venezuela', state: 'Lara', municipality: 'Iribarren', city: 'Barquisimeto', parish: 'Catedral',
  },
  {
    // SERVICE_PROVIDER (no FREELANCER): repara máquinas a domicilio/taller,
    // trabajo presencial — mismo criterio que delivery@demo.com.
    role: Role.PROFESIONAL,
    profileType: ProfileType.PROFESSIONAL,
    subtype: ProfessionalSubtype.SERVICE_PROVIDER,
    email: 'costura@demo.com',
    password: DEMO_PASSWORDS['costura@demo.com'],
    firstName: 'Ana',
    lastName: 'Rivas',
    categoryName: 'Reparación y Oficios Técnicos',
    subcategoryName: 'Máquinas de Coser',
    country: 'Venezuela', state: 'Táchira', municipality: 'San Cristóbal', city: 'San Cristóbal', parish: 'La Concordia',
  },
  {
    role: Role.NORMAL,
    email: 'normal@demo.com',
    password: DEMO_PASSWORDS['normal@demo.com'],
    firstName: 'Usuario',
    lastName: 'Normal',
    country: 'Venezuela', state: 'Aragua', municipality: 'Girardot', city: 'Maracay', parish: 'Las Delicias',
  },
]

// Catálogo de permisos + defaults por rol/perfil: ver permission-defaults.js
// (fuente única compartida con scripts/simulate-permission-defaults.js y los
// tests de contrato).
const { PERMISSIONS, ROLE_DEFAULTS, PROFILE_PERMISSION_DEFAULTS } = require('./permission-defaults.js')

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
  const roles = ['SUPERADMIN', 'ADMIN', 'PROFESIONAL', 'NORMAL']

  for (const role of roles) {
    const grantedKeys = new Set(ROLE_DEFAULTS[role])
    let created = 0
    for (const perm of allPerms) {
      const granted = grantedKeys.has(perm.key)
      // Solo crea filas faltantes: antes era upsert con update { granted },
      // así que cada corrida del seed borraba cualquier ajuste que un admin
      // hubiera hecho desde la matriz de permisos. Cambiar el default de un
      // permiso YA existente es una migración de datos versionada (ver
      // prisma/migrations/*_invert_profesional_role_permissions), no el seed.
      if (RESET_PERMISSION_MATRIX) {
        await prisma.rolePermission.upsert({
          where: { role_permissionId: { role, permissionId: perm.id } },
          create: { role, permissionId: perm.id, granted },
          update: { granted },
        })
      } else {
        const res = await prisma.rolePermission.createMany({
          data: [{ role, permissionId: perm.id, granted }],
          skipDuplicates: true,
        })
        created += res.count
      }
    }
    console.log(`  ✅ [${role.padEnd(12)}] ${grantedKeys.size} granted by default${RESET_PERMISSION_MATRIX ? ' (reset)' : `, ${created} new rows`}`)
  }

  console.log('\n✨ Permission matrix seeded.')
}

// SEED_RESET_PERMISSIONS=1 → vuelve a imponer los defaults sobre filas ya
// existentes (pisa ajustes de admin). Solo para desarrollo local.
const RESET_PERMISSION_MATRIX = process.env.SEED_RESET_PERMISSIONS === '1' && !PRODUCTION_SEED

async function seedProfilePermissions() {
  console.log('\n🔐 Seeding profile permission matrix...\n')

  const allPerms = await prisma.permission.findMany()

  for (const { profileType, subtype, keys } of PROFILE_PERMISSION_DEFAULTS) {
    const grantedKeys = new Set(keys)
    let created = 0
    for (const perm of allPerms) {
      const granted = grantedKeys.has(perm.key)
      const existing = await prisma.profilePermission.findFirst({
        where: { profileType, subtype, permissionId: perm.id },
        select: { id: true },
      })
      // Mismo criterio que seedPermissions: solo crea filas faltantes.
      if (existing) {
        if (RESET_PERMISSION_MATRIX) {
          await prisma.profilePermission.update({ where: { id: existing.id }, data: { granted } })
        }
      } else {
        await prisma.profilePermission.create({
          data: { profileType, subtype, permissionId: perm.id, granted },
        })
        created++
      }
    }
    console.log(`  ✅ [${profileType}${subtype ? '/' + subtype : ''}] ${grantedKeys.size} granted by default${RESET_PERMISSION_MATRIX ? ' (reset)' : `, ${created} new rows`}`)
  }

  console.log('\n✨ Profile permission matrix seeded.')
}

async function seedPlans({ createOnly = false } = {}) {
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
      // Debe reflejar el mismo set que FREE_MODULES (plan-limits.service.ts) —
      // un freelancer suscrito EXPLÍCITAMENTE al plan Gratis (no solo el fallback
      // sin-suscripción) también necesita poder operar servicios/solicitudes/billetera.
      enabledModules: ['dashboard', 'menu', 'orders', 'customers', 'settings', 'notifications', 'services', 'service_requests', 'wallets'],
      maxServices: 3,
      maxServiceRequests: -1,
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
      enabledModules: ['dashboard', 'menu', 'orders', 'customers', 'analytics', 'expenses', 'sales', 'reports'],
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
      enabledModules: ['dashboard', 'menu', 'orders', 'customers', 'analytics', 'expenses', 'employees', 'branches', 'delivery', 'appointments', 'services', 'jobs', 'service_requests', 'corridas', 'wallets', 'sales', 'reports', 'purchases', 'suppliers', 'accounts'],
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
      enabledModules: ['dashboard', 'menu', 'orders', 'customers', 'analytics', 'expenses', 'employees', 'branches', 'delivery', 'appointments', 'inventory', 'services', 'jobs', 'service_requests', 'corridas', 'wallets', 'reports', 'sales', 'purchases', 'suppliers', 'accounts'],
    },
  ]

  for (const plan of plans) {
    const existing = await prisma.plan.findFirst({ where: { name: plan.name } })
    if (existing && createOnly) {
      console.log(`  ⏭️  Plan "${plan.name}" ya existe, no se modifica.`)
      continue
    }
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
  // 🍔 Comercios de categoría Comida
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

async function seedServiceModalities() {
  console.log('\n📋 Seeding service modalities...\n')

  const modalities = [
    { name: 'Presencial', value: 'IN_PERSON', emoji: '📍', sortOrder: 1 },
    { name: 'Remoto', value: 'REMOTE', emoji: '💻', sortOrder: 2 },
    { name: 'Cualquiera', value: 'ANY', emoji: '🤝', sortOrder: 3 },
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

    // Crear subcategorías — cada entrada puede ser un string plano (legado,
    // sin icon/description propios: cae al icono de la categoría padre en la
    // UI) o un objeto { name, icon, description } para las nuevas.
    for (const sub of category.subcategories) {
      const subName = typeof sub === 'string' ? sub : sub.name
      const subIcon = typeof sub === 'string' ? null : (sub.icon ?? null)
      const subDescription = typeof sub === 'string' ? null : (sub.description ?? null)

      const existingSub = await prisma.userSubcategory.findFirst({
        where: {
          name: subName,
          categoryId: savedCategory.id
        }
      })

      const subData = {
        name: subName,
        icon: subIcon,
        description: subDescription,
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

      console.log(`    ${subIcon || '📄'} ${subName}`)
    }
  }

  console.log('\n✨ User categories seeded.')
}

async function seedServiceAndJobCategories() {
  console.log('\n🧰 Seeding service & job categories (scoped by rubro)...\n')

  const userCategories = await prisma.userCategory.findMany({ select: { id: true, name: true } })
  const idByName = new Map(userCategories.map(c => [c.name, c.id]))

  for (const cat of SERVICE_CATEGORIES) {
    const userCategoryIds = cat.userCategories.map(n => idByName.get(n)).filter(Boolean)
    const existing = await prisma.serviceCategory.findFirst({ where: { name: cat.name } })
    const data = { name: cat.name, icon: cat.icon, userCategoryIds }
    if (existing) {
      await prisma.serviceCategory.update({ where: { id: existing.id }, data })
    } else {
      await prisma.serviceCategory.create({ data })
    }
    console.log(`  ${cat.icon} ${cat.name} → ${cat.userCategories.join(', ')}`)
  }

  for (const cat of JOB_CATEGORIES) {
    const userCategoryIds = cat.userCategories.map(n => idByName.get(n)).filter(Boolean)
    const existing = await prisma.jobCategory.findFirst({ where: { name: cat.name } })
    const data = { name: cat.name, icon: cat.icon, userCategoryIds }
    if (existing) {
      await prisma.jobCategory.update({ where: { id: existing.id }, data })
    } else {
      await prisma.jobCategory.create({ data })
    }
    console.log(`  ${cat.icon} ${cat.name} → ${cat.userCategories.join(', ')}`)
  }

  console.log('\n✨ Service & job categories seeded.')
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
  
  let commerce = await prisma.commerce.findFirst({
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

async function seedVeLocations() {
  console.log('\n🇻🇪 Seeding catálogo de ubicaciones de Venezuela...\n')

  let municipiosCount = 0
  let ciudadesCount = 0
  let parroquiasCount = 0

  for (const state of veLocationsData) {
    for (const mun of state.municipios) {
      // parentId es null en los Municipios (raíz del árbol) — la unique key
      // compuesta no acepta null en upsert.where, así que se resuelve con
      // findFirst + create/update manual solo para este nivel. stateName se
      // incluye en el filtro porque algunos nombres de municipio se repiten
      // entre estados distintos (ej. "Sucre" en Miranda y en Sucre).
      let municipio = await prisma.veLocation.findFirst({
        where: { name: mun.name, parentId: null, type: VeLocationType.MUNICIPIO, stateName: state.stateName },
      })
      if (municipio) {
        municipio = await prisma.veLocation.update({
          where: { id: municipio.id },
          data: { stateName: state.stateName },
        })
      } else {
        municipio = await prisma.veLocation.create({
          data: {
            type: VeLocationType.MUNICIPIO,
            name: mun.name,
            stateName: state.stateName,
          },
        })
      }
      municipiosCount++

      for (const ciu of mun.ciudades || []) {
        // Mismo problema que con Municipio: stateName es null aquí y Prisma
        // no admite null en upsert.where para una clave compuesta — findFirst
        // + create/update manual.
        let ciudad = await prisma.veLocation.findFirst({
          where: { name: ciu.name, parentId: municipio.id, type: VeLocationType.CIUDAD },
        })
        if (!ciudad) {
          ciudad = await prisma.veLocation.create({
            data: { type: VeLocationType.CIUDAD, name: ciu.name, parentId: municipio.id },
          })
        }
        ciudadesCount++

        for (const par of ciu.parroquias || []) {
          const existing = await prisma.veLocation.findFirst({
            where: { name: par.name, parentId: ciudad.id, type: VeLocationType.PARROQUIA },
          })
          if (existing) {
            await prisma.veLocation.update({
              where: { id: existing.id },
              data: { postalCode: par.postalCode ?? null },
            })
          } else {
            await prisma.veLocation.create({
              data: {
                type: VeLocationType.PARROQUIA,
                name: par.name,
                parentId: ciudad.id,
                postalCode: par.postalCode ?? null,
              },
            })
          }
          parroquiasCount++
        }
      }
    }
    console.log(`  📍 ${state.stateName}: ${state.municipios.length} municipios`)
  }

  console.log(
    `\n✨ Ubicaciones VE seeded: ${municipiosCount} municipios, ${ciudadesCount} ciudades, ${parroquiasCount} parroquias.`
  )
}

// Tasa global de comisión (fallback) + overrides por plan. Sin esto,
// resolveFeeConfig() devuelve null y la plataforma no cobra comisión a nadie
// (platform-fees.service.ts:37-64). Prioridad de resolución: override por
// userId > override por planId > tasa global.
async function seedPlatformFees({ createOnly = false } = {}) {
  console.log('\n💰 Seeding platform fee rates...\n')

  const globalRates = [{ type: 'SERVICE_REQUEST', rate: 10, payer: 'PROVIDER' }]

  for (const rate of globalRates) {
    const existing = await prisma.platformFeeRate.findFirst({ where: { type: rate.type, isActive: true } })
    if (existing && createOnly) {
      console.log(`  ⏭️  Tasa global ${rate.type} ya existe (${existing.rate}%), no se modifica.`)
      continue
    }
    if (existing) {
      await prisma.platformFeeRate.update({ where: { id: existing.id }, data: rate })
    } else {
      await prisma.platformFeeRate.create({ data: rate })
    }
    console.log(`  ✅ Tasa global ${rate.type}: ${rate.rate}% (paga ${rate.payer})`)
  }

  // Plan "Básico" no tiene override — usa la tasa global (10%, PROVIDER) tal
  // cual, evita un registro redundante que duplique el valor global.
  const planOverrides = [
    { planName: 'Gratis', rate: 12, payer: 'PROVIDER' },
    { planName: 'Pro', rate: 7, payer: 'PROVIDER' },
    { planName: 'Enterprise', rate: 5, payer: 'PROVIDER' },
  ]

  for (const ov of planOverrides) {
    const plan = await prisma.plan.findFirst({ where: { name: ov.planName } })
    if (!plan) {
      console.log(`  ⚠️  Plan "${ov.planName}" no encontrado, se omite el override de comisión.`)
      continue
    }
    const existing = await prisma.platformFeeOverride.findFirst({
      where: { type: 'SERVICE_REQUEST', planId: plan.id, isActive: true },
    })
    const data = { type: 'SERVICE_REQUEST', rate: ov.rate, payer: ov.payer, planId: plan.id }
    if (existing && createOnly) {
      console.log(`  ⏭️  Override ${ov.planName} ya existe, no se modifica.`)
      continue
    }
    if (existing) {
      await prisma.platformFeeOverride.update({ where: { id: existing.id }, data })
    } else {
      await prisma.platformFeeOverride.create({ data })
    }
    console.log(`  ✅ Override ${ov.planName} → SERVICE_REQUEST: ${ov.rate}% (paga ${ov.payer})`)
  }

  console.log('\n✨ Platform fees seeded.')
}

// Crea/actualiza el UserProfile ACTIVE que distingue COMMERCE de FREELANCER
// para un usuario demo — desde el refactor a Role.PROFESIONAL (2026-08-25),
// User.role ya no distingue eso, así que sin esto AccountTypeResolver.resolve()
// devuelve null para todos los usuarios demo (ver account-type.resolver.ts).
async function upsertDemoUserProfile(userId, demo, categoryId, subcategoryId) {
  const existing = await prisma.userProfile.findFirst({
    where: { userId, type: demo.profileType },
  })
  const data = {
    type: demo.profileType,
    subtype: demo.subtype ?? null,
    status: ProfileStatus.ACTIVE,
    categoryId,
    subcategoryId,
  }
  if (existing) {
    await prisma.userProfile.update({ where: { id: existing.id }, data })
  } else {
    await prisma.userProfile.create({ data: { ...data, userId } })
  }
  // ProfileActivationsService.review() solo activa un perfil con KYC
  // aprobado; el seed crea el perfil ya ACTIVE, así que tiene que dejar al
  // usuario en el mismo estado. Sin esto delivery@demo.com no podía aceptar
  // corridas (KycApprovedGuard en POST /rides/:id/accept) y el dashboard le
  // pedía verificar identidad a un perfil ya activo.
  await prisma.user.update({ where: { id: userId }, data: { kycStatus: KycStatus.APPROVED } })
}

// Crea el primer SUPERADMIN de producción desde el entorno. No hace nada si
// ya existe alguno, y nunca cambia contraseñas de usuarios existentes.
async function bootstrapSuperadmin() {
  console.log('\n👑 SUPERADMIN inicial...\n')
  const existing = await prisma.user.findFirst({ where: { role: Role.SUPERADMIN } })
  if (existing) {
    console.log(`  ⏭️  Ya existe un SUPERADMIN (${existing.email}), no se crea otro.`)
    return
  }

  const email = (process.env.SUPERADMIN_EMAIL || '').trim().toLowerCase()
  const password = process.env.SUPERADMIN_PASSWORD || ''
  if (!email || !password) {
    console.log('  ⚠️  No hay SUPERADMIN: define SUPERADMIN_EMAIL y SUPERADMIN_PASSWORD y vuelve a correr el seed.')
    return
  }
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    throw new Error('SUPERADMIN_EMAIL no es un email válido')
  }
  if (password.length < 12 || !/[a-z]/.test(password) || !/[A-Z]/.test(password) || !/\d/.test(password)) {
    throw new Error('SUPERADMIN_PASSWORD debe tener al menos 12 caracteres, con mayúsculas, minúsculas y números')
  }
  if (Object.values(DEMO_PASSWORDS).includes(password)) {
    throw new Error('SUPERADMIN_PASSWORD no puede ser una contraseña demo del repositorio')
  }

  const taken = await prisma.user.findUnique({ where: { email } })
  if (taken) {
    throw new Error(`${email} ya pertenece a otro usuario; usa otro email o asígnale el rol desde la base`)
  }

  await prisma.user.create({
    data: {
      email,
      password: await bcrypt.hash(password, 12),
      firstName: process.env.SUPERADMIN_FIRST_NAME || 'Super',
      lastName: process.env.SUPERADMIN_LAST_NAME || 'Admin',
      role: Role.SUPERADMIN,
      userType: 'APP',
      emailVerified: true,
    },
  })
  console.log(`  ✅ SUPERADMIN creado: ${email}. Quita SUPERADMIN_PASSWORD del .env del servidor.`)
}

async function productionSeed() {
  console.log('🏭 Seed de producción (sin usuarios demo)\n')
  await seedCategories()
  await seedServiceModalities()
  await seedUserCategories()
  await seedServiceAndJobCategories()
  await seedPermissions()
  await seedProfilePermissions()
  await seedPlans({ createOnly: true })
  await seedSearchTabs()
  await seedVeLocations()
  await seedPlatformFees({ createOnly: true })
  await bootstrapSuperadmin()
}

async function main() {
  // Debe correr ANTES del bucle de DEMO_USERS: varios usuarios demo (incluido
  // el nuevo costura@demo.com) resuelven su categoryName/subcategoryName por
  // búsqueda en DB (líneas más abajo) — si UserCategory/UserSubcategory
  // todavía no existen, esa búsqueda no encuentra nada y el usuario demo
  // queda sin categoría. Antes esto quedaba oculto porque las categorías ya
  // existían de una corrida anterior del seed; con una categoría nueva se
  // vuelve visible en la primera corrida.
  await seedCategories()
  await seedServiceModalities()
  await seedUserCategories()
  await seedServiceAndJobCategories()

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
          ...(demo.country && { country: demo.country }),
          ...(demo.state && { state: demo.state }),
          ...(demo.city && { city: demo.city }),
          ...(demo.municipality && { municipality: demo.municipality }),
          ...(demo.parish && { parish: demo.parish }),
        },
      })

      if (demo.commerceName) {
        await prisma.commerce.updateMany({
          where: { user: { email: demo.email } },
          data: {
            ...(demo.country && { country: demo.country }),
            ...(demo.state && { state: demo.state }),
            ...(demo.city && { city: demo.city }),
            ...(demo.municipality && { municipality: demo.municipality }),
            ...(demo.parish && { parish: demo.parish }),
          },
        })
      }

      if (demo.profileType) {
        await upsertDemoUserProfile(existing.id, demo, categoryId, subcategoryId)
      }

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
        ...(demo.country && { country: demo.country }),
        ...(demo.state && { state: demo.state }),
        ...(demo.city && { city: demo.city }),
        ...(demo.municipality && { municipality: demo.municipality }),
        ...(demo.parish && { parish: demo.parish }),
        ...(demo.commerceName
          ? { commerce: { create: { name: demo.commerceName, country: demo.country, state: demo.state, city: demo.city, municipality: demo.municipality, parish: demo.parish } } }
          : {}),
      },
      include: { commerce: true, category: true, subcategory: true },
    })

    if (demo.profileType) {
      await upsertDemoUserProfile(user.id, demo, categoryId, subcategoryId)
    }

    const categoryInfo = user.category ? ` | 📦 ${user.category.name}${user.subcategory ? ' → ' + user.subcategory.name : ''}` : ''
    console.log(`✅ [${demo.role}] Created: ${user.email}${user.commerce ? ` | Commerce: ${user.commerce.name}` : ''}${categoryInfo}`)
    console.log(`   Password: ${demo.password}`)
  }

  console.log('\n✨ Seed complete.')
  await seedPermissions()
  await seedProfilePermissions()
  await seedPlans()
  await seedSearchTabs()
  await seedVeLocations()
  await seedDemoSubscriptions()
  await seedPlatformFees()
}

// Sin esta suscripción, los usuarios COMMERCE/FREELANCER demo caen al plan
// FREE fallback (dashboard, menu, orders, customers, settings, notifications)
// — pensado para catálogo de comercio, no para freelancers de servicios — y
// terminan con el sidebar casi vacío tras intersectar con su categoría.
async function seedDemoSubscriptions() {
  console.log('\n💳 Seeding demo subscriptions...\n')

  const plan = await prisma.plan.findFirst({ where: { name: 'Pro' } })
  if (!plan) {
    console.log('  ⚠️  Plan "Pro" no encontrado, se omite la asignación de suscripciones demo.')
    return
  }

  const emails = DEMO_USERS
    .filter(d => d.profileType === ProfileType.BUSINESS || d.profileType === ProfileType.PROFESSIONAL)
    .map(d => d.email)

  for (const email of emails) {
    const user = await prisma.user.findUnique({ where: { email } })
    if (!user) continue

    const existing = await prisma.subscription.findFirst({
      where: { userId: user.id, status: { in: ['ACTIVE', 'TRIAL'] } },
    })
    if (existing) continue

    await prisma.subscription.create({
      data: {
        userId: user.id,
        planId: plan.id,
        status: 'ACTIVE',
        interval: 'MONTHLY',
        pricePaid: plan.price,
      },
    })
    console.log(`  ✅ Suscripción "${plan.name}" asignada a ${email}`)
  }

  console.log('\n✨ Demo subscriptions seeded.')
}

// El seed escribe RolePermission/ProfilePermission/User directo con Prisma
// Client, sin pasar por PermissionsService — así que nunca dispara
// invalidateRoleVersion() ni borra las claves que ese servicio cachea en
// Redis (TTL 5min, ver permissions.service.ts). Sin esto, un cambio de
// permisos por seed (ej. agregar settings:view a PROFESIONAL) puede quedar
// invisible para usuarios ya cacheados hasta que expire el TTL — el sidebar
// "Negocio" vacío de un usuario demo fue exactamente este caso. Se usa SCAN
// (no KEYS) para no bloquear Redis, aunque en este script de un solo uso el
// volumen es trivial. Falla en silencio si Redis no está disponible: el
// seed no debe abortar por esto, es un best-effort de higiene de caché.
async function invalidatePermissionCaches() {
  console.log('\n🧹 Invalidando cachés de permisos en Redis...\n')

  const redis = new Redis({
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD || undefined,
    retryStrategy: () => null, // no reintentar indefinidamente si Redis no está arriba
    lazyConnect: true,
  })
  // El error real ya se captura en el catch de abajo — sin este listener,
  // ioredis además imprime un "Unhandled error event" ruidoso por su cuenta.
  redis.on('error', () => {})

  try {
    await redis.connect()

    const patterns = ['permissions:role:*', 'permissions:profile:*', 'permissions:user:*', 'permissions:overrides:user:*', 'user:find-by-id:*']
    let totalDeleted = 0
    for (const pattern of patterns) {
      let cursor = '0'
      do {
        const [nextCursor, keys] = await redis.scan(cursor, 'MATCH', pattern, 'COUNT', 200)
        cursor = nextCursor
        if (keys.length > 0) {
          await redis.del(...keys)
          totalDeleted += keys.length
        }
      } while (cursor !== '0')
    }
    console.log(`  ✅ ${totalDeleted} claves de caché invalidadas.`)
  } catch (err) {
    console.log(`  ⚠️  No se pudo invalidar el caché de Redis (${err.message}). Los permisos/datos actualizados pueden tardar hasta 5 min en reflejarse.`)
  } finally {
    redis.disconnect()
  }

  console.log('\n✨ Cache invalidation done.')
}

;(PRODUCTION_SEED ? productionSeed() : main())
  .then(() => invalidatePermissionCaches())
  .catch((e) => {
    console.error('❌ Seed failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
