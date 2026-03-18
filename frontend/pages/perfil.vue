<template>
  <div>
    <PageHeader
      title="Mi Perfil"
      description="Gestiona tu información personal y preferencias"
      :icon="UserCircleIcon"
    />

    <!-- Loading skeleton -->
    <div v-if="loadingProfile" class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div class="card-premium p-6 animate-pulse">
        <div class="flex flex-col items-center space-y-4">
          <div class="h-32 w-32 bg-gray-200 rounded-full" />
          <div class="h-6 w-40 bg-gray-200 rounded" />
          <div class="h-4 w-32 bg-gray-200 rounded" />
        </div>
      </div>
      <div class="lg:col-span-2 space-y-6">
        <div class="card-premium p-6 animate-pulse space-y-4">
          <div class="h-6 w-48 bg-gray-200 rounded" />
          <div class="grid grid-cols-2 gap-4">
            <div v-for="i in 4" :key="i" class="h-12 bg-gray-200 rounded-xl" />
          </div>
        </div>
      </div>
    </div>

    <div v-else class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <!-- Sidebar: avatar + meta -->
      <div class="lg:col-span-1">
        <div class="card-premium p-6">
          <div class="text-center">
            <div class="relative inline-block mb-4">
              <!-- Avatar image or initials -->
              <div class="h-32 w-32 rounded-full shadow-xl ring-4 ring-white overflow-hidden mx-auto">
                <img
                  v-if="avatarUrl"
                  :src="avatarUrl"
                  alt="Foto de perfil"
                  class="h-full w-full object-cover"
                >
                <div
                  v-else
                  class="h-full w-full bg-gradient-to-br from-workplace-red to-red-700 flex items-center justify-center"
                >
                  <span class="text-4xl font-bold text-white select-none">{{ userInitials }}</span>
                </div>
              </div>

              <!-- Upload button overlay -->
              <button
                type="button"
                :disabled="uploadingAvatar"
                @click="triggerAvatarInput"
                class="absolute bottom-0 right-0 h-9 w-9 rounded-full bg-white border-2 border-gray-200 shadow-md flex items-center justify-center hover:bg-gray-50 transition-colors disabled:opacity-60"
                title="Cambiar foto"
              >
                <span v-if="uploadingAvatar" class="h-4 w-4 border-2 border-workplace-red border-t-transparent rounded-full animate-spin" />
                <CameraIcon v-else class="h-4 w-4 text-gray-600" />
              </button>

              <!-- Hidden file input -->
              <input
                ref="avatarFileInput"
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                class="hidden"
                @change="onAvatarFileSelected"
              >
            </div>
            <h2 class="text-2xl font-bold text-gray-900 mb-1">{{ fullName }}</h2>
            <p class="text-gray-500 mb-2 text-sm">{{ auth.user.value?.email }}</p>
            <span class="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold" :class="roleStyle.badge">
              {{ roleStyle.label }}
            </span>
            <div v-if="auth.user.value?.username && (isCommerce || auth.user.value?.role === 'FREELANCER')" class="mt-3">
              <NuxtLink
                :to="`/p/${auth.user.value.username}`"
                class="inline-flex items-center gap-1.5 text-sm text-workplace-red hover:underline font-medium"
              >
                <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/>
                </svg>
                Ver perfil público
              </NuxtLink>
            </div>
            <p v-else-if="isCommerce || auth.user.value?.role === 'FREELANCER'" class="mt-2 text-xs text-gray-400">
              Define un <span class="font-medium">@username</span> para activar tu perfil público
            </p>
          </div>

          <div class="mt-6 pt-6 border-t border-gray-200 space-y-3">
            <div class="flex items-center justify-between text-sm">
              <span class="text-gray-500">Estado</span>
              <span class="inline-flex items-center gap-1.5 font-semibold text-green-700">
                <span class="h-2 w-2 bg-green-500 rounded-full" />
                Activo
              </span>
            </div>
            <div v-if="isCommerce" class="flex items-center justify-between text-sm">
              <span class="text-gray-500">Restaurante</span>
              <span class="font-semibold text-gray-900 truncate max-w-[120px]" :title="auth.restaurant.value?.name">
                {{ auth.restaurant.value?.name ?? '—' }}
              </span>
            </div>
            <div v-if="auth.user.value?.phone" class="flex items-center justify-between text-sm">
              <span class="text-gray-500">Teléfono</span>
              <span class="font-semibold text-gray-900">{{ auth.user.value.phone }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Main content -->
      <div class="lg:col-span-2 space-y-6">

        <!-- Success / Error banners -->
        <transition name="fade">
          <div v-if="successMsg" class="flex items-center gap-3 px-4 py-3 bg-green-50 border border-green-200 rounded-xl text-green-800 text-sm font-medium">
            <CheckCircleIcon class="h-5 w-5 flex-shrink-0" />
            {{ successMsg }}
          </div>
        </transition>
        <transition name="fade">
          <div v-if="errorMsg" class="flex items-center gap-3 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-red-800 text-sm font-medium">
            <ExclamationCircleIcon class="h-5 w-5 flex-shrink-0" />
            {{ errorMsg }}
          </div>
        </transition>

        <!-- Personal Information -->
        <div class="card-premium p-6">
          <div class="flex items-center mb-6">
            <div class="p-3 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg mr-3">
              <UserCircleIcon class="h-6 w-6 text-white" />
            </div>
            <h3 class="text-xl font-bold text-gray-900">Información Personal</h3>
          </div>

          <form @submit.prevent="saveProfile" class="space-y-6">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label class="block text-sm font-semibold text-gray-700 mb-2">Nombre</label>
                <input
                  v-model="profileForm.firstName"
                  type="text"
                  required
                  minlength="2"
                  maxlength="50"
                  class="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-workplace-red/20 focus:border-workplace-red transition-all duration-300"
                  placeholder="Tu nombre"
                >
              </div>

              <div>
                <label class="block text-sm font-semibold text-gray-700 mb-2">Apellido</label>
                <input
                  v-model="profileForm.lastName"
                  type="text"
                  required
                  minlength="2"
                  maxlength="50"
                  class="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-workplace-red/20 focus:border-workplace-red transition-all duration-300"
                  placeholder="Tu apellido"
                >
              </div>

              <div>
                <label class="block text-sm font-semibold text-gray-700 mb-2">Correo Electrónico</label>
                <input
                  v-model="profileForm.email"
                  type="email"
                  required
                  class="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-workplace-red/20 focus:border-workplace-red transition-all duration-300"
                  placeholder="tu@email.com"
                >
              </div>

              <div>
                <label class="block text-sm font-semibold text-gray-700 mb-2">Teléfono</label>
                <input
                  v-model="profileForm.phone"
                  type="tel"
                  maxlength="20"
                  class="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-workplace-red/20 focus:border-workplace-red transition-all duration-300"
                  placeholder="+52 123 456 7890"
                >
              </div>
            </div>

            <!-- Username — solo COMMERCE y FREELANCER -->
            <div v-if="isCommerce || auth.user.value?.role === 'FREELANCER'">
              <label class="block text-sm font-semibold text-gray-700 mb-2">
                Nombre de usuario
                <span class="ml-1 text-xs font-normal text-gray-400">(visible públicamente)</span>
              </label>

              <!-- Locked: cooldown active -->
              <div v-if="usernameIsLocked" class="relative">
                <span class="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-medium select-none">@</span>
                <input
                  :value="profileForm.username"
                  type="text"
                  disabled
                  class="w-full pl-8 pr-10 py-3 border-2 border-gray-200 rounded-xl bg-gray-50 text-gray-500 cursor-not-allowed"
                >
                <span class="absolute right-3 top-1/2 -translate-y-1/2">
                  <svg class="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
                  </svg>
                </span>
              </div>
              <p v-if="usernameIsLocked" class="mt-1.5 text-xs text-amber-600">
                Podrás cambiar tu nombre de usuario en {{ usernameDaysLeft }} día{{ usernameDaysLeft !== 1 ? 's' : '' }} (cada 30 días)
              </p>

              <!-- Unlocked: editable -->
              <div v-else class="relative">
                <span class="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-medium select-none">@</span>
                <input
                  v-model="profileForm.username"
                  type="text"
                  maxlength="30"
                  class="w-full pl-8 pr-10 py-3 border-2 rounded-xl focus:outline-none focus:ring-4 transition-all duration-300"
                  :class="{
                    'border-gray-200 focus:ring-workplace-red/20 focus:border-workplace-red': usernameStatus === 'idle' || usernameStatus === 'checking',
                    'border-green-400 focus:ring-green-100 focus:border-green-500': usernameStatus === 'available',
                    'border-red-400 focus:ring-red-100 focus:border-red-500': usernameStatus === 'taken' || usernameStatus === 'invalid' || usernameStatus === 'cooldown',
                  }"
                  placeholder="mi.usuario"
                  autocomplete="username"
                  @input="onUsernameInput(($event.target as HTMLInputElement).value)"
                >
                <!-- Status icon -->
                <span class="absolute right-3 top-1/2 -translate-y-1/2">
                  <svg v-if="usernameStatus === 'checking'" class="animate-spin h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                  </svg>
                  <svg v-else-if="usernameStatus === 'available'" class="h-4 w-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                  </svg>
                  <svg v-else-if="usernameStatus === 'taken' || usernameStatus === 'invalid' || usernameStatus === 'cooldown'" class="h-4 w-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </span>
              </div>
              <!-- Hint / error message (only when unlocked) -->
              <p v-if="!usernameIsLocked" class="mt-1.5 text-xs" :class="{
                'text-gray-400': usernameStatus === 'idle' || usernameStatus === 'checking',
                'text-green-600': usernameStatus === 'available',
                'text-red-500': usernameStatus === 'taken' || usernameStatus === 'invalid' || usernameStatus === 'cooldown',
              }">
                <span v-if="usernameStatus === 'idle'">Solo letras minúsculas, números, puntos, guiones y guiones bajos</span>
                <span v-else-if="usernameStatus === 'checking'">Verificando disponibilidad...</span>
                <span v-else-if="usernameStatus === 'available'">¡Disponible!</span>
                <span v-else-if="usernameStatus === 'taken'">Este nombre de usuario ya está en uso</span>
                <span v-else-if="usernameStatus === 'invalid'">Solo se permiten letras minúsculas, números, puntos, guiones y guiones bajos</span>
                <span v-else-if="usernameStatus === 'cooldown'">Solo puedes cambiar el nombre de usuario cada 30 días. Faltan {{ usernameCooldownDaysLeft }} día{{ usernameCooldownDaysLeft !== 1 ? 's' : '' }}</span>
              </p>
            </div>

            <div class="flex justify-end space-x-3">
              <button
                type="button"
                :disabled="savingProfile"
                @click="resetProfileForm"
                class="px-5 py-2.5 border-2 border-gray-300 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 transition-all duration-200 disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="submit"
                :disabled="savingProfile || !profileDirty || usernameStatus === 'taken' || usernameStatus === 'invalid' || usernameStatus === 'checking' || usernameStatus === 'cooldown'"
                class="px-5 py-2.5 bg-gradient-to-r from-workplace-red to-red-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <span v-if="savingProfile" class="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                {{ savingProfile ? 'Guardando...' : 'Guardar Cambios' }}
              </button>
            </div>
          </form>
        </div>

        <!-- Change Password -->
        <div class="card-premium p-6">
          <div class="flex items-center mb-6">
            <div class="p-3 bg-gradient-to-br from-red-500 to-red-600 rounded-xl shadow-lg mr-3">
              <LockClosedIcon class="h-6 w-6 text-white" />
            </div>
            <h3 class="text-xl font-bold text-gray-900">Cambiar Contraseña</h3>
          </div>

          <form @submit.prevent="changePassword" class="space-y-5">
            <div>
              <label class="block text-sm font-semibold text-gray-700 mb-2">Contraseña Actual</label>
              <div class="relative">
                <input
                  v-model="passwordForm.current"
                  :type="showPasswords.current ? 'text' : 'password'"
                  required
                  class="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-workplace-red/20 focus:border-workplace-red transition-all duration-300 pr-12"
                  placeholder="••••••••"
                  autocomplete="current-password"
                >
                <button type="button" @click="showPasswords.current = !showPasswords.current" class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  <EyeIcon v-if="!showPasswords.current" class="h-5 w-5" />
                  <EyeSlashIcon v-else class="h-5 w-5" />
                </button>
              </div>
            </div>

            <div>
              <label class="block text-sm font-semibold text-gray-700 mb-2">Nueva Contraseña</label>
              <div class="relative">
                <input
                  v-model="passwordForm.new"
                  :type="showPasswords.new ? 'text' : 'password'"
                  required
                  minlength="8"
                  class="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-workplace-red/20 focus:border-workplace-red transition-all duration-300 pr-12"
                  placeholder="••••••••"
                  autocomplete="new-password"
                >
                <button type="button" @click="showPasswords.new = !showPasswords.new" class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  <EyeIcon v-if="!showPasswords.new" class="h-5 w-5" />
                  <EyeSlashIcon v-else class="h-5 w-5" />
                </button>
              </div>
              <!-- Password strength indicator -->
              <div v-if="passwordForm.new" class="mt-2 space-y-1">
                <div class="flex gap-1">
                  <div v-for="i in 4" :key="i" class="h-1 flex-1 rounded-full transition-colors duration-300"
                    :class="passwordStrength >= i ? passwordStrengthColor : 'bg-gray-200'" />
                </div>
                <p class="text-xs" :class="passwordStrengthTextColor">{{ passwordStrengthLabel }}</p>
              </div>
            </div>

            <div>
              <label class="block text-sm font-semibold text-gray-700 mb-2">Confirmar Nueva Contraseña</label>
              <div class="relative">
                <input
                  v-model="passwordForm.confirm"
                  :type="showPasswords.confirm ? 'text' : 'password'"
                  required
                  class="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-workplace-red/20 focus:border-workplace-red transition-all duration-300 pr-12"
                  :class="{ 'border-red-400 focus:border-red-500': passwordForm.confirm && passwordForm.new !== passwordForm.confirm }"
                  placeholder="••••••••"
                  autocomplete="new-password"
                >
                <button type="button" @click="showPasswords.confirm = !showPasswords.confirm" class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  <EyeIcon v-if="!showPasswords.confirm" class="h-5 w-5" />
                  <EyeSlashIcon v-else class="h-5 w-5" />
                </button>
              </div>
              <p v-if="passwordForm.confirm && passwordForm.new !== passwordForm.confirm" class="mt-1 text-xs text-red-500">
                Las contraseñas no coinciden
              </p>
            </div>

            <div class="flex justify-end">
              <button
                type="submit"
                :disabled="savingPassword || !passwordFormValid"
                class="px-5 py-2.5 bg-gradient-to-r from-red-500 to-red-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <span v-if="savingPassword" class="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                {{ savingPassword ? 'Cambiando...' : 'Cambiar Contraseña' }}
              </button>
            </div>
          </form>
        </div>

      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import {
  UserCircleIcon,
  LockClosedIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  EyeIcon,
  EyeSlashIcon,
  CameraIcon,
} from '@heroicons/vue/24/outline'
import Swal from 'sweetalert2'
import PageHeader from '~/components/ui/PageHeader.vue'
import { useAuth } from '~/composables/useAuth'

const auth = useAuth()
const { checkUsername } = auth
const config = useRuntimeConfig()
const apiUrl = config.public.apiUrl as string

// ─── State ────────────────────────────────────────────────────────────────────
const loadingProfile = ref(false)
const savingProfile = ref(false)
const savingPassword = ref(false)
const uploadingAvatar = ref(false)
const avatarPreview = ref<string | null>(null)
const avatarFileInput = ref<HTMLInputElement | null>(null)
const successMsg = ref('')
const errorMsg = ref('')
let successTimer: ReturnType<typeof setTimeout> | null = null

const profileForm = ref({ firstName: '', lastName: '', email: '', phone: '', username: '' })
const passwordForm = ref({ current: '', new: '', confirm: '' })
const showPasswords = ref({ current: false, new: false, confirm: false })

// ─── Username availability check ──────────────────────────────────────────────
type UsernameStatus = 'idle' | 'checking' | 'available' | 'taken' | 'invalid' | 'cooldown'
const usernameStatus = ref<UsernameStatus>('idle')
const usernameCooldownDaysLeft = ref(0)
const usernameNextChangeAt = ref<string | null>(null)
let usernameDebounce: ReturnType<typeof setTimeout> | null = null

const USERNAME_REGEX = /^[a-z0-9_.-]+$/
const USERNAME_COOLDOWN_DAYS = 30

// Computed: is username field locked due to cooldown?
const usernameIsLocked = computed(() => {
  const u = auth.user.value
  if (!u?.usernameUpdatedAt) return false
  const daysSince = (Date.now() - new Date(u.usernameUpdatedAt).getTime()) / (1000 * 60 * 60 * 24)
  return daysSince < USERNAME_COOLDOWN_DAYS
})

const usernameDaysLeft = computed(() => {
  const u = auth.user.value
  if (!u?.usernameUpdatedAt) return 0
  const daysSince = (Date.now() - new Date(u.usernameUpdatedAt).getTime()) / (1000 * 60 * 60 * 24)
  return Math.ceil(USERNAME_COOLDOWN_DAYS - daysSince)
})

function onUsernameInput(val: string) {
  usernameStatus.value = 'idle'
  if (usernameDebounce) clearTimeout(usernameDebounce)
  if (!val || val.length < 3) return
  if (!USERNAME_REGEX.test(val)) {
    usernameStatus.value = 'invalid'
    return
  }
  // If same as current username, no check needed
  if (val === (auth.user.value?.username ?? '')) {
    usernameStatus.value = 'idle'
    return
  }
  usernameStatus.value = 'checking'
  usernameDebounce = setTimeout(async () => {
    try {
      const res = await checkUsername(val)
      if (!res.canChange) {
        usernameStatus.value = 'cooldown'
        usernameCooldownDaysLeft.value = res.daysLeft
        usernameNextChangeAt.value = res.nextChangeAt
      } else {
        usernameStatus.value = res.available ? 'available' : 'taken'
      }
    } catch {
      usernameStatus.value = 'idle'
    }
  }, 500)
}

// ─── Computed ─────────────────────────────────────────────────────────────────
const fullName = computed(() => {
  const u = auth.user.value
  if (!u) return ''
  return `${u.firstName} ${u.lastName}`.trim()
})

const userInitials = computed(() => {
  const u = auth.user.value
  if (!u) return '?'
  return `${u.firstName?.[0] ?? ''}${u.lastName?.[0] ?? ''}`.toUpperCase()
})

const ROLE_STYLES: Record<string, { label: string; badge: string }> = {
  SUPERADMIN: { label: 'Super Administrador', badge: 'bg-red-100 text-red-800' },
  ADMIN: { label: 'Administrador', badge: 'bg-purple-100 text-purple-800' },
  COMMERCE: { label: 'Comercio', badge: 'bg-blue-100 text-blue-800' },
  FREELANCER: { label: 'Freelancer', badge: 'bg-amber-100 text-amber-800' },
  NORMAL: { label: 'Usuario', badge: 'bg-gray-100 text-gray-700' },
}

const roleStyle = computed(() => ROLE_STYLES[auth.user.value?.role ?? 'NORMAL'] ?? ROLE_STYLES.NORMAL)
// Solo COMMERCE tiene restaurante asociado y perfil público
const isCommerce = computed(() => auth.user.value?.role === 'COMMERCE')

const avatarUrl = computed(() => {
  if (avatarPreview.value) return avatarPreview.value
  const av = auth.user.value?.avatar
  if (!av) return null
  return av.startsWith('http') ? av : `${apiUrl}${av}`
})

// Track dirty state to enable/disable Save button
const profileDirty = computed(() => {
  const u = auth.user.value
  if (!u) return false
  return (
    profileForm.value.firstName !== (u.firstName ?? '') ||
    profileForm.value.lastName !== (u.lastName ?? '') ||
    profileForm.value.email !== (u.email ?? '') ||
    profileForm.value.phone !== (u.phone ?? '') ||
    profileForm.value.username !== (u.username ?? '')
  )
})

const passwordFormValid = computed(() =>
  passwordForm.value.current.length > 0 &&
  passwordForm.value.new.length >= 8 &&
  passwordForm.value.new === passwordForm.value.confirm
)

// Password strength
const passwordStrength = computed(() => {
  const p = passwordForm.value.new
  if (!p) return 0
  let score = 0
  if (p.length >= 8) score++
  if (/[A-Z]/.test(p)) score++
  if (/[0-9]/.test(p)) score++
  if (/[^A-Za-z0-9]/.test(p)) score++
  return score
})

const passwordStrengthColor = computed(() => {
  const colors = ['', 'bg-red-400', 'bg-orange-400', 'bg-yellow-400', 'bg-green-500']
  return colors[passwordStrength.value] ?? 'bg-gray-200'
})

const passwordStrengthTextColor = computed(() => {
  const colors = ['', 'text-red-500', 'text-orange-500', 'text-yellow-600', 'text-green-600']
  return colors[passwordStrength.value] ?? 'text-gray-400'
})

const passwordStrengthLabel = computed(() => {
  const labels = ['', 'Muy débil', 'Débil', 'Buena', 'Fuerte']
  return labels[passwordStrength.value] ?? ''
})

// ─── Helpers ──────────────────────────────────────────────────────────────────
function syncFormFromUser() {
  const u = auth.user.value
  if (!u) return
  profileForm.value = {
    firstName: u.firstName ?? '',
    lastName: u.lastName ?? '',
    email: u.email ?? '',
    phone: u.phone ?? '',
    username: u.username ?? '',
  }
  usernameStatus.value = 'idle'
}

function resetProfileForm() {
  syncFormFromUser()
}

function showSuccess(msg: string) {
  errorMsg.value = ''
  successMsg.value = msg
  if (successTimer) clearTimeout(successTimer)
  successTimer = setTimeout(() => { successMsg.value = '' }, 4000)
}

function showError(err: unknown) {
  successMsg.value = ''
  const e = err as { data?: { message?: unknown }; message?: string }
  const detail = e?.data?.message ?? e?.message ?? 'Ocurrió un error inesperado'
  errorMsg.value = Array.isArray(detail) ? detail.join('. ') : String(detail)
  if (successTimer) clearTimeout(successTimer)
  successTimer = setTimeout(() => { errorMsg.value = '' }, 6000)
}

// ─── Actions ──────────────────────────────────────────────────────────────────
function triggerAvatarInput() {
  avatarFileInput.value?.click()
}

async function onAvatarFileSelected(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (!file) return

  // Preview local
  const reader = new FileReader()
  reader.onload = (e) => { avatarPreview.value = e.target?.result as string }
  reader.readAsDataURL(file)

  uploadingAvatar.value = true
  errorMsg.value = ''
  try {
    await auth.uploadAvatar(file)
    avatarPreview.value = null // usar la URL del servidor ya persistida
    showSuccess('Foto de perfil actualizada')
  } catch (err) {
    avatarPreview.value = null
    showError(err)
  } finally {
    uploadingAvatar.value = false
    if (avatarFileInput.value) avatarFileInput.value.value = ''
  }
}

async function saveProfile() {
  if (!profileDirty.value) return
  if (usernameStatus.value === 'taken') return
  if (usernameStatus.value === 'invalid') return
  if (usernameStatus.value === 'cooldown') return

  const usernameChanging = profileForm.value.username !== (auth.user.value?.username ?? '')

  if (usernameChanging && profileForm.value.username) {
    const result = await Swal.fire({
      title: '¿Confirmas el cambio?',
      html: `Estás a punto de establecer <strong>@${profileForm.value.username}</strong> como tu nombre de usuario.<br><br>Podrás volver a cambiarlo en <strong>30 días</strong>.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, cambiar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#e53e3e',
      cancelButtonColor: '#718096',
      reverseButtons: true,
    })
    if (!result.isConfirmed) return
  }

  savingProfile.value = true
  errorMsg.value = ''
  try {
    await auth.saveProfile({
      firstName: profileForm.value.firstName,
      lastName: profileForm.value.lastName,
      email: profileForm.value.email,
      phone: profileForm.value.phone || undefined,
      username: profileForm.value.username || undefined,
    })
    usernameStatus.value = 'idle'
    showSuccess('Perfil actualizado correctamente')
  } catch (err) {
    showError(err)
  } finally {
    savingProfile.value = false
  }
}

async function changePassword() {
  if (!passwordFormValid.value) return
  savingPassword.value = true
  errorMsg.value = ''
  try {
    await auth.changePassword({
      currentPassword: passwordForm.value.current,
      newPassword: passwordForm.value.new,
    })
    passwordForm.value = { current: '', new: '', confirm: '' }
    showSuccess('Contraseña cambiada correctamente')
  } catch (err) {
    showError(err)
  } finally {
    savingPassword.value = false
  }
}

// ─── Lifecycle ────────────────────────────────────────────────────────────────
onMounted(async () => {
  if (!auth.user.value) {
    loadingProfile.value = true
    await auth.fetchProfile()
    loadingProfile.value = false
  }
  syncFormFromUser()
})

// Sync form if user changes after fetch
watch(() => auth.user.value, syncFormFromUser)
</script>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
