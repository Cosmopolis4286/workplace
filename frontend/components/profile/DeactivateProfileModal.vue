<template>
  <Teleport to="body">
    <div v-if="modelValue" class="fixed inset-0 z-[300] flex items-center justify-center p-4">
      <div class="absolute inset-0 bg-black/50 backdrop-blur-sm" @click="close" />
      <div class="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4">
        <div>
          <h3 class="font-black text-gray-900 text-lg">¿Desactivar {{ label }}?</h3>
          <p class="text-sm text-gray-500 mt-1">
            {{ description }} Puedes reactivarlo cuando quieras, con los mismos datos.
          </p>
        </div>

        <p v-if="loading" class="text-sm text-gray-400">Revisando tu perfil…</p>

        <!-- Lo que impide desactivar ahora: no se deja confirmar -->
        <div v-else-if="blockers.length" class="rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 space-y-1.5">
          <p class="text-sm font-semibold text-amber-900">Antes de desactivarlo:</p>
          <ul class="list-disc pl-5 text-sm text-amber-800 space-y-1">
            <li v-for="b in blockers" :key="b">{{ b }}</li>
          </ul>
        </div>

        <template v-else>
          <div>
            <label class="block text-xs font-semibold text-gray-700 mb-1.5">Motivo <span class="text-red-500">*</span></label>
            <select
              v-model="reason"
              class="w-full px-3 py-2 text-sm border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-4 focus:ring-workplace-red/20 focus:border-workplace-red bg-white"
            >
              <option value="" disabled>Selecciona un motivo</option>
              <option v-for="opt in reasons" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
            </select>
          </div>
          <div>
            <label class="block text-xs font-semibold text-gray-700 mb-1.5">
              {{ reason === 'OTHER' ? 'Cuéntanos el motivo' : 'Comentario' }}
              <span v-if="reason === 'OTHER'" class="text-red-500">*</span>
              <span v-else class="font-normal text-gray-400">(opcional)</span>
            </label>
            <textarea
              v-model="note"
              rows="3"
              maxlength="500"
              placeholder="Nos ayuda a mejorar"
              class="w-full px-3 py-2 text-sm border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-4 focus:ring-workplace-red/20 focus:border-workplace-red resize-none"
            />
          </div>
        </template>

        <p v-if="error" class="text-xs text-red-600">{{ error }}</p>

        <div class="flex gap-3 pt-1">
          <button class="flex-1 border border-gray-200 text-gray-700 font-semibold py-2.5 rounded-xl hover:bg-gray-50 text-sm" @click="close">
            {{ blockers.length ? 'Entendido' : 'Cancelar' }}
          </button>
          <button
            v-if="!loading && !blockers.length"
            :disabled="!canSubmit || submitting"
            class="flex-1 bg-workplace-red text-white font-semibold py-2.5 rounded-xl hover:bg-red-700 disabled:opacity-50 text-sm"
            @click="submit"
          >
            {{ submitting ? 'Desactivando…' : 'Desactivar' }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import {
  useProfileActivations,
  type DeactivationReasonOption,
  type ProfileDeactivationReason,
} from '~/composables/users/useProfileActivations'
import { getApiErrorMessage } from '~/composables/core/useApiErrors'

const props = defineProps<{
  modelValue: boolean
  profileId: string
  label: string
  description: string
}>()
const emit = defineEmits<{
  'update:modelValue': [boolean]
  deactivated: []
}>()

const { fetchDeactivationReasons, checkDeactivation, deactivate } = useProfileActivations()

const reasons = ref<DeactivationReasonOption[]>([])
const blockers = ref<string[]>([])
const reason = ref<ProfileDeactivationReason | ''>('')
const note = ref('')
const loading = ref(false)
const submitting = ref(false)
const error = ref('')

const canSubmit = computed(() =>
  !!reason.value && (reason.value !== 'OTHER' || note.value.trim().length >= 5),
)

watch(() => props.modelValue, async (open) => {
  if (!open) return
  reason.value = ''
  note.value = ''
  error.value = ''
  blockers.value = []
  loading.value = true
  try {
    // En paralelo: los motivos y lo que impide desactivar ahora.
    const [opts, blocks] = await Promise.all([
      reasons.value.length ? Promise.resolve(reasons.value) : fetchDeactivationReasons(),
      checkDeactivation(props.profileId),
    ])
    reasons.value = opts
    blockers.value = blocks
  } catch (e: unknown) {
    error.value = getApiErrorMessage(e, 'No se pudo cargar la información del perfil')
  } finally {
    loading.value = false
  }
}, { immediate: true })

function close() {
  emit('update:modelValue', false)
}

async function submit() {
  if (!canSubmit.value || !reason.value) return
  submitting.value = true
  error.value = ''
  try {
    await deactivate(props.profileId, { reason: reason.value, note: note.value.trim() || undefined })
    emit('deactivated')
    close()
  } catch (e: unknown) {
    // El backend vuelve a validar: si apareció trabajo en curso, se muestra.
    const data = (e as { data?: { blockers?: string[] } })?.data
    if (data?.blockers?.length) blockers.value = data.blockers
    else error.value = getApiErrorMessage(e, 'No se pudo desactivar el perfil')
  } finally {
    submitting.value = false
  }
}
</script>
