<template>
  <div class="min-h-screen bg-gradient-to-br from-gray-50 via-white to-red-50">
    <AppSidebar :open="sidebarOpen" @update:open="toggleSidebar" />
    <div class="lg:pl-72 transition-all duration-300">
      <AppHeader @toggle-sidebar="toggleSidebar" />
      <main class="py-8">
        <div class="px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
          <slot />
        </div>
      </main>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'

const sidebarOpen = ref(false)

const toggleSidebar = (value) => {
  if (typeof value === 'boolean') {
    sidebarOpen.value = value
  } else {
    sidebarOpen.value = !sidebarOpen.value
  }
}
</script>