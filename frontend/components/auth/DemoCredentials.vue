<template>
  <!-- Floating toggle button -->
  <div v-if="isDevelopment && isAvailable" class="fixed bottom-4 right-4 z-50">
    <div class="relative group">
      <div
        v-show="!isOpen"
        class="absolute bottom-full right-0 mb-2 px-3 py-2 bg-gray-900 text-white text-sm rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap"
      >
        Demo Login <kbd class="ml-1 px-1.5 py-0.5 bg-white/20 rounded text-xs font-mono">Ctrl+D</kbd>
        <div class="absolute top-full right-4 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900" />
      </div>

      <button
        :title="isOpen ? 'Cerrar' : 'Demo credentials'"
        class="relative bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white shadow-lg hover:shadow-xl transition-all duration-300 rounded-full p-3 hover:scale-110"
        @click="toggleModal"
      >
        <SharedIcon
          :name="isOpen ? 'x-mark' : 'key'"
          class="w-5 h-5"
        />
        <div class="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full animate-pulse border-2 border-white" />
      </button>
    </div>
  </div>

  <!-- Modal -->
  <Teleport to="body">
    <Transition
      enter-active-class="duration-200 ease-out"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="duration-150 ease-in"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="isDevelopment && isOpen"
        class="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4"
        @click="closeModal"
      >
        <div class="absolute inset-0 bg-black/30 backdrop-blur-sm" />

        <Transition
          enter-active-class="duration-200 ease-out"
          enter-from-class="opacity-0 scale-95 translate-y-4"
          enter-to-class="opacity-100 scale-100 translate-y-0"
          leave-active-class="duration-150 ease-in"
          leave-from-class="opacity-100 scale-100 translate-y-0"
          leave-to-class="opacity-0 scale-95 translate-y-4"
        >
          <div
            v-if="isOpen"
            class="relative bg-white rounded-2xl shadow-2xl border border-gray-100 w-full max-w-sm"
            @click.stop
          >
            <!-- Header -->
            <div class="flex items-center justify-between p-5 border-b border-gray-100 bg-gradient-to-r from-amber-50 to-orange-50 rounded-t-2xl">
              <div class="flex items-center gap-3">
                <div class="p-2 bg-gradient-to-br from-amber-400 to-orange-500 rounded-xl shadow">
                  <SharedIcon name="key" class="w-4 h-4 text-white" />
                </div>
                <div>
                  <h3 class="font-bold text-gray-900 text-sm">Demo Account</h3>
                  <p class="text-xs text-gray-500">Solo disponible en desarrollo</p>
                </div>
              </div>
              <button
                class="p-1.5 hover:bg-white/70 rounded-lg transition-colors text-gray-500 hover:text-gray-700"
                @click="closeModal"
              >
                <SharedIcon name="x-mark" class="w-4 h-4" />
              </button>
            </div>

            <!-- Content -->
            <div class="p-5 space-y-4">
              <!-- Loading -->
              <div v-if="isLoading" class="flex items-center justify-center py-6">
                <div class="w-7 h-7 border-4 border-orange-200 border-t-orange-500 rounded-full animate-spin" />
              </div>

              <!-- Error -->
              <div v-else-if="error" class="text-center py-4">
                <SharedIcon name="exclamation-triangle" class="w-6 h-6 text-red-400 mx-auto mb-2" />
                <p class="text-sm text-red-600 mb-3">{{ error }}</p>
                <button
                  class="text-xs text-red-600 underline hover:no-underline"
                  @click="refresh"
                >
                  Reintentar
                </button>
              </div>

              <!-- Credential card -->
              <template v-else-if="credential">
                <div
                  class="group relative p-4 border border-orange-200/60 rounded-xl hover:bg-orange-50/50 hover:shadow-md transition-all duration-200 cursor-pointer"
                  @click="handleFill"
                >
                  <div class="flex items-center justify-between gap-3">
                    <div class="flex items-center gap-3 min-w-0">
                      <div class="w-10 h-10 bg-gradient-to-br from-orange-400 to-amber-500 rounded-xl flex items-center justify-center shadow flex-shrink-0">
                        <SharedIcon name="building-office" class="w-5 h-5 text-white" />
                      </div>
                      <div class="min-w-0">
                        <div class="font-semibold text-sm text-gray-900">{{ credential.restaurantName }}</div>
                        <div class="text-xs text-gray-500 truncate">{{ credential.email }}</div>
                        <Transition
                          enter-active-class="duration-200 ease-out"
                          enter-from-class="opacity-0 -translate-y-1"
                          enter-to-class="opacity-100 translate-y-0"
                        >
                          <div
                            v-if="showPassword"
                            class="mt-1 text-xs font-mono text-orange-700 bg-orange-50 border border-orange-200 rounded px-2 py-0.5 inline-flex items-center gap-1"
                          >
                            🔑 {{ credential.password }}
                          </div>
                        </Transition>
                      </div>
                    </div>

                    <div class="flex items-center gap-1.5 flex-shrink-0">
                      <button
                        :title="showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'"
                        class="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-white transition-all"
                        @click.stop="showPassword = !showPassword"
                      >
                        <SharedIcon :name="showPassword ? 'eye-slash' : 'eye'" class="w-4 h-4" />
                      </button>
                      <button
                        :disabled="isFilling"
                        :title="autoLogin ? 'Iniciar sesión' : 'Rellenar formulario'"
                        class="p-1.5 rounded-lg text-orange-500 hover:text-orange-700 hover:bg-orange-100 transition-all disabled:opacity-50"
                        @click.stop="handleFill"
                      >
                        <svg v-if="isFilling" class="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
                          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        <SharedIcon v-else :name="autoLogin ? 'bolt' : 'arrow-right-on-rectangle'" class="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>

                <!-- Keyboard shortcut hint -->
                <div class="flex items-center justify-between text-xs text-gray-400 pt-1">
                  <span>Click para rellenar el formulario</span>
                  <kbd class="px-1.5 py-0.5 bg-gray-100 border border-gray-200 rounded font-mono text-gray-500">Ctrl+D</kbd>
                </div>
              </template>
            </div>
          </div>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { useDemoCredentials } from '~/composables/auth/useDemoCredentials'

interface Props {
  autoLogin?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  autoLogin: false,
})

const emit = defineEmits<{
  'fillCredentials': [{ email: string; password: string }]
  'autoLogin': [{ email: string; password: string }]
}>()

const { credential, isLoading, error, isAvailable, refresh } = useDemoCredentials()

const isOpen = ref(false)
const showPassword = ref(false)
const isFilling = ref(false)

const isDevelopment = computed(() => process.env.NODE_ENV === 'development')

const toggleModal = () => { isOpen.value = !isOpen.value }
const closeModal = () => { isOpen.value = false }

const handleFill = async () => {
  if (!credential.value || isFilling.value) return

  isFilling.value = true
  await new Promise(resolve => setTimeout(resolve, 200))

  const creds = { email: credential.value.email, password: credential.value.password }

  if (props.autoLogin) {
    emit('autoLogin', creds)
  } else {
    emit('fillCredentials', creds)
    closeModal()
  }

  isFilling.value = false
}

const handleKeydown = (e: KeyboardEvent) => {
  if (!isDevelopment.value) return
  if (e.key === 'Escape' && isOpen.value) { closeModal(); return }
  if (e.ctrlKey && e.key.toLowerCase() === 'd') {
    e.preventDefault()
    toggleModal()
  }
}

onMounted(() => { document.addEventListener('keydown', handleKeydown) })
onUnmounted(() => { document.removeEventListener('keydown', handleKeydown) })
</script>
