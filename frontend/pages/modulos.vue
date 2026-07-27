<template>
  <div>
    <PageHeader
      title="Módulos"
      description="Elige qué secciones quieres ver en tu menú lateral. Solo puedes elegir entre los módulos que incluye tu plan."
      :icon="Squares2X2Icon"
    />

    <!-- Loading skeleton -->
    <div v-if="loading" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      <div v-for="i in 6" :key="i" class="card-premium p-5 animate-pulse">
        <div class="h-5 bg-gray-200 rounded w-2/3 mb-2" />
        <div class="h-3 bg-gray-100 rounded w-full" />
      </div>
    </div>

    <template v-else>
      <!-- Error banner -->
      <div
        v-if="error"
        class="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3 text-red-700"
      >
        <ExclamationTriangleIcon class="h-5 w-5 flex-shrink-0" />
        <span class="text-sm font-medium">{{ error }}</span>
        <button class="ml-auto text-red-400 hover:text-red-600" @click="error = null">
          <XMarkIcon class="h-4 w-4" />
        </button>
      </div>

      <!-- Success banner -->
      <Transition name="fade">
        <div
          v-if="successMsg"
          class="mb-6 p-4 bg-green-50 border border-green-200 rounded-xl flex items-center gap-3 text-green-700"
        >
          <CheckCircleIcon class="h-5 w-5 flex-shrink-0" />
          <span class="text-sm font-medium">{{ successMsg }}</span>
        </div>
      </Transition>

      <div class="card-premium p-6">
        <div class="flex items-center justify-between mb-6">
          <div class="flex items-center">
            <div class="p-3 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-xl shadow-lg mr-3">
              <Squares2X2Icon class="h-6 w-6 text-white" />
            </div>
            <div>
              <h3 class="text-xl font-bold text-gray-900">Módulos disponibles en tu plan</h3>
              <p class="text-sm text-gray-500">{{ availableModules.length }} módulo{{ availableModules.length !== 1 ? 's' : '' }} incluido{{ availableModules.length !== 1 ? 's' : '' }}</p>
            </div>
          </div>
          <NuxtLink to="/mi-plan" class="text-sm font-semibold text-workplace-red hover:underline whitespace-nowrap">
            Ver mi plan
          </NuxtLink>
        </div>

        <div v-if="availableModules.length === 0" class="text-center py-10 text-gray-400">
          <Squares2X2Icon class="w-10 h-10 mx-auto mb-2 opacity-40" />
          <p class="text-sm">Tu plan no incluye módulos configurables todavía.</p>
        </div>

        <div v-else class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <label
            v-for="m in availableModules"
            :key="m"
            class="flex items-start gap-3 p-4 rounded-xl border cursor-pointer transition-colors"
            :class="isEnabled(m) ? 'border-gray-200 hover:border-gray-300 bg-white' : 'border-gray-200 bg-gray-50'"
          >
            <button
              type="button"
              role="switch"
              :aria-checked="isEnabled(m)"
              class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-300 flex-shrink-0 mt-0.5"
              :class="isEnabled(m) ? 'bg-workplace-red' : 'bg-gray-300'"
              @click="toggle(m)"
            >
              <span
                class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-300"
                :class="isEnabled(m) ? 'translate-x-6' : 'translate-x-1'"
              />
            </button>
            <div>
              <div class="font-semibold text-gray-900 text-sm">{{ MODULE_LABELS[m] ?? m }}</div>
              <div class="text-xs text-gray-400">{{ isEnabled(m) ? 'Visible en tu menú' : 'Oculto de tu menú' }}</div>
            </div>
          </label>
        </div>

        <p class="mt-5 text-xs text-gray-400 text-center">
          Ocultar un módulo no cancela ninguna función de tu plan — solo lo retira de tu menú lateral. Puedes reactivarlo cuando quieras.
        </p>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ middleware: 'auth' })

import { ref, computed, onMounted } from 'vue'
import { Squares2X2Icon, ExclamationTriangleIcon, XMarkIcon, CheckCircleIcon } from '@heroicons/vue/24/outline'
import PageHeader from '~/components/ui/PageHeader.vue'
import { useSettings } from '~/composables/useSettings'
import { useModules } from '~/composables/useModules'
import { useModuleCatalog } from '~/composables/useModuleCatalog'

const { error, successMsg, saving, loadModuleSettings, saveModuleSettings } = useSettings()
const { invalidate: invalidateModules, loadModules } = useModules()
const { labels: MODULE_LABELS, load: loadModuleCatalog } = useModuleCatalog()

const loading = ref(true)
const availableModules = ref<string[]>([])
const disabledModules = ref<string[]>([])

function isEnabled(module: string) {
  return !disabledModules.value.includes(module)
}

async function toggle(module: string) {
  const next = isEnabled(module)
    ? [...disabledModules.value, module]
    : disabledModules.value.filter((m) => m !== module)

  const previous = disabledModules.value
  disabledModules.value = next // optimistic

  const ok = await saveModuleSettings(next)
  if (!ok) {
    disabledModules.value = previous // rollback
    return
  }
  // El sidebar comparte el mismo estado singleton de useModules() — invalidar +
  // recargar aquí actualiza también lo que el sidebar ve, sin recargar la página.
  invalidateModules()
  await loadModules()
}

onMounted(async () => {
  loading.value = true
  await loadModuleCatalog()
  const data = await loadModuleSettings()
  if (data) {
    availableModules.value = data.availableModules
    disabledModules.value = data.disabledModules
  }
  loading.value = false
})
</script>

<style scoped>
.fade-enter-active,
.fade-leave-active { transition: opacity 0.3s ease; }
.fade-enter-from,
.fade-leave-to { opacity: 0; }
</style>
