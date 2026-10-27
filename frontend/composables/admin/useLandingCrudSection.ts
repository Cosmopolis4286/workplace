import { ref, reactive, type Ref } from 'vue'
import { useApi } from '~/composables/core/useApi'
import { getApiErrorMessage } from '~/composables/core/useApiErrors'

// CRUD genérico para las secciones de contenido de /landing-admin que
// comparten la misma forma (testimonials/features/steps: listar, crear,
// editar, eliminar, y opcionalmente reordenar) — evita triplicar la misma
// lógica de load/save/delete/reorder con solo el endpoint y el shape del
// formulario cambiando entre secciones.
export function useLandingCrudSection<
  T extends { id: string },
  F extends object,
>(endpoint: string, emptyForm: () => F, options: { reorder?: boolean } = {}) {
  // `as Ref<T[]>`: con un T genérico, ref<T[]> se tipa como UnwrapRef<T>[].
  const items = ref([]) as Ref<T[]>
  const loading = ref(false)
  const showModal = ref(false)
  const saving = ref(false)
  const editingId = ref<string | null>(null)
  const form = reactive(emptyForm()) as F
  const error = ref<string | null>(null)

  async function load() {
    loading.value = true
    try {
      const { get } = useApi()
      items.value = await get<T[]>(endpoint)
    } catch (e: any) {
      error.value = getApiErrorMessage(e, 'Error al cargar')
    } finally {
      loading.value = false
    }
  }

  function openModal(item: (T & Partial<F>) | null) {
    editingId.value = item?.id ?? null
    Object.assign(form, emptyForm())
    if (item) Object.assign(form, item)
    showModal.value = true
  }

  async function save(extra: Record<string, unknown> = {}) {
    saving.value = true
    error.value = null
    try {
      const { put, post } = useApi()
      if (editingId.value) {
        const updated = await put<T>(`${endpoint}/${editingId.value}`, { ...form, ...extra })
        const idx = items.value.findIndex((i) => i.id === editingId.value)
        if (idx !== -1) items.value[idx] = updated
      } else {
        const created = await post<T>(endpoint, { ...form, ...extra })
        items.value.push(created)
      }
      showModal.value = false
      return true
    } catch (e: any) {
      error.value = getApiErrorMessage(e, 'Error al guardar')
      return false
    } finally {
      saving.value = false
    }
  }

  async function remove(id: string) {
    error.value = null
    try {
      const { del } = useApi()
      await del(`${endpoint}/${id}`)
      items.value = items.value.filter((i) => i.id !== id)
      return true
    } catch (e: any) {
      error.value = getApiErrorMessage(e, 'Error al eliminar')
      return false
    }
  }

  async function move(idx: number, direction: -1 | 1) {
    if (!options.reorder) return
    const targetIdx = idx + direction
    if (targetIdx < 0 || targetIdx >= items.value.length) return
    const reordered = [...items.value]
    ;[reordered[idx], reordered[targetIdx]] = [reordered[targetIdx], reordered[idx]]
    items.value = reordered
    error.value = null
    try {
      const { patch } = useApi()
      await patch(`${endpoint}/reorder`, { orderedIds: reordered.map((i) => i.id) })
    } catch (e: any) {
      error.value = getApiErrorMessage(e, 'Error al reordenar')
    }
  }

  return { items, loading, showModal, saving, editingId, form, error, load, openModal, save, remove, move }
}
