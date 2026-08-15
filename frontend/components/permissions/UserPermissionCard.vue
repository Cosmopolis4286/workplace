<template>
  <div
    class="border rounded-lg p-3 transition-colors"
    :class="cardClass"
  >
    <div class="flex items-start justify-between gap-3">
      <div class="flex-1 min-w-0">
        <div class="flex items-center gap-2">
          <span class="font-medium text-gray-800">{{ perm.label }}</span>
          <span
            v-if="perm.isSystem"
            class="px-1.5 py-0.5 text-[10px] bg-gray-100 text-gray-500 rounded"
          >Sistema</span>
        </div>
        <div class="text-xs text-gray-500 font-mono mt-0.5">{{ perm.key }}</div>
        <div class="text-xs text-gray-400 mt-1">
          {{ perm.module }} • {{ perm.action }}
        </div>

        <!-- Mostrar expiración y razón si existen -->
        <div v-if="perm.expiresAt || perm.reason" class="mt-2 text-xs space-y-1">
          <div v-if="perm.expiresAt" class="text-amber-600">
            ⏰ Expira: {{ formatDate(perm.expiresAt) }}
          </div>
          <div v-if="perm.reason" class="text-gray-500 italic">
            "{{ perm.reason }}"
          </div>
        </div>

        <!-- Mini-formulario inline: razón + expiración antes de confirmar -->
        <div v-if="actionActive" class="mt-3 space-y-2 border-t border-gray-100 pt-2">
          <textarea
            :value="actionReason"
            rows="2"
            placeholder="Razón (opcional)"
            class="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-300"
            @input="$emit('update:actionReason', ($event.target as HTMLTextAreaElement).value)"
          />
          <input
            :value="actionExpiresAt"
            type="datetime-local"
            class="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-300"
            @input="$emit('update:actionExpiresAt', ($event.target as HTMLInputElement).value)"
          />
          <div class="flex gap-2 justify-end">
            <button
              type="button"
              @click="$emit('cancel-action')"
              class="px-2.5 py-1 text-xs text-gray-500 hover:bg-gray-100 rounded"
            >Cancelar</button>
            <button
              type="button"
              @click="$emit('confirm-action')"
              :disabled="saving"
              class="px-2.5 py-1 text-xs text-white rounded font-medium disabled:opacity-60"
              :class="actionType === 'grant' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'"
            >{{ actionType === 'grant' ? 'Confirmar concesión' : 'Confirmar denegación' }}</button>
          </div>
        </div>
      </div>

      <div class="flex flex-col items-end gap-1">
        <!-- Badge de origen -->
        <span
          class="px-2 py-0.5 text-[10px] rounded-full font-medium"
          :class="sourceBadgeClass"
        >
          {{ perm.source === 'role' ? 'Rol' : perm.source === 'user' ? 'Usuario' : 'No' }}
        </span>

        <!-- Botones de acción -->
        <div class="flex gap-1 mt-2">
          <button
            v-if="!perm.effectiveGranted"
            @click="$emit('start-action', 'grant')"
            :disabled="saving || !canManageThisUser"
            class="p-1.5 text-green-600 hover:bg-green-50 rounded transition-colors disabled:opacity-40 disabled:hover:bg-transparent"
            title="Conceder"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
            </svg>
          </button>
          <button
            v-if="perm.effectiveGranted"
            @click="$emit('start-action', 'deny')"
            :disabled="saving || !canManageThisUser"
            class="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors disabled:opacity-40 disabled:hover:bg-transparent"
            title="Denegar"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
          <button
            v-if="perm.userGranted !== null"
            @click="$emit('remove')"
            :disabled="saving || !canManageThisUser"
            class="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors disabled:opacity-40 disabled:hover:bg-transparent"
            title="Eliminar personalización"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
            </svg>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { UserPermission } from '~/composables/users/useUserPermissions'

const props = defineProps<{
  perm: UserPermission
  saving: boolean
  canManageThisUser: boolean
  actionActive: boolean
  actionType: 'grant' | 'deny' | undefined
  actionReason: string
  actionExpiresAt: string
  formatDate: (date: string) => string
}>()

defineEmits<{
  'start-action': [type: 'grant' | 'deny']
  'cancel-action': []
  'confirm-action': []
  remove: []
  'update:actionReason': [value: string]
  'update:actionExpiresAt': [value: string]
}>()

const cardClass = computed(() => {
  if (props.perm.userGranted === true) return 'border-green-200 bg-green-50/50'
  if (props.perm.userGranted === false) return 'border-red-200 bg-red-50/50'
  if (props.perm.roleGranted) return 'border-blue-200 bg-blue-50/30'
  return 'border-gray-200 bg-white'
})

const sourceBadgeClass = computed(() => {
  if (props.perm.source === 'user') {
    return props.perm.effectiveGranted ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
  }
  if (props.perm.source === 'role') return 'bg-blue-100 text-blue-700'
  return 'bg-gray-100 text-gray-500'
})
</script>
