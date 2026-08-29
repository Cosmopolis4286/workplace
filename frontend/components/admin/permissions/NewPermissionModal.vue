<template>
  <Teleport to="body">
    <div v-if="show" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div class="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div class="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h3 class="text-lg font-semibold text-gray-900">Nuevo permiso</h3>
          <button @click="$emit('close')" class="text-gray-400 hover:text-gray-600">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>
        <form @submit.prevent="$emit('submit')" class="px-6 py-5 space-y-4">
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Módulo <span class="text-red-500">*</span></label>
              <select v-model="form.module" @change="$emit('module-change')" required class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300">
                <option value="">Seleccionar...</option>
                <option v-for="mod in allModules" :key="mod" :value="mod">{{ moduleLabels[mod] ?? mod }}</option>
                <option value="__custom">Otro (personalizado)</option>
              </select>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Acción <span class="text-red-500">*</span></label>
              <input v-model="form.action" @input="$emit('module-change')" required placeholder="view, create, export…" class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
            </div>
          </div>
          <div v-if="form.module === '__custom'">
            <label class="block text-sm font-medium text-gray-700 mb-1">Módulo personalizado</label>
            <input v-model="form.customModule" @input="$emit('module-change')" placeholder="mi_modulo" class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Clave (key) <span class="text-red-500">*</span></label>
            <input v-model="form.key" required placeholder="módulo:acción" class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-300" />
            <p class="text-xs text-gray-400 mt-1">Se usa en código: <code>can('{{ form.key || 'modulo:accion' }}')</code></p>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Etiqueta <span class="text-red-500">*</span></label>
            <input v-model="form.label" required placeholder="Ver reportes exportados" class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Descripción (opcional)</label>
            <input v-model="form.description" placeholder="Descripción breve del permiso" class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Conceder inicialmente a</label>
            <div class="flex flex-wrap gap-3">
              <label v-for="r in roles" :key="r" class="inline-flex items-center gap-1.5 text-sm text-gray-700">
                <input
                  type="checkbox"
                  :value="r"
                  v-model="form.grantedRoles"
                  :disabled="r === 'SUPERADMIN'"
                  class="w-4 h-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-400 disabled:opacity-40"
                />
                {{ roleLabels[r] }}
              </label>
            </div>
            <p class="text-xs text-gray-400 mt-1">SUPERADMIN siempre tiene acceso, sin importar esta selección.</p>
          </div>
          <div v-if="error" class="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">{{ error }}</div>
          <div class="flex justify-end gap-3 pt-1">
            <button type="button" @click="$emit('close')" class="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50">Cancelar</button>
            <button type="submit" :disabled="saving" class="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-60 font-medium">
              {{ saving ? 'Creando...' : 'Crear permiso' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
type Role = 'SUPERADMIN' | 'ADMIN' | 'PROFESIONAL' | 'NORMAL'

export interface NewPermissionForm {
  module: string
  customModule: string
  action: string
  key: string
  label: string
  description: string
  grantedRoles: Role[]
}

defineProps<{
  show: boolean
  saving: boolean
  error: string | null
  form: NewPermissionForm
  allModules: string[]
  moduleLabels: Record<string, string>
  roles: Role[]
  roleLabels: Record<Role, string>
}>()

defineEmits<{
  close: []
  submit: []
  'module-change': []
}>()
</script>
