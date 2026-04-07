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
        <SharedIcon :name="isOpen ? 'x-mark' : 'key'" class="w-5 h-5" />
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
            class="relative bg-white rounded-2xl shadow-2xl border border-gray-100 w-full max-w-md"
            @click.stop
          >
            <!-- Header -->
            <div class="flex items-center justify-between p-5 border-b border-gray-100 bg-gradient-to-r from-amber-50 to-orange-50 rounded-t-2xl">
              <div class="flex items-center gap-3">
                <div class="p-2 bg-gradient-to-br from-amber-400 to-orange-500 rounded-xl shadow">
                  <SharedIcon name="key" class="w-4 h-4 text-white" />
                </div>
                <div>
                  <h3 class="font-bold text-gray-900 text-sm">Cuentas Demo</h3>
                  <p class="text-xs text-gray-500">{{ credentials.length }} roles disponibles · Solo en desarrollo</p>
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
            <div class="p-4 space-y-2 max-h-[70vh] overflow-y-auto">
              <!-- Loading -->
              <div v-if="isLoading" class="flex items-center justify-center py-8">
                <div class="w-7 h-7 border-4 border-orange-200 border-t-orange-500 rounded-full animate-spin" />
              </div>

              <!-- Error -->
              <div v-else-if="error" class="text-center py-4">
                <SharedIcon name="exclamation-triangle" class="w-6 h-6 text-red-400 mx-auto mb-2" />
                <p class="text-sm text-red-600 mb-3">{{ error }}</p>
                <button class="text-xs text-red-600 underline hover:no-underline" @click="refresh">
                  Reintentar
                </button>
              </div>

              <!-- Credentials list -->
              <template v-else-if="credentials.length">
                <div
                  v-for="cred in credentials"
                  :key="cred.role"
                  class="group relative p-3.5 border border-gray-200/70 rounded-xl hover:shadow-md transition-all duration-200 cursor-pointer hover:border-gray-300"
                  @click="handleFill(cred)"
                >
                  <div class="flex items-center justify-between gap-3">
                    <!-- Left: icon + info -->
                    <div class="flex items-center gap-3 min-w-0">
                      <div
                        class="w-9 h-9 bg-gradient-to-br rounded-xl flex items-center justify-center shadow flex-shrink-0"
                        :class="ROLE_COLORS[cred.role]"
                      >
                        <SharedIcon name="user" class="w-4 h-4 text-white" />
                      </div>
                      <div class="min-w-0">
                        <div class="flex items-center gap-2 flex-wrap">
                          <span class="font-semibold text-sm text-gray-900">{{ cred.label }}</span>
                          <span
                            class="text-[10px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wide"
                            :class="ROLE_BADGE[cred.role]"
                          >
                            {{ cred.role }}
                          </span>
                        </div>
                        <div class="text-xs text-gray-500 truncate">{{ cred.email }}</div>
                        <div class="text-xs text-gray-400 truncate">{{ cred.description }}</div>
                        <Transition
                          enter-active-class="duration-200 ease-out"
                          enter-from-class="opacity-0 -translate-y-1"
                          enter-to-class="opacity-100 translate-y-0"
                        >
                          <div
                            v-if="showPasswordFor === cred.role"
                            class="mt-1 text-xs font-mono text-orange-700 bg-orange-50 border border-orange-200 rounded px-2 py-0.5 inline-flex items-center gap-1"
                          >
                            🔑 {{ cred.password }}
                          </div>
                        </Transition>
                      </div>
                    </div>

                    <!-- Right: actions -->
                    <div class="flex items-center gap-1 flex-shrink-0">
                      <button
                        :title="showPasswordFor === cred.role ? 'Ocultar' : 'Mostrar contraseña'"
                        class="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-all"
                        @click.stop="togglePassword(cred.role)"
                      >
                        <SharedIcon :name="showPasswordFor === cred.role ? 'eye-slash' : 'eye'" class="w-4 h-4" />
                      </button>
                      <button
                        :disabled="fillingRole === cred.role"
                        :title="autoLogin ? 'Iniciar sesión' : 'Rellenar formulario'"
                        class="p-1.5 rounded-lg text-orange-500 hover:text-orange-700 hover:bg-orange-100 transition-all disabled:opacity-50"
                        @click.stop="handleFill(cred)"
                      >
                        <svg v-if="fillingRole === cred.role" class="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
                          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        <SharedIcon v-else :name="autoLogin ? 'bolt' : 'arrow-right-on-rectangle'" class="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>

                <!-- Footer hint -->
                <div class="flex items-center justify-between text-xs text-gray-400 pt-1 px-1">
                  <span>Click en una cuenta para rellenar el formulario</span>
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
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useDemoCredentials, type DemoCredential } from '~/composables/auth/useDemoCredentials'

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

const { credentials, isLoading, error, isAvailable, refresh } = useDemoCredentials()

const config = useRuntimeConfig()
const isOpen = ref(false)
const isDevelopment = computed(() =>
  config.public.environment === 'development' || config.public.useDemoCredentials === true
)
const showPasswordFor = ref<string | null>(null)
const fillingRole = ref<string | null>(null)

const toggleModal = () => { isOpen.value = !isOpen.value }
const closeModal = () => { isOpen.value = false }

const ROLE_COLORS: Record<string, string> = {
  SUPERADMIN: 'from-purple-500 to-purple-700',
  ADMIN: 'from-blue-500 to-blue-700',
  COMMERCE: 'from-orange-400 to-amber-500',
  FREELANCER: 'from-teal-500 to-cyan-600',
  NORMAL: 'from-gray-400 to-gray-600',
}

const ROLE_BADGE: Record<string, string> = {
  SUPERADMIN: 'bg-purple-100 text-purple-700',
  ADMIN: 'bg-blue-100 text-blue-700',
  COMMERCE: 'bg-orange-100 text-orange-700',
  FREELANCER: 'bg-teal-100 text-teal-700',
  NORMAL: 'bg-gray-100 text-gray-600',
}

const togglePassword = (role: string) => {
  showPasswordFor.value = showPasswordFor.value === role ? null : role
}

const handleFill = async (cred: DemoCredential) => {
  if (fillingRole.value) return

  fillingRole.value = cred.role
  await new Promise(resolve => setTimeout(resolve, 200))

  const creds = { email: cred.email, password: cred.password }

  if (props.autoLogin) {
    emit('autoLogin', creds)
  } else {
    emit('fillCredentials', creds)
    closeModal()
  }

  fillingRole.value = null
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
