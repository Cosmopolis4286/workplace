<template>
  <AuthLayout
    title="Recuperar contraseña"
    description="Te enviaremos un enlace para restablecer tu acceso"
  >
    <template #header-action>
      <NuxtLink
        to="/login"
        class="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors duration-150"
      >
        <ArrowLeftIcon class="h-4 w-4" />
        Volver al login
      </NuxtLink>
    </template>

    <!-- Step: form -->
    <template v-if="!emailSent">
      <form @submit.prevent="handleRecoverPassword" class="space-y-5" novalidate>
        <!-- General error banner -->
        <div
          v-if="generalError"
          class="flex items-start gap-2.5 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700"
          role="alert"
        >
          <ExclamationCircleIcon class="h-4 w-4 flex-shrink-0 mt-0.5 text-red-500" />
          <span>{{ generalError }}</span>
        </div>

        <!-- Illustration -->
        <div class="flex flex-col items-center text-center gap-3 pb-2">
          <div class="w-14 h-14 rounded-2xl bg-gradient-to-br from-workplace-red/10 to-red-600/10 flex items-center justify-center border border-red-100">
            <KeyIcon class="h-7 w-7 text-workplace-red" />
          </div>
          <p class="text-sm text-gray-500 max-w-xs leading-relaxed">
            Ingresa tu correo y te enviaremos las instrucciones para restablecer tu contraseña.
          </p>
        </div>

        <AuthInput
          id="email"
          v-model="form.email"
          type="email"
          label="Correo electrónico"
          placeholder="tu@email.com"
          :icon="EnvelopeIcon"
          :error="errors.email"
          :show-valid="touched && !errors.email && !!form.email"
          autocomplete="email"
          required
          @blur="touched = true"
        />

        <AuthButton
          type="submit"
          text="Enviar enlace de recuperación"
          :loading="isLoading"
          :icon="PaperAirplaneIcon"
          variant="primary"
        />
      </form>
    </template>

    <!-- Step: success -->
    <template v-else>
      <div class="flex flex-col items-center text-center gap-5 py-2">
        <!-- Success icon -->
        <div class="w-16 h-16 rounded-2xl bg-gradient-to-br from-green-50 to-green-100 flex items-center justify-center border border-green-200">
          <CheckCircleIcon class="h-9 w-9 text-green-500" />
        </div>

        <div class="space-y-2">
          <h3 class="text-lg font-bold text-gray-900">¡Revisa tu bandeja!</h3>
          <p class="text-sm text-gray-500 leading-relaxed max-w-xs">
            Enviamos las instrucciones a
          </p>
          <p class="text-sm font-semibold text-workplace-red bg-red-50 px-3 py-1.5 rounded-lg inline-block">
            {{ form.email }}
          </p>
        </div>

        <!-- Info box -->
        <div class="w-full flex items-start gap-3 px-4 py-3 bg-blue-50 border border-blue-100 rounded-xl text-sm text-blue-700">
          <InformationCircleIcon class="h-4 w-4 flex-shrink-0 mt-0.5 text-blue-500" />
          <p>
            El correo puede tardar unos minutos. Si no lo ves, revisa tu carpeta de <strong>spam</strong>.
          </p>
        </div>

        <div class="flex flex-col sm:flex-row gap-3 w-full">
          <AuthButton
            variant="outline"
            text="Reenviar correo"
            :icon="ArrowPathIcon"
            :loading="isResending"
            @click="resendEmail"
          />
          <AuthButton
            variant="ghost"
            text="Usar otro correo"
            :icon="ArrowLeftIcon"
            @click="resetForm"
          />
        </div>
      </div>
    </template>

    <template #footer>
      <p class="text-sm text-gray-500">
        ¿Recordaste tu contraseña?
        <NuxtLink to="/login" class="font-semibold text-workplace-red hover:underline ml-1">
          Inicia sesión
        </NuxtLink>
      </p>
    </template>
  </AuthLayout>
</template>

<script setup lang="ts">
useHead({ title: 'Recuperar contraseña — WorkPlace Manager' })
import { ref, computed } from 'vue'
import { EnvelopeIcon, ExclamationCircleIcon } from '@heroicons/vue/24/outline'
import { useApi } from '~/composables/useApi'
import { getApiErrorMessage } from '~/composables/useApiErrors'
import { KeyIcon, PaperAirplaneIcon, CheckCircleIcon, InformationCircleIcon, ArrowPathIcon, ArrowLeftIcon } from '@heroicons/vue/24/outline'
import { useFormValidation } from '~/composables/useFormValidation'

const { required, email: emailRule, validate } = useFormValidation()

const form = reactive({ email: '' })
const errors = reactive({ email: '' })
const touched = ref(false)
const isLoading = ref(false)
const isResending = ref(false)
const emailSent = ref(false)
const generalError = ref('')

watch(() => form.email, () => {
  if (touched.value) errors.email = validate(form.email, [required('El correo'), emailRule()])
})

const handleRecoverPassword = async () => {
  touched.value = true
  errors.email = validate(form.email, [required('El correo'), emailRule()])
  if (errors.email) return

  isLoading.value = true
  generalError.value = ''
  try {
    const { post } = useApi()
    await post('/auth/forgot-password', { email: form.email })
    emailSent.value = true
  } catch (err: unknown) {
    generalError.value = getApiErrorMessage(err, 'Error al enviar el correo. Inténtalo de nuevo.')
  } finally {
    isLoading.value = false
  }
}

const resendEmail = async () => {
  isResending.value = true
  generalError.value = ''
  try {
    const { post } = useApi()
    await post('/auth/forgot-password', { email: form.email })
  } catch (err: unknown) {
    generalError.value = getApiErrorMessage(err, 'Error al reenviar el correo. Inténtalo de nuevo.')
  } finally {
    isResending.value = false
  }
}

const resetForm = () => {
  emailSent.value = false
  form.email = ''
  errors.email = ''
  touched.value = false
  generalError.value = ''
}
</script>
