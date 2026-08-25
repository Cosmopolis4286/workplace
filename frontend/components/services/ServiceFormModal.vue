<template>
  <Teleport to="body">
    <div
      v-if="show"
      class="fixed inset-0 z-50 flex items-center justify-center p-4"
      @click.self="!saving && $emit('close')"
    >
      <div class="absolute inset-0 bg-black/40 backdrop-blur-sm"></div>
      <div class="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div class="p-6">
          <div class="flex items-center justify-between mb-6">
            <h2 class="text-lg font-semibold text-gray-900">
              {{ editing ? 'Editar Servicio' : 'Nuevo Servicio' }}
            </h2>
            <button @click="$emit('close')" :disabled="saving" class="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-40">
              <XMarkIcon class="h-5 w-5" />
            </button>
          </div>

          <div v-if="formError" class="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            {{ formError }}
          </div>

          <form @submit.prevent="handleSubmit" class="space-y-4">
            <!-- Nombre -->
            <div>
              <div class="flex items-center justify-between mb-1">
                <label class="block text-xs font-medium text-gray-700">Nombre <span class="text-red-500">*</span></label>
                <span class="text-[10px] text-gray-400">{{ form.name.length }}/120</span>
              </div>
              <input
                v-model="form.name"
                type="text"
                placeholder="Ej: Diseño de logo"
                maxlength="120"
                required
                class="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-400"
              />
            </div>

            <!-- Descripción -->
            <div>
              <div class="flex items-center justify-between mb-1">
                <label class="block text-xs font-medium text-gray-700">Descripción</label>
                <span class="text-[10px] text-gray-400">{{ form.description.length }}/1000</span>
              </div>
              <textarea
                v-model="form.description"
                rows="3"
                placeholder="Describe tu servicio: qué incluye, qué necesita el cliente, tiempos estimados..."
                maxlength="1000"
                class="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-400 resize-none"
              ></textarea>
              <p v-if="!form.description" class="mt-1 text-xs text-amber-600">
                Los servicios con descripción reciben más solicitudes. Te recomendamos completarla.
              </p>
            </div>

            <!-- Precio y unidad -->
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-xs font-medium text-gray-700 mb-1">Precio <span class="text-red-500">*</span></label>
                <input
                  v-model.number="form.price"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  required
                  class="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-400"
                />
              </div>
              <div>
                <label class="block text-xs font-medium text-gray-700 mb-1">Unidad de precio</label>
                <input
                  v-model="form.priceUnit"
                  type="text"
                  placeholder="hora, proyecto, mes..."
                  maxlength="30"
                  class="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-400"
                />
              </div>
            </div>

            <!-- Duración y categoría -->
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-xs font-medium text-gray-700 mb-1">Duración (minutos)</label>
                <input
                  v-model.number="form.duration"
                  type="number"
                  min="1"
                  placeholder="60"
                  class="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-400"
                />
              </div>
              <div>
                <label class="block text-xs font-medium text-gray-700 mb-1">Categoría</label>
                <select
                  v-model="form.categoryId"
                  class="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 bg-white"
                >
                  <option value="">Sin categoría</option>
                  <option v-for="cat in catalogCategories" :key="cat.id" :value="cat.id">
                    {{ cat.name }}
                  </option>
                </select>
              </div>
            </div>

            <!-- Estado -->
            <div>
              <label class="block text-xs font-medium text-gray-700 mb-1">Estado</label>
              <select
                v-model="form.status"
                class="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 bg-white"
              >
                <option value="ACTIVE">Activo</option>
                <option value="PAUSED">Pausado</option>
                <option value="INACTIVE">Inactivo</option>
              </select>
            </div>

            <!-- Garantía de plataforma -->
            <div class="flex items-start justify-between gap-3 rounded-xl border border-gray-200 p-3">
              <div class="min-w-0">
                <p class="text-xs font-medium text-gray-700">Ofrecer con garantía de plataforma</p>
                <p class="mt-0.5 text-xs text-gray-400">
                  El cliente deposita el pago del servicio en la plataforma al acordar el precio; te lo liberamos al confirmar la finalización.
                  Cambiarlo solo afecta solicitudes nuevas.
                </p>
              </div>
              <button
                type="button"
                role="switch"
                :aria-checked="form.hasEscrow"
                class="relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors"
                :class="form.hasEscrow ? 'bg-red-500' : 'bg-gray-200'"
                @click="form.hasEscrow = !form.hasEscrow"
              >
                <span
                  class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform"
                  :class="form.hasEscrow ? 'translate-x-6' : 'translate-x-1'"
                />
              </button>
            </div>

            <!-- Tags -->
            <div>
              <label class="block text-xs font-medium text-gray-700 mb-1">Etiquetas</label>
              <TagsInput v-model="form.tags" suggestions-endpoint="/services/catalog/tags" />
              <p class="mt-1.5 text-xs text-gray-400">Ayudan a que tu servicio aparezca en más búsquedas.</p>
            </div>

            <!-- Modalidades -->
            <div>
              <label class="block text-xs font-medium text-gray-700 mb-2">Modalidades que ofreces</label>
              <div class="grid grid-cols-3 gap-2">
                <button
                  v-for="opt in ALL_MODALITIES"
                  :key="opt.value"
                  type="button"
                  class="flex flex-col items-center gap-1 py-3 px-2 rounded-xl border-2 text-xs font-semibold transition-all"
                  :class="form.modalities.includes(opt.value)
                    ? 'border-red-500 bg-red-50 text-red-700'
                    : 'border-gray-200 text-gray-500 hover:border-gray-300 hover:bg-gray-50'"
                  @click="form.modalities.includes(opt.value)
                    ? form.modalities.splice(form.modalities.indexOf(opt.value), 1)
                    : form.modalities.push(opt.value)"
                >
                  <span class="text-lg">{{ opt.emoji }}</span>
                  {{ opt.label }}
                </button>
              </div>
              <p v-if="form.modalities.length === 0" class="mt-1.5 text-xs text-amber-600">
                Sin modalidades seleccionadas, el servicio no mostrará esta información a los clientes.
              </p>
              <p v-else class="mt-1.5 text-xs text-gray-400">Selecciona una o más. Los clientes solo verán las que hayas activado.</p>
            </div>

            <!-- Campos por ítem -->
            <div>
              <label class="block text-xs font-medium text-gray-700 mb-1">Campos por ítem</label>
              <div class="flex flex-wrap gap-1.5 mb-2">
                <span
                  v-for="field in form.itemFields"
                  :key="field"
                  class="flex items-center gap-1 text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded-full"
                >
                  {{ field }}
                  <button type="button" @click="removeItemField(field)" class="hover:text-blue-900">
                    <XMarkIcon class="h-3 w-3" />
                  </button>
                </span>
              </div>
              <div class="flex gap-2">
                <input
                  v-model="itemFieldInput"
                  @keydown.enter.prevent="addItemField"
                  type="text"
                  placeholder="Ej: Marca, Modelo, Tipo de máquina..."
                  maxlength="40"
                  class="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-400"
                />
                <button
                  type="button"
                  @click="addItemField"
                  class="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-xl text-sm font-medium text-gray-700 transition-colors"
                >
                  Agregar
                </button>
              </div>
              <p class="mt-1.5 text-xs text-gray-400">
                Define qué información pedirás por cada ítem/equipo que el cliente quiera reparar (ej. Marca, Modelo, Tipo de máquina). Déjalo vacío si tu servicio no maneja ítems individuales.
              </p>
            </div>

            <!-- Imágenes -->
            <div>
              <label class="block text-xs font-medium text-gray-700 mb-2">Imágenes</label>
              <div v-if="!editing" class="text-xs text-gray-400 mb-2">
                Podrás agregar imágenes después de crear el servicio.
              </div>
              <div v-else class="grid grid-cols-3 gap-2">
                <ServiceImageSlot
                  v-for="slot in [0, 1, 2]"
                  :key="slot"
                  :label="slot === 0 ? 'Principal' : `Secundaria ${slot}`"
                  :image="form.images[slot]"
                  :busy="uploadingSlot === slot"
                  @upload="(file) => handleImageUpload(slot, file)"
                  @import-url="(url) => handleImageUrl(slot, url)"
                />
              </div>
              <p v-if="imageError" class="mt-1.5 text-xs text-red-600">{{ imageError }}</p>
            </div>

            <!-- Buttons -->
            <div class="flex gap-3 pt-2">
              <button
                type="button"
                @click="$emit('close')"
                :disabled="saving"
                class="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-40"
              >
                Cancelar
              </button>
              <button
                type="submit"
                :disabled="saving || !isFormValid"
                class="flex-1 btn-primary disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {{ saving ? 'Guardando...' : (editing ? 'Guardar cambios' : 'Crear servicio') }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { XMarkIcon } from '@heroicons/vue/24/outline'
import TagsInput from '~/components/ui/TagsInput.vue'
import ServiceImageSlot from './ServiceImageSlot.vue'
import { useFormValidation } from '~/composables/ui/useFormValidation'
import { useMyServices } from '~/composables/services/useMyServices'
import type { Service, MyServiceCategory } from '~/composables/services/useMyServices'

const props = defineProps<{
  show: boolean
  editing: Service | null
  catalogCategories: MyServiceCategory[]
  saving: boolean
}>()

const emit = defineEmits<{
  close: []
  submit: [payload: Record<string, unknown>]
}>()

const { validate, required } = useFormValidation()
const { uploadServiceImage, importServiceImageFromUrl } = useMyServices()

const ALL_MODALITIES = [
  { value: 'IN_PERSON', label: 'Presencial', emoji: '📍' },
  { value: 'REMOTE', label: 'Remoto', emoji: '💻' },
  { value: 'ANY', label: 'Cualquiera', emoji: '🤝' },
]

const emptyForm = () => ({
  name: '',
  description: '',
  price: 0,
  priceUnit: '',
  duration: undefined as number | undefined,
  images: [] as string[],
  status: 'ACTIVE' as Service['status'],
  tags: [] as string[],
  modalities: [] as string[],
  itemFields: [] as string[],
  categoryId: '',
  hasEscrow: false,
})

const form = ref(emptyForm())
const itemFieldInput = ref('')
const formError = ref<string | null>(null)
const imageError = ref<string | null>(null)
const uploadingSlot = ref<number | null>(null)

const isFormValid = computed(() =>
  form.value.name.trim().length > 0 && Number.isFinite(form.value.price) && form.value.price >= 0
)

watch(() => props.show, (visible) => {
  if (!visible) return
  formError.value = null
  if (props.editing) {
    const service = props.editing
    form.value = {
      name: service.name,
      description: service.description ?? '',
      price: service.price,
      priceUnit: service.priceUnit ?? '',
      duration: service.duration,
      images: [...(service.images ?? [])],
      status: service.status,
      tags: [...service.tags],
      modalities: [...(service.modalities ?? [])],
      itemFields: [...(service.itemFields ?? [])],
      categoryId: service.categoryId ?? '',
      hasEscrow: service.hasEscrow ?? false,
    }
  } else {
    form.value = emptyForm()
  }
})

function addItemField() {
  const f = itemFieldInput.value.trim()
  if (f && !form.value.itemFields.includes(f) && form.value.itemFields.length < 10) form.value.itemFields.push(f)
  itemFieldInput.value = ''
}

function removeItemField(field: string) {
  form.value.itemFields = form.value.itemFields.filter(f => f !== field)
}

function handleSubmit() {
  const nameError = validate(form.value.name, [required('El nombre del servicio')])
  if (nameError) {
    formError.value = nameError
    return
  }
  if (!Number.isFinite(form.value.price) || form.value.price < 0) {
    formError.value = 'El precio debe ser un número mayor o igual a 0'
    return
  }
  formError.value = null
  emit('submit', {
    name: form.value.name.trim(),
    description: form.value.description || undefined,
    price: form.value.price,
    priceUnit: form.value.priceUnit || undefined,
    duration: form.value.duration || undefined,
    status: form.value.status,
    tags: form.value.tags,
    modalities: form.value.modalities,
    itemFields: form.value.itemFields,
    categoryId: form.value.categoryId || undefined,
    hasEscrow: form.value.hasEscrow,
  })
}

async function handleImageUpload(slot: number, file: File) {
  if (!props.editing?.id) return
  imageError.value = null
  uploadingSlot.value = slot
  try {
    const updated = await uploadServiceImage(props.editing.id, slot, file)
    form.value.images = [...(updated.images ?? [])]
  } catch (err: any) {
    imageError.value = err?.message ?? 'Error al subir la imagen'
  } finally {
    uploadingSlot.value = null
  }
}

async function handleImageUrl(slot: number, url: string) {
  if (!props.editing?.id) return
  imageError.value = null
  uploadingSlot.value = slot
  try {
    const updated = await importServiceImageFromUrl(props.editing.id, slot, url)
    form.value.images = [...(updated.images ?? [])]
  } catch (err: any) {
    imageError.value = err?.message ?? 'No se pudo importar la imagen desde esa URL'
  } finally {
    uploadingSlot.value = null
  }
}

defineExpose({ setError: (msg: string) => { formError.value = msg } })
</script>
