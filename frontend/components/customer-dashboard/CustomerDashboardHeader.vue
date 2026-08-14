<template>
  <div class="bg-gradient-to-r from-green-500 via-teal-500 to-blue-500 text-white p-6 rounded-b-3xl shadow-2xl">
    <div class="flex items-center justify-between">
      <div class="flex items-center space-x-4">
        <div class="p-3 bg-white/20 rounded-2xl backdrop-blur-sm">
          <ShoppingBag class="w-8 h-8" />
        </div>
        <div>
          <h1 class="text-3xl font-bold">Mi Panel de Cliente</h1>
          <p class="text-green-100">Gestiona tus pedidos y compras</p>
        </div>
      </div>
      <div class="flex items-center space-x-3">
        <button
          @click="$emit('refresh')"
          :disabled="loading"
          class="p-2 bg-white/20 rounded-xl backdrop-blur-sm hover:scale-110 transition-transform duration-200 disabled:opacity-50"
          title="Actualizar"
        >
          <RefreshCw class="w-5 h-5" :class="{ 'animate-spin': loading }" />
        </button>
        <NuxtLink to="/profile" class="p-2 bg-white/20 rounded-xl backdrop-blur-sm hover:scale-110 transition-transform duration-200">
          <User class="w-6 h-6" />
        </NuxtLink>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ShoppingBag, User, RefreshCw } from 'lucide-vue-next'

defineProps<{
  loading: boolean
}>()

defineEmits<{
  refresh: []
}>()
</script>
