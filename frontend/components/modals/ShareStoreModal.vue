<template>
  <Teleport to="body">
    <Transition
      enter-active-class="duration-300 ease-out"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="duration-200 ease-in"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div v-if="modelValue" class="fixed inset-0 z-[250] flex items-end sm:items-center justify-center p-0 sm:p-4" @click.self="$emit('update:modelValue', false)">
        <div class="absolute inset-0 bg-black/50 backdrop-blur-sm" @click="$emit('update:modelValue', false)" />

        <Transition
          enter-active-class="duration-300 ease-out"
          enter-from-class="opacity-0 translate-y-full sm:translate-y-4 sm:scale-95"
          enter-to-class="opacity-100 translate-y-0 sm:scale-100"
          leave-active-class="duration-200 ease-in"
          leave-from-class="opacity-100 translate-y-0 sm:scale-100"
          leave-to-class="opacity-0 translate-y-full sm:translate-y-4 sm:scale-95"
        >
          <div v-if="modelValue" class="relative w-full sm:max-w-sm bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden">
            <div class="flex justify-center pt-3 pb-1 sm:hidden">
              <div class="w-10 h-1 rounded-full bg-gray-200" />
            </div>

            <div class="flex items-center justify-between px-5 pt-4 pb-3 border-b border-gray-100">
              <h3 class="font-bold text-gray-900 text-lg">Compartir</h3>
              <button class="w-8 h-8 rounded-xl bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors" @click="$emit('update:modelValue', false)">
                <XMarkIcon class="h-4 w-4 text-gray-500" />
              </button>
            </div>

            <div class="p-6 flex flex-col items-center gap-4">
              <div class="h-48 w-48 rounded-2xl overflow-hidden bg-gray-50 flex items-center justify-center">
                <img v-if="qrDataUrl" :src="qrDataUrl" alt="Código QR" class="h-full w-full object-contain">
                <div v-else class="h-8 w-8 border-2 border-gray-300 border-t-transparent rounded-full animate-spin" />
              </div>

              <p class="text-xs text-gray-400 text-center break-all">{{ url }}</p>

              <div class="w-full flex gap-2">
                <button
                  class="flex-1 py-2.5 border-2 border-gray-200 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 transition-colors text-sm flex items-center justify-center gap-2"
                  @click="copyLink"
                >
                  <CheckIcon v-if="copied" class="h-4 w-4 text-green-500" />
                  <LinkIcon v-else class="h-4 w-4" />
                  {{ copied ? 'Copiado' : 'Copiar link' }}
                </button>
                <button
                  v-if="canNativeShare"
                  class="flex-1 py-2.5 bg-workplace-red text-white font-semibold rounded-xl hover:bg-red-700 transition-colors text-sm flex items-center justify-center gap-2"
                  @click="nativeShare"
                >
                  <ShareIcon class="h-4 w-4" />
                  Compartir
                </button>
              </div>
            </div>
          </div>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { XMarkIcon, LinkIcon, ShareIcon, CheckIcon } from '@heroicons/vue/24/outline'
import { useQrCode } from '~/composables/core/useQrCode'

const props = defineProps<{
  modelValue: boolean
  url: string
  title?: string
}>()

defineEmits<{
  'update:modelValue': [val: boolean]
}>()

const { generateQrDataUrl } = useQrCode()
const qrDataUrl = ref<string | null>(null)
const copied = ref(false)
const canNativeShare = typeof navigator !== 'undefined' && !!navigator.share

watch(() => props.modelValue, async (open) => {
  if (!open) return
  qrDataUrl.value = null
  qrDataUrl.value = await generateQrDataUrl(props.url, { width: 220 })
}, { immediate: true })

async function copyLink() {
  try {
    await navigator.clipboard.writeText(props.url)
    copied.value = true
    setTimeout(() => { copied.value = false }, 2000)
  } catch {
    // Clipboard API puede fallar sin permisos/HTTPS — el link ya está
    // visible en pantalla como fallback silencioso.
  }
}

async function nativeShare() {
  try {
    await navigator.share({ title: props.title, url: props.url })
  } catch {
    // AbortError si el usuario cancela el share sheet — no es un error real.
  }
}
</script>
