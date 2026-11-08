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
        <LocationPreferenceCard @saved="showUserToast" />
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
        <!-- Información y URL de la tienda: quien tiene un Commerce (BUSINESS,
             o profesional que vende producto) -->
        <CommerceInfoCard
          v-if="hasCommerce && commerce"
          :commerce="commerce"
          :saving="saving === 'commerce'"
          @save="saveCommerceInfo"
        />

        <StoreSlugCard
          v-if="hasCommerce && commerce"
          :slug-owner="commerce"
          :saving="saving === 'slug'"
          :check-slug-availability="checkSlugAvailability"
          @save="saveCommerceSlug"
        />

        <StoreSlugCard
          v-if="showProfessionalSlug"
          :slug-owner="freelancerSettings"
          :saving="saving === 'slug'"
          :check-slug-availability="checkFreelancerSlugAvailability"
          title="URL de tu Perfil"
          prefix="/pro/"
          placeholder="mi-nombre"
          owner-label="de tu perfil"
          @save="saveFreelancerSlug"
        />

        <!-- Bio + redes del perfil público (/pro/:slug) — mismo criterio que
             showProfessionalSlug: HAS_PROFESSIONAL_PROFILE, no accountType. -->
        <FreelancerProfileCard
          v-if="showProfessionalSlug"
          :settings="freelancerSettings"
          :saving="saving === 'freelancerProfile'"
          @save="saveFreelancerProfile"
        />

        <!-- Secciones por capacidad, no por accountType: un híbrido con
             Commerce y perfil profesional ve las de pedidos Y las de
             solicitudes (el backend guarda el form en ambos settings). -->
        <BusinessNotificationsCard
          :commerce-settings="commerceSettings"
          :freelancer-settings="freelancerSettings"
          :show-commerce="hasCommerce"
          :show-freelancer="showFreelancerNotifications"
          @save="saveNotificationSettings"
        />

        <!-- Configuración de Pagos / Operaciones — solo categoría "Comida" -->
        <PaymentSettingsCard
          v-if="isComidaCategory"
          :settings="settings"
          :saving="saving === 'payment'"
          @save="savePaymentSettings"
        />

        <!-- Operaciones y Price Guard: gateadas por hasCommerce (como ya hace
             el backend — PATCH /settings/operations y /settings/price-guard
             exigen @RequireCapability('HAS_COMMERCE'), no accountType). Un
             profesional con Commerce ("opción 2") también debe verlas — antes
             el !isFreelancer se lo ocultaba aunque ya pudiera guardarlas.
             SettingsService.resolveStrategy también decide por HAS_COMMERCE,
             así que para este caso `settings` ya es CommerceSettings. Si
             todavía no existe, llega null: los componentes usan sus defaults
             y el CommerceSettings se crea al guardar (getOrCreateSettings). -->
        <OperationsSettingsCard
          v-if="isComidaCategory && hasCommerce"
          :settings="commerceSettings"
          :saving="saving === 'operations'"
          @save="saveOperationSettings"
        />

        <PriceGuardSettingsCard
          v-if="hasCommerce"
          :settings="commerceSettings"
          :saving="saving === 'priceGuard'"
          @save="savePriceGuardSettings"
        />

        <!-- Carga sus propios datos (/alert-rules, exige HAS_COMMERCE) -->
        <AlertRulesSettingsCard v-if="hasCommerce" />

        <LocationSettingsCard
          :latitude="locationOwner?.latitude"
          :longitude="locationOwner?.longitude"
          :saving="saving === 'location'"
          @save="saveLocation"
        />

        <!-- Cuentas donde sus clientes le pagan directo (pago móvil,
             transferencia, Zelle): todo vendedor, con o sin Commerce. -->
        <SellerPaymentAccountsCard v-if="isSeller" @saved="showUserToast" />

        <!-- Financiamiento (Cashea / Krece) — /bnpl/settings exige HAS_COMMERCE;
             antes se montaba para todos (admins y freelancers recibían 403) -->
        <BnplSettingsSection v-if="hasCommerce && bnplEnabled" />
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
import LocationPreferenceCard from '~/components/settings/LocationPreferenceCard.vue'
import LocalDataCard from '~/components/settings/LocalDataCard.vue'
import AboutCard from '~/components/settings/AboutCard.vue'
import CommerceInfoCard, { type CommerceInfoForm } from '~/components/settings/CommerceInfoCard.vue'
import StoreSlugCard from '~/components/settings/StoreSlugCard.vue'
import FreelancerProfileCard, { type FreelancerProfileForm } from '~/components/settings/FreelancerProfileCard.vue'
import BusinessNotificationsCard from '~/components/settings/BusinessNotificationsCard.vue'
import PaymentSettingsCard from '~/components/settings/PaymentSettingsCard.vue'
import OperationsSettingsCard from '~/components/settings/OperationsSettingsCard.vue'
import PriceGuardSettingsCard from '~/components/settings/PriceGuardSettingsCard.vue'
import LocationSettingsCard from '~/components/settings/LocationSettingsCard.vue'
import AlertRulesSettingsCard from '~/components/settings/AlertRulesSettingsCard.vue'
import AppLockCard from '~/components/settings/AppLockCard.vue'
import SellerPaymentAccountsCard from '~/components/settings/SellerPaymentAccountsCard.vue'
import { useSettings, type CommerceSettings, type FreelancerSettingsData } from '~/composables/commerce/useSettings'
import { useAuth } from '~/composables/auth/useAuth'
import { usePermissions } from '~/composables/users/usePermissions'
import { useProfileContext } from '~/composables/users/useProfileContext'
import { useFeatures } from '~/composables/core/useFeatures'

// Misma fuente que aplica el backend (GET /features).
const { features: platformFeatures } = useFeatures()
const bnplEnabled = computed(() => platformFeatures.value.bnpl)

const { user } = useAuth()
const { userCategory } = usePermissions()
const role = computed(() => user.value?.role ?? 'NORMAL')
const { hasCapability } = useProfileContext()
// Vista de negocio (configuración de backend): cualquier PROFESIONAL. El
// nombre histórico `isCommerce` se conserva solo para el v-if de la vista;
// lo que opera sobre un Commerce real se decide con `hasCommerce`.
const isCommerce = computed(() => role.value === 'PROFESIONAL')
// HAS_COMMERCE — mismo hecho que exige el backend (CapabilityGuard) en
// /settings/commerce, /settings/price-guard, /alert-rules... Un profesional
// que vende producto ("opción 2") también lo tiene; antes estas tarjetas
// se mostraban a cualquier PROFESIONAL y terminaban en 403.
const hasCommerce = computed(() => hasCapability('HAS_COMMERCE'))
// URL /pro/:slug y bio/redes: quien tiene perfil profesional, con o sin
// Commerce — es lo único que exige el backend (PATCH /settings/freelancer/*
// con @RequireCapability('HAS_PROFESSIONAL_PROFILE')). Antes también pedía
// accountType === 'FREELANCER', y un híbrido con perfil BUSINESS no veía su
// URL /pro/:slug aunque tuviera FreelancerSettings.
const showProfessionalSlug = computed(() => hasCapability('HAS_PROFESSIONAL_PROFILE'))
// Vende algo (productos o servicios): puede recibir pagos directos.
const isSeller = computed(() => hasCommerce.value || hasCapability('HAS_PROFESSIONAL_PROFILE'))
// Sin Commerce los settings son siempre FreelancerSettings; con Commerce,
// solo si además tiene perfil profesional (híbrido) — mismo criterio que
// SettingsService.getSettings/updateNotificationSettings.
const showFreelancerNotifications = computed(() => !hasCommerce.value || hasCapability('HAS_PROFESSIONAL_PROFILE'))
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
  freelancerSettings: hybridFreelancerSettings,
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
  saveFreelancerProfile: saveFreelancerProfileApi,
  savePaymentSettings: savePaymentSettingsApi,
  saveOperationSettings: saveOperationSettingsApi,
  savePriceGuardSettings: savePriceGuardSettingsApi,
  saveNotificationSettings: saveNotificationSettingsApi,
  saveLocation: saveLocationApi,
} = useSettings()

// `settings` tiene la forma que decidió SettingsService.resolveStrategy —
// por hasCommerce (HAS_COMMERCE), no por accountType (ver comentario en
// settings.service.ts: "un PROFESSIONAL con Commerce resolvía
// accountType=FREELANCER y caía en FreelancerSettingsStrategy, su GET
// /settings nunca incluía CommerceSettings"). Un PROFESIONAL con Commerce
// ("opción 2") recibe CommerceSettings real en `settings`, no
// FreelancerSettingsData.
const commerceSettings = computed(() => (hasCommerce.value ? (settings.value as CommerceSettings | null) : null))
// Para un freelancer puro, `settings` ya es FreelancerSettingsData. Para un
// híbrido (Commerce + perfil profesional a la vez), el backend lo manda
// aparte como `freelancerSettings` (ver FullSettings.freelancerSettings) —
// StoreSlugCard (rama profesional)/BusinessNotificationsCard/
// FreelancerProfileCard usan esta misma fuente en ambos casos.
const freelancerSettings = computed(() =>
  hasCommerce.value ? hybridFreelancerSettings.value : (settings.value as FreelancerSettingsData | null)
)

// Ubicación base para MatchingService — PATCH /settings/location resuelve
// por resolveStrategy (hasCommerce), igual que el resto de settings
// compartidos: un híbrido con Commerce guarda su ubicación ahí, no en su
// FreelancerSettings (aunque también tenga uno).
const locationOwner = computed(() => (hasCommerce.value ? commerce.value : freelancerSettings.value))

async function saveCommerceInfo(form: CommerceInfoForm) { await saveCommerceInfoApi(form) }
async function saveCommerceSlug(slug: string) { await saveCommerceSlugApi(slug) }
async function saveFreelancerSlug(slug: string) { await saveFreelancerSlugApi(slug) }
async function saveFreelancerProfile(form: FreelancerProfileForm) { await saveFreelancerProfileApi(form) }
async function saveLocation(data: { latitude: number; longitude: number }) { await saveLocationApi(data) }
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
