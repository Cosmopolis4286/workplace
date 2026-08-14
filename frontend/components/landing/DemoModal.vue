<template>
  <Teleport to="body">
    <Transition name="fade">
      <div
        v-if="show"
        class="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
        role="dialog"
        aria-modal="true"
        aria-labelledby="demo-modal-title"
        @click.self="$emit('close')"
      >
        <div
          ref="demoModalRef"
          class="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden"
          tabindex="-1"
        >
          <!-- Modal header -->
          <div class="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
            <div>
              <h3 id="demo-modal-title" class="font-bold text-gray-900">{{ t('landing.demoModal.title') }}</h3>
              <p class="text-xs text-gray-400 mt-0.5">{{ t('landing.demoModal.subtitle') }}</p>
            </div>
            <button
              ref="demoCloseRef"
              type="button"
              :aria-label="t('landing.demoModal.close')"
              class="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-all flex-shrink-0"
              @click="$emit('close')"
            >
              <XMarkIcon class="w-5 h-5" />
            </button>
          </div>

          <!-- Modal body (scrollable) -->
          <div class="p-6 space-y-5 overflow-y-auto">
            <!-- Preview image placeholder -->
            <div class="w-full aspect-video bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl border border-gray-200 flex flex-col items-center justify-center gap-3">
              <div class="w-14 h-14 rounded-2xl bg-red-50 border border-red-100 flex items-center justify-center">
                <PlayIcon class="w-7 h-7 text-workplace-red" />
              </div>
              <p class="text-sm font-semibold text-gray-700">{{ t('landing.demoModal.videoSoon') }}</p>
              <p class="text-xs text-gray-400 text-center max-w-xs">{{ t('landing.demoModal.meanwhile') }}</p>
            </div>

            <!-- Feature highlights -->
            <div class="grid grid-cols-2 gap-3">
              <div v-for="feat in demoHighlights" :key="feat.label" class="flex items-center gap-2.5 px-3 py-2.5 bg-gray-50 rounded-xl border border-gray-100">
                <div :class="['w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0', feat.bg]">
                  <component :is="feat.icon" class="w-3.5 h-3.5 text-white" />
                </div>
                <span class="text-xs font-semibold text-gray-700">{{ feat.label }}</span>
              </div>
            </div>
          </div>

          <!-- Modal footer -->
          <div class="flex flex-col sm:flex-row gap-2.5 px-6 py-4 border-t border-gray-100 flex-shrink-0">
            <NuxtLink
              to="/register"
              class="flex-1 inline-flex items-center justify-center gap-2 bg-workplace-red hover:bg-red-700 text-white font-bold px-6 py-3 rounded-xl transition-all duration-150 text-sm"
              @click="$emit('close')"
            >
              {{ t('landing.demoModal.createFreeAccount') }}
              <ArrowRightIcon class="w-4 h-4" />
            </NuxtLink>
            <button
              type="button"
              class="flex-1 inline-flex items-center justify-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold px-6 py-3 rounded-xl transition-all duration-150 text-sm"
              @click="$emit('close')"
            >
              {{ t('landing.demoModal.keepExploring') }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick, onUnmounted } from 'vue'
import {
  XMarkIcon, PlayIcon, ArrowRightIcon,
  ShoppingCartIcon, CubeIcon, ChartBarIcon, UsersIcon,
} from '@heroicons/vue/24/outline'

const props = defineProps<{
  show: boolean
}>()

const emit = defineEmits<{
  close: []
}>()

const { t } = useI18n()

const demoHighlights = computed(() => [
  { label: t('landing.demoModal.highlightOrders'), icon: ShoppingCartIcon, bg: 'bg-blue-500' },
  { label: t('landing.demoModal.highlightInventory'), icon: CubeIcon, bg: 'bg-violet-500' },
  { label: t('landing.demoModal.highlightAnalytics'), icon: ChartBarIcon, bg: 'bg-amber-500' },
  { label: t('landing.demoModal.highlightCrm'), icon: UsersIcon, bg: 'bg-pink-500' },
])

// ─── Focus trap ───────────────────────────────────────────────────────────────
const demoModalRef = ref<HTMLElement | null>(null)
const demoCloseRef = ref<HTMLElement | null>(null)

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

function trapFocus(e: KeyboardEvent) {
  if (!demoModalRef.value) return
  const focusable = Array.from(demoModalRef.value.querySelectorAll<HTMLElement>(FOCUSABLE))
  if (!focusable.length) return
  const first = focusable[0]
  const last = focusable[focusable.length - 1]
  if (e.shiftKey) {
    if (document.activeElement === first) { e.preventDefault(); last.focus() }
  } else {
    if (document.activeElement === last) { e.preventDefault(); first.focus() }
  }
}

function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') { emit('close'); return }
  if (e.key === 'Tab') trapFocus(e)
}

watch(() => props.show, async (visible) => {
  if (visible) {
    document.body.style.overflow = 'hidden'
    await nextTick()
    demoCloseRef.value?.focus()
    // Captura antes del listener global del padre (que también escucha Escape
    // para el menú móvil), así el demo intercepta primero mientras está abierto.
    window.addEventListener('keydown', handleKeydown, true)
  } else {
    document.body.style.overflow = ''
    window.removeEventListener('keydown', handleKeydown, true)
  }
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown, true)
  document.body.style.overflow = ''
})
</script>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
