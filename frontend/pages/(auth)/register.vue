<template>
  <AuthLayout
    :title="t('auth.register.title')"
    :description="t('auth.register.description')"
    panel-variant="register"
  >
    <template #header-action>
      <p class="text-sm text-gray-500">
        {{ t('auth.register.hasAccount') }}
        <NuxtLink to="/login" class="font-semibold text-workplace-red hover:underline ml-1">
          {{ t('auth.register.login') }}
        </NuxtLink>
      </p>
    </template>

    <form @submit.prevent="handleSubmit" novalidate>
      <!-- Personal info -->
      <div class="grid grid-cols-2 gap-4">
        <AuthInput
          id="firstName"
          v-model="form.firstName"
          :label="t('auth.register.firstNameLabel')"
          :placeholder="t('auth.register.firstNamePlaceholder')"
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
          :label="t('auth.register.lastNameLabel')"
          :placeholder="t('auth.register.lastNamePlaceholder')"
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
        :label="t('auth.register.emailLabel')"
        :placeholder="t('auth.register.emailPlaceholder')"
        :icon="EnvelopeIcon"
        :error="errors.email"
        :show-valid="touched.email"
        autocomplete="email"
        required
        @blur="touch('email')"
      />

      <div class="grid grid-cols-2 gap-4">
        <AuthInput
          id="birthDate"
          v-model="form.birthDate"
          type="date"
          :label="t('auth.register.birthDateLabel')"
          :icon="CakeIcon"
          :error="errors.birthDate"
          :show-valid="touched.birthDate && !errors.birthDate"
          autocomplete="bday"
          required
          @blur="touch('birthDate')"
        />

        <div class="space-y-1.5">
          <label for="sex" class="block text-sm font-medium text-gray-700">{{ t('auth.register.sexLabel') }}</label>
          <select
            id="sex"
            v-model="form.sex"
            class="w-full h-11 px-3 rounded-xl border text-sm bg-white focus:outline-none focus:ring-2 focus:ring-workplace-red/30"
            :class="errors.sex && touched.sex ? 'border-red-300' : 'border-gray-300'"
            required
            @blur="touch('sex')"
          >
            <option value="" disabled>{{ t('auth.register.sexPlaceholder') }}</option>
            <option value="MALE">{{ t('auth.register.sexMale') }}</option>
            <option value="FEMALE">{{ t('auth.register.sexFemale') }}</option>
            <option value="OTHER">{{ t('auth.register.sexOther') }}</option>
          </select>
          <p v-if="errors.sex && touched.sex" class="text-xs text-red-500">{{ errors.sex }}</p>
        </div>
      </div>

      <AuthInput
        id="password"
        v-model="form.password"
        type="password"
        :label="t('auth.register.passwordLabel')"
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
          {{ t('auth.passwordStrengthCaption', { label: strengthLabel }) }}
        </p>
      </div>

      <AuthInput
        id="confirmPassword"
        v-model="form.confirmPassword"
        type="password"
        :label="t('auth.register.confirmPasswordLabel')"
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
          <i18n-t keypath="auth.register.acceptTerms" tag="span">
            <template #terms>
              <NuxtLink to="/terms" target="_blank" class="font-semibold text-workplace-red hover:underline">{{ t('auth.register.termsLink') }}</NuxtLink>
            </template>
            <template #privacy>
              <NuxtLink to="/privacy" target="_blank" class="font-semibold text-workplace-red hover:underline">{{ t('auth.register.privacyLink') }}</NuxtLink>
            </template>
          </i18n-t>
        </span>
      </label>

      <!-- Submit button -->
      <AuthButton
        type="submit"
        variant="primary"
        :text="t('auth.register.submit')"
        :loading="isLoading"
        :disabled="!form.acceptTerms"
        :icon="UserPlusIcon"
      />

      <!-- Divider + social -->
      <div class="relative flex items-center">
        <div class="flex-1 border-t border-gray-200"></div>
        <span class="px-3 text-xs text-gray-400 font-medium">{{ t('auth.register.orRegisterWith') }}</span>
        <div class="flex-1 border-t border-gray-200"></div>
      </div>
      <GoogleAuthButton :label="t('auth.register.registerWithGoogle')" />

      <!-- reCAPTCHA notice -->
      <i18n-t v-if="recaptchaEnabled" keypath="auth.register.recaptchaNotice" tag="p" class="text-center text-[11px] text-gray-400 leading-relaxed">
        <template #privacy>
          <a href="https://policies.google.com/privacy" target="_blank" class="hover:underline">{{ t('auth.register.privacy') }}</a>
        </template>
        <template #terms>
          <a href="https://policies.google.com/terms" target="_blank" class="hover:underline">{{ t('auth.register.terms') }}</a>
        </template>
      </i18n-t>
    </div>
    </form>

  </AuthLayout>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'auth' })

import { ref, reactive, computed } from 'vue'
import {
  UserIcon,
  EnvelopeIcon,
  CakeIcon,
  LockClosedIcon,
  UserPlusIcon,
  CheckIcon,
} from '@heroicons/vue/24/outline'
import { useAuth } from '~/composables/auth/useAuth'
import { useFormValidation } from '~/composables/ui/useFormValidation'
import { useRecaptcha } from '~/composables/auth/useRecaptcha'
import { getApiErrorMessage } from '~/composables/core/useApiErrors'
import { useToast } from '~/composables/ui/useToast'

const { t } = useI18n()
useHead({ title: () => `${t('auth.register.title')} — ${t('common.appName')}` })

const { register, isAuthenticated } = useAuth()
const { executeRecaptcha, isEnabled: recaptchaEnabled } = useRecaptcha()
const toast = useToast()
const route = useRoute()
const { required, email, minLength, maxLength, passwordStrength, matches, validateAll, passwordScore, strengthLabel: slabel, strengthColor: scolor } = useFormValidation()

// Solo rutas internas (?redirect=), nunca URLs externas
function safeRedirectTarget(): string {
  const raw = route.query.redirect as string | undefined
  if (raw && raw.startsWith('/') && !raw.startsWith('//')) return raw
  return '/dashboard'
}

// F: auto-redirect si ya hay sesión activa
onMounted(() => { if (isAuthenticated.value) navigateTo(safeRedirectTarget()) })

const form = reactive({
  firstName: '', lastName: '', email: '', birthDate: '', sex: '',
  password: '', confirmPassword: '', acceptTerms: false
})

const errors = reactive({
  firstName: '', lastName: '', email: '', birthDate: '', sex: '',
  password: '', confirmPassword: ''
})

type FormKey = keyof typeof errors
const touched = reactive<Record<FormKey, boolean>>({
  firstName: false, lastName: false, email: false, birthDate: false, sex: false,
  password: false, confirmPassword: false
})

const isLoading = ref(false)

const pwScore = computed(() => passwordScore(form.password))
const strengthLabel = computed(() => slabel(pwScore.value))
const strengthColor = computed(() => scolor(pwScore.value))

const touch = (field: FormKey) => {
  touched[field] = true
  runValidation()
}

const validationSchema = {
  firstName: [required(t('validation.fields.firstName'))],
  lastName: [required(t('validation.fields.lastName'))],
  email: [required(t('validation.fields.email')), email()],
  birthDate: [
    required(t('validation.fields.birthDate')),
    (v: string) => {
      const birth = new Date(v)
      if (Number.isNaN(birth.getTime())) return t('validation.invalidDate')
      const today = new Date()
      let age = today.getFullYear() - birth.getFullYear()
      const monthDiff = today.getMonth() - birth.getMonth()
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) age--
      return age >= 18 ? true : t('validation.minAge')
    },
  ],
  sex: [required(t('validation.fields.sex'))],
  password: [required(t('validation.fields.password')), minLength(8), passwordStrength()],
  confirmPassword: [required(t('validation.fields.confirmPassword')), matches(() => form.password, t('validation.fields.passwords'))]
}

const runValidation = (): boolean => {
  const fields: Record<string, string> = {}
  for (const k of Object.keys(validationSchema)) fields[k] = (form as unknown as Record<string, string>)[k] ?? ''

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
  try {
    const recaptchaToken = await executeRecaptcha('register')
    await register({
      firstName: form.firstName,
      lastName: form.lastName,
      email: form.email,
      birthDate: form.birthDate,
      sex: form.sex as 'MALE' | 'FEMALE' | 'OTHER',
      password: form.password,
      acceptTerms: form.acceptTerms,
      recaptchaToken
    })
    const redirect = route.query.redirect as string | undefined
    const suffix = redirect ? `&redirect=${encodeURIComponent(redirect)}` : ''
    await navigateTo(`/verify-email?email=${encodeURIComponent(form.email)}${suffix}`)
  } catch (err: unknown) {
    toast.error(getApiErrorMessage(err, t('auth.register.createError')))
  } finally {
    isLoading.value = false
  }
}

</script>
