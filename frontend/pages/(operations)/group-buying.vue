<template>
  <div>
    <PageHeader
      title="Compra Agrupada"
      description="Uní volumen con otros comercios para acceder a mejores precios por cantidad"
      :icon="UserGroupIcon"
      :breadcrumb="breadcrumbItems"
    >
      <template #actions>
        <HeaderActionButton variant="primary" :icon="PlusIcon" @click="showCampaignModal = true">
          Nueva campaña
        </HeaderActionButton>
      </template>
    </PageHeader>

    <div v-if="error" class="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center justify-between">
      <p class="text-red-700 text-sm">{{ error }}</p>
      <button class="text-red-500 hover:text-red-700" @click="error = null">
        <XMarkIcon class="h-4 w-4" />
      </button>
    </div>

    <div v-if="loading" class="space-y-3">
      <div v-for="i in 3" :key="i" class="skeleton h-24 rounded-xl" />
    </div>

    <div v-else-if="campaigns.length === 0" class="card p-12 text-center">
      <UserGroupIcon class="h-12 w-12 text-gray-300 mx-auto mb-3" />
      <p class="text-gray-500">No hay campañas de compra agrupada abiertas</p>
      <button class="btn-primary mt-4 text-sm" @click="showCampaignModal = true">Crear la primera</button>
    </div>

    <div v-else class="grid gap-4 sm:grid-cols-2">
      <div v-for="campaign in campaigns" :key="campaign.id" class="card p-4">
        <div class="flex items-start justify-between gap-2">
          <div class="min-w-0">
            <p class="font-medium text-gray-900 truncate">{{ campaign.title }}</p>
            <p v-if="campaign.description" class="text-sm text-gray-500 line-clamp-2">{{ campaign.description }}</p>
          </div>
          <span class="badge bg-blue-100 text-blue-800 shrink-0">{{ daysLeft(campaign.deadline) }}</span>
        </div>

        <div class="mt-3 p-3 bg-gray-50 rounded-lg text-sm space-y-1.5">
          <p class="flex justify-between">
            <span class="text-gray-500">Comprometido</span>
            <span class="font-medium text-gray-800">{{ campaign.totalQuantity }} {{ campaign.unit }}</span>
          </p>
          <p class="flex justify-between">
            <span class="text-gray-500">Precio actual</span>
            <span class="font-medium" :class="campaign.currentUnitPrice != null ? 'text-green-700' : 'text-gray-400'">
              {{ campaign.currentUnitPrice != null ? formatMoney(campaign.currentUnitPrice, campaign.currencyCode) : 'Sin tramo alcanzado' }}
            </span>
          </p>
          <p v-if="campaign.nextTier" class="text-xs text-blue-600">
            Faltan {{ campaign.nextTier.unitsToUnlock }} {{ campaign.unit }} para {{ formatMoney(campaign.nextTier.unitPrice, campaign.currencyCode) }}
          </p>
          <p v-else class="text-xs text-green-600">Mejor tramo de precio alcanzado 🎉</p>
        </div>

        <div class="mt-3 flex flex-wrap gap-2">
          <button class="btn-primary text-xs flex-1" @click="openPledgeModal(campaign)">
            Comprometer cantidad
          </button>
          <button
            v-if="isOrganizer(campaign) && campaign.pledges?.some(p => !p.cancelled)"
            class="btn-secondary text-xs" @click="handleClose(campaign)"
          >
            Cerrar campaña
          </button>
          <button v-if="isOrganizer(campaign)" class="text-xs text-red-500 hover:text-red-700 px-2" @click="handleCancel(campaign)">
            Cancelar
          </button>
        </div>

        <details v-if="campaign.pledges?.length" class="mt-2">
          <summary class="text-xs text-gray-400 cursor-pointer hover:text-gray-600">
            Ver {{ campaign.pledges.filter(p => !p.cancelled).length }} compromiso(s)
          </summary>
          <ul class="mt-2 space-y-1">
            <li
              v-for="p in campaign.pledges.filter(p => !p.cancelled)" :key="p.id"
              class="text-xs text-gray-500 flex justify-between"
            >
              <span>{{ p.commerce?.name ?? 'Comercio' }}</span>
              <span>{{ p.quantity }} {{ campaign.unit }}</span>
            </li>
          </ul>
        </details>
      </div>
    </div>

    <GroupBuyingCampaignModal
      :is-open="showCampaignModal"
      @close="showCampaignModal = false"
      @created="loadCampaigns"
    />
    <GroupBuyingPledgeModal
      :is-open="showPledgeModal"
      :campaign="selectedCampaign"
      @close="showPledgeModal = false"
      @pledged="loadCampaigns"
    />
  </div>
</template>

<script setup lang="ts">
definePageMeta({ middleware: 'auth' })

import { ref, onMounted } from 'vue'
import { UserGroupIcon, PlusIcon, XMarkIcon } from '@heroicons/vue/24/outline'
import PageHeader from '~/components/ui/PageHeader.vue'
import HeaderActionButton from '~/components/ui/HeaderActionButton.vue'
import GroupBuyingCampaignModal from '~/components/modals/GroupBuyingCampaignModal.vue'
import GroupBuyingPledgeModal from '~/components/modals/GroupBuyingPledgeModal.vue'
import { useGroupBuying, type GroupBuyingCampaign } from '~/composables/commerce/useGroupBuying'
import { useAuth } from '~/composables/auth/useAuth'

const { campaigns, loading, error, loadCampaigns, closeCampaign, cancelCampaign } = useGroupBuying()
const { user } = useAuth()

const showCampaignModal = ref(false)
const showPledgeModal = ref(false)
const selectedCampaign = ref<GroupBuyingCampaign | null>(null)

const breadcrumbItems = [
  { label: 'Dashboard', to: '/' },
  { label: 'Compra Agrupada' },
]

function isOrganizer(campaign: GroupBuyingCampaign) {
  return campaign.organizerId === user.value?.id
}

function openPledgeModal(campaign: GroupBuyingCampaign) {
  selectedCampaign.value = campaign
  showPledgeModal.value = true
}

async function handleClose(campaign: GroupBuyingCampaign) {
  if (!confirm(`¿Cerrar "${campaign.title}"? Se cobrará la comisión de plataforma y no se podrán agregar más compromisos.`)) return
  await closeCampaign(campaign.id)
}

async function handleCancel(campaign: GroupBuyingCampaign) {
  if (!confirm(`¿Cancelar "${campaign.title}"? Esta acción no se puede deshacer.`)) return
  await cancelCampaign(campaign.id)
}

function daysLeft(deadline: string) {
  const days = Math.ceil((new Date(deadline).getTime() - Date.now()) / 86_400_000)
  if (days <= 0) return 'Vence hoy'
  return `${days} día${days === 1 ? '' : 's'}`
}

function formatMoney(amount: number, currencyCode: string) {
  return new Intl.NumberFormat('es-VE', { style: 'currency', currency: currencyCode }).format(amount)
}

onMounted(loadCampaigns)
</script>

<style scoped>
.badge { @apply inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium; }
.skeleton { @apply bg-gray-200 animate-pulse; }
</style>
