<template>
  <AuthLayout
    title="Crear tu cuenta"
    description="Empieza gratis, sin tarjeta de crédito"
  >
    <template #header-action>
      <p class="text-sm text-gray-500">
        ¿Ya tienes cuenta?
        <NuxtLink to="/login" class="font-semibold text-workplace-red hover:underline ml-1">
          Inicia sesión
        </NuxtLink>
      </p>
    </template>

    <form @submit.prevent="handleSubmit" novalidate>
      <!-- General error -->
      <div
        v-if="generalError"
        class="flex items-start gap-2.5 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700"
        role="alert"
      >
        <ExclamationCircleIcon class="h-4 w-4 flex-shrink-0 mt-0.5 text-red-500" />
        <span>{{ generalError }}</span>
      </div>

      <!-- Personal info -->
      <div class="grid grid-cols-2 gap-4">
        <AuthInput
          id="firstName"
          v-model="form.firstName"
          label="Nombre"
          placeholder="Juan"
          :icon="UserIcon"
          :error="errors.firstName"
          :show-valid="touched.firstName"
          autocomplete="given-name"
          required
          @blur="touch('firstName')"
        />
        <AuthInput
          id="lastName"
          v-model="form.lastName"
          label="Apellido"
          placeholder="Pérez"
          :icon="UserIcon"
          :error="errors.lastName"
          :show-valid="touched.lastName"
          autocomplete="family-name"
          required
          @blur="touch('lastName')"
        />
      </div>

      <AuthInput
        id="email"
        v-model="form.email"
        type="email"
        label="Correo electrónico"
        placeholder="tu@email.com"
        :icon="EnvelopeIcon"
        :error="errors.email"
        :show-valid="touched.email"
        autocomplete="email"
        required
        @blur="touch('email')"
      />

      <AuthInput
        id="phone"
        v-model="form.phone"
        type="tel"
        label="Teléfono (opcional)"
        placeholder="+52 55 1234 5678"
        :icon="PhoneIcon"
        :error="errors.phone"
        :show-valid="touched.phone && !!form.phone && !errors.phone"
        autocomplete="tel"
        inputmode="tel"
        @blur="touch('phone')"
      />

      <AuthInput
        id="commerceName"
        v-model="form.commerceName"
        label="Nombre de tu negocio"
        placeholder="Ej: Restaurante El Sabor"
        :icon="BuildingStorefrontIcon"
        :error="errors.commerceName"
        :show-valid="touched.commerceName"
        autocomplete="organization"
        required
        @blur="touch('commerceName')"
      />

      <AuthInput
        id="password"
        v-model="form.password"
        type="password"
        label="Contraseña"
        placeholder="••••••••"
        :icon="LockClosedIcon"
        :error="errors.password"
        :show-password-toggle="true"
        autocomplete="new-password"
        required
        @blur="touch('password')"
      />

      <!-- Password strength bar -->
      <div v-if="form.password" class="space-y-1.5 -mt-2">
        <div class="flex gap-1">
          <div
            v-for="i in 4"
            :key="i"
            class="flex-1 h-1 rounded-full transition-all duration-300"
            :class="i <= pwScore ? strengthColor : 'bg-gray-200'"
          ></div>
        </div>
        <p class="text-xs" :class="pwScore >= 3 ? 'text-green-600' : pwScore >= 2 ? 'text-yellow-600' : 'text-red-500'">
          Seguridad: <span class="font-semibold">{{ strengthLabel }}</span>
        </p>
      </div>

      <AuthInput
        id="confirmPassword"
        v-model="form.confirmPassword"
        type="password"
        label="Confirmar contraseña"
        placeholder="••••••••"
        :icon="LockClosedIcon"
        :error="errors.confirmPassword"
        :show-valid="touched.confirmPassword && !errors.confirmPassword"
        :show-password-toggle="true"
        autocomplete="new-password"
        required
        @blur="touch('confirmPassword')"
      />

      <div class="space-y-4">
        <!-- Terms -->
        <label class="flex items-start gap-3 cursor-pointer group">
        <div class="relative flex-shrink-0 mt-0.5">
          <input v-model="form.acceptTerms" type="checkbox" class="sr-only" />
          <div
            class="w-4 h-4 rounded border-2 transition-all duration-150 flex items-center justify-center"
            :class="form.acceptTerms ? 'bg-workplace-red border-workplace-red' : 'border-gray-300 group-hover:border-gray-400'"
          >
            <CheckIcon v-if="form.acceptTerms" class="w-2.5 h-2.5 text-white stroke-[3]" />
          </div>
        </div>
        <span class="text-sm text-gray-600 leading-snug">
          Acepto los
          <NuxtLink to="/terminos" target="_blank" class="font-semibold text-workplace-red hover:underline">Términos y Condiciones</NuxtLink>
          y la
          <NuxtLink to="/privacidad" target="_blank" class="font-semibold text-workplace-red hover:underline">Política de Privacidad</NuxtLink>
        </span>
      </label>

      <!-- Submit button -->
      <AuthButton
        type="submit"
        variant="primary"
        text="Crear cuenta"
        :loading="isLoading"
        :disabled="!form.acceptTerms"
        :icon="UserPlusIcon"
      />

      <!-- Divider + social -->
      <div class="relative flex items-center">
        <div class="flex-1 border-t border-gray-200"></div>
        <span class="px-3 text-xs text-gray-400 font-medium">o regístrate con</span>
        <div class="flex-1 border-t border-gray-200"></div>
      </div>
      <GoogleAuthButton label="Registrarse con Google" />

      <!-- reCAPTCHA notice -->
      <p v-if="recaptchaEnabled" class="text-center text-[11px] text-gray-400 leading-relaxed">
        Protegido por reCAPTCHA —
        <a href="https://policies.google.com/privacy" target="_blank" class="hover:underline">Privacidad</a>
        y
        <a href="https://policies.google.com/terms" target="_blank" class="hover:underline">Términos</a>
        de Google.
      </p>
    </div>
    </form>

  </AuthLayout>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'auth' })
useHead({ title: 'Crear cuenta — WorkPlace Manager' })

import { ref, reactive, computed } from 'vue'
import {
  UserIcon,
  EnvelopeIcon,
  PhoneIcon,
  LockClosedIcon,
  UserPlusIcon,
  ExclamationCircleIcon,
  CheckIcon,
  BuildingStorefrontIcon,
} from '@heroicons/vue/24/outline'
import { useAuth } from '~/composables/useAuth'
import { useFormValidation } from '~/composables/useFormValidation'
import { useRecaptcha } from '~/composables/useRecaptcha'
import { getApiErrorMessage } from '~/composables/useApiErrors'

const { register, isAuthenticated } = useAuth()
const { executeRecaptcha, isEnabled: recaptchaEnabled } = useRecaptcha()
const { required, email, minLength, maxLength, passwordStrength, matches, phone, validateAll, passwordScore, strengthLabel: slabel, strengthColor: scolor } = useFormValidation()

// F: auto-redirect si ya hay sesión activa
onMounted(() => { if (isAuthenticated.value) navigateTo('/dashboard') })

const form = reactive({
  firstName: '', lastName: '', email: '', phone: '',
  commerceName: '',
  password: '', confirmPassword: '', acceptTerms: false
})

const errors = reactive({
  firstName: '', lastName: '', email: '', phone: '',
  commerceName: '',
  password: '', confirmPassword: ''
})

type FormKey = keyof typeof errors
const touched = reactive<Record<FormKey, boolean>>({
  firstName: false, lastName: false, email: false, phone: false,
  commerceName: false,
  password: false, confirmPassword: false
})

const isLoading = ref(false)
const generalError = ref('')

const pwScore = computed(() => passwordScore(form.password))
const strengthLabel = computed(() => slabel(pwScore.value))
const strengthColor = computed(() => scolor(pwScore.value))

const touch = (field: FormKey) => {
  touched[field] = true
  runValidation()
}

const validationSchema = {
  firstName: [required('El nombre')],
  lastName: [required('El apellido')],
  email: [required('El correo'), email()],
  phone: [(v: string) => !v || phone()(v)],
  commerceName: [required('El nombre del negocio'), minLength(2), maxLength(80)],
  password: [required('La contraseña'), minLength(8), passwordStrength()],
  confirmPassword: [required('Confirma la contraseña'), matches(() => form.password, 'Las contraseñas')]
}

const runValidation = (): boolean => {
  const fields: Record<string, string> = {}
  for (const k of Object.keys(validationSchema)) fields[k] = (form as Record<string, string>)[k] ?? ''

  const { errors: e } = validateAll(fields as Record<FormKey, string>, validationSchema as never)

  for (const k of Object.keys(validationSchema) as FormKey[]) {
    errors[k] = touched[k] ? e[k] : ''
  }

  return Object.values(e).every(v => !v)
}

const handleSubmit = async () => {
  // Mark all fields as touched
  for (const k of Object.keys(touched) as FormKey[]) touched[k] = true

  if (!runValidation()) return

  isLoading.value = true
  generalError.value = ''
  try {
    const recaptchaToken = await executeRecaptcha('register')
    await register({
      firstName: form.firstName,
      lastName: form.lastName,
      email: form.email,
      phone: form.phone,
      password: form.password,
      commerceName: form.commerceName,
      acceptTerms: form.acceptTerms,
      recaptchaToken
    })
    await navigateTo(`/verify-email?email=${encodeURIComponent(form.email)}`)
  } catch (err: unknown) {
    generalError.value = getApiErrorMessage(err, 'Error al crear la cuenta')
  } finally {
    isLoading.value = false
  }
}

</script>
