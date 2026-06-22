<template>
  <TransitionRoot appear :show="isOpen" as="template">
    <Dialog as="div" class="relative z-50" @close="close">
      <TransitionChild
        as="template"
        enter="duration-300 ease-out" enter-from="opacity-0" enter-to="opacity-100"
        leave="duration-200 ease-in" leave-from="opacity-100" leave-to="opacity-0"
      >
        <div class="fixed inset-0 bg-black bg-opacity-25" />
      </TransitionChild>

      <div class="fixed inset-0 overflow-y-auto">
        <div class="flex min-h-full items-center justify-center p-4 text-center">
          <TransitionChild
            as="template"
            enter="duration-300 ease-out" enter-from="opacity-0 scale-95" enter-to="opacity-100 scale-100"
            leave="duration-200 ease-in" leave-from="opacity-100 scale-100" leave-to="opacity-0 scale-95"
          >
            <DialogPanel class="w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
              <DialogTitle as="h3" class="text-lg font-bold text-gray-900 mb-1">
                Proponer categoría
              </DialogTitle>
              <p class="text-xs text-gray-400 mb-5">
                Tu propuesta será revisada por un administrador antes de aparecer en los filtros de búsqueda.
              </p>

              <form class="space-y-4" @submit.prevent="submit">
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
                  <input v-model="form.name" type="text" required maxlength="60" class="input-field" placeholder="Ej. Repostería sin gluten" />
                </div>

                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">Descripción (opcional)</label>
                  <textarea v-model="form.description" rows="2" maxlength="300" class="input-field" placeholder="Breve descripción"></textarea>
                </div>

                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">Color</label>
                  <div class="flex items-center gap-2">
                    <input v-model="form.color" type="color" class="w-12 h-10 border border-gray-300 rounded cursor-pointer" />
                    <input v-model="form.color" type="text" class="input-field flex-1" placeholder="#3B82F6" />
                  </div>
                </div>

                <p v-if="error" class="text-xs font-semibold text-red-600">{{ error }}</p>

                <div class="flex gap-2 pt-2">
                  <button type="submit" class="flex-1 btn-primary" :disabled="saving">
                    <span v-if="saving">Enviando…</span>
                    <span v-else>Enviar propuesta</span>
                  </button>
                  <button type="button" class="btn-secondary" @click="close">Cancelar</button>
                </div>
              </form>
            </DialogPanel>
          </TransitionChild>
        </div>
      </div>
    </Dialog>
  </TransitionRoot>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { Dialog, DialogPanel, DialogTitle, TransitionChild, TransitionRoot } from '@headlessui/vue'
import { useProposedCategories, type ProposedCategoryTarget } from '~/composables/useProposedCategories'

const props = defineProps<{
  isOpen: boolean
  target: ProposedCategoryTarget
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'success'): void
}>()

const { propose } = useProposedCategories()

const saving = ref(false)
const error = ref('')
const form = ref({ name: '', description: '', color: '#3B82F6' })

watch(() => props.isOpen, (open) => {
  if (open) {
    form.value = { name: '', description: '', color: '#3B82F6' }
    error.value = ''
  }
})

async function submit() {
  if (!form.value.name.trim()) return
  saving.value = true
  error.value = ''
  try {
    await propose({
      name: form.value.name.trim(),
      description: form.value.description.trim() || undefined,
      color: form.value.color,
      target: props.target,
    })
    emit('success')
    emit('close')
  } catch (e: any) {
    error.value = e?.message ?? 'No se pudo enviar la propuesta'
  } finally {
    saving.value = false
  }
}

function close() {
  emit('close')
}
</script>
