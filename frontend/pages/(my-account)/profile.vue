<template>
  <div>
    <PageHeader
      title="Mi Perfil"
      description="Gestiona tu información personal y preferencias"
      :icon="UserCircleIcon"
    >
      <template v-if="canSeeSettings" #actions>
        <NuxtLink
          to="/settings"
          class="inline-flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 text-gray-700 font-semibold rounded-xl shadow-sm hover:shadow-md hover:border-workplace-red/30 hover:text-workplace-red transition-all duration-200"
        >
          <Cog6ToothIcon class="h-5 w-5" />
          Ir a Configuración
        </NuxtLink>
      </template>
    </PageHeader>

    <!-- Loading skeleton -->
    <div v-if="loadingProfile" class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div class="card-premium p-6 animate-pulse">
        <div class="flex flex-col items-center space-y-4">
          <div class="h-32 w-32 bg-gray-200 rounded-full" />
          <div class="h-6 w-40 bg-gray-200 rounded" />
          <div class="h-4 w-32 bg-gray-200 rounded" />
        </div>
      </div>
      <div class="lg:col-span-2 space-y-6">
        <div class="card-premium p-6 animate-pulse space-y-4">
          <div class="h-6 w-48 bg-gray-200 rounded" />
          <div class="grid grid-cols-2 gap-4">
            <div v-for="i in 4" :key="i" class="h-12 bg-gray-200 rounded-xl" />
          </div>
        </div>
      </div>
    </div>

    <div v-else class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <!-- Sidebar: avatar + meta -->
      <div class="lg:col-span-1">
        <ProfileAvatarCard
          :user="auth.user.value"
          :commerce-name="auth.commerce.value?.name"
          :avatar-url="avatarUrl"
          :user-initials="userInitials"
          :full-name="fullName"
          :uploading-avatar="uploadingAvatar"
          :is-commerce="isCommerce"
          :role-style="roleStyle"
          :kyc-badge="kycBadge"
          @upload-avatar="triggerAvatarInput"
        />
      </div>

      <!-- Main content -->
      <div class="lg:col-span-2 space-y-6">

        <!-- Success / Error banners -->
        <transition name="fade">
          <div v-if="successMsg" class="flex items-center gap-3 px-4 py-3 bg-green-50 border border-green-200 rounded-xl text-green-800 text-sm font-medium">
            <CheckCircleIcon class="h-5 w-5 flex-shrink-0" />
            {{ successMsg }}
          </div>
        </transition>
        <transition name="fade">
          <div v-if="errorMsg" class="flex items-center gap-3 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-red-800 text-sm font-medium">
            <ExclamationCircleIcon class="h-5 w-5 flex-shrink-0" />
            {{ errorMsg }}
          </div>
        </transition>

        <ProfilePersonalInfoCard @success="showSuccess" @error="showError" />

        <ProfilePasswordCard @success="showSuccess" @error="showError" />

        <!-- Convertirme en freelancer — solo NORMAL -->
        <ProfileFreelancerCard v-if="auth.user.value?.role === 'NORMAL'" />

        <ProfileSessionsCard @success="showSuccess" @error="showError" />

        <ProfileQuickAccessCard />

        <ProfileQuickActionsCard />

      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ middleware: 'auth' })

import { ref, computed, onMounted, nextTick } from 'vue'
import {
  UserCircleIcon,
  CheckCircleIcon,
  CheckBadgeIcon,
  ExclamationCircleIcon,
  ClockIcon,
  ShieldExclamationIcon,
  Cog6ToothIcon,
} from '@heroicons/vue/24/outline'
import PageHeader from '~/components/ui/PageHeader.vue'
import ProfileAvatarCard from '~/components/profile/ProfileAvatarCard.vue'
import ProfilePersonalInfoCard from '~/components/profile/ProfilePersonalInfoCard.vue'
import ProfilePasswordCard from '~/components/profile/ProfilePasswordCard.vue'
import ProfileFreelancerCard from '~/components/profile/ProfileFreelancerCard.vue'
import ProfileSessionsCard from '~/components/profile/ProfileSessionsCard.vue'
import ProfileQuickAccessCard from '~/components/profile/ProfileQuickAccessCard.vue'
import ProfileQuickActionsCard from '~/components/profile/ProfileQuickActionsCard.vue'
import { useAuth } from '~/composables/auth/useAuth'
import { useCamera } from '~/composables/core/useCamera'
import { useKyc } from '~/composables/kyc/useKyc'
import { getApiErrorMessage } from '~/composables/core/useApiErrors'

const auth = useAuth()
const { takePhoto } = useCamera()
const { can } = usePermissions()

// ─── Estado de verificación de identidad (KYC) ────────────────────────────────
const { myStatus: kycMyStatus, fetchMyStatus: fetchKycStatus } = useKyc()
onMounted(() => { fetchKycStatus() })

const kycBadge = computed(() => {
  const status = kycMyStatus.value?.kycStatus ?? 'NONE'
  return ({
    NONE: { label: 'Identidad sin verificar', icon: ShieldExclamationIcon, class: 'bg-gray-100 text-gray-500 hover:bg-gray-200' },
    PENDING: { label: 'Verificación en revisión', icon: ClockIcon, class: 'bg-amber-100 text-amber-700 hover:bg-amber-200' },
    APPROVED: { label: 'Identidad verificada', icon: CheckBadgeIcon, class: 'bg-green-100 text-green-700 hover:bg-green-200' },
    REJECTED: { label: 'Verificación rechazada', icon: ExclamationCircleIcon, class: 'bg-red-100 text-red-600 hover:bg-red-200' },
  })[status]
})
const canSeeSettings = computed(() => can('settings:view'))

// ─── State ────────────────────────────────────────────────────────────────────
const loadingProfile = ref(false)
const uploadingAvatar = ref(false)
const avatarPreview = ref<string | null>(null)
const successMsg = ref('')
const errorMsg = ref('')
let successTimer: ReturnType<typeof setTimeout> | null = null

const roleStyle = computed(() => {
  const ROLE_STYLES: Record<string, { label: string; badge: string }> = {
    SUPERADMIN: { label: 'Super Administrador', badge: 'bg-red-100 text-red-800' },
    ADMIN: { label: 'Administrador', badge: 'bg-purple-100 text-purple-800' },
    COMMERCE: { label: 'Comercio', badge: 'bg-blue-100 text-blue-800' },
    FREELANCER: { label: 'Freelancer', badge: 'bg-amber-100 text-amber-800' },
    NORMAL: { label: 'Usuario', badge: 'bg-gray-100 text-gray-700' },
  }
  return ROLE_STYLES[auth.user.value?.role ?? 'NORMAL'] ?? ROLE_STYLES.NORMAL
})
const isCommerce = computed(() => auth.user.value?.role === 'COMMERCE')

const fullName = computed(() => {
  const u = auth.user.value
  if (!u) return ''
  return `${u.firstName} ${u.lastName}`.trim()
})

const userInitials = computed(() => {
  const u = auth.user.value
  if (!u) return '?'
  return `${u.firstName?.[0] ?? ''}${u.lastName?.[0] ?? ''}`.toUpperCase()
})

const { getAssetUrl } = useAssetUrl()
const avatarUrl = computed(() => {
  if (avatarPreview.value) return avatarPreview.value
  return getAssetUrl(auth.user.value?.avatar)
})

// ─── Helpers ──────────────────────────────────────────────────────────────────
function showSuccess(msg: string) {
  errorMsg.value = ''
  successMsg.value = msg
  if (successTimer) clearTimeout(successTimer)
  successTimer = setTimeout(() => { successMsg.value = '' }, 4000)
}

function showError(err: unknown) {
  successMsg.value = ''
  errorMsg.value = getApiErrorMessage(err, 'Ocurrió un error inesperado')
  if (successTimer) clearTimeout(successTimer)
  successTimer = setTimeout(() => { errorMsg.value = '' }, 6000)
}

// ─── Avatar ───────────────────────────────────────────────────────────────────
async function triggerAvatarInput() {
  const file = await takePhoto()
  if (!file) return

  // Preview local
  const reader = new FileReader()
  reader.onload = (e) => { avatarPreview.value = e.target?.result as string }
  reader.readAsDataURL(file)

  uploadingAvatar.value = true
  try {
    await auth.uploadAvatar(file)
    avatarPreview.value = null // usar la URL del servidor ya persistida
    showSuccess('Foto de perfil actualizada')
  } catch (err) {
    avatarPreview.value = null
    showError(err)
  } finally {
    uploadingAvatar.value = false
  }
}

// ─── Lifecycle ────────────────────────────────────────────────────────────────
onMounted(async () => {
  if (!auth.user.value) {
    loadingProfile.value = true
    await auth.fetchProfile()
    loadingProfile.value = false
  }

  const targetTab = useRoute().query.tab
  if (targetTab === 'quick-access' || targetTab === 'quick-actions') {
    nextTick(() => {
      document.getElementById(targetTab as string)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
  }
})
</script>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
