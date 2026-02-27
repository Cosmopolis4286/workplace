<template>
  <div class="min-h-screen bg-gradient-to-br from-gray-50 via-white to-red-50">
    <AppSidebar :open="sidebarOpen" @update:open="toggleSidebar" />
    <div
      :class="[
        'transition-all duration-300 ease-in-out',
        sidebarOpen ? 'lg:pl-72' : 'lg:pl-0',
      ]"
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
const sidebarOpen = ref(false);

const toggleSidebar = (value?: boolean) => {
  sidebarOpen.value = typeof value === "boolean" ? value : !sidebarOpen.value;
};

onMounted(() => {
  if (window.innerWidth >= 1024) {
    setTimeout(() => {
      sidebarOpen.value = true;
    }, 100);
  }
});
</script>
