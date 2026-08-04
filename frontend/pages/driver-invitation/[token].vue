<template>
  <NuxtLayout :name="layout">
  <div class="max-w-md mx-auto px-4 py-10">

    <!-- Loading -->
    <div v-if="loading" class="card-premium p-6 animate-pulse space-y-4">
      <div class="h-6 w-48 bg-gray-200 rounded" />
      <div class="h-24 bg-gray-200 rounded-xl" />
    </div>

    <!-- Not found / error -->
    <div v-else-if="loadError" class="card-premium p-8 text-center">
      <div class="text-5xl mb-4">😕</div>
      <h2 class="text-xl font-bold text-gray-800 mb-2">Invitación no encontrada</h2>
      <p class="text-gray-500 mb-6">{{ loadError }}</p>
      <NuxtLink to="/" class="inline-flex items-center gap-2 px-5 py-2.5 bg-workplace-red text-white rounded-xl font-semibold">
        Volver al inicio
      </NuxtLink>
    </div>

    <template v-else-if="invitation">
      <div class="card-premium p-6 space-y-6">
        <div class="text-center">
          <div class="p-3 rounded-xl shadow-lg bg-gradient-to-br from-red-500 to-red-600 inline-flex mb-3">
            <TruckIcon class="h-7 w-7 text-white" />
          </div>
          <h1 class="text-lg font-bold text-gray-900">Invitación de repartidor</h1>
          <p class="text-sm text-gray-500 mt-1">
            <strong>{{ invitation.commerceName }}</strong> te invitó a unirte como repartidor.
          </p>
        </div>

        <!-- Invitación ya no disponible -->
        <div v-if="invitation.status !== 'PENDING'" class="p-4 bg-amber-50 border border-amber-100 rounded-xl text-sm text-amber-700 text-center">
          <template v-if="invitation.status === 'EXPIRED'">Esta invitación expiró. Pide al comercio que te envíe una nueva.</template>
          <template v-else-if="invitation.status === 'ACCEPTED'">Esta invitación ya fue aceptada.</template>
          <template v-else>Esta invitación ya no está disponible.</template>
        </div>

        <template v-else>
          <!-- Sin sesión: pedir login/registro -->
          <div v-if="!isAuthenticated" class="space-y-3">
            <p class="text-sm text-gray-600 text-center">
              Para aceptar, primero crea una cuenta o inicia sesión. Vuelve a este mismo enlace después.
            </p>
            <div class="flex gap-3">
              <NuxtLink to="/register" class="flex-1 text-center py-2.5 bg-workplace-red text-white rounded-xl font-semibold text-sm">
                Crear cuenta
              </NuxtLink>
              <NuxtLink to="/login" class="flex-1 text-center py-2.5 bg-gray-100 text-gray-700 rounded-xl font-semibold text-sm">
                Iniciar sesión
              </NuxtLink>
            </div>
          </div>

          <!-- Con sesión: aceptar -->
          <div v-else class="space-y-4">
            <div v-if="acceptError" class="p-3 bg-red-50 border border-red-100 rounded-xl text-sm text-red-600">{{ acceptError }}</div>

            <div v-if="kycStatus && kycStatus !== 'APPROVED'" class="p-3 bg-amber-50 border border-amber-100 rounded-xl text-sm text-amber-700">
              Podrás aceptar la invitación, pero necesitarás verificar tu identidad antes de recibir entregas.
              <NuxtLink to="/verification" class="font-semibold underline">Verifícate aquí</NuxtLink>.
            </div>

            <button
              class="w-full py-3 bg-workplace-red text-white rounded-xl font-semibold text-sm disabled:opacity-60"
              :disabled="accepting"
              @click="handleAccept"
            >
              {{ accepting ? 'Aceptando...' : 'Aceptar invitación' }}
            </button>
          </div>
        </template>
      </div>
    </template>

  </div>
  </NuxtLayout>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { TruckIcon } from '@heroicons/vue/24/outline'
import { useAuth } from '~/composables/useAuth'
import { useKyc } from '~/composables/useKyc'
import { useDelivery, type DriverInvitationStatus } from '~/composables/useDelivery'

definePageMeta({ layout: false })

const route = useRoute()
const token = route.params.token as string

const { isAuthenticated } = useAuth()
const { myStatus: myKycStatus, fetchMyStatus: fetchMyKycStatus } = useKyc()
const kycStatus = computed(() => myKycStatus.value?.kycStatus)
const { previewInvitation, acceptInvitation } = useDelivery()

const layout = computed(() => isAuthenticated.value ? 'default' : 'public')

const loading = ref(true)
const loadError = ref<string | null>(null)
const invitation = ref<{ commerceName: string; status: DriverInvitationStatus } | null>(null)

const accepting = ref(false)
const acceptError = ref<string | null>(null)

async function handleAccept() {
  accepting.value = true
  acceptError.value = null
  try {
    await acceptInvitation(token)
    await navigateTo('/delivery')
  } catch (e: any) {
    acceptError.value = e?.message ?? 'No se pudo aceptar la invitación. Intenta de nuevo.'
  } finally {
    accepting.value = false
  }
}

onMounted(async () => {
  try {
    invitation.value = await previewInvitation(token)
  } catch (e: any) {
    loadError.value = e?.message ?? 'Esta invitación no existe o ya no está disponible.'
  } finally {
    loading.value = false
  }
  if (isAuthenticated.value) fetchMyKycStatus()
})
</script>
