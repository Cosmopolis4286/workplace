-- CreateTable: user_categories
CREATE TABLE "user_categories" (
    "id"   TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "icon" TEXT,
    CONSTRAINT "user_categories_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "user_categories_name_key" ON "user_categories"("name");

-- CreateTable: user_subcategories
CREATE TABLE "user_subcategories" (
    "id"         TEXT NOT NULL,
    "name"       TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    CONSTRAINT "user_subcategories_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "user_subcategories_categoryId_fkey"
        FOREIGN KEY ("categoryId") REFERENCES "user_categories"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "user_subcategories_name_categoryId_key"
    ON "user_subcategories"("name", "categoryId");

-- AlterTable: users — add category/subcategory FK columns
ALTER TABLE "users"
    ADD COLUMN "categoryId"    TEXT,
    ADD COLUMN "subcategoryId" TEXT;

ALTER TABLE "users"
    ADD CONSTRAINT "users_categoryId_fkey"
        FOREIGN KEY ("categoryId") REFERENCES "user_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "users"
    ADD CONSTRAINT "users_subcategoryId_fkey"
        FOREIGN KEY ("subcategoryId") REFERENCES "user_subcategories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Seed: default categories and subcategories
INSERT INTO "user_categories" ("id", "name", "icon") VALUES
    ('cat-alimentos',     'Alimentos y Bebidas',    '🍔'),
    ('cat-tecnologia',    'Tecnología',             '💻'),
    ('cat-moda',          'Moda y Estilo',           '👗'),
    ('cat-salud',         'Salud y Bienestar',       '🏥'),
    ('cat-educacion',     'Educación',               '📚'),
    ('cat-entretenimiento','Entretenimiento',         '🎬'),
    ('cat-hogar',         'Hogar y Jardín',          '🏠'),
    ('cat-automotriz',    'Automotriz',              '🚗'),
    ('cat-finanzas',      'Finanzas y Seguros',      '💰'),
    ('cat-servicios',     'Servicios Profesionales', '🔧');

INSERT INTO "user_subcategories" ("id", "name", "categoryId") VALUES
    -- Alimentos y Bebidas
    ('sub-restaurante',  'Restaurante',         'cat-alimentos'),
    ('sub-cafeteria',    'Cafetería',           'cat-alimentos'),
    ('sub-panaderia',    'Panadería / Pastelería','cat-alimentos'),
    ('sub-pizzeria',     'Pizzería',            'cat-alimentos'),
    ('sub-bar',          'Bar / Cantina',       'cat-alimentos'),
    ('sub-food-truck',   'Food Truck',          'cat-alimentos'),
    ('sub-catering',     'Catering',            'cat-alimentos'),
    -- Tecnología
    ('sub-software',     'Desarrollo de Software','cat-tecnologia'),
    ('sub-ecommerce',    'E-commerce',          'cat-tecnologia'),
    ('sub-marketing-dig','Marketing Digital',   'cat-tecnologia'),
    ('sub-soporte-ti',   'Soporte TI',          'cat-tecnologia'),
    -- Moda y Estilo
    ('sub-ropa',         'Ropa y Accesorios',   'cat-moda'),
    ('sub-calzado',      'Calzado',             'cat-moda'),
    ('sub-belleza',      'Belleza y Cosméticos','cat-moda'),
    ('sub-joyeria',      'Joyería',             'cat-moda'),
    -- Salud y Bienestar
    ('sub-clinica',      'Clínica / Consultorio','cat-salud'),
    ('sub-farmacia',     'Farmacia',            'cat-salud'),
    ('sub-gym',          'Gimnasio / Fitness',  'cat-salud'),
    ('sub-spa',          'Spa / Bienestar',     'cat-salud'),
    -- Educación
    ('sub-escuela',      'Escuela / Instituto', 'cat-educacion'),
    ('sub-tutoria',      'Tutoría / Clases',    'cat-educacion'),
    ('sub-cursos-online','Cursos Online',       'cat-educacion'),
    -- Entretenimiento
    ('sub-musica',       'Música',              'cat-entretenimiento'),
    ('sub-eventos',      'Eventos y Espectáculos','cat-entretenimiento'),
    ('sub-gaming',       'Gaming',              'cat-entretenimiento'),
    -- Hogar y Jardín
    ('sub-muebles',      'Muebles y Decoración','cat-hogar'),
    ('sub-jardineria',   'Jardinería',          'cat-hogar'),
    ('sub-limpieza',     'Limpieza del Hogar',  'cat-hogar'),
    -- Automotriz
    ('sub-taller',       'Taller Mecánico',     'cat-automotriz'),
    ('sub-ventas-auto',  'Venta de Vehículos',  'cat-automotriz'),
    ('sub-refacciones',  'Refacciones',         'cat-automotriz'),
    -- Finanzas
    ('sub-contabilidad', 'Contabilidad',        'cat-finanzas'),
    ('sub-seguros',      'Seguros',             'cat-finanzas'),
    ('sub-inversiones',  'Inversiones',         'cat-finanzas'),
    -- Servicios Profesionales
    ('sub-legal',        'Legal / Abogacía',    'cat-servicios'),
    ('sub-diseno',       'Diseño Gráfico',      'cat-servicios'),
    ('sub-construccion', 'Construcción',        'cat-servicios'),
    ('sub-freelance-gen','Freelance General',   'cat-servicios');
