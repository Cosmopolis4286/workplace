<template>
  <!-- Barra fina arriba: siempre que se cambia de página. -->
  <NuxtLoadingIndicator color="#ea1d2c" :height="3" :throttle="150" />

  <!-- Pantalla de carga: solo si el cambio de página tarda (evita parpadeos
       en navegaciones rápidas). Cubre el hueco en que la URL ya cambió pero
       la página nueva todavía no se muestra (p. ej. justo después del login). -->
  <Transition
    enter-active-class="transition-opacity duration-200 ease-out"
    enter-from-class="opacity-0"
    leave-active-class="transition-opacity duration-150 ease-in"
    leave-to-class="opacity-0"
  >
    <div
      v-if="visible"
      class="page-loader fixed inset-0 z-[400] flex items-center justify-center bg-white/70 backdrop-blur-sm dark:bg-gray-950/70"
      role="status"
      aria-live="polite"
    >
      <div class="flex flex-col items-center gap-4">
        <div class="relative h-20 w-20">
          <span class="page-loader__ring absolute inset-0 rounded-full" />
          <span class="page-loader__pulse absolute inset-2 rounded-full bg-workplace-red/10" />
          <img src="/icon-192.svg" alt="" class="absolute inset-4 h-12 w-12 rounded-xl" />
        </div>
        <p class="text-sm font-medium text-gray-600 dark:text-gray-300">Cargando…</p>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { onBeforeUnmount, ref } from 'vue'

// Retraso antes de mostrar la pantalla: la mayoría de navegaciones terminan
// antes y no deben parpadear.
const SHOW_AFTER_MS = 350
// Si algo nunca termina (error de red sin respuesta), no dejar la pantalla
// bloqueada para siempre.
const MAX_VISIBLE_MS = 20_000

const visible = ref(false)
let showTimer: ReturnType<typeof setTimeout> | null = null
let maxTimer: ReturnType<typeof setTimeout> | null = null

function clearTimers() {
  if (showTimer) clearTimeout(showTimer)
  if (maxTimer) clearTimeout(maxTimer)
  showTimer = maxTimer = null
}

function start() {
  clearTimers()
  showTimer = setTimeout(() => {
    visible.value = true
    maxTimer = setTimeout(stop, MAX_VISIBLE_MS)
  }, SHOW_AFTER_MS)
}

function stop() {
  clearTimers()
  visible.value = false
}

const nuxtApp = useNuxtApp()
const unhooks = [
  nuxtApp.hook('page:loading:start', start),
  nuxtApp.hook('page:loading:end', stop),
  nuxtApp.hook('vue:error', stop),
]
onBeforeUnmount(() => {
  clearTimers()
  unhooks.forEach((unhook) => unhook())
})
</script>

<style scoped>
.page-loader__ring {
  border: 3px solid rgba(234, 29, 44, 0.15);
  border-top-color: #ea1d2c;
  animation: page-loader-spin 0.9s linear infinite;
}
.page-loader__pulse {
  animation: page-loader-pulse 1.6s ease-in-out infinite;
}
@keyframes page-loader-spin {
  to { transform: rotate(360deg); }
}
@keyframes page-loader-pulse {
  0%, 100% { transform: scale(0.92); opacity: 0.6; }
  50% { transform: scale(1); opacity: 1; }
}
@media (prefers-reduced-motion: reduce) {
  .page-loader__ring,
  .page-loader__pulse {
    animation-duration: 3s;
  }
}
</style>
