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
        El teléfono del cliente permanece privado durante la consulta preliminar.
      </p>

      <div v-if="inquiry.providerResponse" class="mt-4 rounded-xl bg-green-50 p-3">
        <p class="text-xs font-bold text-green-800">Respuesta del prestador</p>
        <p class="mt-1 whitespace-pre-wrap text-sm text-green-900">{{ inquiry.providerResponse }}</p>
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
        :read-only="inquiry.status === 'CLOSED' || inquiry.status === 'CANCELLED'"
        read-only-text="Consulta cerrada. Puedes revisar el historial, pero ya no enviar mensajes."
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
  status: 'OPEN' | 'RESPONDED' | 'CLOSED' | 'CANCELLED'
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
const responses = reactive<Record<string, string>>({})

function formatDate(value: string) {
  return new Date(value).toLocaleString('es-VE', { dateStyle: 'medium', timeStyle: 'short' })
}
function statusLabel(status: Inquiry['status']) {
  return ({ OPEN: 'Pendiente', RESPONDED: 'Respondida', CLOSED: 'Cerrada', CANCELLED: 'Cancelada' })[status]
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

watch(() => props.asRole, load)
onMounted(load)
</script>
