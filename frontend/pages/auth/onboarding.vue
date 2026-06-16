<template>
  <AuthLayout
    title="Un último paso"
    description="Completa el nombre de tu negocio para comenzar"
  >
    <form @submit.prevent="handleSubmit" class="space-y-5" novalidate>
      <div class="flex flex-col items-center text-center gap-3 pb-2">
        <div class="w-14 h-14 rounded-2xl bg-gradient-to-br from-workplace-red/10 to-red-600/10 flex items-center justify-center border border-red-100">
          <BuildingStorefrontIcon class="h-7 w-7 text-workplace-red" />
        </div>
        <p class="text-sm text-gray-500 max-w-xs leading-relaxed">
          ¿Cómo se llama tu restaurante o negocio? Podrás cambiar esto más tarde desde la configuración.
        </p>
      </div>

      <div
        v-if="generalError"
        class="flex items-start gap-2.5 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700"
        role="alert"
      >
        <ExclamationCircleIcon class="h-4 w-4 flex-shrink-0 mt-0.5 text-red-500" />
        <span>{{ generalError }}</span>
      </div>

      <AuthInput
        id="commerceName"
        v-model="commerceName"
        label="Nombre de tu negocio"
        placeholder="Ej: Restaurante El Sabor"
        :icon="BuildingStorefrontIcon"
        :error="error"
        :show-valid="touched && !error"
        autocomplete="organization"
        required
        @blur="touch"
      />

      <AuthButton
        type="submit"
        text="Comenzar"
        :loading="isLoading"
        :icon="ArrowRightIcon"
        variant="primary"
      />
    </form>
  </AuthLayout>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'auth' })
useHead({ title: 'Configura tu negocio — WorkPlace Manager' })

import { ref } from 'vue'
import { BuildingStorefrontIcon, ExclamationCircleIcon, ArrowRightIcon } from '@heroicons/vue/24/outline'
import { useAuth } from '~/composables/useAuth'
import { useFormValidation } from '~/composables/useFormValidation'
import { getApiErrorMessage } from '~/composables/useApiErrors'

const { isAuthenticated, saveProfile } = useAuth()
const { required, minLength, maxLength, validate } = useFormValidation()

onMounted(() => { if (!isAuthenticated.value) navigateTo('/login') })

const commerceName = ref('')
const error = ref('')
const touched = ref(false)
const isLoading = ref(false)
const generalError = ref('')

function touch() {
  touched.value = true
  error.value = validate(commerceName.value, [required('El nombre'), minLength(2), maxLength(80)])
}

const handleSubmit = async () => {
  touch()
  if (error.value) return

  isLoading.value = true
  generalError.value = ''
  try {
    const config = useRuntimeConfig()
    const { token } = useAuth()
    await $fetch(`${config.public.apiUrl}/settings/restaurant`, {
      method: 'PATCH',
      credentials: 'include',
      headers: token.value ? { Authorization: `Bearer ${token.value}` } : {},
      body: { name: commerceName.value },
    })
    await navigateTo('/dashboard')
  } catch (err: unknown) {
    generalError.value = getApiErrorMessage(err, 'No se pudo guardar el nombre. Inténtalo de nuevo.')
  } finally {
    isLoading.value = false
  }
}
</script>
