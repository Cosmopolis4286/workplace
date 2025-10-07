<template>
  <AuthLayout
    title="Recuperar Contraseña"
    description="Te enviaremos un enlace para restablecer tu contraseña"
  >
    <div v-if="!emailSent">
      <form @submit.prevent="handleRecoverPassword" class="space-y-6">
        <div class="text-center mb-6">
          <div class="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-gradient-to-br from-ifood-red/20 to-red-600/20 mb-4">
            <KeyIcon class="h-8 w-8 text-ifood-red" />
          </div>
          <p class="text-gray-600">
            Ingresa tu correo electrónico y te enviaremos las instrucciones para restablecer tu contraseña.
          </p>
        </div>

        <AuthInput
          id="email"
          v-model="form.email"
          type="email"
          label="Correo Electrónico"
          placeholder="tu@email.com"
          :icon="EnvelopeIcon"
          :error="errors.email"
          required
        />

        <AuthButton
          type="submit"
          text="Enviar Enlace de Recuperación"
          :loading="isLoading"
          :icon="PaperAirplaneIcon"
        />
      </form>
    </div>

    <div v-else class="text-center space-y-6">
      <div class="mx-auto flex items-center justify-center h-20 w-20 rounded-full bg-gradient-to-br from-green-100 to-green-200 mb-6">
        <CheckCircleIcon class="h-12 w-12 text-green-600" />
      </div>
      
      <div class="space-y-3">
        <h3 class="text-xl font-semibold text-gray-900">¡Correo Enviado!</h3>
        <p class="text-gray-600">
          Hemos enviado las instrucciones de recuperación a:
        </p>
        <p class="font-semibold text-ifood-red">{{ form.email }}</p>
        <p class="text-sm text-gray-500">
          Revisa tu bandeja de entrada y sigue las instrucciones. Si no ves el correo, revisa tu carpeta de spam.
        </p>
      </div>

      <div class="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-200">
        <div class="flex items-start space-x-3">
          <InformationCircleIcon class="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
          <div class="text-sm text-blue-800">
            <p class="font-medium mb-1">¿No recibiste el correo?</p>
            <p>El enlace puede tardar unos minutos en llegar. También puedes verificar tu carpeta de spam o correo no deseado.</p>
          </div>
        </div>
      </div>

      <div class="flex flex-col sm:flex-row gap-3">
        <AuthButton
          variant="outline"
          text="Reenviar Correo"
          :icon="ArrowPathIcon"
          @click="resendEmail"
          :loading="isResending"
        />
        <AuthButton
          variant="secondary"
          text="Intentar con Otro Correo"
          :icon="ArrowLeftIcon"
          @click="resetForm"
        />
      </div>
    </div>

    <template #footer>
      <p class="text-sm text-gray-600">
        ¿Recordaste tu contraseña?
        <NuxtLink
          to="/login"
          class="font-semibold text-ifood-red hover:text-red-700 transition-colors duration-200 hover:underline ml-1"
        >
          Inicia sesión aquí
        </NuxtLink>
      </p>
      <p class="text-sm text-gray-600 mt-2">
        ¿No tienes una cuenta?
        <NuxtLink
          to="/register"
          class="font-semibold text-ifood-red hover:text-red-700 transition-colors duration-200 hover:underline ml-1"
        >
          Regístrate aquí
        </NuxtLink>
      </p>
    </template>
  </AuthLayout>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { 
  EnvelopeIcon,
  KeyIcon,
  PaperAirplaneIcon,
  CheckCircleIcon,
  InformationCircleIcon,
  ArrowPathIcon,
  ArrowLeftIcon
} from '@heroicons/vue/24/outline'

definePageMeta({
  layout: false
})

const form = reactive({
  email: ''
})

const errors = reactive({
  email: ''
})

const isLoading = ref(false)
const isResending = ref(false)
const emailSent = ref(false)

const validateForm = () => {
  errors.email = ''

  if (!form.email) {
    errors.email = 'El correo electrónico es requerido'
    return false
  }

  if (!/\S+@\S+\.\S+/.test(form.email)) {
    errors.email = 'El correo electrónico no es válido'
    return false
  }

  return true
}

const handleRecoverPassword = async () => {
  if (!validateForm()) return

  isLoading.value = true

  try {
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    emailSent.value = true
  } catch (error) {
    console.error('Recovery error:', error)
    errors.email = 'Error al enviar el correo. Inténtalo de nuevo.'
  } finally {
    isLoading.value = false
  }
}

const resendEmail = async () => {
  isResending.value = true

  try {
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1500))
    
    // Show success message or notification
    console.log('Email resent successfully')
  } catch (error) {
    console.error('Resend error:', error)
  } finally {
    isResending.value = false
  }
}

const resetForm = () => {
  emailSent.value = false
  form.email = ''
  errors.email = ''
}
</script>