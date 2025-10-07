<template>
  <div class="min-h-screen bg-gradient-to-br from-gray-50 via-white to-red-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
    <!-- Background Pattern -->
    <div class="absolute inset-0 overflow-hidden">
      <div class="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-ifood-red/20 to-red-600/20 rounded-full blur-3xl"></div>
      <div class="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-br from-ifood-orange/20 to-orange-600/20 rounded-full blur-3xl"></div>
      <div class="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-gradient-to-br from-ifood-red/10 to-red-600/10 rounded-full blur-3xl"></div>
    </div>

    <div class="relative max-w-md w-full space-y-8">
      <!-- Logo Section -->
      <div class="text-center">
        <div class="flex justify-center mb-6">
          <div class="relative group">
            <div class="absolute inset-0 bg-gradient-to-r from-ifood-red to-red-600 rounded-2xl blur opacity-30 group-hover:opacity-50 transition-opacity duration-300"></div>
            <div class="relative bg-white p-4 rounded-2xl shadow-2xl transform group-hover:scale-110 transition-transform duration-300 floating-animation">
              <img class="h-16 w-16 rounded-xl" src="https://images.pexels.com/photos/4386431/pexels-photo-4386431.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&fit=crop" alt="iFood Manager">
            </div>
          </div>
        </div>
        <div class="mb-2">
          <span class="text-4xl font-black bg-gradient-to-r from-ifood-red to-red-600 bg-clip-text text-transparent">iFood</span>
          <span class="text-3xl font-bold text-gray-700 ml-2">Manager</span>
        </div>
        <p class="text-gray-600 font-medium">{{ subtitle }}</p>
      </div>

      <!-- Main Card -->
      <div class="card-premium p-8 space-y-6">
        <div class="text-center">
          <h2 class="text-3xl font-bold text-gray-900 mb-2">{{ title }}</h2>
          <p class="text-gray-600">{{ description }}</p>
        </div>

        <slot />
      </div>

      <!-- Footer Links -->
      <div class="text-center space-y-4">
        <slot name="footer" />
        
        <div class="text-sm text-gray-500">
          <p>&copy; 2024 iFood Manager. Todos los derechos reservados.</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
defineProps({
  title: String,
  subtitle: {
    type: String,
    default: 'Sistema de gestión para restaurantes'
  },
  description: String
})
</script>