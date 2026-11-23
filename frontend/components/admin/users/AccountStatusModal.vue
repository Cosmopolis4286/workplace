<template>
  <Teleport to="body">
    <div v-if="modelValue && user" class="fixed inset-0 z-[300] flex items-center justify-center p-4">
      <div class="absolute inset-0 bg-black/50 backdrop-blur-sm" @click="close" />
      <div class="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4">
        <div>
          <h3 class="font-black text-gray-900 text-lg">
            {{ suspending ? 'Suspender cuenta' : 'Reactivar cuenta' }}
          </h3>
          <p class="text-sm text-gray-500 mt-1">
            <strong class="text-gray-700">{{ user.firstName }} {{ user.lastName }}</strong> · {{ user.email }}
          </p>
        </div>

        <template v-if="suspending">
          <p class="rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 text-xs text-amber-800">
            Se cierran todas sus sesiones y no podrá iniciar sesión hasta que la reactives. Le avisamos por correo con el
            motivo (la nota es interna y no se le envía).
          </p>
          <div>
            <label for="suspend-reason" class="block text-xs font-semibold text-gray-700 mb-1.5">Motivo <span class="text-red-500">*</span></label>
            <select id="suspend-reason" v-model="reason" class="input-field w-full">
              <option value="" disabled>Selecciona un motivo</option>
              <option v-for="opt in reasons" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
            </select>
          </div>
        </template>
        <p v-else-if="user.suspensionReason" class="text-sm text-gray-600">
          Estaba suspendida por: <strong>{{ reasonLabel(user.suspensionReason) }}</strong>
          <span v-if="user.suspensionNote" class="block text-xs text-gray-500 mt-1">Nota: {{ user.suspensionNote }}</span>
        </p>

        <div>
          <label for="status-note" class="block text-xs font-semibold text-gray-700 mb-1.5">
            {{ noteRequired ? 'Explica el motivo' : 'Nota interna' }}
            <span v-if="noteRequired" class="text-red-500">*</span>
            <span v-else class="font-normal text-gray-400">(opcional)</span>
          </label>
          <textarea
            id="status-note"
            v-model="note"
            rows="3"
            maxlength="500"
            :placeholder="suspending ? 'Qué pasó, referencias, número de reclamo…' : 'Por qué se reactiva'"
            class="input-field w-full resize-none"
          />
        </div>

        <p v-if="error" class="text-xs text-red-600">{{ error }}</p>

        <div class="flex gap-3 pt-1">
          <button class="flex-1 btn-secondary" :disabled="submitting" @click="close">Cancelar</button>
          <button
            :disabled="!canSubmit || submitting"
            class="flex-1 font-semibold py-2.5 rounded-xl text-sm text-white disabled:opacity-50"
            :class="suspending ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'"
            @click="submit"
          >
            {{ submitting ? 'Guardando…' : suspending ? 'Suspender' : 'Reactivar' }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import {
  useUsers,
  type AccountStatusResult,
  type AccountSuspensionReason,
  type SuspensionReasonOption,
} from '~/composables/users/useUsers'
import { getApiErrorMessage } from '~/composables/core/useApiErrors'

interface StatusTarget {
  id: string
  firstName: string
  lastName: string
  email: string
  isActive: boolean
  suspensionReason?: AccountSuspensionReason | null
  suspensionNote?: string | null
}

const props = defineProps<{ modelValue: boolean; user: StatusTarget | null }>()
const emit = defineEmits<{ 'update:modelValue': [value: boolean]; done: [result: AccountStatusResult] }>()

const { fetchSuspensionReasons, suspendUser, reactivateUser } = useUsers()

// Se carga una sola vez por sesión de la página.
const reasons = ref<SuspensionReasonOption[]>([])
const reason = ref<AccountSuspensionReason | ''>('')
const note = ref('')
const error = ref('')
const submitting = ref(false)

const suspending = computed(() => Boolean(props.user?.isActive))
const noteRequired = computed(() => suspending.value && reason.value === 'OTHER')
const canSubmit = computed(() => {
  if (!suspending.value) return true
  if (!reason.value) return false
  return !noteRequired.value || note.value.trim().length >= 5
})

function reasonLabel(value: AccountSuspensionReason) {
  return reasons.value.find(r => r.value === value)?.label ?? value
}

watch(
  () => props.modelValue,
  async (open) => {
    if (!open) return
    reason.value = ''
    note.value = ''
    error.value = ''
    if (!reasons.value.length) {
      try { reasons.value = await fetchSuspensionReasons() } catch { /* el select queda vacío y el error se ve al enviar */ }
    }
  },
  { immediate: true },
)

function close() {
  if (!submitting.value) emit('update:modelValue', false)
}

async function submit() {
  if (!props.user || !canSubmit.value) return
  submitting.value = true
  error.value = ''
  try {
    const result = suspending.value
      ? await suspendUser(props.user.id, {
          reason: reason.value as AccountSuspensionReason,
          ...(note.value.trim() ? { note: note.value.trim() } : {}),
        })
      : await reactivateUser(props.user.id, note.value.trim() || undefined)
    emit('done', result)
    emit('update:modelValue', false)
  } catch (e) {
    error.value = getApiErrorMessage(e, 'No se pudo cambiar el estado de la cuenta')
  } finally {
    submitting.value = false
  }
}
</script>
