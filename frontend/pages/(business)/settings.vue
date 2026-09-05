<template>
  <div>
    <PageHeader
      title="Configuración"
      description="Personaliza tu experiencia y gestiona las opciones del sistema"
      :icon="CogIcon"
    />

    <!-- ════════════════════════════════════════════════════════════════════
         VISTA SUPERADMIN / ADMIN / NORMAL — preferencias de usuario (sin backend)
         ════════════════════════════════════════════════════════════════════ -->
    <template v-if="!isCommerce">
      <!-- Toast -->
      <Teleport to="body">
        <Transition name="toast">
          <div
            v-if="userToast"
            class="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-5 py-3 bg-gray-900 text-white text-sm font-medium rounded-2xl shadow-2xl"
          >
            <CheckCircleIcon class="h-4 w-4 text-green-400 flex-shrink-0" />
            {{ userToast }}
          </div>
        </Transition>
      </Teleport>

      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <UserPreferencesCard @saved="showUserToast" />
        <UserNotificationsCard />
        <UserPrivacyCard />
        <LocalDataCard @cleared="showUserToast" />
        <AboutCard :email="user?.email" :role-label="roleLabel" />
      </div>
    </template>

    <!-- ════════════════════════════════════════════════════════════════════
         VISTA PROFESIONAL (Comercio / Freelancer) — configuración del negocio (backend)
         ════════════════════════════════════════════════════════════════════ -->
    <template v-else>
      <!-- Loading skeleton -->
      <div v-if="loading" class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div v-for="i in 4" :key="i" class="card-premium p-6 animate-pulse">
          <div class="h-6 bg-gray-200 rounded-lg w-1/2 mb-6" />
          <div class="space-y-4">
            <div class="h-10 bg-gray-200 rounded-xl" />
            <div class="h-10 bg-gray-200 rounded-xl" />
            <div class="h-10 bg-gray-200 rounded-xl" />
          </div>
        </div>
      </div>

      <!-- Error banner -->
      <div
        v-if="error"
        class="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3 text-red-700"
      >
        <ExclamationTriangleIcon class="h-5 w-5 flex-shrink-0" />
        <span class="text-sm font-medium">{{ error }}</span>
        <button class="ml-auto text-red-400 hover:text-red-600" @click="error = null">
          <XMarkIcon class="h-4 w-4" />
        </button>
      </div>

      <!-- Success banner -->
      <Transition name="fade">
        <div
          v-if="successMsg"
          class="mb-6 p-4 bg-green-50 border border-green-200 rounded-xl flex items-center gap-3 text-green-700"
        >
          <CheckCircleIcon class="h-5 w-5 flex-shrink-0" />
          <span class="text-sm font-medium">{{ successMsg }}</span>
        </div>
      </Transition>

      <div v-if="!loading" class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <!-- Información del Comercio (solo COMMERCE: un freelancer no tiene negocio físico) -->
        <CommerceInfoCard
          v-if="!isFreelancer"
          :commerce="commerce"
          :saving="saving === 'commerce'"
          @save="saveCommerceInfo"
        />

        <StoreSlugCard
          v-if="!isFreelancer"
          :slug-owner="commerce"
          :saving="saving === 'slug'"
          :check-slug-availability="checkSlugAvailability"
          @save="saveCommerceSlug"
        />

        <StoreSlugCard
          v-else
          :slug-owner="freelancerSettings"
          :saving="saving === 'slug'"
          :check-slug-availability="checkFreelancerSlugAvailability"
          title="URL de tu Perfil"
          prefix="/pro/"
          placeholder="mi-nombre"
          owner-label="de tu perfil"
          @save="saveFreelancerSlug"
        />

        <BusinessNotificationsCard
          :settings="settings"
          :is-freelancer="isFreelancer"
          @save="saveNotificationSettings"
        />

        <!-- Configuración de Pagos / Operaciones — solo categoría "Comida" -->
        <PaymentSettingsCard
          v-if="isComidaCategory"
          :settings="settings"
          :saving="saving === 'payment'"
          @save="savePaymentSettings"
        />

        <OperationsSettingsCard
          v-if="isComidaCategory"
          :settings="commerceSettings"
          :saving="saving === 'operations'"
          @save="saveOperationSettings"
        />

        <PriceGuardSettingsCard
          v-if="isCommerce"
          :settings="commerceSettings"
          :saving="saving === 'priceGuard'"
          @save="savePriceGuardSettings"
        />

        <!-- Financiamiento (Cashea / Krece) -->
        <BnplSettingsSection />
      </div>
    </template>

    <!-- ════════════════════════════════════════════════════════════════════
         SEGURIDAD — 2FA, disponible para todos los roles
         ════════════════════════════════════════════════════════════════════ -->
    <div class="mt-6">
      <TwoFactorSettings />
    </div>

    <!-- ════════════════════════════════════════════════════════════════════
         APP LOCK — disponible para todos los roles en app nativa
         ════════════════════════════════════════════════════════════════════ -->
    <AppLockCard @toggled="showUserToast" />
  </div>
</template>

<script setup lang="ts">
definePageMeta({ middleware: 'auth' })

import { ref, computed, onMounted } from 'vue'
import {
  CogIcon,
  ExclamationTriangleIcon,
  XMarkIcon,
  CheckCircleIcon,
} from '@heroicons/vue/24/outline'
import PageHeader from '~/components/ui/PageHeader.vue'
import TwoFactorSettings from '~/components/settings/TwoFactorSettings.vue'
import BnplSettingsSection from '~/components/settings/BnplSettingsSection.vue'
import UserPreferencesCard from '~/components/settings/UserPreferencesCard.vue'
import UserNotificationsCard from '~/components/settings/UserNotificationsCard.vue'
import UserPrivacyCard from '~/components/settings/UserPrivacyCard.vue'
import LocalDataCard from '~/components/settings/LocalDataCard.vue'
import AboutCard from '~/components/settings/AboutCard.vue'
import CommerceInfoCard from '~/components/settings/CommerceInfoCard.vue'
import StoreSlugCard from '~/components/settings/StoreSlugCard.vue'
import BusinessNotificationsCard from '~/components/settings/BusinessNotificationsCard.vue'
import PaymentSettingsCard from '~/components/settings/PaymentSettingsCard.vue'
import OperationsSettingsCard from '~/components/settings/OperationsSettingsCard.vue'
import PriceGuardSettingsCard from '~/components/settings/PriceGuardSettingsCard.vue'
import AppLockCard from '~/components/settings/AppLockCard.vue'
import { useSettings, type CommerceSettings, type FreelancerSettingsData } from '~/composables/commerce/useSettings'
import { useAuth } from '~/composables/auth/useAuth'
import { usePermissions } from '~/composables/users/usePermissions'

const { user } = useAuth()
const { userCategory } = usePermissions()
const role = computed(() => user.value?.role ?? 'NORMAL')
// Solo PROFESIONAL tiene un negocio propio con configuración de backend.
const isCommerce = computed(() => role.value === 'PROFESIONAL')
// Un freelancer es proveedor de servicios independiente: sin Commerce, sin
// campos de comercio físico (dirección, horario, tax, delivery, etc.)
// role=PROFESIONAL ya no distingue COMMERCE de FREELANCER — accountType
// (resuelto por el backend) es la fuente real.
const isFreelancer = computed(() => user.value?.accountType === 'FREELANCER')
// Solo usuarios de categoría "Comida" pueden ver Operaciones y Configuración de Pagos
const isComidaCategory = computed(() => userCategory.value === 'Comida')
const roleLabel = computed(() => {
  const labels: Record<string, string> = {
    SUPERADMIN: 'Super Administrador',
    ADMIN: 'Administrador',
    PROFESIONAL: 'Profesional',
    NORMAL: 'Usuario',
  }
  return labels[role.value] ?? role.value
})

// ─── COMMERCE settings (backend) ─────────────────────────────────────────────

const {
  commerce,
  settings,
  loading,
  saving,
  error,
  successMsg,
  loadSettings,
  saveCommerceInfo: saveCommerceInfoApi,
  checkSlugAvailability,
  saveCommerceSlug: saveCommerceSlugApi,
  checkFreelancerSlugAvailability,
  saveFreelancerSlug: saveFreelancerSlugApi,
  savePaymentSettings: savePaymentSettingsApi,
  saveOperationSettings: saveOperationSettingsApi,
  savePriceGuardSettings: savePriceGuardSettingsApi,
  saveNotificationSettings: saveNotificationSettingsApi,
} = useSettings()

// OperationsSettingsCard solo se muestra cuando isComidaCategory, y esa categoría
// implica accountType COMMERCE (no FREELANCER) — settings siempre es CommerceSettings ahí.
const commerceSettings = computed(() => settings.value as CommerceSettings | null)
// StoreSlugCard (rama freelancer) solo se monta cuando isFreelancer — settings
// siempre es FreelancerSettingsData ahí.
const freelancerSettings = computed(() => settings.value as FreelancerSettingsData | null)

async function saveCommerceInfo(form: Record<string, unknown>) { await saveCommerceInfoApi(form) }
async function saveCommerceSlug(slug: string) { await saveCommerceSlugApi(slug) }
async function saveFreelancerSlug(slug: string) { await saveFreelancerSlugApi(slug) }
async function savePaymentSettings(form: Record<string, unknown>) { await savePaymentSettingsApi(form) }
async function saveOperationSettings(form: Record<string, unknown>) { await saveOperationSettingsApi(form) }
async function savePriceGuardSettings(form: { targetMarginPct: number; minMarginPct: number }) { await savePriceGuardSettingsApi(form) }
async function saveNotificationSettings(form: Record<string, boolean>) { await saveNotificationSettingsApi(form) }

// ─── Toast (preferencias locales / app lock) ──────────────────────────────────

const userToast = ref<string | null>(null)
let toastTimer: ReturnType<typeof setTimeout> | null = null

function showUserToast(msg: string) {
  if (toastTimer) clearTimeout(toastTimer)
  userToast.value = msg
  toastTimer = setTimeout(() => { userToast.value = null }, 2800)
}

// ─── Init ─────────────────────────────────────────────────────────────────────

onMounted(async () => {
  if (isCommerce.value) {
    await loadSettings()
  }
})
</script>

<style scoped>
.fade-enter-active,
.fade-leave-active { transition: opacity 0.3s ease; }
.fade-enter-from,
.fade-leave-to { opacity: 0; }

.toast-enter-active,
.toast-leave-active { transition: all 0.3s ease; }
.toast-enter-from,
.toast-leave-to { opacity: 0; transform: translateX(-50%) translateY(1rem); }
</style>
