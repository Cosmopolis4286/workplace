<template>
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
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { LockClosedIcon, EyeIcon, EyeSlashIcon } from '@heroicons/vue/24/outline'
import { useAuth } from '~/composables/auth/useAuth'

const emit = defineEmits<{
  success: [message: string]
  error: [err: unknown]
}>()

const auth = useAuth()

const passwordForm = ref({ current: '', new: '', confirm: '' })
const showPasswords = ref({ current: false, new: false, confirm: false })
const savingPassword = ref(false)

const passwordFormValid = computed(() =>
  passwordForm.value.current.length > 0 &&
  passwordForm.value.new.length >= 8 &&
  passwordForm.value.new === passwordForm.value.confirm
)

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

async function changePassword() {
  if (!passwordFormValid.value) return
  savingPassword.value = true
  try {
    await auth.changePassword({
      currentPassword: passwordForm.value.current,
      newPassword: passwordForm.value.new,
    })
    passwordForm.value = { current: '', new: '', confirm: '' }
    emit('success', 'Contraseña cambiada correctamente')
  } catch (err) {
    emit('error', err)
  } finally {
    savingPassword.value = false
  }
}
</script>
