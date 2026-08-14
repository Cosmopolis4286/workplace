<template>
  <div v-if="status === 'CONTACTED' || pendingProposal || resolvedProposals.length" class="border border-gray-100 rounded-xl overflow-hidden">
    <div class="flex items-center justify-between px-4 py-2.5 bg-gray-50/70 border-b border-gray-100">
      <div class="flex items-center gap-2">
        <SparklesIcon class="h-3.5 w-3.5 text-gray-400" />
        <p class="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">
          Ítems adicionales / Aumento de precio
        </p>
      </div>
      <button
        v-if="isProvider && status === 'CONTACTED' && !pendingProposal && !proposingIncrease"
        class="text-xs text-red-600 hover:text-red-700 font-medium flex items-center gap-1"
        @click="startProposeIncrease"
      >
        <PencilIcon class="h-3.5 w-3.5" />
        Proponer aumento
      </button>
    </div>

    <div class="p-4 space-y-3">
      <!-- Proveedor: formulario para proponer -->
      <template v-if="isProvider && proposingIncrease">
        <div class="space-y-2.5">
          <div v-for="(item, idx) in proposalItemsInput" :key="idx" class="border border-gray-100 rounded-lg p-3 space-y-2">
            <div class="flex items-center justify-between">
              <p class="text-[11px] font-semibold text-gray-400">Ítem {{ idx + 1 }}</p>
              <button v-if="proposalItemsInput.length > 1" type="button" class="text-gray-300 hover:text-red-500" @click="removeProposalItem(idx)">
                <XMarkIcon class="h-3.5 w-3.5" />
              </button>
            </div>
            <input
              v-model="item.description"
              type="text"
              placeholder="Ej: Repuesto / SKU / descripción"
              class="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-500"
            />
            <textarea
              v-model="item.notes"
              rows="2"
              placeholder="Notas del ítem (opcional)"
              class="w-full text-sm border border-gray-200 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-red-500 resize-none"
            />
          </div>
          <button type="button" class="text-xs text-red-600 hover:text-red-700 font-medium" @click="addProposalItem">
            + Agregar otro ítem
          </button>
        </div>

        <div class="grid grid-cols-2 gap-2">
          <div>
            <label class="block text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-1">Nuevo precio total</label>
            <div class="relative">
              <span class="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">$</span>
              <input
                v-model.number="proposedPriceInput"
                type="number"
                min="0"
                :placeholder="String(price ?? 0)"
                class="w-full pl-7 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>
          </div>
          <div class="flex items-end">
            <p v-if="proposalDelta > 0" class="text-xs text-amber-700 font-semibold pb-2">
              Aumento: +${{ formatPrice(proposalDelta) }}
            </p>
          </div>
        </div>
        <textarea
          v-model="proposalNoteInput"
          rows="2"
          placeholder="Explica al cliente por qué es necesario este aumento (opcional)"
          class="w-full text-sm border border-gray-200 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-red-500 resize-none"
        />
        <div class="flex justify-end gap-2">
          <button class="btn-secondary text-xs py-1.5 px-3" @click="proposingIncrease = false">Cancelar</button>
          <button
            class="btn-primary text-xs py-1.5 px-3"
            :disabled="submitting || proposalDelta <= 0"
            @click="submitProposeIncrease"
          >
            {{ submitting ? 'Enviando…' : 'Enviar propuesta' }}
          </button>
        </div>
      </template>

      <!-- Propuesta pendiente: vista del cliente (aprobar/rechazar) -->
      <template v-else-if="!isProvider && pendingProposal">
        <div class="bg-amber-50 border border-amber-100 rounded-xl p-3.5 space-y-2">
          <div class="flex items-center justify-between text-sm">
            <span class="text-amber-800 font-bold">${{ formatPrice(pendingProposal.previousPrice) }} → ${{ formatPrice(pendingProposal.proposedPrice) }}</span>
            <span class="text-amber-700 font-semibold">+${{ formatPrice(pendingProposal.deltaAmount) }}</span>
          </div>
          <p v-if="pendingProposal.note" class="text-xs text-gray-600 italic">"{{ pendingProposal.note }}"</p>
          <ul class="text-xs text-gray-600 space-y-0.5">
            <li v-for="item in pendingProposal.items" :key="item.id">
              • {{ Object.values(item.fields ?? {}).join(' ') || item.notes || 'Ítem adicional' }}
            </li>
          </ul>
        </div>

        <div v-if="confirmingAction" class="space-y-2">
          <p class="text-xs text-gray-700 font-medium">
            {{ confirmingAction === 'approve' ? '¿Aprobar este aumento? Se retendrá el monto adicional de tu billetera.' : '¿Rechazar esta propuesta?' }}
          </p>
          <textarea
            v-if="confirmingAction === 'reject'"
            v-model="rejectReasonInput"
            rows="2"
            placeholder="Motivo (opcional)"
            class="w-full text-sm border border-gray-200 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-red-500 resize-none"
          />
          <div class="flex justify-end gap-2">
            <button class="btn-secondary text-xs py-1.5 px-3" :disabled="submitting" @click="confirmingAction = null">No</button>
            <button
              class="px-3 py-1.5 rounded-lg text-xs font-semibold text-white disabled:opacity-50"
              :class="confirmingAction === 'approve' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'"
              :disabled="submitting"
              @click="confirmingAction === 'approve' ? doApprove() : doReject()"
            >
              {{ submitting ? 'Procesando…' : (confirmingAction === 'approve' ? 'Sí, aprobar' : 'Sí, rechazar') }}
            </button>
          </div>
        </div>
        <div v-else class="flex justify-end gap-2">
          <button class="px-3 py-1.5 rounded-lg text-xs font-semibold text-red-600 border border-red-200 hover:bg-red-50" @click="confirmingAction = 'reject'">Rechazar</button>
          <button class="px-3 py-1.5 rounded-lg text-xs font-semibold bg-green-600 text-white hover:bg-green-700" @click="confirmingAction = 'approve'">Aprobar</button>
        </div>
      </template>

      <template v-else-if="isProvider && pendingProposal">
        <p class="text-xs text-gray-500 italic">Propuesta enviada, esperando respuesta del cliente.</p>
      </template>

      <p v-else-if="status === 'CONTACTED'" class="text-xs text-gray-400 italic">
        {{ isProvider ? 'Sin propuestas de aumento. Si surge trabajo adicional, puedes proponerlo aquí.' : 'El proveedor no ha propuesto ningún aumento.' }}
      </p>

      <!-- Historial de propuestas resueltas -->
      <div v-if="resolvedProposals.length" class="pt-2 border-t border-gray-100 space-y-1.5">
        <p class="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Historial</p>
        <div v-for="p in resolvedProposals" :key="p.id" class="flex items-center justify-between text-xs">
          <span class="text-gray-500">${{ formatPrice(p.previousPrice) }} → ${{ formatPrice(p.proposedPrice) }}</span>
          <span
            class="font-semibold"
            :class="{
              'text-green-600': p.status === 'APPROVED',
              'text-amber-600': p.status === 'APPROVED_PENDING_FUNDS',
              'text-red-500': p.status === 'REJECTED' || p.status === 'INVALIDATED',
            }"
          >
            {{ PROPOSAL_STATUS_LABELS[p.status] }}
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { SparklesIcon, PencilIcon, XMarkIcon } from '@heroicons/vue/24/outline'
import { useServiceRequestPriceProposals, type ServiceRequestPriceChangeProposal } from '~/composables/services/useServiceRequestPriceProposals'
import { getApiErrorMessage } from '~/composables/core/useApiErrors'

const props = defineProps<{
  requestId: string
  isProvider: boolean
  status: string
  price?: number
  formatPrice: (p: number) => string
}>()

const emit = defineEmits<{
  approved: [proposal: ServiceRequestPriceChangeProposal]
  error: [message: string]
}>()

const PROPOSAL_STATUS_LABELS: Record<string, string> = {
  PENDING: 'Pendiente',
  APPROVED: 'Aprobado',
  APPROVED_PENDING_FUNDS: 'Aprobado (sin fondos)',
  REJECTED: 'Rechazado',
  INVALIDATED: 'Invalidado',
}

const proposals = ref<ServiceRequestPriceChangeProposal[]>([])
const pendingProposal = computed(() => proposals.value.find(p => p.status === 'PENDING') ?? null)
const resolvedProposals = computed(() => proposals.value.filter(p => p.status !== 'PENDING'))

const { fetchProposals, propose, approve, reject } = useServiceRequestPriceProposals()
const submitting = ref(false)

async function loadProposals() {
  try {
    proposals.value = await fetchProposals(props.requestId)
  } catch {
    proposals.value = []
  }
}

// Proponer (proveedor)
const proposingIncrease = ref(false)
const proposalItemsInput = ref<{ description: string; notes: string }[]>([{ description: '', notes: '' }])
const proposedPriceInput = ref<number | null>(null)
const proposalNoteInput = ref('')

const proposalDelta = computed(() => {
  if (proposedPriceInput.value == null) return 0
  return proposedPriceInput.value - (props.price ?? 0)
})

function startProposeIncrease() {
  proposalItemsInput.value = [{ description: '', notes: '' }]
  proposedPriceInput.value = null
  proposalNoteInput.value = ''
  proposingIncrease.value = true
}
function addProposalItem() {
  proposalItemsInput.value.push({ description: '', notes: '' })
}
function removeProposalItem(idx: number) {
  proposalItemsInput.value.splice(idx, 1)
}

async function submitProposeIncrease() {
  submitting.value = true
  try {
    const items = proposalItemsInput.value
      .filter(i => i.description.trim() || i.notes.trim())
      .map(i => ({ fields: i.description.trim() ? { descripción: i.description.trim() } : {}, notes: i.notes.trim() || undefined }))
    await propose(props.requestId, {
      proposedPrice: proposedPriceInput.value!,
      note: proposalNoteInput.value.trim() || undefined,
      items: items.length ? items : [{ fields: {}, notes: undefined }],
    })
    proposingIncrease.value = false
    await loadProposals()
  } catch (e: any) {
    emit('error', getApiErrorMessage(e, 'Error al enviar la propuesta'))
  } finally {
    submitting.value = false
  }
}

// Aprobar/rechazar (cliente)
const confirmingAction = ref<'approve' | 'reject' | null>(null)
const rejectReasonInput = ref('')

async function doApprove() {
  if (!pendingProposal.value) return
  submitting.value = true
  try {
    const proposal = pendingProposal.value
    await approve(props.requestId, proposal.id)
    confirmingAction.value = null
    await loadProposals()
    emit('approved', proposal)
  } catch (e: any) {
    emit('error', getApiErrorMessage(e, 'Error al aprobar la propuesta'))
  } finally {
    submitting.value = false
  }
}

async function doReject() {
  if (!pendingProposal.value) return
  submitting.value = true
  try {
    await reject(props.requestId, pendingProposal.value.id, rejectReasonInput.value.trim() || undefined)
    confirmingAction.value = null
    rejectReasonInput.value = ''
    await loadProposals()
  } catch (e: any) {
    emit('error', getApiErrorMessage(e, 'Error al rechazar la propuesta'))
  } finally {
    submitting.value = false
  }
}

watch(() => props.requestId, () => { proposals.value = [] })

defineExpose({ loadProposals })
</script>
