<template>
  <div class="border border-gray-100 rounded-xl overflow-hidden flex flex-col">
    <div class="flex items-center gap-2 px-4 py-2.5 bg-gray-50/70 border-b border-gray-100">
      <ChatBubbleLeftRightIcon class="h-3.5 w-3.5 text-gray-400" />
      <p class="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Mensajes</p>
    </div>

    <div ref="messagesScrollEl" class="max-h-64 overflow-y-auto p-4 space-y-2.5 bg-white">
      <p v-if="loadingMessages" class="text-xs text-gray-400 text-center py-2">Cargando mensajes…</p>
      <p v-else-if="!messages.length" class="text-xs text-gray-400 italic text-center py-2">
        Aún no hay mensajes. Escribe para coordinar con {{ contactName }}.
      </p>
      <div
        v-for="msg in messages"
        :key="msg.id"
        class="flex"
        :class="msg.senderId === currentUserId ? 'justify-end' : 'justify-start'"
      >
        <div
          class="max-w-[75%] rounded-2xl px-3.5 py-2"
          :class="msg.senderId === currentUserId ? 'bg-red-500 text-white rounded-br-sm' : 'bg-gray-100 text-gray-800 rounded-bl-sm'"
        >
          <p class="text-sm whitespace-pre-wrap break-words">{{ msg.body }}</p>
          <p class="text-[10px] mt-0.5 text-right" :class="msg.senderId === currentUserId ? 'text-white/70' : 'text-gray-400'">
            {{ timeAgo(msg.createdAt) }}
          </p>
        </div>
      </div>
    </div>

    <form class="flex items-center gap-2 border-t border-gray-100 p-3" @submit.prevent="handleSendMessage">
      <input
        v-model="messageInput"
        type="text"
        placeholder="Escribe un mensaje…"
        maxlength="2000"
        class="flex-1 text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-500"
      />
      <button
        type="submit"
        class="p-2 rounded-lg bg-red-500 text-white hover:bg-red-600 disabled:opacity-50 flex-shrink-0"
        :disabled="sendingMessage || !messageInput.trim()"
      >
        <PaperAirplaneIcon class="h-4 w-4" />
      </button>
    </form>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, nextTick, onBeforeUnmount } from 'vue'
import { ChatBubbleLeftRightIcon, PaperAirplaneIcon } from '@heroicons/vue/24/outline'
import { useServiceRequestMessages, type ServiceRequestMessage } from '~/composables/services/useServiceRequestMessages'

const props = defineProps<{
  requestId: string
  active: boolean
  currentUserId: string
  contactName: string
  timeAgo: (d: string) => string
}>()

const { fetchMessages, sendMessage, markRead } = useServiceRequestMessages()
const messages = ref<ServiceRequestMessage[]>([])
const loadingMessages = ref(false)
const sendingMessage = ref(false)
const messageInput = ref('')
const messagesScrollEl = ref<HTMLElement | null>(null)
let messagesPollTimer: ReturnType<typeof setInterval> | null = null

function scrollMessagesToBottom() {
  nextTick(() => {
    if (messagesScrollEl.value) messagesScrollEl.value.scrollTop = messagesScrollEl.value.scrollHeight
  })
}

async function loadMessages(showSpinner: boolean) {
  if (showSpinner) loadingMessages.value = true
  try {
    messages.value = await fetchMessages(props.requestId)
  } catch {
    // silencioso: no interrumpir el resto del modal por un fallo de polling
  } finally {
    if (showSpinner) loadingMessages.value = false
  }
}

async function open() {
  await loadMessages(true)
  scrollMessagesToBottom()
  try {
    await markRead(props.requestId)
  } catch {
    // no crítico
  }
}

function stopPolling() {
  if (messagesPollTimer) { clearInterval(messagesPollTimer); messagesPollTimer = null }
}

function startPolling() {
  stopPolling()
  messagesPollTimer = setInterval(() => loadMessages(false), 10000)
}

async function handleSendMessage() {
  const body = messageInput.value.trim()
  if (!body || sendingMessage.value) return
  sendingMessage.value = true
  try {
    const created = await sendMessage(props.requestId, body)
    messages.value.push(created)
    messageInput.value = ''
    scrollMessagesToBottom()
  } catch {
    // el error queda expuesto vía `error` del composable si se necesita mostrar
  } finally {
    sendingMessage.value = false
  }
}

watch(() => props.requestId, () => { messages.value = [] })
watch(() => props.active, (visible) => {
  if (visible) { open(); startPolling() }
  else stopPolling()
}, { immediate: true })
onBeforeUnmount(stopPolling)
</script>
