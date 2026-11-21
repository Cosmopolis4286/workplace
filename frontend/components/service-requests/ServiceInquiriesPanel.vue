<template>
  <section class="space-y-4">
    <div class="flex items-center justify-between">
      <div>
        <h2 class="text-lg font-bold text-gray-900">Consultas preliminares</h2>
        <p class="text-sm text-gray-500">
          {{ asRole === 'provider' ? 'Personas interesadas en tus servicios' : 'Consultas que has enviado a prestadores' }}
        </p>
      </div>
      <button
        class="rounded-xl border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-50"
        :disabled="loading"
        @click="load"
      >
        Actualizar
      </button>
    </div>

    <p v-if="error" class="rounded-xl bg-red-50 p-3 text-sm text-red-700">{{ error }}</p>
    <div v-if="loading" class="rounded-2xl border border-gray-200 bg-white p-8 text-center text-sm text-gray-500">
      Cargando consultas...
    </div>
    <div v-else-if="!inquiries.length" class="rounded-2xl border border-dashed border-gray-300 bg-white p-8 text-center">
      <p class="font-semibold text-gray-700">Todavía no tienes consultas</p>
      <p class="mt-1 text-sm text-gray-500">Las consultas iniciales aparecerán aquí, separadas de las contrataciones formales.</p>
    </div>
    <article v-for="inquiry in inquiries" :key="inquiry.id" class="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
      <div class="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 class="font-bold text-gray-900">{{ inquiry.service?.name ?? 'Servicio' }}</h3>
          <p class="mt-1 text-xs text-gray-500">
            {{ asRole === 'provider' ? 'Consulta recibida' : 'Consulta enviada' }} · {{ formatDate(inquiry.createdAt) }}
          </p>
        </div>
        <span class="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">
          {{ statusLabel(inquiry.status) }}
        </span>
      </div>

      <p v-if="inquiry.message" class="mt-3 whitespace-pre-wrap text-sm text-gray-700">{{ inquiry.message }}</p>
      <div class="mt-3 flex flex-wrap gap-3 text-xs text-gray-500">
        <span v-if="inquiry.modality">Modalidad: {{ modalityLabel(inquiry.modality) }}</span>
        <span v-if="inquiry.preferredDate">Fecha preferida: {{ formatDate(inquiry.preferredDate) }}</span>
        <span v-if="inquiry.city">{{ inquiry.city }}</span>
      </div>
      <p v-if="asRole === 'provider' && inquiry.contactHidden" class="mt-3 text-xs text-gray-500">
        El teléfono y la dirección exacta del cliente permanecen privados durante la consulta preliminar.
      </p>

      <div v-if="inquiry.providerResponse" class="mt-4 rounded-xl bg-green-50 p-3">
        <p class="text-xs font-bold text-green-800">Respuesta del prestador</p>
        <p class="mt-1 whitespace-pre-wrap text-sm text-green-900">{{ inquiry.providerResponse }}</p>
      </div>

      <div v-if="inquiry.status === 'OPEN' || inquiry.status === 'RESPONDED'" class="mt-4 flex flex-wrap justify-end gap-2">
        <button
          v-if="asRole === 'client'"
          class="rounded-xl border border-red-200 px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50"
          :disabled="statusChangingId === inquiry.id"
          @click="changeStatus(inquiry, 'CANCEL')"
        >
          Cancelar consulta
        </button>
        <button
          class="rounded-xl border border-gray-300 px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          :disabled="statusChangingId === inquiry.id"
          @click="changeStatus(inquiry, 'CLOSE')"
        >
          {{ statusChangingId === inquiry.id ? 'Cerrando...' : 'Cerrar consulta' }}
        </button>
      </div>

      <div v-if="asRole === 'client' && (inquiry.status === 'OPEN' || inquiry.status === 'RESPONDED')" class="mt-4 flex justify-end">
        <button
          class="rounded-xl bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
          :disabled="convertingId === inquiry.id"
          @click="openConversion(inquiry)"
        >
          Convertir en contratación
        </button>
      </div>

      <div v-if="conversionTargetId === inquiry.id" class="mt-3 space-y-3 rounded-xl border border-blue-200 bg-blue-50 p-4">
        <div>
          <p class="text-sm font-bold text-blue-900">Confirmar contratación</p>
          <p class="mt-1 text-xs text-blue-800">Se creará una solicitud formal vinculada a esta consulta. Se aplicará la verificación KYC requerida. No se realizará ningún pago ni retención automáticamente.</p>
        </div>
        <label class="block text-xs font-semibold text-gray-700">
          Fecha preferida
          <input v-model="conversionDate" type="date" :min="today" class="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm" />
        </label>
        <label class="block text-xs font-semibold text-gray-700">
          Teléfono de contacto
          <input v-model="conversionPhone" type="tel" maxlength="20" placeholder="+584121234567" class="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm" />
        </label>
        <div class="flex justify-end gap-2">
          <button class="rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs font-semibold text-gray-700" :disabled="convertingId === inquiry.id" @click="closeConversion">Cancelar</button>
          <button class="rounded-lg bg-blue-600 px-3 py-2 text-xs font-bold text-white disabled:opacity-50" :disabled="convertingId === inquiry.id || (!conversionDate && !inquiry.preferredDate) || !conversionPhone.trim()" @click="convertInquiry(inquiry)">
            {{ convertingId === inquiry.id ? 'Creando contratación...' : 'Confirmar y crear solicitud' }}
          </button>
        </div>
      </div>

      <div class="mt-4 flex justify-end">
        <button
          class="rounded-xl border border-blue-200 px-3 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-50"
          @click="toggleConversation(inquiry.id)"
        >
          {{ openConversationId === inquiry.id ? 'Ocultar conversación' : 'Abrir conversación' }}
        </button>
      </div>
      <ConversationChat
        v-if="openConversationId === inquiry.id"
        class="mt-3"
        thread-type="SERVICE_INQUIRY"
        :thread-id="inquiry.id"
        :current-user-id="user?.id ?? ''"
        title="Conversación preliminar"
        hint="Mantén el contacto dentro de WorkPlace. No compartas teléfonos, correos ni enlaces externos."
        :read-only="inquiry.status === 'CLOSED' || inquiry.status === 'CANCELLED' || inquiry.status === 'CONVERTED'"
        read-only-text="Consulta cerrada o convertida. Puedes revisar el historial, pero ya no enviar mensajes."
      />

      <div v-if="asRole === 'provider' && inquiry.status === 'OPEN'" class="mt-4 space-y-2">
        <textarea
          v-model="responses[inquiry.id]"
          rows="2"
          maxlength="600"
          placeholder="Responde la consulta sin compartir datos de contacto externos..."
          class="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-blue-400"
        />
        <div class="flex justify-end">
          <button
            class="rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            :disabled="sendingId === inquiry.id || !responses[inquiry.id]?.trim()"
            @click="respond(inquiry)"
          >
            {{ sendingId === inquiry.id ? 'Enviando...' : 'Enviar respuesta' }}
          </button>
        </div>
      </div>
    </article>
  </section>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref, watch } from 'vue'
import { useApi } from '~/composables/core/useApi'
import ConversationChat from '~/components/conversations/ConversationChat.vue'

type Inquiry = {
  id: string
  status: 'OPEN' | 'RESPONDED' | 'CLOSED' | 'CANCELLED' | 'CONVERTED'
  modality: string
  preferredDate?: string | null
  city?: string | null
  message?: string | null
  providerResponse?: string | null
  contactHidden?: boolean
  createdAt: string
  service?: { name: string }
}

const props = defineProps<{ asRole: 'provider' | 'client' }>()
const { user } = useAuth()
const openConversationId = ref('')

function toggleConversation(inquiryId: string) {
  openConversationId.value = openConversationId.value === inquiryId ? '' : inquiryId
}
const { get, patch } = useApi()
const inquiries = ref<Inquiry[]>([])
const loading = ref(false)
const error = ref('')
const sendingId = ref('')
const statusChangingId = ref('')
const convertingId = ref('')
const conversionTargetId = ref('')
const conversionDate = ref('')
const conversionPhone = ref('')
const today = new Date().toISOString().slice(0, 10)
const responses = reactive<Record<string, string>>({})

function formatDate(value: string) {
  return new Date(value).toLocaleString('es-VE', { dateStyle: 'medium', timeStyle: 'short' })
}
function statusLabel(status: Inquiry['status']) {
  return ({ OPEN: 'Pendiente', RESPONDED: 'Respondida', CLOSED: 'Cerrada', CANCELLED: 'Cancelada', CONVERTED: 'Convertida en contratación' })[status]
}
function modalityLabel(value: string) {
  const labels: Record<string, string> = {
    IN_PERSON: 'Presencial',
    REMOTE: 'Remoto',
    ANY: 'A convenir',
  }
  return labels[value] ?? value
}

async function load() {
  loading.value = true
  error.value = ''
  try {
    const result = await get<{ data: Inquiry[] }>(`/services/requests/inquiries/mine?as=${props.asRole}`)
    inquiries.value = result.data
  } catch (e: any) {
    error.value = e?.message ?? 'No se pudieron cargar las consultas.'
  } finally {
    loading.value = false
  }
}

async function respond(inquiry: Inquiry) {
  const response = responses[inquiry.id]?.trim()
  if (!response) return
  sendingId.value = inquiry.id
  error.value = ''
  try {
    await patch(`/services/requests/inquiries/${inquiry.id}/respond`, { response })
    responses[inquiry.id] = ''
    await load()
  } catch (e: any) {
    error.value = e?.message ?? 'No se pudo enviar la respuesta.'
  } finally {
    sendingId.value = ''
  }
}

function openConversion(inquiry: Inquiry) {
  conversionTargetId.value = inquiry.id
  conversionDate.value = inquiry.preferredDate ? new Date(inquiry.preferredDate).toISOString().slice(0, 10) : ''
  conversionPhone.value = ''
}
function closeConversion() {
  conversionTargetId.value = ''
  conversionDate.value = ''
  conversionPhone.value = ''
}
async function convertInquiry(inquiry: Inquiry) {
  convertingId.value = inquiry.id
  error.value = ''
  try {
    await post(`/services/requests/inquiries/${inquiry.id}/convert`, {
      ...(conversionDate.value ? { preferredDate: new Date(`${conversionDate.value}T12:00:00`).toISOString() } : {}),
      clientPhone: conversionPhone.value.trim(),
    })
    closeConversion()
    await load()
  } catch (e: any) {
    error.value = e?.message ?? 'No se pudo crear la contratación. Verifica tu KYC y los datos de contacto.'
  } finally {
    convertingId.value = ''
  }
}

async function changeStatus(inquiry: Inquiry, action: 'CANCEL' | 'CLOSE') {
  const message = action === 'CANCEL'
    ? '¿Quieres cancelar esta consulta? La conversación quedará en solo lectura.'
    : '¿Quieres cerrar esta consulta? La conversación quedará en solo lectura.'
  if (!window.confirm(message)) return

  statusChangingId.value = inquiry.id
  error.value = ''
  try {
    await patch(`/services/requests/inquiries/${inquiry.id}/status`, { action })
    if (openConversationId.value === inquiry.id) openConversationId.value = ''
    await load()
  } catch (e: any) {
    error.value = e?.message ?? 'No se pudo actualizar la consulta.'
  } finally {
    statusChangingId.value = ''
  }
}

watch(() => props.asRole, load)
onMounted(load)
</script>
