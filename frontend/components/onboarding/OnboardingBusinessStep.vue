<template>
  <div class="p-6">
    <h2 class="text-base font-bold text-gray-900 mb-0.5">
      {{ isFreelancer ? 'Cuéntanos sobre ti' : 'Cuéntanos sobre tu negocio' }}
    </h2>
    <p class="text-sm text-gray-500 mb-5">Así es como te verán tus clientes.</p>

    <div class="flex items-center gap-4 mb-5">
      <button
        type="button"
        class="relative w-16 h-16 rounded-2xl bg-gray-100 border-2 border-dashed border-gray-300 flex items-center justify-center overflow-hidden flex-shrink-0 hover:border-red-400 transition-colors"
        :disabled="uploadingLogo"
        @click="fileInput?.click()"
      >
        <img v-if="logoPreview" :src="logoPreview" alt="Logo" class="w-full h-full object-cover" />
        <BuildingStorefrontIcon v-else class="w-6 h-6 text-gray-400" />
        <div v-if="uploadingLogo" class="absolute inset-0 bg-white/70 flex items-center justify-center">
          <div class="w-4 h-4 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
        </div>
      </button>
      <div class="flex-1 min-w-0">
        <button
          type="button"
          class="text-sm font-semibold text-red-600 hover:text-red-700"
          :disabled="uploadingLogo"
          @click="fileInput?.click()"
        >
          {{ logoPreview ? 'Cambiar logo' : 'Subir logo (opcional)' }}
        </button>
        <p class="text-xs text-gray-400 mt-0.5">JPG, PNG o WEBP. Puedes agregarlo después.</p>
      </div>
      <input ref="fileInput" type="file" accept="image/jpeg,image/png,image/webp,image/gif" class="hidden" @change="onFileChange" />
    </div>

    <label class="block text-xs font-medium text-gray-700 mb-1">
      {{ isFreelancer ? 'Nombre profesional' : 'Nombre del negocio' }}
    </label>
    <input
      :value="businessName"
      type="text"
      maxlength="80"
      :placeholder="isFreelancer ? 'Ej: Juan Pérez Diseño' : 'Ej: Panadería Doña Carmen'"
      class="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-400"
      @input="$emit('update:businessName', ($event.target as HTMLInputElement).value)"
    />
    <p class="text-xs text-gray-400 mt-1.5">Podrás cambiarlo cuando quieras desde Configuración.</p>

    <p v-if="error" class="text-xs text-red-600 mt-3 flex items-center gap-1.5">
      <ExclamationCircleIcon class="h-3.5 w-3.5 flex-shrink-0" />{{ error }}
    </p>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { BuildingStorefrontIcon, ExclamationCircleIcon } from '@heroicons/vue/24/outline'
import { useAssetUrl } from '~/composables/core/useAssetUrl'

const props = defineProps<{
  businessName: string
  logoUrl?: string | null
  uploadingLogo: boolean
  error: string
  isFreelancer?: boolean
}>()

const emit = defineEmits<{
  'update:businessName': [value: string]
  'upload-logo': [file: File]
}>()

const { getAssetUrl } = useAssetUrl()
const fileInput = ref<HTMLInputElement | null>(null)
const logoPreview = computed(() => getAssetUrl(props.logoUrl))

function onFileChange(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (!file) return
  emit('upload-logo', file)
  ;(event.target as HTMLInputElement).value = ''
}
</script>
