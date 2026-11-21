<template>
  <div class="space-y-8">
    <PageHeader
      title="Mi tienda"
      description="Administra tu presencia comercial y profesional desde un solo lugar."
      :icon="BuildingStorefrontIcon"
    />

    <section class="grid grid-cols-1 gap-5 md:grid-cols-2">
      <article v-if="hasCommerce" class="card-premium p-6">
        <div class="mb-4 flex items-center gap-3">
          <div class="rounded-xl bg-red-50 p-3 text-workplace-red">
            <BuildingStorefrontIcon class="h-6 w-6" />
          </div>
          <div>
            <h2 class="text-lg font-bold text-gray-900">Tienda comercial</h2>
            <p class="text-sm text-gray-500">Productos, inventario y pedidos</p>
          </div>
        </div>
        <p class="mb-5 text-sm text-gray-600">
          Gestiona el catálogo y las operaciones de tu comercio. Estos accesos reutilizan los módulos existentes.
        </p>
        <div class="flex flex-wrap gap-2">
          <NuxtLink v-if="can('menu:view')" to="/menu" class="store-action">Productos</NuxtLink>
          <NuxtLink v-if="can('inventory:view')" to="/inventory" class="store-action">Inventario</NuxtLink>
          <NuxtLink v-if="can('orders:view')" to="/orders" class="store-action">Pedidos</NuxtLink>
          <NuxtLink v-if="can('sales:view')" to="/sales" class="store-action">Ventas</NuxtLink>
        </div>
      </article>

      <article v-if="hasProfessionalProfile" class="card-premium p-6">
        <div class="mb-4 flex items-center gap-3">
          <div class="rounded-xl bg-blue-50 p-3 text-blue-700">
            <BriefcaseIcon class="h-6 w-6" />
          </div>
          <div>
            <h2 class="text-lg font-bold text-gray-900">Perfil profesional</h2>
            <p class="text-sm text-gray-500">Servicios, solicitudes y reputación</p>
          </div>
        </div>
        <p class="mb-5 text-sm text-gray-600">
          Administra tus servicios y atiende las solicitudes de tus clientes sin mezclar esta información con el catálogo comercial.
        </p>
        <div class="flex flex-wrap gap-2">
          <NuxtLink v-if="can('services:view')" to="/my-services" class="store-action">Mis servicios</NuxtLink>
          <NuxtLink v-if="can('service_requests:view')" to="/service-requests" class="store-action">Solicitudes</NuxtLink>
        </div>
      </article>
    </section>

    <section class="card-premium p-6">
      <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 class="text-lg font-bold text-gray-900">Configuración y publicación</h2>
          <p class="mt-1 max-w-2xl text-sm text-gray-600">
            Configura los datos de tu negocio y las direcciones públicas. La visibilidad del perfil y la publicación de la tienda son controles independientes.
          </p>
        </div>
        <NuxtLink to="/settings" class="store-action self-start">Abrir configuración</NuxtLink>
      </div>
      <div class="mt-5 grid grid-cols-1 gap-3 border-t border-gray-100 pt-5 sm:grid-cols-2">
        <div class="rounded-xl bg-gray-50 p-4">
          <p class="font-semibold text-gray-800">Perfil público</p>
          <p class="mt-1 text-sm text-gray-500">Identidad, publicaciones y reputación profesional.</p>
          <NuxtLink v-if="username" :to="`/p/${username}`" class="mt-3 inline-flex text-sm font-semibold text-workplace-red hover:underline">
            Ver mi perfil
          </NuxtLink>
          <span v-else class="mt-3 inline-block text-xs text-gray-400">Configura tu nombre de usuario en Mi Perfil.</span>
        </div>
        <div class="rounded-xl bg-gray-50 p-4">
          <p class="font-semibold text-gray-800">Tienda pública</p>
          <p class="mt-1 text-sm text-gray-500">Catálogo comercial, precios y disponibilidad.</p>
          <NuxtLink v-if="hasCommerce" to="/settings" class="mt-3 inline-flex text-sm font-semibold text-workplace-red hover:underline">
            Configurar tienda y URL pública
          </NuxtLink>
          <span v-else class="mt-3 inline-block text-xs text-gray-400">
            Tu perfil profesional no necesita una tienda comercial para publicar servicios.
          </span>
        </div>
      </div>
    </section>

    <p v-if="!hasCommerce && !hasProfessionalProfile" class="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
      Tu cuenta todavía no tiene un perfil comercial o profesional activo. Puedes revisar las opciones disponibles en
      <NuxtLink to="/pricing" class="font-semibold underline">Planes y Precios</NuxtLink>.
    </p>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { BuildingStorefrontIcon, BriefcaseIcon } from '@heroicons/vue/24/outline'
import PageHeader from '~/components/ui/PageHeader.vue'

definePageMeta({ middleware: 'auth' })
useHead({ title: 'Mi tienda — WorkPlace' })

const { user } = useAuth()
const { hasCapability } = useProfileContext()
const { can } = usePermissions()

const hasCommerce = computed(() => hasCapability('HAS_COMMERCE'))
const hasProfessionalProfile = computed(() => hasCapability('HAS_PROFESSIONAL_PROFILE'))
const username = computed(() => user.value?.username ?? '')
</script>

<style scoped>
.store-action {
  @apply inline-flex items-center rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-700 transition-colors hover:border-workplace-red hover:text-workplace-red;
}
</style>
