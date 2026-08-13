<template>
  <div class="fixed bottom-4 inset-x-4 z-[600] flex flex-col gap-2 sm:left-auto sm:right-4 sm:w-96">
    <Transition
      enter-active-class="transition ease-out duration-200"
      enter-from-class="opacity-0 translate-y-2"
      enter-to-class="opacity-100 translate-y-0"
      leave-active-class="transition ease-in duration-150"
      leave-from-class="opacity-100 translate-y-0"
      leave-to-class="opacity-0 translate-y-2"
    >
      <div
        v-if="showInstallPrompt"
        class="rounded-2xl bg-white shadow-2xl border border-gray-200 p-4 flex items-start gap-3"
      >
        <img src="/icon-192.png" alt="WorkPlace" class="h-10 w-10 rounded-lg flex-shrink-0" />
        <div class="flex-1 min-w-0">
          <p class="text-sm font-semibold text-gray-900">Instalar WorkPlace Manager</p>
          <p class="text-xs text-gray-500 mt-0.5">Accede más rápido instalando la app en tu dispositivo.</p>
          <div class="flex gap-2 mt-3">
            <button
              type="button"
              class="px-3 py-1.5 text-xs font-medium rounded-lg bg-workplace-red text-white hover:opacity-90"
              @click="install"
            >
              Instalar
            </button>
            <button
              type="button"
              class="px-3 py-1.5 text-xs font-medium rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200"
              @click="cancelInstall"
            >
              Ahora no
            </button>
          </div>
        </div>
      </div>
    </Transition>

    <Transition
      enter-active-class="transition ease-out duration-200"
      enter-from-class="opacity-0 translate-y-2"
      enter-to-class="opacity-100 translate-y-0"
      leave-active-class="transition ease-in duration-150"
      leave-from-class="opacity-100 translate-y-0"
      leave-to-class="opacity-0 translate-y-2"
    >
      <div
        v-if="needRefresh"
        class="rounded-2xl bg-white shadow-2xl border border-gray-200 p-4 flex items-start gap-3"
      >
        <div class="flex-1 min-w-0">
          <p class="text-sm font-semibold text-gray-900">Nueva versión disponible</p>
          <p class="text-xs text-gray-500 mt-0.5">Actualiza para obtener las últimas mejoras.</p>
          <div class="flex gap-2 mt-3">
            <button
              type="button"
              class="px-3 py-1.5 text-xs font-medium rounded-lg bg-workplace-red text-white hover:opacity-90"
              @click="updateServiceWorker(true)"
            >
              Actualizar
            </button>
            <button
              type="button"
              class="px-3 py-1.5 text-xs font-medium rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200"
              @click="cancelPrompt"
            >
              Más tarde
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
const pwa = usePWA()

const showInstallPrompt = computed(() => pwa?.showInstallPrompt.value ?? false)
const needRefresh = computed(() => pwa?.needRefresh.value ?? false)

function install() {
  pwa?.install()
}

function cancelInstall() {
  pwa?.cancelInstall()
}

function updateServiceWorker(reload: boolean) {
  pwa?.updateServiceWorker(reload)
}

function cancelPrompt() {
  pwa?.cancelPrompt()
}
</script>
