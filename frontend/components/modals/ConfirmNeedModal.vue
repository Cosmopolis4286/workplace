<template>
  <Teleport to="body">
    <Transition
      enter-active-class="duration-300 ease-out"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="duration-200 ease-in"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div v-if="modelValue" class="fixed inset-0 z-[250] flex items-end sm:items-center justify-center p-0 sm:p-4" @click.self="$emit('update:modelValue', false)">
        <div class="absolute inset-0 bg-black/50 backdrop-blur-sm" @click="$emit('update:modelValue', false)" />

        <div v-if="modelValue" class="relative w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl max-h-[92vh] overflow-y-auto">
          <div class="flex justify-center pt-3 pb-1 sm:hidden">
            <div class="w-10 h-1 rounded-full bg-gray-200" />
          </div>

          <div class="px-5 pt-4 pb-2 flex items-start justify-between">
            <div>
              <h3 class="text-lg font-black text-gray-900">Confirmar solicitud</h3>
              <p class="text-sm text-gray-500">{{ service?.name }} — {{ service?.user.firstName }} {{ service?.user.lastName }}</p>
            </div>
            <button class="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400" @click="$emit('update:modelValue', false)">
              <XMarkIcon class="w-5 h-5" />
            </button>
          </div>

          <form class="px-5 py-4 space-y-4" @submit.prevent="submit">
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-xs font-bold text-gray-700 mb-1.5">Fecha preferida <span class="text-blue-500">*</span></label>
                <input
                  v-model="form.preferredDate"
                  type="date"
                  required
                  :min="minDate"
                  class="w-full px-3 py-2.5 text-sm border-2 border-gray-200 rounded-xl focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                />
              </div>
              <div>
                <label class="block text-xs font-bold text-gray-700 mb-1.5">Hora (opcional)</label>
                <input
                  v-model="form.preferredTime"
                  type="time"
                  class="w-full px-3 py-2.5 text-sm border-2 border-gray-200 rounded-xl focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                />
              </div>
            </div>

            <div>
              <label class="block text-xs font-bold text-gray-700 mb-1.5">Dirección (opcional)</label>
              <input
                v-model="form.address"
                type="text"
                maxlength="200"
                placeholder="Calle, número, barrio..."
                class="w-full px-3 py-2.5 text-sm border-2 border-gray-200 rounded-xl focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
              />
            </div>

            <!-- Solo se pide si el usuario no tiene teléfono cargado en su perfil (ver ConfirmNeedDto.phone en el backend) -->
            <div v-if="needsPhone">
              <label class="block text-xs font-bold text-gray-700 mb-1.5">Teléfono <span class="text-blue-500">*</span></label>
              <input
                v-model="form.phone"
                type="tel"
                required
                maxlength="30"
                placeholder="Teléfono / WhatsApp"
                class="w-full px-3 py-2.5 text-sm border-2 border-gray-200 rounded-xl focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
              />
              <p class="text-[11px] text-gray-400 mt-1">No tienes un teléfono cargado en tu perfil — lo necesita el proveedor para contactarte.</p>
            </div>

            <div>
              <label class="block text-xs font-bold text-gray-700 mb-1.5">Describe lo que necesitas (opcional)</label>
              <textarea
                v-model="form.description"
                maxlength="600"
                rows="3"
                placeholder="Detalles importantes, expectativas..."
                class="w-full px-3 py-2.5 text-sm border-2 border-gray-200 rounded-xl focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 resize-none"
              />
            </div>

            <p v-if="kycStatus && kycStatus !== 'APPROVED'" class="text-xs text-amber-700 font-medium bg-amber-50 px-3 py-2 rounded-xl">
              Debes verificar tu identidad antes de solicitar un servicio.
              <NuxtLink to="/verification" class="font-semibold underline" @click="$emit('update:modelValue', false)">Completa la verificación</NuxtLink>.
            </p>

            <p v-if="errorMsg" class="text-xs text-red-600 font-medium bg-red-50 px-3 py-2 rounded-xl">{{ errorMsg }}</p>

            <button
              type="submit"
              :disabled="sending || (kycStatus !== undefined && kycStatus !== 'APPROVED')"
              class="w-full py-3.5 bg-blue-600 text-white font-black text-sm rounded-2xl hover:bg-blue-700 active:scale-[0.98] transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <span v-if="sending" class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              <span>{{ sending ? 'Enviando solicitud...' : 'Confirmar y enviar' }}</span>
            </button>
          </form>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { XMarkIcon } from '@heroicons/vue/24/outline'
import { useAuth } from '~/composables/auth/useAuth'
import { useKyc } from '~/composables/kyc/useKyc'
import { useAiNeeds } from '~/composables/ai/useAiNeeds'
import { getApiErrorMessage } from '~/composables/core/useApiErrors'
import type { CatalogService } from '~/composables/services/useServices'

const props = defineProps<{
  modelValue: boolean
  service: CatalogService | null
  searchId: string
}>()

const emit = defineEmits<{
  'update:modelValue': [val: boolean]
  'success': []
}>()

const { user } = useAuth()
const { myStatus: myKycStatus, fetchMyStatus: fetchMyKycStatus } = useKyc()
const kycStatus = computed(() => myKycStatus.value?.kycStatus)
const { confirming, confirmNeed } = useAiNeeds()

const needsPhone = computed(() => !((user.value as any)?.phone))

const minDate = new Date().toISOString().split('T')[0]

const defaultForm = () => ({
  preferredDate: '',
  preferredTime: '',
  address: '',
  phone: '',
  description: '',
})

const form = ref(defaultForm())
const sending = computed(() => confirming.value)
const errorMsg = ref('')

watch(() => props.modelValue, (isOpen) => {
  if (isOpen) {
    form.value = defaultForm()
    errorMsg.value = ''
    fetchMyKycStatus()
  }
})

async function submit() {
  if (!props.service) return
  errorMsg.value = ''

  if (needsPhone.value && !form.value.phone.trim()) {
    errorMsg.value = 'Ingresa un teléfono para que el proveedor pueda contactarte.'
    return
  }

  try {
    await confirmNeed({
      searchId: props.searchId,
      serviceId: props.service.id,
      preferredDate: form.value.preferredDate,
      preferredTime: form.value.preferredTime || undefined,
      address: form.value.address || undefined,
      phone: needsPhone.value ? form.value.phone.trim() : undefined,
      description: form.value.description || undefined,
    })
    emit('update:modelValue', false)
    emit('success')
  } catch (e: any) {
    errorMsg.value = getApiErrorMessage(e, 'No se pudo enviar la solicitud. Intenta de nuevo.')
  }
}
</script>
