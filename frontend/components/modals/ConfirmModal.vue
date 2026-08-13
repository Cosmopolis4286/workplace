<template>
  <Teleport to="body">
    <Transition enter-active-class="ease-out duration-200" enter-from-class="opacity-0" enter-to-class="opacity-100"
      leave-active-class="ease-in duration-150" leave-from-class="opacity-100" leave-to-class="opacity-0">
      <div v-if="state.visible" class="fixed inset-0 z-[60] flex items-center justify-center p-4">
        <div class="absolute inset-0 bg-black/40" @click="!state.loading && settle(false)" />
        <div class="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
          <h3 class="text-base font-semibold text-gray-900 mb-2">{{ state.title }}</h3>
          <p v-if="state.message" class="text-sm text-gray-500 mb-6">{{ state.message }}</p>
          <div v-if="state.error" class="mb-4 p-3 bg-red-50 border border-red-100 rounded-xl text-red-600 text-xs">
            {{ state.error }}
          </div>
          <div class="flex gap-3" :class="{ 'mt-6': !state.message }">
            <button class="btn-secondary flex-1" :disabled="state.loading" @click="settle(false)">{{ state.cancelText }}</button>
            <button
              class="flex-1 px-4 py-2.5 text-white rounded-xl text-sm font-medium disabled:opacity-60 transition-colors"
              :class="state.variant === 'danger'
                ? 'bg-red-600 hover:bg-red-700'
                : state.variant === 'warning'
                  ? 'bg-yellow-500 hover:bg-yellow-600'
                  : 'bg-blue-600 hover:bg-blue-700'"
              :disabled="state.loading"
              @click="settle(true)"
            >
              {{ state.loading ? 'Procesando...' : state.confirmText }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { useConfirm } from '~/composables/ui/useConfirm'

const { state, settle } = useConfirm()
</script>
