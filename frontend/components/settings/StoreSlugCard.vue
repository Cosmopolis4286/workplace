<template>
  <div class="card-premium p-6">
    <div class="flex items-center mb-6">
      <div class="p-3 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl shadow-lg mr-3">
        <LinkIcon class="h-6 w-6 text-white" />
      </div>
      <h3 class="text-xl font-bold text-gray-900">URL de tu Tienda</h3>
    </div>

    <div class="space-y-5">
      <div>
        <label class="block text-sm font-semibold text-gray-700 mb-2">
          Link público
          <span class="ml-1 text-xs font-normal text-gray-400">(compártelo por WhatsApp, Instagram, etc.)</span>
        </label>

        <!-- Locked: cooldown active -->
        <div v-if="slugIsLocked" class="relative">
          <span class="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm select-none">/loja/</span>
          <input
            :value="form.slug"
            type="text"
            disabled
            class="w-full pl-16 pr-10 py-3 border-2 border-gray-200 rounded-xl bg-gray-50 text-gray-500 cursor-not-allowed"
          >
        </div>
        <p v-if="slugIsLocked" class="mt-1.5 text-xs text-amber-600">
          Podrás cambiar la URL de tu tienda en {{ slugDaysLeft }} día{{ slugDaysLeft !== 1 ? 's' : '' }} (cada 30 días)
        </p>

        <!-- Unlocked: editable -->
        <div v-else class="relative">
          <span class="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm select-none">/loja/</span>
          <input
            v-model="form.slug"
            type="text"
            maxlength="30"
            class="w-full pl-16 pr-10 py-3 border-2 rounded-xl focus:outline-none focus:ring-4 transition-all duration-300"
            :class="{
              'border-gray-200 focus:ring-workplace-red/20 focus:border-workplace-red': slugStatus === 'idle' || slugStatus === 'checking',
              'border-green-400 focus:ring-green-100 focus:border-green-500': slugStatus === 'available',
              'border-red-400 focus:ring-red-100 focus:border-red-500': slugStatus === 'taken' || slugStatus === 'invalid' || slugStatus === 'cooldown',
            }"
            placeholder="mi-negocio"
            @input="onSlugInput(($event.target as HTMLInputElement).value)"
          >
          <span class="absolute right-3 top-1/2 -translate-y-1/2">
            <svg v-if="slugStatus === 'checking'" class="animate-spin h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
            </svg>
            <svg v-else-if="slugStatus === 'available'" class="h-4 w-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
            </svg>
            <svg v-else-if="slugStatus === 'taken' || slugStatus === 'invalid' || slugStatus === 'cooldown'" class="h-4 w-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </span>
        </div>
        <p v-if="!slugIsLocked" class="mt-1.5 text-xs" :class="{
          'text-gray-400': slugStatus === 'idle' || slugStatus === 'checking',
          'text-green-600': slugStatus === 'available',
          'text-red-500': slugStatus === 'taken' || slugStatus === 'invalid' || slugStatus === 'cooldown',
        }">
          <span v-if="slugStatus === 'idle'">Solo letras minúsculas, números, puntos, guiones y guiones bajos</span>
          <span v-else-if="slugStatus === 'checking'">Verificando disponibilidad...</span>
          <span v-else-if="slugStatus === 'available'">¡Disponible!</span>
          <span v-else-if="slugStatus === 'taken'">Esta URL ya está en uso</span>
          <span v-else-if="slugStatus === 'invalid'">Solo se permiten letras minúsculas, números, puntos, guiones y guiones bajos</span>
          <span v-else-if="slugStatus === 'cooldown'">Solo puedes cambiar la URL cada 30 días. Faltan {{ slugCooldownDaysLeft }} día{{ slugCooldownDaysLeft !== 1 ? 's' : '' }}</span>
        </p>
      </div>

      <button
        :disabled="saving || !dirty || slugStatus === 'taken' || slugStatus === 'invalid' || slugStatus === 'cooldown'"
        class="btn-save btn-purple"
        @click="onSave"
      >
        <span v-if="saving" class="flex items-center justify-center gap-2">
          <svg class="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
          </svg>
          Guardando...
        </span>
        <span v-else>Guardar URL</span>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { LinkIcon } from '@heroicons/vue/24/outline'
import type { CommerceInfo } from '~/composables/commerce/useSettings'

const props = defineProps<{
  commerce: CommerceInfo | null
  saving: boolean
  checkSlugAvailability: (slug: string) => Promise<{ available: boolean; canChange: boolean; daysLeft: number; nextChangeAt: string | null } | null>
}>()

const emit = defineEmits<{
  save: [slug: string]
}>()

const form = ref({ slug: '' })

watch(() => props.commerce, (commerce) => {
  if (!commerce) return
  form.value.slug = commerce.slug ?? ''
}, { immediate: true })

const dirty = computed(() => form.value.slug !== (props.commerce?.slug ?? ''))

type SlugStatus = 'idle' | 'checking' | 'available' | 'taken' | 'invalid' | 'cooldown'
const slugStatus = ref<SlugStatus>('idle')
const slugCooldownDaysLeft = ref(0)
let slugDebounce: ReturnType<typeof setTimeout> | null = null

const slugIsLocked = computed(() => {
  const c = props.commerce
  if (!c?.slugUpdatedAt) return false
  const daysSince = (Date.now() - new Date(c.slugUpdatedAt).getTime()) / (1000 * 60 * 60 * 24)
  return daysSince < 30
})

const slugDaysLeft = computed(() => {
  const c = props.commerce
  if (!c?.slugUpdatedAt) return 0
  const daysSince = (Date.now() - new Date(c.slugUpdatedAt).getTime()) / (1000 * 60 * 60 * 24)
  return Math.max(0, Math.ceil(30 - daysSince))
})

function onSlugInput(val: string) {
  form.value.slug = val
  slugStatus.value = 'idle'
  if (slugDebounce) clearTimeout(slugDebounce)

  if (!val) return

  if (!/^[a-z0-9_.-]{3,30}$/.test(val)) {
    slugStatus.value = 'invalid'
    return
  }

  if (val === (props.commerce?.slug ?? '')) {
    slugStatus.value = 'idle'
    return
  }

  slugStatus.value = 'checking'
  slugDebounce = setTimeout(async () => {
    const res = await props.checkSlugAvailability(val)
    if (!res) {
      slugStatus.value = 'idle'
      return
    }
    if (!res.canChange) {
      slugStatus.value = 'cooldown'
      slugCooldownDaysLeft.value = res.daysLeft
    } else {
      slugStatus.value = res.available ? 'available' : 'taken'
    }
  }, 400)
}

function onSave() {
  if (!form.value.slug || slugStatus.value === 'taken' || slugStatus.value === 'invalid' || slugStatus.value === 'cooldown') return
  emit('save', form.value.slug)
}
</script>

<style scoped>
.btn-save {
  @apply w-full px-6 py-3 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100;
}
.btn-purple { @apply bg-gradient-to-r from-purple-500 to-purple-600; }
</style>
