<template>
  <footer class="border-t border-gray-100 bg-white/80 backdrop-blur-sm mt-4">
    <div class="px-4 sm:px-6 lg:px-8 py-4">
      <div class="flex flex-col sm:flex-row justify-between items-center gap-3">
        <!-- Brand + copyright -->
        <div class="flex items-center gap-2">
          <div class="w-5 h-5 bg-gradient-to-br from-red-500 to-orange-400 rounded flex items-center justify-center shadow-sm">
            <svg class="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path d="M3 4a1 1 0 011-1h12a1 1 0 010 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 010 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h7a1 1 0 010 2H4a1 1 0 01-1-1z" />
            </svg>
          </div>
          <span class="text-sm text-gray-400">
            © {{ currentYear }}
            <span class="font-medium text-gray-500">FoodManager</span>.
            Todos los derechos reservados.
          </span>
        </div>

        <!-- Links -->
        <nav class="flex items-center gap-1">
          <NuxtLink
            to="/privacidad"
            class="px-3 py-1.5 text-xs font-medium text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all duration-150"
          >
            Privacidad
          </NuxtLink>
          <span class="text-gray-200 select-none">|</span>
          <NuxtLink
            to="/terminos"
            class="px-3 py-1.5 text-xs font-medium text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all duration-150"
          >
            Términos
          </NuxtLink>
          <span class="text-gray-200 select-none">|</span>
          <NuxtLink
            to="/soporte"
            class="px-3 py-1.5 text-xs font-medium text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all duration-150"
          >
            Soporte
          </NuxtLink>
        </nav>
      </div>
    </div>
  </footer>
</template>

<script setup lang="ts">
const currentYear = new Date().getFullYear()
</script>
