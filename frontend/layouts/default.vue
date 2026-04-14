<template>
  <div
    class="min-h-screen transition-colors duration-300"
    :class="isDark
      ? 'bg-gray-950 text-white'
      : 'bg-gradient-to-br from-gray-50 via-white to-red-50 text-gray-900'"
  >
    <AppSidebar :open="sidebarOpen" @update:open="setSidebar" />
    <div
      class="transition-all duration-[220ms] ease-[cubic-bezier(0.4,0,0.2,1)]"
      :class="sidebarOpen ? 'lg:pl-[272px]' : 'lg:pl-16'"
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
const { isDark } = useColorMode()

const sidebarOpen = ref(false)

function setSidebar(val: boolean) {
  sidebarOpen.value = val
}
function toggleSidebar() {
  sidebarOpen.value = !sidebarOpen.value
}
</script>
