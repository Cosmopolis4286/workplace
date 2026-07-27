<template>
  <!-- Mientras se confirma la sesión, no renderizamos nada: evita el "flash"
       de sidebar/header de backoffice (con datos de un usuario potencialmente
       caducado) antes de saber si hay sesión real. -->
  <div v-if="!sessionChecked" class="min-h-screen" />

  <!-- Sin sesión real: este layout es solo para el backoffice autenticado.
       Si una página pública lo usa por error u omisión (p.ej. /pricing para
       visitantes anónimos), no mostramos sidebar/header de usuario — solo
       el contenido de la página, igual que el layout 'public'. -->
  <div v-else-if="!isAuthenticated" class="min-h-screen">
    <slot />
  </div>

  <div
    v-else
    class="min-h-screen transition-colors duration-300"
    :class="isDark
      ? 'bg-gray-950 text-white'
      : 'bg-gradient-to-br from-gray-50 via-white to-red-50 text-gray-900'"
  >
    <AppSidebar :open="sidebarOpen" @update:open="setSidebar" @update:expanded="sidebarExpanded = $event" />
    <div
      class="transition-all duration-[220ms] ease-[cubic-bezier(0.4,0,0.2,1)]"
      :class="sidebarOpen || sidebarExpanded ? 'lg:pl-[272px]' : 'lg:pl-16'"
    >
      <AppHeader @toggle-sidebar="toggleSidebar" :sidebar-open="sidebarOpen" />
      <main class="py-8">
        <div class="px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
          <slot />
        </div>
      </main>
      <AppFooter />
    </div>
  </div>
</template>

<script setup lang="ts">
import { isPublicRoute } from '~/utils/publicRoutes'

const { isDark } = useColorMode()
const { isAuthenticated, ensureSessionVerified } = useAuth()
const route = useRoute()

const sidebarOpen = ref(false)
const sidebarExpanded = ref(false)
const sessionChecked = ref(false)

function setSidebar(val: boolean) {
  sidebarOpen.value = val
}
function toggleSidebar() {
  sidebarOpen.value = !sidebarOpen.value
}

// El middleware de rutas ya corrió ensureSessionVerified() antes de que este
// layout se monte, así que esto resuelve de inmediato (misma promesa
// memoizada) salvo en la primera carga de la app.
await ensureSessionVerified()

// Sin sesión real en una ruta que no es pública: el middleware solo conoce
// la ruta de destino, no qué layout usa la página, así que esta es la
// segunda barrera — si algo cambia de página sin pasar por el middleware
// (navegación cliente-a-cliente) y termina aquí sin sesión, no dejamos
// el sidebar/header de backoffice expuesto.
if (!isAuthenticated.value && !isPublicRoute(route.path)) {
  await navigateTo(`/login?redirect=${encodeURIComponent(route.path)}`)
}

sessionChecked.value = true
</script>
