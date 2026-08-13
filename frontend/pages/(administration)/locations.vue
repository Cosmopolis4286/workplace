<template>
  <div>
    <PageHeader
      title="Catálogo de Ubicaciones (Venezuela)"
      description="Estado → Municipio → Ciudad → Parroquia"
      :icon="MapIcon"
      :breadcrumb="[{ label: 'Ubicaciones' }]"
      :stats="headerStats"
    >
      <template #actions>
        <HeaderActionButton variant="primary" :icon="PlusIcon" @click="openModal('MUNICIPIO')">
          Nuevo Municipio
        </HeaderActionButton>
      </template>
    </PageHeader>

    <!-- Error -->
    <div v-if="error" class="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center justify-between">
      <p class="text-red-700 text-sm">{{ error }}</p>
      <button class="text-red-500 hover:text-red-700" @click="error = null"><XMarkIcon class="h-4 w-4" /></button>
    </div>

    <!-- Filtro por estado -->
    <div class="card p-4 mb-6 flex flex-col sm:flex-row gap-3">
      <select v-model="filterState" class="input-field w-auto" @change="loadTree(filterState || undefined)">
        <option value="">Todos los estados</option>
        <option v-for="s in states" :key="s" :value="s">{{ s }}</option>
      </select>
      <div class="relative flex-1">
        <MagnifyingGlassIcon class="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input v-model="searchQuery" type="text" placeholder="Buscar municipio, ciudad o parroquia..." class="input-field pl-9" />
      </div>
    </div>

    <!-- Skeleton -->
    <div v-if="loading" class="card divide-y divide-gray-100">
      <div v-for="i in 4" :key="i" class="p-4 flex items-center gap-4 animate-pulse">
        <div class="skeleton h-4 w-48 rounded" />
      </div>
    </div>

    <!-- Vacío -->
    <div v-else-if="filteredTree.length === 0" class="card p-12 text-center">
      <MapIcon class="h-12 w-12 text-gray-300 mx-auto mb-3" />
      <p class="text-gray-500 font-medium">No hay municipios registrados</p>
      <p class="text-sm text-gray-400 mt-1">Agrega el primer municipio del catálogo</p>
    </div>

    <!-- Árbol -->
    <div v-else class="card divide-y divide-gray-100">
      <div v-for="municipio in filteredTree" :key="municipio.id">
        <!-- Municipio -->
        <div class="p-4 flex items-center gap-3 hover:bg-gray-50 transition-colors">
          <button class="p-1 text-gray-400 hover:text-gray-600" @click="toggle(municipio.id)">
            <ChevronRightIcon class="h-4 w-4 transition-transform" :class="expanded.has(municipio.id) ? 'rotate-90' : ''" />
          </button>
          <BuildingOffice2Icon class="h-4 w-4 text-red-500 flex-shrink-0" />
          <div class="flex-1 min-w-0">
            <p class="text-sm font-semibold text-gray-900">{{ municipio.name }}</p>
            <p class="text-xs text-gray-400">{{ municipio.stateName }} · {{ municipio.children?.length ?? 0 }} ciudad(es)</p>
          </div>
          <div class="flex gap-1 flex-shrink-0">
            <button class="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors" title="Agregar ciudad" @click="openModal('CIUDAD', municipio)">
              <PlusIcon class="h-4 w-4" />
            </button>
            <button class="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" @click="openEditModal(municipio)">
              <PencilIcon class="h-4 w-4" />
            </button>
            <button class="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" @click="confirmDelete(municipio)">
              <TrashIcon class="h-4 w-4" />
            </button>
          </div>
        </div>

        <!-- Ciudades -->
        <div v-if="expanded.has(municipio.id)" class="bg-gray-50/50">
          <div v-for="ciudad in municipio.children" :key="ciudad.id" class="pl-10">
            <div class="p-3 flex items-center gap-3 hover:bg-gray-100 transition-colors border-t border-gray-100">
              <button class="p-1 text-gray-400 hover:text-gray-600" @click="toggle(ciudad.id)">
                <ChevronRightIcon class="h-4 w-4 transition-transform" :class="expanded.has(ciudad.id) ? 'rotate-90' : ''" />
              </button>
              <BuildingOfficeIcon class="h-4 w-4 text-blue-500 flex-shrink-0" />
              <div class="flex-1 min-w-0">
                <p class="text-sm font-medium text-gray-800">{{ ciudad.name }}</p>
                <p class="text-xs text-gray-400">{{ ciudad.children?.length ?? 0 }} parroquia(s)</p>
              </div>
              <div class="flex gap-1 flex-shrink-0">
                <button class="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors" title="Agregar parroquia" @click="openModal('PARROQUIA', ciudad)">
                  <PlusIcon class="h-4 w-4" />
                </button>
                <button class="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" @click="openEditModal(ciudad)">
                  <PencilIcon class="h-4 w-4" />
                </button>
                <button class="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" @click="confirmDelete(ciudad)">
                  <TrashIcon class="h-4 w-4" />
                </button>
              </div>
            </div>

            <!-- Parroquias -->
            <div v-if="expanded.has(ciudad.id)" class="pl-10">
              <div
                v-for="parroquia in ciudad.children" :key="parroquia.id"
                class="p-2.5 flex items-center gap-3 hover:bg-gray-100 transition-colors border-t border-gray-100"
              >
                <MapPinIcon class="h-3.5 w-3.5 text-gray-400 flex-shrink-0 ml-5" />
                <div class="flex-1 min-w-0">
                  <p class="text-sm text-gray-700">{{ parroquia.name }}</p>
                  <p v-if="parroquia.postalCode" class="text-xs text-gray-400">CP: {{ parroquia.postalCode }}</p>
                </div>
                <div class="flex gap-1 flex-shrink-0">
                  <button class="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" @click="openEditModal(parroquia)">
                    <PencilIcon class="h-4 w-4" />
                  </button>
                  <button class="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" @click="confirmDelete(parroquia)">
                    <TrashIcon class="h-4 w-4" />
                  </button>
                </div>
              </div>
              <p v-if="!ciudad.children?.length" class="text-xs text-gray-400 italic pl-8 py-2">Sin parroquias registradas</p>
            </div>
          </div>
          <p v-if="!municipio.children?.length" class="text-xs text-gray-400 italic pl-10 py-2">Sin ciudades registradas</p>
        </div>
      </div>
    </div>

    <!-- Modal crear/editar -->
    <Teleport to="body">
      <Transition enter-active-class="ease-out duration-200" enter-from-class="opacity-0" enter-to-class="opacity-100"
        leave-active-class="ease-in duration-150" leave-from-class="opacity-100" leave-to-class="opacity-0">
        <div v-if="showModal" class="fixed inset-0 z-50 flex items-center justify-center p-4" @click.self="closeModal">
          <div class="absolute inset-0 bg-black/40" @click="closeModal" />
          <div class="relative bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div class="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 class="text-base font-bold text-gray-900">{{ modalTitle }}</h2>
              <button class="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400" @click="closeModal"><XMarkIcon class="h-5 w-5" /></button>
            </div>
            <form @submit.prevent="saveNode" class="p-6 space-y-4">
              <div>
                <label class="block text-xs font-medium text-gray-700 mb-1">Nombre <span class="text-red-500">*</span></label>
                <input v-model="form.name" type="text" required class="input-field" />
              </div>
              <div v-if="form.type === 'MUNICIPIO'">
                <label class="block text-xs font-medium text-gray-700 mb-1">Estado <span class="text-red-500">*</span></label>
                <select v-model="form.stateName" required class="input-field">
                  <option value="" disabled>Selecciona un estado</option>
                  <option v-for="s in venezuelaStates" :key="s" :value="s">{{ s }}</option>
                </select>
              </div>
              <div v-if="form.type === 'PARROQUIA'">
                <label class="block text-xs font-medium text-gray-700 mb-1">Código postal</label>
                <input v-model="form.postalCode" type="text" maxlength="20" class="input-field" />
              </div>
              <p v-if="!editingNode && parentLabel" class="text-xs text-gray-400">
                Se creará dentro de: <strong>{{ parentLabel }}</strong>
              </p>
              <div class="flex gap-3 pt-2">
                <button type="button" class="btn-secondary flex-1" @click="closeModal">Cancelar</button>
                <button type="submit" :disabled="saving" class="btn-primary flex-1">{{ saving ? 'Guardando...' : (editingNode ? 'Guardar cambios' : 'Crear') }}</button>
              </div>
            </form>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- Modal eliminar -->
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import {
  MapIcon, PlusIcon, XMarkIcon, MagnifyingGlassIcon, PencilIcon, TrashIcon,
  ChevronRightIcon, BuildingOffice2Icon, BuildingOfficeIcon, MapPinIcon,
} from '@heroicons/vue/24/outline'
import PageHeader from '~/components/ui/PageHeader.vue'
import HeaderActionButton from '~/components/ui/HeaderActionButton.vue'
import {
  useLocationsAdmin,
  type VeLocationNode,
  type VeLocationType,
} from '~/composables/admin/useLocationsAdmin'
import { useVeLocations } from '~/composables/location/useVeLocations'
import { useLocationData } from '~/composables/location/useLocationData'

definePageMeta({ middleware: 'auth' })

const { tree, loading, error, loadTree, createNode, updateNode, deleteNode } = useLocationsAdmin()
const { getStates } = useVeLocations()
const { getStatesByCountry } = useLocationData()

const states = ref<string[]>([])
const venezuelaStates = ref<string[]>([])
const filterState = ref('')
const searchQuery = ref('')
const expanded = ref(new Set<string>())

function toggle(id: string) {
  if (expanded.value.has(id)) expanded.value.delete(id)
  else expanded.value.add(id)
}

const filteredTree = computed(() => {
  if (!searchQuery.value) return tree.value
  const q = searchQuery.value.toLowerCase()
  return tree.value.filter((municipio) => {
    if (municipio.name.toLowerCase().includes(q)) return true
    return (municipio.children ?? []).some((ciudad) => {
      if (ciudad.name.toLowerCase().includes(q)) return true
      return (ciudad.children ?? []).some((p) => p.name.toLowerCase().includes(q))
    })
  })
})

const headerStats = computed(() => {
  let municipios = 0, ciudades = 0, parroquias = 0
  for (const m of tree.value) {
    municipios++
    for (const c of m.children ?? []) {
      ciudades++
      parroquias += c.children?.length ?? 0
    }
  }
  return [
    { label: 'Municipios', value: String(municipios) },
    { label: 'Ciudades', value: String(ciudades) },
    { label: 'Parroquias', value: String(parroquias) },
  ]
})

// ─── Modal crear/editar ───────────────────────────────────────────────────────
const showModal = ref(false)
const editingNode = ref<VeLocationNode | null>(null)
const parentNode = ref<VeLocationNode | null>(null)
const saving = ref(false)

const form = ref({ type: 'MUNICIPIO' as VeLocationType, name: '', stateName: '', postalCode: '' })

const modalTitle = computed(() => {
  const labels: Record<VeLocationType, string> = { MUNICIPIO: 'Municipio', CIUDAD: 'Ciudad', PARROQUIA: 'Parroquia' }
  return editingNode.value ? `Editar ${labels[form.value.type]}` : `Nuevo ${labels[form.value.type]}`
})

const parentLabel = computed(() => parentNode.value?.name ?? '')

function openModal(type: VeLocationType, parent?: VeLocationNode) {
  editingNode.value = null
  parentNode.value = parent ?? null
  form.value = { type, name: '', stateName: '', postalCode: '' }
  showModal.value = true
}

function openEditModal(node: VeLocationNode) {
  editingNode.value = node
  parentNode.value = null
  form.value = { type: node.type, name: node.name, stateName: node.stateName ?? '', postalCode: node.postalCode ?? '' }
  showModal.value = true
}

function closeModal() {
  showModal.value = false
  editingNode.value = null
  parentNode.value = null
}

async function saveNode() {
  saving.value = true
  try {
    if (editingNode.value) {
      await updateNode(editingNode.value.id, {
        name: form.value.name,
        ...(form.value.type === 'MUNICIPIO' ? { stateName: form.value.stateName } : {}),
        ...(form.value.type === 'PARROQUIA' ? { postalCode: form.value.postalCode || undefined } : {}),
      })
    } else {
      await createNode({
        type: form.value.type,
        name: form.value.name,
        parentId: parentNode.value?.id,
        ...(form.value.type === 'MUNICIPIO' ? { stateName: form.value.stateName } : {}),
        ...(form.value.type === 'PARROQUIA' ? { postalCode: form.value.postalCode || undefined } : {}),
      })
    }
    await loadTree(filterState.value || undefined)
    closeModal()
  } finally {
    saving.value = false
  }
}

// ─── Delete ───────────────────────────────────────────────────────────────────
const { confirm } = useConfirm()

async function confirmDelete(node: VeLocationNode) {
  const message = node.type !== 'PARROQUIA'
    ? `¿Eliminar ${node.name}? Esto también eliminará todos sus hijos (ciudades/parroquias dentro).`
    : `¿Eliminar ${node.name}?`
  const ok = await confirm({
    title: 'Eliminar ubicación',
    message,
    confirmText: 'Eliminar',
    variant: 'danger',
    onConfirm: async () => {
      const ok = await deleteNode(node.id)
      if (!ok) return 'No se pudo eliminar la ubicación'
    },
  })
  if (ok) await loadTree(filterState.value || undefined)
}

onMounted(async () => {
  await loadTree()
  states.value = await getStates()
  venezuelaStates.value = (await getStatesByCountry('VE')).map((s) => s.name)
})
</script>
