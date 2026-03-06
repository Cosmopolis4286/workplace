<template>
  <div class="min-h-screen bg-gradient-to-br from-gray-50 via-white to-red-50">
    <!-- Header público -->
    <header class="bg-white/95 backdrop-blur-lg shadow-sm border-b border-gray-200 sticky top-0 z-40">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex justify-between items-center h-16">
          <!-- Logo -->
          <NuxtLink to="/" class="flex items-center group">
            <div class="relative">
              <div class="absolute inset-0 bg-gradient-to-r from-ifood-red to-red-600 rounded-xl blur opacity-30 group-hover:opacity-50 transition-opacity duration-300" />
              <div class="relative h-10 w-10 rounded-xl bg-gradient-to-br from-ifood-red to-red-700 flex items-center justify-center shadow-lg transform group-hover:scale-110 transition-transform duration-300">
                <span class="text-white font-black text-lg">i</span>
              </div>
            </div>
            <div class="ml-3">
              <span class="text-2xl font-black bg-gradient-to-r from-ifood-red to-red-600 bg-clip-text text-transparent">iFood</span>
              <span class="text-xl font-bold text-gray-700 ml-1">Manager</span>
            </div>
          </NuxtLink>

          <!-- Acciones -->
          <div class="flex items-center gap-3">
            <NuxtLink
              to="/login"
              class="px-4 py-2 text-sm font-semibold text-gray-700 hover:text-ifood-red transition-colors duration-200"
            >
              Iniciar sesión
            </NuxtLink>
            <NuxtLink
              to="/register"
              class="px-4 py-2 text-sm font-semibold text-white bg-gradient-to-r from-ifood-red to-red-600 rounded-xl shadow hover:shadow-md hover:from-red-600 hover:to-red-700 transition-all duration-200"
            >
              Registrarse
            </NuxtLink>
          </div>
        </div>
      </div>
    </header>

    <main>
      <slot />
    </main>

    <AppFooter />
  </div>
</template>
