<template>
  <div class="card-premium p-6 border-2 border-red-100">
    <div class="flex items-center mb-4">
      <div class="p-3 bg-gradient-to-br from-red-600 to-red-700 rounded-xl shadow-lg mr-3">
        <TrashIcon class="h-6 w-6 text-white" />
      </div>
      <div>
        <h3 class="text-xl font-bold text-gray-900">Eliminar cuenta</h3>
        <p class="text-sm text-gray-500">Esta acción no se puede deshacer.</p>
      </div>
    </div>

    <div v-if="!expanded">
      <button
        type="button"
        class="px-5 py-2.5 border-2 border-red-200 text-red-700 font-semibold rounded-xl hover:bg-red-50 transition-colors disabled:opacity-50"
        :disabled="loadingBlockers"
        @click="openConfirmation"
      >
        {{ loadingBlockers ? 'Revisando tu cuenta…' : 'Eliminar mi cuenta' }}
      </button>
    </div>

    <div v-else class="space-y-4">
      <div class="text-sm text-gray-700 space-y-2">
        <p class="font-semibold">Al eliminar tu cuenta:</p>
        <ul class="list-disc pl-5 space-y-1">
          <li>Se borran tu nombre, email, teléfono, fecha de nacimiento, ubicación y fotos.</li>
          <li>Se borran tus publicaciones, seguidores, notificaciones y documentos de verificación de identidad.</li>
          <li>Tus servicios y empleos dejan de mostrarse.</li>
          <li>Se cierra tu sesión en todos los dispositivos.</li>
        </ul>
        <p class="text-gray-500">
          Por obligaciones legales y contables conservamos, sin tus datos personales, los registros
          de movimientos de dinero, pagos protegidos y comisiones. Tus reseñas a otros usuarios
          quedan firmadas como «Usuario eliminado».
        </p>
      </div>

      <div v-if="blockers.length" class="p-4 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-900">
        <p class="font-semibold mb-2">Antes de eliminar la cuenta tienes que resolver esto:</p>
        <ul class="list-disc pl-5 space-y-1">
          <li v-for="b in blockers" :key="b">{{ b }}</li>
        </ul>
      </div>

      <form v-else class="space-y-3" @submit.prevent="confirmDeletion">
        <label for="delete-confirmation" class="block text-sm font-semibold text-gray-700">
          Escribe <span class="font-mono text-red-700">ELIMINAR</span> para confirmar
        </label>
        <input
          id="delete-confirmation"
          v-model="confirmation"
          type="text"
          autocomplete="off"
          autocapitalize="characters"
          class="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-red-500/20 focus:border-red-500 transition-all duration-300"
          placeholder="ELIMINAR"
        >
        <div class="flex flex-wrap gap-3 justify-end">
          <button type="button" class="btn-secondary" :disabled="deleting" @click="cancel">Cancelar</button>
          <button
            type="submit"
            :disabled="deleting || confirmation.trim() !== 'ELIMINAR'"
            class="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-xl shadow-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <span v-if="deleting" class="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            {{ deleting ? 'Eliminando…' : 'Eliminar mi cuenta definitivamente' }}
          </button>
        </div>
      </form>

      <button v-if="blockers.length" type="button" class="btn-secondary" @click="cancel">Cerrar</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { TrashIcon } from '@heroicons/vue/24/outline'
import { useAuth } from '~/composables/auth/useAuth'

const emit = defineEmits<{
  error: [err: unknown]
}>()

const auth = useAuth()
const expanded = ref(false)
const loadingBlockers = ref(false)
const blockers = ref<string[]>([])
const confirmation = ref('')
const deleting = ref(false)

async function openConfirmation() {
  loadingBlockers.value = true
  try {
    blockers.value = await auth.getAccountDeletionBlockers()
    expanded.value = true
  } catch (err) {
    emit('error', err)
  } finally {
    loadingBlockers.value = false
  }
}

function cancel() {
  expanded.value = false
  confirmation.value = ''
}

async function confirmDeletion() {
  if (confirmation.value.trim() !== 'ELIMINAR') return
  deleting.value = true
  try {
    await auth.deleteAccount()
    await navigateTo({ path: '/account-deletion', query: { done: '1' } })
  } catch (err) {
    // 409 con bloqueos nuevos (p.ej. entró un depósito mientras confirmaba).
    const data = (err as { data?: { blockers?: string[] } })?.data
    if (data?.blockers?.length) {
      blockers.value = data.blockers
    } else {
      emit('error', err)
    }
  } finally {
    deleting.value = false
  }
}
</script>
