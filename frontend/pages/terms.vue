<template>
  <div class="max-w-3xl mx-auto space-y-6 pb-8">

    <!-- Page header -->
    <div class="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <div class="h-1.5 bg-gradient-to-r from-orange-500 to-amber-400" />
      <div class="px-8 py-8">
        <div class="flex items-start gap-4">
          <div class="w-12 h-12 bg-orange-50 rounded-xl flex items-center justify-center flex-shrink-0">
            <svg class="w-6 h-6 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <div>
            <h1 class="text-2xl font-bold text-gray-900">Términos de Servicio</h1>
            <p class="text-sm text-gray-400 mt-1">Última actualización: enero 2026 · Versión 2.0</p>
            <p class="text-gray-500 mt-3 leading-relaxed">
              Al usar WorkPlace Manager, aceptas estos términos. Te recomendamos leerlos con atención
              para entender tus derechos y responsabilidades como usuario de la plataforma.
            </p>
          </div>
        </div>
      </div>
    </div>

    <!-- Acceptance notice -->
    <div class="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl px-5 py-4">
      <svg class="w-5 h-5 text-amber-500 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
        <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
      </svg>
      <p class="text-sm text-amber-700">
        <span class="font-semibold">Importante:</span> Al crear una cuenta o continuar usando WorkPlace Manager, confirmas que has leído y aceptado estos términos en su totalidad.
      </p>
    </div>

    <!-- Sections -->
    <div
      v-for="(section, index) in sections"
      :key="section.title"
      class="bg-white rounded-2xl shadow-sm border border-gray-100 p-6"
    >
      <div class="flex items-center gap-3 mb-4">
        <div class="w-7 h-7 bg-orange-100 rounded-lg flex items-center justify-center flex-shrink-0">
          <span class="text-xs font-bold text-orange-600">{{ index + 1 }}</span>
        </div>
        <h2 class="text-base font-semibold text-gray-800">{{ section.title }}</h2>
      </div>
      <div class="space-y-2.5">
        <p
          v-for="paragraph in section.paragraphs"
          :key="paragraph"
          class="text-sm text-gray-500 leading-relaxed"
        >
          {{ paragraph }}
        </p>
      </div>
    </div>

    <!-- Footer note -->
    <div class="flex items-start gap-3 bg-gray-50 border border-gray-200 rounded-xl px-5 py-4">
      <svg class="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
          d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <p class="text-sm text-gray-400">
        Podemos actualizar estos términos en cualquier momento. Te notificaremos por correo electrónico ante cambios significativos con al menos 30 días de anticipación. El uso continuado del servicio tras dicha notificación implica tu aceptación.
      </p>
    </div>

    <!-- CTA row -->
    <div class="flex flex-col sm:flex-row gap-3">
      <NuxtLink
        to="/privacy"
        class="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-white border border-gray-200 text-gray-600 text-sm font-medium rounded-xl hover:border-orange-300 hover:text-orange-600 transition-all duration-150 shadow-sm"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
            d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
        Ver Política de Privacidad
      </NuxtLink>
      <NuxtLink
        to="/support"
        class="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-orange-500 text-white text-sm font-medium rounded-xl hover:bg-orange-600 transition-all duration-150 shadow-sm"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
            d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
        Ir a Soporte
      </NuxtLink>
    </div>

  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'public' })
useHead({ title: 'Términos de Servicio — WorkPlace Manager' })

const sections = [
  {
    title: 'Aceptación de los términos',
    paragraphs: [
      'Al acceder o utilizar WorkPlace Manager, aceptas quedar vinculado por estos Términos de Servicio y nuestra Política de Privacidad. Si no estás de acuerdo con alguna parte de estos términos, no podrás acceder al servicio.',
    ],
  },
  {
    title: 'Descripción del servicio',
    paragraphs: [
      'WorkPlace Manager es una plataforma de gestión para comercios y proveedores de servicios que incluye módulos de pedidos, inventario, clientes, empleados, delivery, gastos y analytics.',
      'Nos reservamos el derecho de modificar o interrumpir el servicio (temporal o permanentemente) con o sin aviso previo.',
    ],
  },
  {
    title: 'Cuenta de usuario',
    paragraphs: [
      'Eres responsable de mantener la confidencialidad de tus credenciales de acceso y de todas las actividades realizadas bajo tu cuenta.',
      'Debes notificarnos inmediatamente de cualquier uso no autorizado de tu cuenta. No nos hacemos responsables de pérdidas derivadas del uso no autorizado.',
      'Una cuenta corresponde a un comercio o proveedor de servicios. El uso de una cuenta para múltiples negocios no está permitido sin un plan correspondiente.',
    ],
  },
  {
    title: 'Uso aceptable',
    paragraphs: [
      'Te comprometes a usar WorkPlace Manager únicamente para fines legales y de acuerdo con estos términos. Queda prohibido: intentar acceder a datos de otros comercios o proveedores, realizar ingeniería inversa, o usar el servicio para actividades ilegales.',
      'Nos reservamos el derecho de suspender o cancelar cuentas que violen estas condiciones sin previo aviso.',
    ],
  },
  {
    title: 'Propiedad intelectual',
    paragraphs: [
      'El servicio y su contenido original, características y funcionalidades son y seguirán siendo propiedad exclusiva de WorkPlace Manager y sus licenciantes.',
      'Tus datos de negocio (pedidos, clientes, productos, etc.) son de tu propiedad. WorkPlace Manager solo los procesa para prestarte el servicio.',
    ],
  },
  {
    title: 'Limitación de responsabilidad',
    paragraphs: [
      'WorkPlace Manager no será responsable por daños indirectos, incidentales, especiales o consecuentes derivados del uso o incapacidad de usar el servicio.',
      'Hacemos nuestro mejor esfuerzo por mantener la disponibilidad del servicio, con un objetivo de uptime del 99.5% mensual, excluyendo mantenimientos programados.',
    ],
  },
]
</script>
