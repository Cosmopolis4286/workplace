<template>
  <div class="card-premium p-6">
    <div class="flex items-center mb-4">
      <div class="p-3 bg-gradient-to-br from-workplace-red to-red-700 rounded-xl shadow-lg mr-3">
        <BriefcaseIcon class="h-6 w-6 text-white" />
      </div>
      <h3 class="text-xl font-bold text-gray-900">Ofrece tus servicios</h3>
    </div>

    <!-- Ya tiene una solicitud -->
    <div v-if="latestApplication" class="rounded-xl p-4 border"
      :class="{
        'bg-amber-50 border-amber-100': latestApplication.status === 'PENDING',
        'bg-red-50 border-red-100': latestApplication.status === 'REJECTED',
      }"
    >
      <p v-if="latestApplication.status === 'PENDING'" class="text-sm text-amber-800 font-medium">
        Tu solicitud para convertirte en freelancer está en revisión.
      </p>
      <template v-else-if="latestApplication.status === 'REJECTED'">
        <p class="text-sm text-red-800 font-medium">Tu solicitud fue rechazada.</p>
        <p v-if="latestApplication.rejectionReason" class="text-xs text-red-700 mt-1">
          Motivo: {{ latestApplication.rejectionReason }}
        </p>
        <button
          type="button"
          class="mt-3 text-xs font-semibold text-red-700 hover:text-red-800 underline"
          @click="latestApplication = null"
        >
          Enviar una nueva solicitud
        </button>
      </template>
    </div>

    <!-- Formulario -->
    <form v-else @submit.prevent="submit" class="space-y-4">
      <p class="text-sm text-gray-500">
        Si quieres publicar servicios y recibir solicitudes de clientes, envía tu solicitud.
        Un administrador la revisará antes de activar tu cuenta de freelancer.
      </p>

      <div>
        <label class="block text-sm font-semibold text-gray-700 mb-2">Categoría de servicio</label>
        <select
          v-model="form.categoryId"
          class="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-workplace-red/20 focus:border-workplace-red bg-white"
          required
          @change="onCategoryChange"
        >
          <option value="" disabled>Selecciona una categoría</option>
          <option v-for="cat in categories" :key="cat.id" :value="cat.id">{{ cat.icon || '🏢' }} {{ cat.name }}</option>
        </select>
      </div>

      <div v-if="subcategories.length > 0">
        <label class="block text-sm font-semibold text-gray-700 mb-2">Subcategoría <span class="font-normal text-gray-400">(opcional)</span></label>
        <select
          v-model="form.subcategoryId"
          class="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-workplace-red/20 focus:border-workplace-red bg-white"
        >
          <option value="">Sin subcategoría</option>
          <option v-for="sub in subcategories" :key="sub.id" :value="sub.id">{{ sub.name }}</option>
        </select>
      </div>

      <div>
        <label class="block text-sm font-semibold text-gray-700 mb-2">Cuéntanos de tu experiencia <span class="font-normal text-gray-400">(opcional)</span></label>
        <textarea
          v-model="form.message"
          rows="3"
          maxlength="1000"
          class="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-workplace-red/20 focus:border-workplace-red resize-none"
          placeholder="Ej: Soy electricista con 5 años de experiencia..."
        />
      </div>

      <p v-if="submitError" class="text-sm text-red-600">{{ submitError }}</p>

      <button
        type="submit"
        :disabled="!form.categoryId || submitting"
        class="w-full py-3 bg-workplace-red hover:bg-red-700 disabled:opacity-60 text-white rounded-xl font-bold transition-colors"
      >
        {{ submitting ? 'Enviando...' : 'Enviar solicitud' }}
      </button>
    </form>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { BriefcaseIcon } from '@heroicons/vue/24/outline'
import { useFreelancerApplication, type FreelancerApplication } from '~/composables/jobs/useFreelancerApplication'
import { getApiErrorMessage } from '~/composables/core/useApiErrors'

const { mine: applications, fetchMine, create: createApplication } = useFreelancerApplication()
const { get: apiGet } = useApi()

const categories = ref<{ id: string; name: string; icon?: string }[]>([])
const subcategories = ref<{ id: string; name: string }[]>([])
const form = ref({ categoryId: '', subcategoryId: '', message: '' })
const submitting = ref(false)
const submitError = ref('')
const latestApplication = ref<FreelancerApplication | null>(null)

async function loadCategories() {
  try {
    categories.value = await apiGet('/users/categories')
  } catch { /* no bloquea el resto del perfil */ }
}

async function onCategoryChange() {
  form.value.subcategoryId = ''
  subcategories.value = []
  if (!form.value.categoryId) return
  try {
    subcategories.value = await apiGet(`/users/categories/${form.value.categoryId}/subcategories`)
  } catch { /* sin subcategorías es un caso válido */ }
}

async function submit() {
  submitError.value = ''
  submitting.value = true
  try {
    const created = await createApplication({
      categoryId: form.value.categoryId,
      subcategoryId: form.value.subcategoryId || undefined,
      message: form.value.message || undefined,
    })
    latestApplication.value = created
  } catch (e: any) {
    submitError.value = getApiErrorMessage(e, 'Error al enviar la solicitud')
  } finally {
    submitting.value = false
  }
}

loadCategories()
fetchMine().then(() => {
  latestApplication.value = applications.value[0] ?? null
})
</script>
