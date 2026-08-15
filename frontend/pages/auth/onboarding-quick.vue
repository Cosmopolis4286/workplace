<template>
  <AuthLayout
    :title="t('auth.onboarding.title')"
    :description="t('auth.onboarding.description')"
    panel-variant="login"
  >
    <form @submit.prevent="handleSubmit" class="space-y-5" novalidate>
      <div class="flex flex-col items-center text-center gap-3 pb-2">
        <div class="w-14 h-14 rounded-2xl bg-gradient-to-br from-workplace-red/10 to-red-600/10 flex items-center justify-center border border-red-100">
          <BuildingStorefrontIcon class="h-7 w-7 text-workplace-red" />
        </div>
        <p class="text-sm text-gray-500 max-w-xs leading-relaxed">
          {{ t('auth.onboarding.prompt') }}
        </p>
      </div>

      <AuthInput
        id="commerceName"
        v-model="commerceName"
        :label="t('auth.onboarding.businessNameLabel')"
        :placeholder="t('auth.onboarding.businessNamePlaceholder')"
        :icon="BuildingStorefrontIcon"
        :error="error"
        :show-valid="touched && !error"
        autocomplete="organization"
        required
        @blur="touch"
      />

      <AuthButton
        type="submit"
        :text="t('auth.onboarding.submit')"
        :loading="isLoading"
        :icon="ArrowRightIcon"
        variant="primary"
      />
    </form>

    <template #footer>
      <button
        type="button"
        class="text-sm text-gray-400 hover:text-gray-600 transition-colors duration-150"
        @click="navigateTo('/login')"
      >
        {{ t('auth.onboarding.configureLater') }}
      </button>
    </template>
  </AuthLayout>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'auth' })

import { ref } from 'vue'
import { BuildingStorefrontIcon, ArrowRightIcon } from '@heroicons/vue/24/outline'
import { useAuth } from '~/composables/auth/useAuth'
import { useApi } from '~/composables/core/useApi'
import { useFormValidation } from '~/composables/ui/useFormValidation'
import { getApiErrorMessage } from '~/composables/core/useApiErrors'
import { useToast } from '~/composables/ui/useToast'

const { t } = useI18n()
useHead({ title: () => `${t('auth.onboarding.title')} — ${t('common.appName')}` })

const { isAuthenticated } = useAuth()
const { patch } = useApi()
const { required, minLength, maxLength, validate } = useFormValidation()
const toast = useToast()

onMounted(() => { if (!isAuthenticated.value) navigateTo('/login') })

const commerceName = ref('')
const error = ref('')
const touched = ref(false)
const isLoading = ref(false)

function touch() {
  touched.value = true
  error.value = validate(commerceName.value, [required(t('validation.fields.commerceName')), minLength(2), maxLength(80)])
}

const handleSubmit = async () => {
  touch()
  if (error.value) return

  isLoading.value = true
  try {
    await patch('/settings/commerce', { name: commerceName.value })
    await navigateTo('/dashboard')
  } catch (err: unknown) {
    toast.error(getApiErrorMessage(err, t('auth.onboarding.saveError')))
  } finally {
    isLoading.value = false
  }
}
</script>
