<template>
  <AuthLayout
    :title="t('auth.recoverPassword.title')"
    :description="t('auth.recoverPassword.description')"
  >
    <template #header-action>
      <NuxtLink
        to="/login"
        class="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors duration-150"
      >
        <ArrowLeftIcon class="h-4 w-4" />
        {{ t('auth.recoverPassword.backToLogin') }}
      </NuxtLink>
    </template>

    <!-- Step: form -->
    <template v-if="!emailSent">
      <form @submit.prevent="handleRecoverPassword" class="space-y-5" novalidate>
        <!-- Illustration -->
        <div class="flex flex-col items-center text-center gap-3 pb-2">
          <div class="w-14 h-14 rounded-2xl bg-gradient-to-br from-workplace-red/10 to-red-600/10 flex items-center justify-center border border-red-100">
            <KeyIcon class="h-7 w-7 text-workplace-red" />
          </div>
          <p class="text-sm text-gray-500 max-w-xs leading-relaxed">
            {{ t('auth.recoverPassword.prompt') }}
          </p>
        </div>

        <AuthInput
          id="email"
          v-model="form.email"
          type="email"
          :label="t('auth.recoverPassword.emailLabel')"
          :placeholder="t('auth.recoverPassword.emailPlaceholder')"
          :icon="EnvelopeIcon"
          :error="errors.email"
          :show-valid="touched && !errors.email && !!form.email"
          autocomplete="email"
          required
          @blur="touched = true"
        />

        <AuthButton
          type="submit"
          :text="t('auth.recoverPassword.submit')"
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
          <h3 class="text-lg font-bold text-gray-900">{{ t('auth.recoverPassword.successTitle') }}</h3>
          <p class="text-sm text-gray-500 leading-relaxed max-w-xs">
            {{ t('auth.recoverPassword.successDesc') }}
          </p>
          <p class="text-sm font-semibold text-workplace-red bg-red-50 px-3 py-1.5 rounded-lg inline-block">
            {{ form.email }}
          </p>
        </div>

        <!-- Info box -->
        <div class="w-full flex items-start gap-3 px-4 py-3 bg-blue-50 border border-blue-100 rounded-xl text-sm text-blue-700">
          <InformationCircleIcon class="h-4 w-4 flex-shrink-0 mt-0.5 text-blue-500" />
          <i18n-t keypath="auth.recoverPassword.infoNotice" tag="p">
            <template #spam>
              <strong>{{ t('auth.recoverPassword.spam') }}</strong>
            </template>
          </i18n-t>
        </div>

        <div class="flex flex-col sm:flex-row gap-3 w-full">
          <AuthButton
            variant="outline"
            :text="t('auth.recoverPassword.resend')"
            :icon="ArrowPathIcon"
            :loading="isResending"
            @click="resendEmail"
          />
          <AuthButton
            variant="ghost"
            :text="t('auth.recoverPassword.useAnotherEmail')"
            :icon="ArrowLeftIcon"
            @click="resetForm"
          />
        </div>
      </div>
    </template>

    <template #footer>
      <p class="text-sm text-gray-500">
        {{ t('auth.recoverPassword.rememberedPassword') }}
        <NuxtLink to="/login" class="font-semibold text-workplace-red hover:underline ml-1">
          {{ t('auth.recoverPassword.login') }}
        </NuxtLink>
      </p>
    </template>
  </AuthLayout>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'auth' })

import { ref, computed } from 'vue'
import { EnvelopeIcon } from '@heroicons/vue/24/outline'
import { useApi } from '~/composables/core/useApi'
import { getApiErrorMessage } from '~/composables/core/useApiErrors'
import { KeyIcon, PaperAirplaneIcon, CheckCircleIcon, InformationCircleIcon, ArrowPathIcon, ArrowLeftIcon } from '@heroicons/vue/24/outline'
import { useFormValidation } from '~/composables/ui/useFormValidation'
import { useToast } from '~/composables/ui/useToast'

const { t } = useI18n()
useHead({ title: () => `${t('auth.recoverPassword.title')} — ${t('common.appName')}` })

const { required, email: emailRule, validate } = useFormValidation()
const toast = useToast()

const form = reactive({ email: '' })
const errors = reactive({ email: '' })
const touched = ref(false)
const isLoading = ref(false)
const isResending = ref(false)
const emailSent = ref(false)

watch(() => form.email, () => {
  if (touched.value) errors.email = validate(form.email, [required(t('validation.fields.email')), emailRule()])
})

const handleRecoverPassword = async () => {
  touched.value = true
  errors.email = validate(form.email, [required(t('validation.fields.email')), emailRule()])
  if (errors.email) return

  isLoading.value = true
  try {
    const { post } = useApi()
    await post('/auth/forgot-password', { email: form.email })
    emailSent.value = true
  } catch (err: unknown) {
    toast.error(getApiErrorMessage(err, t('auth.recoverPassword.sendError')))
  } finally {
    isLoading.value = false
  }
}

const resendEmail = async () => {
  isResending.value = true
  try {
    const { post } = useApi()
    await post('/auth/forgot-password', { email: form.email })
    toast.success(t('auth.recoverPassword.resendSuccess'))
  } catch (err: unknown) {
    toast.error(getApiErrorMessage(err, t('auth.recoverPassword.resendError')))
  } finally {
    isResending.value = false
  }
}

const resetForm = () => {
  emailSent.value = false
  form.email = ''
  errors.email = ''
  touched.value = false
}
</script>
