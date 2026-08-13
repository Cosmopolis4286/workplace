<template>
  <div class="p-6 max-w-4xl mx-auto space-y-8">

    <PageHeader
      title="Categorías y Modalidades de Servicio"
      description="Gestiona el catálogo de categorías y modalidades disponibles para publicar servicios."
      :icon="TagIcon"
      :breadcrumb="[{ label: 'Servicios' }]"
    />

    <!-- ── Categorías ──────────────────────────────────────────────────────── -->
    <section class="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      <div class="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
        <h2 class="text-base font-bold text-gray-900">Categorías</h2>
        <button
          type="button"
          class="px-3 py-1.5 bg-workplace-red hover:bg-red-700 text-white rounded-lg text-xs font-semibold"
          @click="openCategoryForm(null)"
        >
          + Nueva categoría
        </button>
      </div>

      <div v-if="loadingCategories" class="p-6 space-y-2">
        <div v-for="i in 3" :key="i" class="h-12 bg-gray-100 rounded-xl animate-pulse" />
      </div>
      <div v-else-if="catalogCategories.length === 0" class="p-8 text-center text-sm text-gray-500">
        No hay categorías creadas.
      </div>
      <div v-else class="divide-y divide-gray-100">
        <div v-for="cat in catalogCategories" :key="cat.id" class="px-6 py-3 flex items-center justify-between gap-3">
          <div class="flex items-center gap-2.5 min-w-0">
            <span class="text-lg flex-shrink-0">{{ cat.icon || '🏷️' }}</span>
            <span class="text-sm font-medium text-gray-900 truncate">{{ cat.name }}</span>
            <span v-if="cat.color" class="w-3 h-3 rounded-full flex-shrink-0" :style="{ background: cat.color }" />
          </div>
          <div class="flex items-center gap-2 flex-shrink-0">
            <button class="text-xs font-semibold text-gray-500 hover:text-workplace-red" @click="openCategoryForm(cat)">Editar</button>
            <button
              class="text-xs font-semibold text-gray-400 hover:text-red-600 disabled:opacity-50"
              :disabled="deletingCategoryId === cat.id"
              @click="confirmDeleteCategory(cat)"
            >{{ deletingCategoryId === cat.id ? 'Eliminando…' : 'Eliminar' }}</button>
          </div>
        </div>
      </div>

      <p v-if="categoryError" class="px-6 py-2 text-xs text-red-600 border-t border-gray-100">{{ categoryError }}</p>

      <!-- Form inline -->
      <div v-if="categoryForm" class="px-6 py-4 border-t border-gray-100 bg-gray-50/70 space-y-3">
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <input v-model="categoryForm.name" type="text" placeholder="Nombre" maxlength="60" class="input sm:col-span-1" />
          <input v-model="categoryForm.icon" type="text" placeholder="Emoji (ej. 🔧)" maxlength="4" class="input" />
          <input v-model="categoryForm.color" type="color" class="input h-11 p-1" />
        </div>
        <div class="flex justify-end gap-2">
          <button class="btn-secondary text-xs py-1.5 px-3" @click="categoryForm = null">Cancelar</button>
          <button class="btn-primary text-xs py-1.5 px-3" :disabled="savingCategory || !categoryForm.name.trim()" @click="submitCategory">
            {{ savingCategory ? 'Guardando…' : editingCategoryId ? 'Guardar cambios' : 'Crear categoría' }}
          </button>
        </div>
      </div>
    </section>

    <!-- ── Modalidades ─────────────────────────────────────────────────────── -->
    <section class="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      <div class="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
        <h2 class="text-base font-bold text-gray-900">Modalidades</h2>
        <button
          type="button"
          class="px-3 py-1.5 bg-workplace-red hover:bg-red-700 text-white rounded-lg text-xs font-semibold"
          @click="openModalityForm(null)"
        >
          + Nueva modalidad
        </button>
      </div>

      <div v-if="loadingModalities" class="p-6 space-y-2">
        <div v-for="i in 3" :key="i" class="h-12 bg-gray-100 rounded-xl animate-pulse" />
      </div>
      <div v-else-if="modalities.length === 0" class="p-8 text-center text-sm text-gray-500">
        No hay modalidades creadas.
      </div>
      <div v-else class="divide-y divide-gray-100">
        <div v-for="mod in modalities" :key="mod.id" class="px-6 py-3 flex items-center justify-between gap-3">
          <div class="flex items-center gap-2.5 min-w-0">
            <span class="text-lg flex-shrink-0">{{ mod.emoji || '🤝' }}</span>
            <span class="text-sm font-medium text-gray-900 truncate">{{ mod.name }}</span>
            <span class="text-xs text-gray-400 font-mono">{{ mod.value }}</span>
            <span v-if="!mod.isActive" class="badge bg-gray-100 text-gray-500">Inactiva</span>
          </div>
          <div class="flex items-center gap-2 flex-shrink-0">
            <button
              class="text-xs font-semibold text-gray-500 hover:text-workplace-red disabled:opacity-50"
              :disabled="togglingModalityId === mod.id"
              @click="toggleModalityActive(mod)"
            >
              {{ togglingModalityId === mod.id ? 'Guardando…' : mod.isActive ? 'Desactivar' : 'Activar' }}
            </button>
            <button class="text-xs font-semibold text-gray-500 hover:text-workplace-red" @click="openModalityForm(mod)">Editar</button>
            <button
              class="text-xs font-semibold text-gray-400 hover:text-red-600 disabled:opacity-50"
              :disabled="deletingModalityId === mod.id"
              @click="confirmDeleteModality(mod)"
            >{{ deletingModalityId === mod.id ? 'Eliminando…' : 'Eliminar' }}</button>
          </div>
        </div>
      </div>

      <p v-if="modalityError" class="px-6 py-2 text-xs text-red-600 border-t border-gray-100">{{ modalityError }}</p>

      <!-- Form inline -->
      <div v-if="modalityForm" class="px-6 py-4 border-t border-gray-100 bg-gray-50/70 space-y-3">
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <input v-model="modalityForm.name" type="text" placeholder="Nombre (ej. Presencial)" maxlength="60" class="input" />
          <input v-model="modalityForm.value" type="text" placeholder="Valor (ej. IN_PERSON)" maxlength="30" class="input font-mono text-sm" />
          <input v-model="modalityForm.emoji" type="text" placeholder="Emoji" maxlength="4" class="input" />
        </div>
        <div class="flex justify-end gap-2">
          <button class="btn-secondary text-xs py-1.5 px-3" @click="modalityForm = null">Cancelar</button>
          <button class="btn-primary text-xs py-1.5 px-3" :disabled="savingModality || !modalityForm.name.trim() || !modalityForm.value.trim()" @click="submitModality">
            {{ savingModality ? 'Guardando…' : editingModalityId ? 'Guardar cambios' : 'Crear modalidad' }}
          </button>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ middleware: ['auth'] })

import { ref, onMounted } from 'vue'
import { TagIcon } from '@heroicons/vue/24/outline'
import { useMyServices, type MyServiceCategory, type ServiceModality } from '~/composables/services/useMyServices'
import { useConfirm } from '~/composables/ui/useConfirm'
import PageHeader from '~/components/ui/PageHeader.vue'

// El guard de rol (SUPERADMIN/ADMIN) vive en middleware/auth.ts (ADMIN_ONLY_ROUTES),
// respaldado por @Roles(SUPERADMIN, ADMIN) en services.controller.ts.
const { confirm } = useConfirm()
const {
  catalogCategories, modalities,
  fetchAdminCategories, fetchAllModalities,
  createCategory, updateCategory, deleteCategory,
  createModality, updateModality, deleteModality,
} = useMyServices()

const loadingCategories = ref(true)
const loadingModalities = ref(true)

// ─── Categorías ─────────────────────────────────────────────────────────────
const categoryForm = ref<{ name: string; icon: string; color: string } | null>(null)
const editingCategoryId = ref<string | null>(null)
const savingCategory = ref(false)
const categoryError = ref('')

function openCategoryForm(cat: MyServiceCategory | null) {
  editingCategoryId.value = cat?.id ?? null
  categoryForm.value = { name: cat?.name ?? '', icon: cat?.icon ?? '', color: cat?.color ?? '#ef4444' }
  categoryError.value = ''
}

async function submitCategory() {
  if (!categoryForm.value) return
  savingCategory.value = true
  categoryError.value = ''
  try {
    const payload = { name: categoryForm.value.name.trim(), icon: categoryForm.value.icon || undefined, color: categoryForm.value.color || undefined }
    if (editingCategoryId.value) await updateCategory(editingCategoryId.value, payload)
    else await createCategory(payload)
    categoryForm.value = null
  } catch (e: any) {
    categoryError.value = e?.data?.message ?? e?.message ?? 'Error al guardar la categoría'
  } finally {
    savingCategory.value = false
  }
}

const deletingCategoryId = ref<string | null>(null)

async function confirmDeleteCategory(cat: MyServiceCategory) {
  const ok = await confirm({
    title: 'Eliminar categoría',
    message: `¿Eliminar la categoría "${cat.name}"? Los servicios que la usan quedarán sin categoría.`,
    confirmText: 'Eliminar',
    variant: 'danger',
  })
  if (!ok) return
  deletingCategoryId.value = cat.id
  categoryError.value = ''
  try {
    await deleteCategory(cat.id)
  } catch (e: any) {
    categoryError.value = e?.data?.message ?? e?.message ?? 'Error al eliminar la categoría'
  } finally {
    deletingCategoryId.value = null
  }
}

// ─── Modalidades ────────────────────────────────────────────────────────────
const modalityForm = ref<{ name: string; value: string; emoji: string } | null>(null)
const editingModalityId = ref<string | null>(null)
const savingModality = ref(false)
const modalityError = ref('')

function openModalityForm(mod: ServiceModality | null) {
  editingModalityId.value = mod?.id ?? null
  modalityForm.value = { name: mod?.name ?? '', value: mod?.value ?? '', emoji: mod?.emoji ?? '' }
  modalityError.value = ''
}

async function submitModality() {
  if (!modalityForm.value) return
  savingModality.value = true
  modalityError.value = ''
  try {
    const payload = { name: modalityForm.value.name.trim(), value: modalityForm.value.value.trim(), emoji: modalityForm.value.emoji || undefined }
    if (editingModalityId.value) await updateModality(editingModalityId.value, payload)
    else await createModality(payload)
    modalityForm.value = null
  } catch (e: any) {
    modalityError.value = e?.data?.message ?? e?.message ?? 'Error al guardar la modalidad'
  } finally {
    savingModality.value = false
  }
}

const togglingModalityId = ref<string | null>(null)
const deletingModalityId = ref<string | null>(null)

async function toggleModalityActive(mod: ServiceModality) {
  togglingModalityId.value = mod.id
  modalityError.value = ''
  try {
    await updateModality(mod.id, { isActive: !mod.isActive })
  } catch (e: any) {
    modalityError.value = e?.data?.message ?? e?.message ?? 'Error al actualizar la modalidad'
  } finally {
    togglingModalityId.value = null
  }
}

async function confirmDeleteModality(mod: ServiceModality) {
  const ok = await confirm({ title: 'Eliminar modalidad', message: `¿Eliminar la modalidad "${mod.name}"?`, confirmText: 'Eliminar', variant: 'danger' })
  if (!ok) return
  deletingModalityId.value = mod.id
  modalityError.value = ''
  try {
    await deleteModality(mod.id)
  } catch (e: any) {
    modalityError.value = e?.data?.message ?? e?.message ?? 'Error al eliminar la modalidad'
  } finally {
    deletingModalityId.value = null
  }
}

onMounted(async () => {
  try {
    await fetchAdminCategories()
  } finally {
    loadingCategories.value = false
  }
  try {
    await fetchAllModalities()
  } finally {
    loadingModalities.value = false
  }
})
</script>
