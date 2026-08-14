<template>
  <div class="card-premium p-6">
    <div class="flex items-center mb-6">
      <div class="p-3 bg-gradient-to-br from-violet-500 to-violet-600 rounded-xl shadow-lg mr-3">
        <PaintBrushIcon class="h-6 w-6 text-white" />
      </div>
      <h3 class="text-xl font-bold text-gray-900">Preferencias</h3>
    </div>

    <div class="space-y-5">
      <div>
        <label class="block text-sm font-semibold text-gray-700 mb-2">Idioma</label>
        <select v-model="userPrefs.language" class="input-field">
          <option value="es">Español</option>
          <option value="en">English</option>
          <option value="pt">Português</option>
        </select>
      </div>

      <div>
        <label class="block text-sm font-semibold text-gray-700 mb-2">Moneda preferida</label>
        <select v-model="userPrefs.currency" class="input-field">
          <option v-for="rate in activeRates" :key="rate.code" :value="rate.code">
            {{ rate.code }} — {{ rate.name }}
          </option>
          <option v-if="activeRates.length === 0" disabled value="">Cargando monedas...</option>
        </select>
      </div>

      <div>
        <label class="block text-sm font-semibold text-gray-700 mb-2">Ordenar productos por defecto</label>
        <select v-model="userPrefs.defaultSort" class="input-field">
          <option value="relevance">Relevancia</option>
          <option value="price_asc">Precio: menor a mayor</option>
          <option value="price_desc">Precio: mayor a menor</option>
          <option value="name">Nombre A–Z</option>
        </select>
      </div>

      <div>
        <label class="block text-sm font-semibold text-gray-700 mb-2">Productos por página</label>
        <select v-model.number="userPrefs.pageSize" class="input-field">
          <option :value="10">10 productos</option>
          <option :value="20">20 productos</option>
          <option :value="40">40 productos</option>
        </select>
      </div>

      <button class="btn-save btn-violet" @click="save">
        Guardar Preferencias
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { PaintBrushIcon } from '@heroicons/vue/24/outline'
import { useUserPreferences } from '~/composables/users/useUserPreferences'

const emit = defineEmits<{
  saved: [message: string]
}>()

const { prefs: userPrefs, activeRates, fetchRates, savePreferences } = useUserPreferences()

function save() {
  savePreferences({ ...userPrefs.value })
  emit('saved', 'Preferencias guardadas')
}

onMounted(() => { fetchRates(false, true) })
</script>

<style scoped>
.input-field {
  @apply w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-red-500 focus:border-red-500 transition-all duration-300 bg-white;
}
.btn-save {
  @apply w-full px-6 py-3 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100;
}
.btn-violet { @apply bg-gradient-to-r from-violet-500 to-violet-600; }
</style>
