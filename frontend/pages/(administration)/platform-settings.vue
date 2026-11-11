<template>
  <div class="space-y-6">
    <PageHeader
      title="Ajustes de la plataforma"
      description="Ajustes globales que afectan a todas las tiendas y usuarios."
      :icon="AdjustmentsHorizontalIcon"
      :breadcrumb="[{ label: 'Ajustes de la plataforma' }]"
    />

    <p v-if="error" class="p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{{ error }}</p>

    <div class="card-premium p-6">
      <div class="flex items-start justify-between gap-4">
        <div>
          <p class="text-sm font-semibold text-gray-800">Mostrar el contacto de las tiendas en su página pública</p>
          <p class="text-xs text-gray-500 mt-1">
            Teléfono, correo y WhatsApp de cada tienda. Si lo apagas, se ocultan en todas las tiendas aunque el
            comercio lo tenga activado; los clientes escriben por el chat de cada pedido.
          </p>
          <p v-if="!isSuperAdmin" class="text-xs text-amber-700 mt-2">Solo un SUPERADMIN puede cambiarlo.</p>
        </div>
        <button
          type="button"
          role="switch"
          :aria-checked="publicContact"
          :disabled="!isSuperAdmin || saving"
          class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors flex-shrink-0 disabled:opacity-50"
          :class="publicContact ? 'bg-blue-600' : 'bg-gray-300'"
          @click="toggle"
        >
          <span
            class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform"
            :class="publicContact ? 'translate-x-6' : 'translate-x-1'"
          />
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { AdjustmentsHorizontalIcon } from '@heroicons/vue/24/outline'
import PageHeader from '~/components/ui/PageHeader.vue'
import { useApi } from '~/composables/core/useApi'
import { useAuth } from '~/composables/auth/useAuth'
import { getApiErrorMessage } from '~/composables/core/useApiErrors'

definePageMeta({ middleware: 'auth' })
useHead({ title: 'Ajustes de la plataforma — WorkPlace' })

const { get, patch } = useApi()
const { user } = useAuth()
const isSuperAdmin = computed(() => user.value?.role === 'SUPERADMIN')
const publicContact = ref(true)
const saving = ref(false)
const error = ref<string | null>(null)

async function load() {
  try {
    const settings = await get<Record<string, unknown>>('/platform-settings')
    publicContact.value = settings['store.publicContact'] !== false
  } catch (e) {
    error.value = getApiErrorMessage(e, 'No se pudieron cargar los ajustes')
  }
}

async function toggle() {
  if (!isSuperAdmin.value || saving.value) return
  saving.value = true
  error.value = null
  try {
    const settings = await patch<Record<string, unknown>>('/platform-settings/store.publicContact', {
      value: !publicContact.value,
    })
    publicContact.value = settings['store.publicContact'] !== false
  } catch (e) {
    error.value = getApiErrorMessage(e, 'No se pudo guardar el ajuste')
  } finally {
    saving.value = false
  }
}

onMounted(load)
</script>
