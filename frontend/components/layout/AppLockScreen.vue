<template>
  <Teleport to="body">
    <div
      v-if="isLocked"
      class="fixed inset-0 z-[1000] flex flex-col items-center justify-center bg-gradient-to-br from-workplace-red to-red-700 px-6"
      style="padding-top: env(safe-area-inset-top); padding-bottom: env(safe-area-inset-bottom)"
    >
      <div class="flex flex-col items-center text-center max-w-xs">
        <img src="/icon-192.png" alt="WorkPlace Manager" class="h-20 w-20 rounded-2xl shadow-lg mb-6" />
        <h1 class="text-white text-lg font-semibold mb-1">WorkPlace Manager</h1>
        <p class="text-white/80 text-sm mb-8">La app está protegida. Desbloquéala para continuar.</p>

        <button
          type="button"
          class="flex items-center gap-2 rounded-xl bg-white text-workplace-red font-medium px-6 py-3 shadow-lg hover:opacity-90 active:scale-95 transition"
          @click="tryUnlock"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 1a4 4 0 0 0-4 4v3H7a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-9a2 2 0 0 0-2-2h-1V5a4 4 0 0 0-4-4Zm-2 4a2 2 0 0 1 4 0v3H10Z" />
          </svg>
          Desbloquear
        </button>

        <p v-if="errorMsg" class="text-white/90 text-xs mt-4">{{ errorMsg }}</p>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
const { isLocked, unlock } = useAppLock()
const { authenticate } = useBiometric()

const errorMsg = ref('')

async function tryUnlock() {
  errorMsg.value = ''
  const success = await authenticate('Desbloquea WorkPlace Manager para continuar')
  if (success) {
    unlock()
  } else {
    errorMsg.value = 'No se pudo verificar tu identidad. Intenta de nuevo.'
  }
}

// Intenta desbloquear automáticamente al mostrarse el overlay
watch(isLocked, (locked) => {
  if (locked) {
    tryUnlock()
  }
}, { immediate: true })
</script>
