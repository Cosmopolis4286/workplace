// 🏷️ Categorías de Usuarios (para clasificar usuarios en el sistema)
// allowedModules = techo de lo que esa categoría puede usar (plan ∩ category = effectiveModules)
// Módulos transversales incluidos en todas las categorías: analytics, expenses, wallets, reports, sales
const USER_CATEGORIES = [
  {
    name: 'Comida',
    icon: '🍔',
    allowedModules: ['dashboard', 'profile', 'menu', 'inventory', 'orders', 'customers', 'delivery', 'employees', 'branches', 'analytics', 'expenses', 'wallets', 'reports', 'sales', 'purchases', 'suppliers', 'accounts'],
    subcategories: [
      { name: 'Restaurante', icon: '🍽️', description: 'Servicio de comidas en mesa, con carta o menú fijo.' },
      { name: 'Cafetería', icon: '☕', description: 'Café, meriendas y repostería para consumir o llevar.' },
      { name: 'Comida Rápida', icon: '🍟', description: 'Hamburguesas, pizzas, comida para llevar y delivery.' },
      { name: 'Food Truck', icon: '🚚', description: 'Venta de comida ambulante o en puntos móviles.' },
      { name: 'Catering', icon: '🥘', description: 'Comida preparada para eventos y reuniones.' },
    ]
  },
  {
    name: 'Tecnología',
    icon: '💻',
    allowedModules: ['dashboard', 'profile', 'services', 'jobs', 'appointments', 'customers', 'service_requests', 'analytics', 'expenses', 'wallets', 'reports', 'sales'],
    subcategories: [
      { name: 'Desarrollo Web', icon: '🌐', description: 'Sitios web, tiendas online y aplicaciones web a medida.' },
      { name: 'Apps Móviles', icon: '📱', description: 'Aplicaciones para Android e iOS.' },
      { name: 'Soporte IT', icon: '🖥️', description: 'Mantenimiento, redes y soporte técnico de equipos.' },
      { name: 'Ciberseguridad', icon: '🔒', description: 'Auditorías, protección de datos y seguridad informática.' },
      { name: 'Data Science', icon: '📊', description: 'Análisis de datos, IA y modelos predictivos.' },
    ]
  },
  {
    name: 'Diseño',
    icon: '🎨',
    allowedModules: ['dashboard', 'profile', 'services', 'jobs', 'appointments', 'customers', 'service_requests', 'analytics', 'expenses', 'wallets', 'reports', 'sales'],
    subcategories: [
      { name: 'Diseño Gráfico', icon: '🖌️', description: 'Piezas gráficas, flyers, empaques y material impreso.' },
      { name: 'UI/UX', icon: '📐', description: 'Diseño de interfaces y experiencia de usuario para apps y webs.' },
      { name: 'Branding', icon: '🏷️', description: 'Identidad visual, logotipos y manuales de marca.' },
      { name: 'Ilustración', icon: '✏️', description: 'Ilustración digital o tradicional por encargo.' },
      { name: 'Motion Graphics', icon: '🎬', description: 'Animación gráfica para video y redes sociales.' },
    ]
  },
  {
    name: 'Marketing',
    icon: '📢',
    allowedModules: ['dashboard', 'profile', 'services', 'jobs', 'appointments', 'customers', 'service_requests', 'analytics', 'expenses', 'wallets', 'reports', 'sales'],
    subcategories: [
      { name: 'Marketing Digital', icon: '📈', description: 'Estrategia y campañas de marketing en medios digitales.' },
      { name: 'SEO/SEM', icon: '🔍', description: 'Posicionamiento en buscadores y campañas de pauta.' },
      { name: 'Redes Sociales', icon: '📱', description: 'Gestión de contenido y comunidad en redes sociales.' },
      { name: 'Email Marketing', icon: '📧', description: 'Campañas y automatización de correo electrónico.' },
      { name: 'Content Manager', icon: '📝', description: 'Creación y gestión de contenido para marcas.' },
    ]
  },
  {
    name: 'Servicios Profesionales',
    icon: '💼',
    allowedModules: ['dashboard', 'profile', 'services', 'jobs', 'appointments', 'customers', 'service_requests', 'analytics', 'expenses', 'wallets', 'reports', 'sales'],
    subcategories: [
      { name: 'Consultoría', icon: '🧭', description: 'Asesoría estratégica y de negocio para empresas.' },
      { name: 'Contabilidad', icon: '🧮', description: 'Contabilidad, declaraciones y cierre de estados financieros.' },
      { name: 'Legal', icon: '⚖️', description: 'Asesoría y representación legal.' },
      { name: 'Recursos Humanos', icon: '🧑‍🤝‍🧑', description: 'Reclutamiento, nómina y gestión de personal.' },
      { name: 'Asesoría Financiera', icon: '💹', description: 'Planificación financiera e inversiones.' },
    ]
  },
  {
    name: 'Salud y Bienestar',
    icon: '🏥',
    allowedModules: ['dashboard', 'profile', 'services', 'jobs', 'appointments', 'customers', 'service_requests', 'analytics', 'expenses', 'wallets', 'reports', 'sales'],
    subcategories: [
      { name: 'Medicina General', icon: '🩺', description: 'Consulta médica general y chequeos.' },
      { name: 'Nutrición', icon: '🥗', description: 'Planes alimenticios y asesoría nutricional.' },
      { name: 'Psicología', icon: '🧠', description: 'Terapia y acompañamiento psicológico.' },
      { name: 'Fisioterapia', icon: '🦵', description: 'Rehabilitación física y terapias de movimiento.' },
      { name: 'Entrenamiento Personal', icon: '🏋️', description: 'Rutinas de ejercicio y acompañamiento fitness.' },
    ]
  },
  {
    name: 'Belleza',
    icon: '💅',
    allowedModules: ['dashboard', 'profile', 'services', 'jobs', 'appointments', 'customers', 'service_requests', 'analytics', 'expenses', 'wallets', 'reports', 'sales'],
    subcategories: [
      { name: 'Peluquería', icon: '💇', description: 'Cortes, tintes y tratamientos capilares.' },
      { name: 'Estética', icon: '✨', description: 'Tratamientos faciales y corporales.' },
      { name: 'Maquillaje', icon: '💄', description: 'Maquillaje social, artístico y para eventos.' },
      { name: 'Manicura', icon: '💅', description: 'Uñas, manicura y pedicura.' },
      { name: 'Spa', icon: '🧖', description: 'Masajes y paquetes de relajación.' },
    ]
  },
  {
    name: 'Educación',
    icon: '📚',
    allowedModules: ['dashboard', 'profile', 'services', 'jobs', 'appointments', 'customers', 'service_requests', 'analytics', 'expenses', 'wallets', 'reports', 'sales'],
    subcategories: [
      { name: 'Clases Particulares', icon: '📖', description: 'Refuerzo escolar y clases personalizadas.' },
      { name: 'Idiomas', icon: '🗣️', description: 'Enseñanza de idiomas para todos los niveles.' },
      { name: 'Preparación Exámenes', icon: '📝', description: 'Preparación para admisión y exámenes estandarizados.' },
      { name: 'Talleres', icon: '🧩', description: 'Talleres prácticos y cursos cortos.' },
      { name: 'Coaching', icon: '🎯', description: 'Acompañamiento personal o profesional por objetivos.' },
    ]
  },
  {
    name: 'Hogar',
    icon: '🏠',
    allowedModules: ['dashboard', 'profile', 'services', 'jobs', 'appointments', 'customers', 'service_requests', 'analytics', 'expenses', 'wallets', 'reports', 'sales'],
    subcategories: [
      { name: 'Limpieza', icon: '🧹', description: 'Limpieza doméstica regular o profunda.' },
      { name: 'Plomería', icon: '🚰', description: 'Instalación y reparación de tuberías y grifería.' },
      { name: 'Electricidad', icon: '💡', description: 'Instalaciones y reparaciones eléctricas del hogar.' },
      { name: 'Carpintería', icon: '🪚', description: 'Muebles y trabajos en madera a medida.' },
      { name: 'Jardinería', icon: '🌳', description: 'Mantenimiento de jardines y áreas verdes.' },
    ]
  },
  // Oficios de reparación que hasta ahora no tenían un hogar propio: no son
  // "Hogar" (el cliente lleva el equipo, no es trabajo en su domicilio) ni
  // "Automotriz" (no son vehículos) — quedaban repartidos entre categorías
  // que no encajaban.
  {
    name: 'Reparación y Oficios Técnicos',
    icon: '🛠️',
    allowedModules: ['dashboard', 'profile', 'services', 'jobs', 'appointments', 'customers', 'service_requests', 'analytics', 'expenses', 'wallets', 'reports', 'sales'],
    subcategories: [
      { name: 'Máquinas de Coser', icon: '🧵', description: 'Mantenimiento y reparación de máquinas de coser domésticas e industriales.' },
      { name: 'Electrodomésticos', icon: '🔌', description: 'Reparación de neveras, lavadoras, cocinas y línea blanca.' },
      { name: 'Electrónica y Equipos', icon: '📺', description: 'Reparación de televisores, audio y equipos electrónicos.' },
      { name: 'Celulares y Computadoras', icon: '🔧', description: 'Reparación de celulares, laptops y computadoras.' },
      { name: 'Relojería y Joyería', icon: '⌚', description: 'Reparación de relojes y arreglo de joyas.' },
      { name: 'Bicicletas', icon: '🚲', description: 'Mantenimiento y reparación de bicicletas.' },
      { name: 'Tapicería', icon: '🛋️', description: 'Reparación y forrado de muebles y tapicería.' },
      { name: 'Calzado y Marroquinería', icon: '👞', description: 'Reparación de zapatos, carteras y artículos de cuero.' },
    ]
  },
  {
    name: 'Transporte',
    icon: '🚗',
    allowedModules: ['dashboard', 'profile', 'services', 'jobs', 'delivery', 'customers', 'corridas', 'service_requests', 'analytics', 'expenses', 'wallets', 'reports', 'sales'],
    subcategories: [
      { name: 'Taxi/Remis', icon: '🚕', description: 'Traslados urbanos con conductor.' },
      { name: 'Mudanzas', icon: '📦', description: 'Traslado de muebles y pertenencias.' },
      { name: 'Delivery', icon: '🛵', description: 'Entrega de pedidos y paquetería.' },
      { name: 'Transporte Escolar', icon: '🚌', description: 'Traslado de estudiantes a instituciones educativas.' },
      { name: 'Logística', icon: '🚛', description: 'Transporte de carga y distribución.' },
    ]
  },
  {
    name: 'Eventos',
    icon: '🎉',
    allowedModules: ['dashboard', 'profile', 'services', 'jobs', 'appointments', 'customers', 'service_requests', 'analytics', 'expenses', 'wallets', 'reports', 'sales'],
    subcategories: [
      { name: 'Organización', icon: '🗓️', description: 'Planificación integral de eventos.' },
      { name: 'Fotografía', icon: '📷', description: 'Cobertura fotográfica de eventos.' },
      { name: 'Video', icon: '🎥', description: 'Filmación y edición de video para eventos.' },
      { name: 'DJ/Música', icon: '🎧', description: 'Animación musical y sonido para eventos.' },
      { name: 'Catering Eventos', icon: '🍾', description: 'Comida y bebida para celebraciones y reuniones.' },
    ]
  },
  {
    name: 'Turismo',
    icon: '✈️',
    allowedModules: ['dashboard', 'profile', 'services', 'jobs', 'appointments', 'customers', 'service_requests', 'analytics', 'expenses', 'wallets', 'reports', 'sales'],
    subcategories: [
      { name: 'Agencia de Viajes', icon: '🧳', description: 'Venta de paquetes y planificación de viajes.' },
      { name: 'Guía Turístico', icon: '🗺️', description: 'Acompañamiento y recorridos guiados.' },
      { name: 'Alojamiento', icon: '🏨', description: 'Hospedaje temporal para viajeros.' },
      { name: 'Tours', icon: '🚐', description: 'Recorridos organizados a destinos turísticos.' },
      { name: 'Excursiones', icon: '⛰️', description: 'Actividades y salidas de un día.' },
    ]
  },
  {
    name: 'Comercio',
    icon: '🛍️',
    allowedModules: ['dashboard', 'profile', 'inventory', 'orders', 'customers', 'employees', 'branches', 'delivery', 'analytics', 'expenses', 'wallets', 'reports', 'sales', 'purchases', 'suppliers', 'accounts'],
    subcategories: [
      { name: 'Retail', icon: '🏬', description: 'Venta al detal en tienda física u online.' },
      { name: 'Mayorista', icon: '📦', description: 'Venta al por mayor a otros comercios.' },
      { name: 'Importación', icon: '🛬', description: 'Compra e ingreso de mercancía del exterior.' },
      { name: 'Exportación', icon: '🛫', description: 'Venta de mercancía hacia otros países.' },
      { name: 'E-commerce', icon: '🛒', description: 'Venta exclusivamente por canales digitales.' },
    ]
  },
  {
    name: 'Automotriz',
    icon: '🔧',
    allowedModules: ['dashboard', 'profile', 'services', 'jobs', 'appointments', 'customers', 'service_requests', 'analytics', 'expenses', 'wallets', 'reports', 'sales'],
    subcategories: [
      { name: 'Taller', icon: '🔩', description: 'Mantenimiento y reparación mecánica de vehículos.' },
      { name: 'Venta de Autos', icon: '🚙', description: 'Compra y venta de vehículos nuevos o usados.' },
      { name: 'Lavado', icon: '🧼', description: 'Lavado y detallado de vehículos.' },
      { name: 'Accesorios', icon: '🧰', description: 'Venta e instalación de accesorios automotrices.' },
      { name: 'Neumáticos', icon: '🛞', description: 'Venta, montaje y balanceo de neumáticos.' },
    ]
  },
  {
    name: 'Mascotas',
    icon: '🐾',
    allowedModules: ['dashboard', 'profile', 'services', 'jobs', 'appointments', 'customers', 'service_requests', 'analytics', 'expenses', 'wallets', 'reports', 'sales'],
    subcategories: [
      { name: 'Veterinaria', icon: '🐶', description: 'Consulta y atención médica para mascotas.' },
      { name: 'Grooming', icon: '✂️', description: 'Baño y estética para mascotas.' },
      { name: 'Tienda de Mascotas', icon: '🐾', description: 'Venta de alimento y accesorios para mascotas.' },
      { name: 'Adiestramiento', icon: '🦴', description: 'Entrenamiento y educación canina.' },
      { name: 'Paseadores', icon: '🐕', description: 'Paseo y cuidado diario de mascotas.' },
    ]
  }
]

// Cada ServiceCategory/JobCategory se vincula a la(s) UserCategory bajo cuyo
// rubro tiene sentido ofrecerla — resuelto por NOMBRE de UserCategory acá y
// convertido a id real en seedServiceAndJobCategories() (corre después de
// seedUserCategories, que ya garantiza que esos nombres existen). Ver
// CategoryScopeService: userCategoryIds vacío = visible para cualquier rubro
// (no se usa acá a propósito — cada categoría de servicio/empleo SÍ tiene un
// rubro de origen claro, dejarlo vacío sería repetir el catálogo genérico
// que causaba el bug original).
const SERVICE_CATEGORIES = [
  // "Comida" es techo-de-comercio por defecto (menu/inventory/orders), pero
  // PlanLimitsService.intersectWithCategory() lo amplía con el techo de
  // servicios para todo FREELANCER/SERVICE_PROVIDER sin Commerce (ver
  // comidarapida@demo.com) — sin estas dos entradas, ese caso veía el
  // módulo 'services' habilitado pero el selector de categoría vacío.
  { name: 'Comida por Encargo', icon: '🍱', userCategories: ['Comida'] },
  { name: 'Catering a Domicilio', icon: '🥡', userCategories: ['Comida'] },
  { name: 'Desarrollo Web', icon: '🌐', userCategories: ['Tecnología'] },
  { name: 'Apps Móviles', icon: '📱', userCategories: ['Tecnología'] },
  { name: 'Soporte IT', icon: '🖥️', userCategories: ['Tecnología'] },
  { name: 'Diseño Gráfico', icon: '🖌️', userCategories: ['Diseño'] },
  { name: 'UI/UX', icon: '📐', userCategories: ['Diseño'] },
  { name: 'Branding', icon: '🏷️', userCategories: ['Diseño'] },
  { name: 'Marketing Digital', icon: '📈', userCategories: ['Marketing'] },
  { name: 'Redes Sociales', icon: '📱', userCategories: ['Marketing'] },
  { name: 'Consultoría', icon: '🧭', userCategories: ['Servicios Profesionales'] },
  { name: 'Contabilidad', icon: '🧮', userCategories: ['Servicios Profesionales'] },
  { name: 'Legal', icon: '⚖️', userCategories: ['Servicios Profesionales'] },
  { name: 'Medicina General', icon: '🩺', userCategories: ['Salud y Bienestar'] },
  { name: 'Nutrición', icon: '🥗', userCategories: ['Salud y Bienestar'] },
  { name: 'Psicología', icon: '🧠', userCategories: ['Salud y Bienestar'] },
  { name: 'Fisioterapia', icon: '🦵', userCategories: ['Salud y Bienestar'] },
  { name: 'Peluquería', icon: '💇', userCategories: ['Belleza'] },
  { name: 'Estética', icon: '✨', userCategories: ['Belleza'] },
  { name: 'Maquillaje', icon: '💄', userCategories: ['Belleza'] },
  { name: 'Clases Particulares', icon: '📖', userCategories: ['Educación'] },
  { name: 'Idiomas', icon: '🗣️', userCategories: ['Educación'] },
  { name: 'Coaching', icon: '🎯', userCategories: ['Educación'] },
  { name: 'Limpieza', icon: '🧹', userCategories: ['Hogar'] },
  { name: 'Plomería', icon: '🚰', userCategories: ['Hogar'] },
  { name: 'Electricidad', icon: '💡', userCategories: ['Hogar'] },
  { name: 'Carpintería', icon: '🪚', userCategories: ['Hogar'] },
  { name: 'Jardinería', icon: '🌳', userCategories: ['Hogar'] },
  { name: 'Reparación de Electrodomésticos', icon: '🔌', userCategories: ['Reparación y Oficios Técnicos'] },
  { name: 'Reparación de Máquinas de Coser', icon: '🧵', userCategories: ['Reparación y Oficios Técnicos'] },
  { name: 'Reparación de Electrónica', icon: '📺', userCategories: ['Reparación y Oficios Técnicos'] },
  { name: 'Reparación de Celulares y Computadoras', icon: '🔧', userCategories: ['Reparación y Oficios Técnicos'] },
  // Delivery/mensajería como SERVICIO (oferta fija, distinto de Ride —
  // corridas puntuales bajo demanda): un repartidor puede tener ambos.
  { name: 'Delivery y Mensajería', icon: '🛵', userCategories: ['Transporte'] },
  { name: 'Mudanzas', icon: '📦', userCategories: ['Transporte'] },
  { name: 'Fotografía', icon: '📷', userCategories: ['Eventos'] },
  { name: 'Video', icon: '🎥', userCategories: ['Eventos'] },
  { name: 'Organización de Eventos', icon: '🗓️', userCategories: ['Eventos'] },
  { name: 'Guía Turístico', icon: '🗺️', userCategories: ['Turismo'] },
  { name: 'Taller Mecánico', icon: '🔩', userCategories: ['Automotriz'] },
  { name: 'Lavado de Autos', icon: '🧼', userCategories: ['Automotriz'] },
  { name: 'Veterinaria', icon: '🐶', userCategories: ['Mascotas'] },
  { name: 'Grooming', icon: '✂️', userCategories: ['Mascotas'] },
  { name: 'Adiestramiento', icon: '🦴', userCategories: ['Mascotas'] },
]

// Empleos aplica a cualquier rubro que contrate personal, incluidos Comida
// y Comercio (siempre tienen 'employees'; 'services' ahora también puede
// aplicarles vía el ensanchado por accountType — ver SERVICE_CATEGORIES) —
// a diferencia de SERVICE_CATEGORIES (antes solo 13/15 rubros, ahora las 15),
// esta lista siempre cubrió las 15 UserCategory.
const JOB_CATEGORIES = [
  { name: 'Cocina y Servicio', icon: '🍽️', userCategories: ['Comida'] },
  { name: 'Desarrollo de Software', icon: '💻', userCategories: ['Tecnología'] },
  { name: 'Soporte Técnico', icon: '🖥️', userCategories: ['Tecnología'] },
  { name: 'Diseño', icon: '🎨', userCategories: ['Diseño'] },
  { name: 'Marketing', icon: '📢', userCategories: ['Marketing'] },
  { name: 'Administración y Contabilidad', icon: '🧮', userCategories: ['Servicios Profesionales'] },
  { name: 'Legal', icon: '⚖️', userCategories: ['Servicios Profesionales'] },
  { name: 'Salud', icon: '🏥', userCategories: ['Salud y Bienestar'] },
  { name: 'Belleza y Estética', icon: '💅', userCategories: ['Belleza'] },
  { name: 'Educación', icon: '📚', userCategories: ['Educación'] },
  { name: 'Oficios del Hogar', icon: '🏠', userCategories: ['Hogar'] },
  { name: 'Técnico de Reparación', icon: '🛠️', userCategories: ['Reparación y Oficios Técnicos'] },
  { name: 'Conductores y Repartidores', icon: '🚗', userCategories: ['Transporte'] },
  { name: 'Producción de Eventos', icon: '🎉', userCategories: ['Eventos'] },
  { name: 'Turismo y Hospitalidad', icon: '✈️', userCategories: ['Turismo'] },
  { name: 'Ventas y Atención al Cliente', icon: '🛍️', userCategories: ['Comercio'] },
  { name: 'Automotriz', icon: '🔧', userCategories: ['Automotriz'] },
  { name: 'Cuidado de Mascotas', icon: '🐾', userCategories: ['Mascotas'] },
]

module.exports = { USER_CATEGORIES, SERVICE_CATEGORIES, JOB_CATEGORIES }
