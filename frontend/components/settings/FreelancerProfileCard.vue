<template>
  <div class="card-premium p-6">
    <div class="flex items-center mb-6">
      <div class="p-3 bg-gradient-to-br from-teal-500 to-teal-600 rounded-xl shadow-lg mr-3">
        <WrenchIcon class="h-6 w-6 text-white" />
      </div>
      <h3 class="text-xl font-bold text-gray-900">Perfil Profesional</h3>
    </div>

    <div class="space-y-5">
      <div>
        <label class="block text-sm font-semibold text-gray-700 mb-2">
          Descripción <span class="text-gray-400 font-normal">(visible en tu perfil público)</span>
        </label>
        <textarea
          v-model="form.description"
          rows="3"
          maxlength="500"
          class="input-field resize-none"
          placeholder="Cuéntale a tus clientes qué servicios ofreces y por qué elegirte..."
        />
      </div>

      <div>
        <label class="block text-sm font-semibold text-gray-700 mb-2">Redes sociales</label>
        <div class="grid grid-cols-2 gap-4">
          <input v-model="form.socialLinks.instagram" type="text" class="input-field" placeholder="Instagram">
          <input v-model="form.socialLinks.facebook" type="text" class="input-field" placeholder="Facebook">
          <input v-model="form.socialLinks.whatsapp" type="text" class="input-field" placeholder="WhatsApp">
          <input v-model="form.socialLinks.tiktok" type="text" class="input-field" placeholder="TikTok">
        </div>
      </div>

      <button :disabled="saving" class="btn-save btn-teal" @click="$emit('save', { ...form })">
        <span v-if="saving" class="flex items-center justify-center gap-2">
          <svg class="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
          </svg>
          Guardando...
        </span>
        <span v-else>Guardar Perfil</span>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { WrenchIcon } from '@heroicons/vue/24/outline'
import type { FreelancerSettingsData, SocialLinks } from '~/composables/commerce/useSettings'

export interface FreelancerProfileForm {
  description: string
  socialLinks: SocialLinks
}

const props = defineProps<{
  settings: FreelancerSettingsData | null
  saving: boolean
}>()

defineEmits<{
  save: [form: FreelancerProfileForm]
}>()

function emptyForm(): FreelancerProfileForm {
  return { description: '', socialLinks: {} }
}

const form = ref<FreelancerProfileForm>(emptyForm())

watch(() => props.settings, (s) => {
  if (!s) return
  form.value = {
    description: s.description ?? '',
    socialLinks: { ...(s.socialLinks ?? {}) },
  }
}, { immediate: true })
</script>

<style scoped>
.input-field {
  @apply w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-red-500 focus:border-red-500 transition-all duration-300 bg-white;
}
.btn-save {
  @apply w-full px-6 py-3 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100;
}
.btn-teal { @apply bg-gradient-to-r from-teal-500 to-teal-600; }
</style>
