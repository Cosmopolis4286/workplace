<template>
  <Teleport to="body">
    <div
      v-if="show"
      class="fixed inset-0 z-50 flex items-center justify-center p-4"
      @click.self="requestClose"
    >
      <div class="absolute inset-0 bg-black/40 backdrop-blur-sm" @click="requestClose"></div>
      <div class="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div class="p-6">
          <div class="flex items-center justify-between mb-6">
            <h2 class="text-lg font-semibold text-gray-900">
              {{ editing ? 'Editar Servicio' : 'Nuevo Servicio' }}
            </h2>
            <button @click="requestClose" :disabled="saving" class="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-40">
              <XMarkIcon class="h-5 w-5" />
            </button>
          </div>

          <div v-if="notice" class="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">
            {{ notice }}
          </div>
          <div v-if="formError" class="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            {{ formError }}
          </div>

          <form @submit.prevent="handleSubmit" class="space-y-4" novalidate>
            <!-- Nombre -->
            <div>
              <div class="flex items-center justify-between mb-1">
                <label class="block text-xs font-medium text-gray-700">Nombre <span class="text-red-500">*</span></label>
                <span class="text-[10px] text-gray-400">{{ form.name.length }}/120</span>
              </div>
              <input
                v-model="form.name"
                type="text"
                :placeholder="namePlaceholder"
                maxlength="120"
                :class="inputClass(errors.name)"
                @blur="touch('name')"
              />
              <p v-if="errors.name" class="mt-1 text-xs text-red-600">{{ errors.name }}</p>
            </div>

            <!-- Categoría -->
            <div>
              <label class="block text-xs font-medium text-gray-700 mb-1">
                Categoría <span v-if="categoryRequired" class="text-red-500">*</span>
              </label>
              <select
                v-model="form.categoryId"
                :class="inputClass(errors.categoryId, 'bg-white')"
                @blur="touch('categoryId')"
              >
                <option value="" :disabled="categoryRequired">
                  {{ categoryRequired ? 'Selecciona una categoría' : 'Sin categoría' }}
                </option>
                <option v-for="cat in catalogCategories" :key="cat.id" :value="cat.id">
                  {{ cat.icon ? `${cat.icon} ` : '' }}{{ cat.name }}
                </option>
              </select>
              <p v-if="errors.categoryId" class="mt-1 text-xs text-red-600">{{ errors.categoryId }}</p>
              <p v-else-if="!categoryRequired" class="mt-1 text-xs text-gray-400">
                Tu rubro todavía no tiene categorías de servicio. Puedes publicarlo igual.
              </p>
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
              <p v-if="form.description.trim().length < 40" class="mt-1 text-xs text-amber-600">
                Los servicios con una buena descripción (40+ caracteres) reciben más solicitudes.
              </p>
            </div>

            <!-- Precio y unidad -->
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-xs font-medium text-gray-700 mb-1">Precio (USD) <span class="text-red-500">*</span></label>
                <div class="relative">
                  <span class="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">$</span>
                  <input
                    v-model.number="form.price"
                    type="number"
                    min="0.01"
                    step="0.01"
                    inputmode="decimal"
                    placeholder="0.00"
                    :class="inputClass(errors.price, 'pl-7')"
                    @blur="touch('price')"
                  />
                </div>
                <p v-if="errors.price" class="mt-1 text-xs text-red-600">{{ errors.price }}</p>
                <p v-else-if="priceLocalLabel" class="mt-1 text-xs text-gray-400">≈ {{ priceLocalLabel }}</p>
              </div>
              <div>
                <label class="block text-xs font-medium text-gray-700 mb-1">Cobras por</label>
                <input
                  v-model="form.priceUnit"
                  type="text"
                  list="service-price-units"
                  placeholder="servicio, hora, envío..."
                  maxlength="30"
                  class="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-400"
                />
                <datalist id="service-price-units">
                  <option v-for="unit in PRICE_UNITS" :key="unit" :value="unit" />
                </datalist>
                <p class="mt-1 text-xs text-gray-400">
                  {{ form.price > 0 ? pricePreview : 'El precio final se ajusta en cada solicitud.' }}
                </p>
              </div>
            </div>

            <!-- Duración y estado -->
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-xs font-medium text-gray-700 mb-1">Duración estimada (min)</label>
                <input
                  v-model.number="form.duration"
                  type="number"
                  min="1"
                  step="5"
                  placeholder="60"
                  :class="inputClass(errors.duration)"
                  @blur="touch('duration')"
                />
                <p v-if="errors.duration" class="mt-1 text-xs text-red-600">{{ errors.duration }}</p>
                <p v-else-if="durationLabel" class="mt-1 text-xs text-gray-400">≈ {{ durationLabel }}</p>
              </div>
              <div>
                <label class="block text-xs font-medium text-gray-700 mb-1">Estado</label>
                <select
                  v-model="form.status"
                  class="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 bg-white"
                >
                  <option value="ACTIVE">Activo (visible)</option>
                  <option value="PAUSED">Pausado</option>
                  <option value="INACTIVE">Inactivo</option>
                </select>
              </div>
            </div>

            <!-- Garantía de plataforma -->
            <div v-if="features.protectedPayments" class="flex items-start justify-between gap-3 rounded-xl border border-gray-200 p-3">
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

            <!-- Modalidades (catálogo activo de la plataforma) -->
            <div>
              <label class="block text-xs font-medium text-gray-700 mb-2">Modalidades que ofreces</label>
              <div class="grid gap-2" :class="modalityOptions.length > 3 ? 'grid-cols-4' : 'grid-cols-3'">
                <button
                  v-for="opt in modalityOptions"
                  :key="opt.value"
                  type="button"
                  :aria-pressed="form.modalities.includes(opt.value)"
                  class="flex flex-col items-center gap-1 py-3 px-2 rounded-xl border-2 text-xs font-semibold transition-all"
                  :class="form.modalities.includes(opt.value)
                    ? 'border-red-500 bg-red-50 text-red-700'
                    : 'border-gray-200 text-gray-500 hover:border-gray-300 hover:bg-gray-50'"
                  @click="toggleModality(opt.value)"
                >
                  <span class="text-lg">{{ opt.emoji }}</span>
                  {{ opt.name }}
                </button>
              </div>
              <p v-if="form.modalities.length === 0" class="mt-1.5 text-xs text-amber-600">
                Sin modalidades seleccionadas, el servicio no mostrará esta información a los clientes.
              </p>
              <p v-else class="mt-1.5 text-xs text-gray-400">
                "Cualquiera" reemplaza a las demás; el cliente elige al solicitar.
              </p>
            </div>

            <!-- Tags -->
            <div>
              <label class="block text-xs font-medium text-gray-700 mb-1">Etiquetas</label>
              <TagsInput v-model="form.tags" suggestions-endpoint="/services/catalog/tags" />
              <p class="mt-1.5 text-xs" :class="errors.tags ? 'text-red-600' : 'text-gray-400'">
                {{ errors.tags || `Ayudan a que tu servicio aparezca en más búsquedas (máx. ${MAX_TAGS}).` }}
              </p>
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
                  placeholder="Ej: Marca, Modelo, Dirección de entrega..."
                  maxlength="40"
                  :disabled="form.itemFields.length >= 10"
                  class="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-400 disabled:bg-gray-50"
                />
                <button
                  type="button"
                  @click="addItemField"
                  :disabled="form.itemFields.length >= 10"
                  class="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-xl text-sm font-medium text-gray-700 transition-colors disabled:opacity-50"
                >
                  Agregar
                </button>
              </div>
              <p class="mt-1.5 text-xs text-gray-400">
                Qué información pedirás por cada ítem que el cliente incluya en la solicitud (máx. 10). Déjalo vacío si no aplica.
              </p>
            </div>

            <!-- Imágenes -->
            <div>
              <label class="block text-xs font-medium text-gray-700 mb-2">Imágenes</label>
              <div v-if="!editing" class="text-xs text-gray-400 mb-2">
                Al crear el servicio podrás agregar hasta 3 imágenes sin cerrar este formulario.
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
                @click="requestClose"
                :disabled="saving"
                class="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-40"
              >
                {{ notice && !isDirty ? 'Listo' : 'Cancelar' }}
              </button>
              <button
                type="submit"
                :disabled="saving || (!!editing && !isDirty)"
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
import { useMyServices } from '~/composables/services/useMyServices'
import { useDefaultRate } from '~/composables/wallets/useDefaultRate'
import { useConfirm } from '~/composables/ui/useConfirm'
import type { Service, MyServiceCategory, ServiceModality } from '~/composables/services/useMyServices'
import { useFeatures } from '~/composables/core/useFeatures'

const { features } = useFeatures()

const props = defineProps<{
  show: boolean
  editing: Service | null
  catalogCategories: MyServiceCategory[]
  modalities: ServiceModality[]
  saving: boolean
}>()

const emit = defineEmits<{
  close: []
  submit: [payload: Record<string, unknown>]
}>()

const { uploadServiceImage, importServiceImageFromUrl } = useMyServices()
const { load: loadRate, convertLabel } = useDefaultRate()
const { confirm } = useConfirm()

// Mismos límites que CreateServiceDto en el backend.
const MAX_PRICE = 1_000_000
const MAX_TAGS = 15
const PRICE_UNITS = ['servicio', 'hora', 'día', 'visita', 'envío', 'km', 'viaje', 'proyecto', 'mes', 'unidad']

// Respaldo si el catálogo de modalidades no cargó: los mismos valores que
// siembra el backend (seedServiceModalities).
const FALLBACK_MODALITIES: Pick<ServiceModality, 'value' | 'name' | 'emoji'>[] = [
  { value: 'IN_PERSON', name: 'Presencial', emoji: '📍' },
  { value: 'REMOTE', name: 'Remoto', emoji: '💻' },
  { value: 'ANY', name: 'Cualquiera', emoji: '🤝' },
]
const modalityOptions = computed(() =>
  props.modalities.length > 0 ? props.modalities.filter(m => m.isActive) : FALLBACK_MODALITIES,
)

const emptyForm = () => ({
  name: '',
  description: '',
  price: undefined as unknown as number,
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

type ServiceForm = ReturnType<typeof emptyForm>

const form = ref<ServiceForm>(emptyForm())
const snapshot = ref('')
const itemFieldInput = ref('')
const formError = ref<string | null>(null)
const notice = ref<string | null>(null)
const imageError = ref<string | null>(null)
const uploadingSlot = ref<number | null>(null)
const touched = ref<Record<string, boolean>>({})
const submitted = ref(false)

// Comparación sin imágenes: se suben al instante, no con "Guardar".
const serialize = (f: ServiceForm) => JSON.stringify({ ...f, images: undefined })
const isDirty = computed(() => serialize(form.value) !== snapshot.value)

const categoryRequired = computed(() => props.catalogCategories.length > 0)

const namePlaceholder = computed(() => {
  const first = props.catalogCategories[0]?.name
  return first ? `Ej: ${first}` : 'Ej: Diseño de logo'
})

const rawErrors = computed(() => {
  const f = form.value
  const e: Record<string, string> = {}
  if (f.name.trim().length < 3) e.name = 'Escribe un nombre de al menos 3 caracteres'
  if (categoryRequired.value && !f.categoryId) e.categoryId = 'Elige la categoría para que te encuentren'
  if (!Number.isFinite(f.price) || f.price <= 0) e.price = 'Ingresa un precio mayor a 0'
  else if (f.price > MAX_PRICE) e.price = 'El precio es demasiado alto'
  else if (Math.round(f.price * 100) !== f.price * 100) e.price = 'Máximo 2 decimales'
  if (f.duration !== undefined && f.duration !== null && (f.duration as unknown) !== '' &&
      (!Number.isInteger(f.duration) || f.duration < 1)) e.duration = 'Usa minutos enteros (mín. 1)'
  if (f.tags.length > MAX_TAGS) e.tags = `Máximo ${MAX_TAGS} etiquetas`
  return e
})

// Errores visibles solo de campos tocados o tras intentar enviar.
const errors = computed(() => {
  const visible: Record<string, string> = {}
  for (const [field, msg] of Object.entries(rawErrors.value)) {
    if (submitted.value || touched.value[field]) visible[field] = msg
  }
  return visible
})

function touch(field: string) {
  touched.value[field] = true
}

function inputClass(error?: string, extra = '') {
  return [
    'w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2',
    error ? 'border-red-300 focus:ring-red-500/20 focus:border-red-400' : 'border-gray-200 focus:ring-red-500/20 focus:border-red-400',
    extra,
  ]
}

const priceLocalLabel = computed(() =>
  Number.isFinite(form.value.price) && form.value.price > 0 ? convertLabel(form.value.price) : null,
)

const pricePreview = computed(() => {
  const unit = form.value.priceUnit.trim()
  return `Se mostrará: $${Number(form.value.price).toFixed(2)}${unit ? ` / ${unit}` : ''}`
})

const durationLabel = computed(() => {
  const d = form.value.duration
  if (!d || !Number.isInteger(d) || d < 60) return null
  const days = Math.floor(d / 1440)
  const hours = Math.floor((d % 1440) / 60)
  const mins = d % 60
  return [days && `${days} d`, hours && `${hours} h`, mins && `${mins} min`].filter(Boolean).join(' ')
})

function loadForm(service: Service | null) {
  form.value = service
    ? {
        name: service.name,
        description: service.description ?? '',
        price: service.price,
        priceUnit: service.priceUnit ?? '',
        duration: service.duration ?? undefined,
        images: [...(service.images ?? [])],
        status: service.status,
        tags: [...service.tags],
        modalities: [...(service.modalities ?? [])],
        itemFields: [...(service.itemFields ?? [])],
        categoryId: service.categoryId ?? '',
        hasEscrow: service.hasEscrow ?? false,
      }
    : emptyForm()
  snapshot.value = serialize(form.value)
  touched.value = {}
  submitted.value = false
}

watch(() => props.show, (visible) => {
  if (!visible) return
  formError.value = null
  notice.value = null
  imageError.value = null
  itemFieldInput.value = ''
  loadForm(props.editing)
  loadRate()
})

// Tras crear, el padre pasa el servicio recién creado como `editing` sin
// cerrar el modal: se recarga el formulario para habilitar las imágenes.
watch(() => props.editing?.id, (id, prev) => {
  if (props.show && id && !prev) loadForm(props.editing)
})

function toggleModality(value: string) {
  const current = form.value.modalities
  if (current.includes(value)) {
    form.value.modalities = current.filter(m => m !== value)
  } else if (value === 'ANY') {
    form.value.modalities = ['ANY']
  } else {
    form.value.modalities = [...current.filter(m => m !== 'ANY'), value]
  }
}

function addItemField() {
  const f = itemFieldInput.value.trim()
  const exists = form.value.itemFields.some(x => x.toLowerCase() === f.toLowerCase())
  if (f && !exists && form.value.itemFields.length < 10) form.value.itemFields.push(f)
  itemFieldInput.value = ''
}

function removeItemField(field: string) {
  form.value.itemFields = form.value.itemFields.filter(f => f !== field)
}

async function requestClose() {
  if (props.saving) return
  if (isDirty.value) {
    const discard = await confirm({
      title: 'Descartar cambios',
      message: 'Tienes cambios sin guardar en este servicio. ¿Quieres descartarlos?',
      confirmText: 'Descartar',
      variant: 'danger',
    })
    if (!discard) return
  }
  emit('close')
}

function handleSubmit() {
  submitted.value = true
  if (Object.keys(rawErrors.value).length > 0) {
    formError.value = 'Revisa los campos marcados.'
    return
  }
  formError.value = null
  const f = form.value
  emit('submit', {
    name: f.name.trim(),
    description: f.description.trim() || undefined,
    price: f.price,
    priceUnit: f.priceUnit.trim() || undefined,
    duration: f.duration || undefined,
    status: f.status,
    tags: f.tags,
    modalities: f.modalities,
    itemFields: f.itemFields,
    categoryId: f.categoryId || undefined,
    hasEscrow: f.hasEscrow,
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

defineExpose({
  setError: (msg: string) => { formError.value = msg },
  // Tras guardar, la nueva línea base es lo guardado (deja de estar "sucio").
  markSaved: (msg?: string) => {
    snapshot.value = serialize(form.value)
    notice.value = msg ?? null
    formError.value = null
  },
})
</script>
