<template>
  <div class="flex flex-col border border-gray-100 rounded-xl overflow-hidden bg-white">
    <div class="flex items-center gap-2 px-3 py-2 border-b border-gray-100 bg-gray-50">
      <ChatBubbleLeftRightIcon class="h-4 w-4 text-gray-500" />
      <p class="text-xs font-semibold text-gray-700">{{ title }}</p>
    </div>

    <div ref="listRef" class="max-h-72 overflow-y-auto p-3 space-y-2">
      <p v-if="loading && !messages.length" class="text-xs text-gray-400">Cargando…</p>
      <p v-else-if="!messages.length" class="text-xs text-gray-400">Todavía no hay mensajes.</p>
      <div
        v-for="msg in messages"
        :key="msg.id"
        class="flex"
        :class="msg.senderId === currentUserId ? 'justify-end' : 'justify-start'"
      >
        <div
          class="max-w-[80%] rounded-2xl px-3 py-2 text-sm"
          :class="msg.senderId === currentUserId ? 'bg-red-500 text-white rounded-br-sm' : 'bg-gray-100 text-gray-800 rounded-bl-sm'"
        >
          <p v-if="msg.fromSupport && msg.senderId !== currentUserId" class="text-[10px] font-semibold text-blue-700">Soporte WorkPlace</p>
          <p class="whitespace-pre-wrap break-words">{{ msg.body }}</p>
          <p class="text-[10px] mt-0.5 text-right" :class="msg.senderId === currentUserId ? 'text-white/70' : 'text-gray-400'">
            {{ new Date(msg.createdAt).toLocaleString('es-VE', { dateStyle: 'short', timeStyle: 'short' }) }}
          </p>
        </div>
      </div>
    </div>

    <p v-if="hint" class="px-3 pt-2 text-[11px] text-gray-500">{{ hint }}</p>
    <p v-if="sendError" class="px-3 pt-1 text-xs text-red-600">{{ sendError }}</p>
    <form class="flex items-center gap-2 border-t border-gray-100 p-3" @submit.prevent="send">
      <input
        v-model="input"
        type="text"
        placeholder="Escribe un mensaje…"
        maxlength="2000"
        class="flex-1 text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-500"
      >
      <button
        type="submit"
        class="p-2 rounded-lg bg-red-500 text-white hover:bg-red-600 disabled:opacity-50 flex-shrink-0"
        :disabled="sending || !input.trim()"
      >
        <PaperAirplaneIcon class="h-4 w-4" />
      </button>
    </form>
  </div>
</template>

<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { ChatBubbleLeftRightIcon, PaperAirplaneIcon } from '@heroicons/vue/24/outline'
import { useApi } from '~/composables/core/useApi'
import { getApiErrorMessage } from '~/composables/core/useApiErrors'

interface ConversationMessage {
  id: string
  senderId: string
  fromSupport: boolean
  body: string
  createdAt: string
}

const props = withDefaults(defineProps<{
  threadType: 'CATALOG_ORDER' | 'REPORT'
  threadId: string
  currentUserId: string
  title?: string
  hint?: string
}>(), {
  title: 'Conversación',
  hint: '',
})

const { get, post, patch } = useApi()
const messages = ref<ConversationMessage[]>([])
const input = ref('')
const loading = ref(false)
const sending = ref(false)
const sendError = ref<string | null>(null)
const listRef = ref<HTMLElement | null>(null)
let timer: ReturnType<typeof setInterval> | null = null

const base = () => `/conversations/${props.threadType}/${props.threadId}`

function scrollToBottom() {
  nextTick(() => { if (listRef.value) listRef.value.scrollTop = listRef.value.scrollHeight })
}

async function load(showLoading = true) {
  if (showLoading) loading.value = true
  try {
    const before = messages.value.length
    messages.value = await get<ConversationMessage[]>(`${base()}/messages`)
    if (messages.value.length !== before) scrollToBottom()
    patch(`${base()}/read`, {}).catch(() => {})
  } catch {
    // Sin acceso o sin red: el chat queda vacío y se reintenta en el próximo ciclo.
  } finally {
    loading.value = false
  }
}

async function send() {
  const body = input.value.trim()
  if (!body || sending.value) return
  sending.value = true
  sendError.value = null
  try {
    const created = await post<ConversationMessage>(`${base()}/messages`, { body })
    messages.value.push(created)
    input.value = ''
    scrollToBottom()
  } catch (e) {
    // Se rechazan datos de contacto: el texto queda para corregirlo.
    sendError.value = getApiErrorMessage(e, 'No se pudo enviar el mensaje')
  } finally {
    sending.value = false
  }
}

onMounted(() => {
  load()
  timer = setInterval(() => load(false), 10000)
})
onBeforeUnmount(() => { if (timer) clearInterval(timer) })
watch(() => props.threadId, () => { messages.value = []; load() })
</script>
