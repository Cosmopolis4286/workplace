<template>
  <div class="card p-5 flex flex-col gap-3 hover:shadow-md transition-shadow">
    <!-- Image -->
    <div v-if="mainImage" class="-mx-5 -mt-5 mb-1 h-40 bg-gray-100 rounded-t-2xl overflow-hidden">
      <img
        :src="mainImage"
        :alt="service.name"
        class="w-full h-full object-cover"
        @error="($event.target as HTMLImageElement).closest('div')!.classList.add('hidden')"
      />
    </div>

    <!-- Header -->
    <div class="flex items-start justify-between gap-2">
      <div class="flex-1 min-w-0">
        <h3 class="font-semibold text-gray-900 truncate">{{ service.name }}</h3>
        <p v-if="service.category" class="text-xs text-gray-500 mt-0.5">
          <span
            class="inline-block w-2 h-2 rounded-full mr-1"
            :style="{ backgroundColor: service.category.color }"
          ></span>
          {{ service.category.name }}
        </p>
      </div>
      <span
        class="flex-shrink-0 text-xs font-medium px-2 py-1 rounded-full"
        :class="SERVICE_STATUS_CLASSES[service.status]"
      >
        {{ SERVICE_STATUS_LABELS[service.status] }}
      </span>
    </div>

    <!-- Description -->
    <p v-if="service.description" class="text-sm text-gray-600 line-clamp-2">
      {{ service.description }}
    </p>

    <!-- Meta -->
    <div class="flex items-center gap-4 text-sm">
      <span class="font-bold text-gray-900">
        ${{ formatNumber(service.price) }}
        <span v-if="service.priceUnit" class="font-normal text-gray-500 text-xs">/ {{ service.priceUnit }}</span>
      </span>
      <span v-if="service.duration" class="text-gray-500 flex items-center gap-1">
        <ClockIcon class="h-3.5 w-3.5" />
        {{ formatDuration(service.duration) }}
      </span>
    </div>

    <!-- Modalidades -->
    <div v-if="service.modalities?.length" class="flex flex-wrap gap-1">
      <span
        v-for="m in service.modalities"
        :key="m"
        class="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full font-medium"
      >
        {{ MODALITY_LABELS[m] ?? m }}
      </span>
    </div>

    <!-- Tags -->
    <div v-if="service.tags?.length" class="flex flex-wrap gap-1">
      <span
        v-for="tag in service.tags.slice(0, 4)"
        :key="tag"
        class="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full"
      >
        {{ tag }}
      </span>
      <span v-if="service.tags.length > 4" class="text-xs text-gray-400">+{{ service.tags.length - 4 }}</span>
    </div>

    <!-- Actions -->
    <div class="flex items-center justify-between pt-2 border-t border-gray-100">
      <button
        @click="$emit('toggle-status', service)"
        class="text-xs font-medium px-3 py-1.5 rounded-lg transition-colors"
        :class="service.status === 'ACTIVE'
          ? 'bg-yellow-50 text-yellow-700 hover:bg-yellow-100'
          : 'bg-green-50 text-green-700 hover:bg-green-100'"
      >
        {{ service.status === 'ACTIVE' ? 'Pausar' : 'Activar' }}
      </button>
      <div class="flex gap-1">
        <button
          @click="$emit('view-metrics', service)"
          class="p-1.5 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
          title="Ver métricas"
        >
          <ChartBarIcon class="h-4 w-4" />
        </button>
        <button
          @click="$emit('edit', service)"
          class="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
          title="Editar"
        >
          <PencilIcon class="h-4 w-4" />
        </button>
        <button
          @click="$emit('delete', service)"
          class="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          title="Eliminar"
        >
          <TrashIcon class="h-4 w-4" />
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { ClockIcon, ChartBarIcon, PencilIcon, TrashIcon } from '@heroicons/vue/24/outline'
import { SERVICE_STATUS_LABELS, SERVICE_STATUS_CLASSES, type Service } from '~/composables/services/useMyServices'
import { useDateFormat } from '~/composables/core/useDateFormat'
import { useAssetUrl } from '~/composables/core/useAssetUrl'

const props = defineProps<{
  service: Service
}>()

const { getAssetUrl } = useAssetUrl()
const mainImage = computed(() => getAssetUrl(props.service.images?.[0]))

defineEmits<{
  'toggle-status': [service: Service]
  'view-metrics': [service: Service]
  edit: [service: Service]
  delete: [service: Service]
}>()

const { formatNumber } = useDateFormat()

const MODALITY_LABELS: Record<string, string> = {
  IN_PERSON: '📍 Presencial', REMOTE: '💻 Remoto', ANY: '🤝 Cualquiera',
}

function formatDuration(minutes: number) {
  if (minutes < 60) return `${minutes} min`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m ? `${h}h ${m}min` : `${h}h`
}
</script>
