<template>
  <div class="max-w-3xl mx-auto space-y-6 pb-8">

    <!-- Page header -->
    <div class="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <div class="h-1.5 bg-gradient-to-r from-red-500 to-orange-400" />
      <div class="px-8 py-8">
        <div class="flex items-start gap-4">
          <div class="w-12 h-12 bg-red-50 rounded-xl flex items-center justify-center flex-shrink-0">
            <svg class="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <div>
            <h1 class="text-2xl font-bold text-gray-900">Política de Privacidad</h1>
            <p class="text-sm text-gray-400 mt-1">Última actualización: enero 2026</p>
            <p class="text-gray-500 mt-3 leading-relaxed">
              En FoodManager nos comprometemos a proteger tu privacidad y la de tu negocio.
              Esta política explica cómo recopilamos, usamos y protegemos tu información.
            </p>
          </div>
        </div>
      </div>
    </div>

    <!-- Sections -->
    <div
      v-for="section in sections"
      :key="section.title"
      class="bg-white rounded-2xl shadow-sm border border-gray-100 p-6"
    >
      <div class="flex items-center gap-3 mb-4">
        <div class="w-8 h-8 bg-red-50 rounded-lg flex items-center justify-center flex-shrink-0">
          <svg class="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" :d="section.iconPath" />
          </svg>
        </div>
        <h2 class="text-base font-semibold text-gray-800">{{ section.title }}</h2>
      </div>
      <ul class="space-y-2.5">
        <li
          v-for="item in section.items"
          :key="item"
          class="flex items-start gap-2.5 text-sm text-gray-500"
        >
          <svg class="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
          </svg>
          {{ item }}
        </li>
      </ul>
    </div>

    <!-- Contact CTA -->
    <div class="bg-gradient-to-br from-red-50 to-orange-50 rounded-2xl border border-red-100 p-6 flex flex-col sm:flex-row items-start sm:items-center gap-4">
      <div class="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm flex-shrink-0">
        <svg class="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
            d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      </div>
      <div class="flex-1">
        <p class="text-sm font-medium text-gray-800">¿Tienes preguntas sobre tu privacidad?</p>
        <p class="text-sm text-gray-500 mt-0.5">Contáctanos en <span class="text-red-500 font-medium">privacidad@foodmanager.app</span></p>
      </div>
      <NuxtLink
        to="/soporte"
        class="inline-flex items-center gap-1.5 px-4 py-2 bg-white border border-red-200 text-red-600 text-sm font-medium rounded-xl hover:bg-red-500 hover:text-white hover:border-red-500 transition-all duration-150 shadow-sm whitespace-nowrap"
      >
        Ir a Soporte
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
        </svg>
      </NuxtLink>
    </div>

  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'public' })
useHead({ title: 'Privacidad — FoodManager' })

const sections = [
  {
    title: 'Información que recopilamos',
    iconPath: 'M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4',
    items: [
      'Datos de cuenta: nombre, correo electrónico y contraseña cifrada.',
      'Datos del restaurante: nombre, dirección y configuración operativa.',
      'Datos de negocio: pedidos, clientes, productos, empleados y gastos que tú ingresas.',
      'Datos de uso: páginas visitadas y acciones realizadas dentro de la plataforma.',
    ],
  },
  {
    title: 'Cómo usamos tu información',
    iconPath: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z',
    items: [
      'Proveer y mejorar los servicios de FoodManager.',
      'Generar reportes y estadísticas para tu negocio.',
      'Enviarte notificaciones relevantes de tu operación.',
      'Garantizar la seguridad y prevenir fraudes.',
    ],
  },
  {
    title: 'Protección de datos',
    iconPath: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z',
    items: [
      'Todos los datos se transmiten mediante HTTPS con cifrado TLS 1.3.',
      'Las contraseñas se almacenan con hashing bcrypt (nunca en texto plano).',
      'Tokens de sesión con expiración automática y lista negra en Redis.',
      'Acceso restringido: solo tu restaurante puede ver sus propios datos.',
    ],
  },
  {
    title: 'Tus derechos',
    iconPath: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z',
    items: [
      'Acceder a todos tus datos en cualquier momento desde Configuración.',
      'Solicitar corrección de datos incorrectos.',
      'Exportar tu información en formato JSON.',
      'Eliminar tu cuenta y todos los datos asociados contactándonos.',
    ],
  },
]
</script>
