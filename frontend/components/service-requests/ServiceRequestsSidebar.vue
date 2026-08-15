<template>
  <div class="space-y-4">

    <!-- Resumen por estado -->
    <div class="card p-5">
      <h3 class="text-sm font-semibold text-gray-700 mb-4">Resumen</h3>
      <div class="space-y-3">
        <div v-for="s in statusSummary" :key="s.status" class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <span class="w-2 h-2 rounded-full flex-shrink-0" :class="s.dot" />
            <span class="text-sm text-gray-600">{{ s.label }}</span>
          </div>
          <span class="text-sm font-bold text-gray-900">{{ s.count }}</span>
        </div>
      </div>
    </div>

    <!-- Pendientes sin atender — solo para proveedores -->
    <div v-if="!isNormal && viewAs === 'provider' && pendingCount > 0" class="card p-5 border-l-4 border-l-yellow-400">
      <div class="flex items-center gap-2 mb-1">
        <ClockIcon class="h-4 w-4 text-yellow-500" />
        <p class="text-sm font-semibold text-gray-700">Pendientes sin atender</p>
      </div>
      <p class="text-2xl font-black text-yellow-600">{{ pendingCount }}</p>
      <p class="text-xs text-gray-400 mt-1">Responde pronto para mejorar tu conversión</p>
    </div>

    <!-- Info vista cliente -->
    <div v-if="viewAs === 'client'" class="card p-5 border-l-4 border-l-blue-400">
      <div class="flex items-center gap-2 mb-1">
        <InformationCircleIcon class="h-4 w-4 text-blue-500" />
        <p class="text-sm font-semibold text-gray-700">Solicitudes enviadas</p>
      </div>
      <p class="text-xs text-gray-500 mt-1">
        El proveedor se pondrá en contacto contigo para coordinar los detalles del servicio.
      </p>
    </div>

    <!-- Tip proveedor -->
    <div v-if="viewAs === 'provider'" class="card p-5 bg-gradient-to-br from-red-50 to-orange-50 border border-red-100">
      <p class="text-xs font-semibold text-red-700 mb-2">Flujo recomendado</p>
      <ol class="space-y-1.5">
        <li class="flex items-start gap-2 text-xs text-gray-600">
          <span class="font-bold text-red-500 flex-shrink-0">1.</span>
          Haz clic en la solicitud para ver los datos del cliente
        </li>
        <li class="flex items-start gap-2 text-xs text-gray-600">
          <span class="font-bold text-red-500 flex-shrink-0">2.</span>
          Contacta al cliente y marca como "Contactado"
        </li>
        <li class="flex items-start gap-2 text-xs text-gray-600">
          <span class="font-bold text-red-500 flex-shrink-0">3.</span>
          Agrega observaciones del acuerdo (fecha, precio, detalles)
        </li>
        <li class="flex items-start gap-2 text-xs text-gray-600">
          <span class="font-bold text-red-500 flex-shrink-0">4.</span>
          Cierra el trato cuando se complete el servicio
        </li>
      </ol>
    </div>

  </div>
</template>

<script setup lang="ts">
import { ClockIcon, InformationCircleIcon } from '@heroicons/vue/24/outline'

defineProps<{
  statusSummary: { status: string; label: string; count: number; dot: string }[]
  isNormal: boolean
  viewAs: 'provider' | 'client'
  pendingCount: number
}>()
</script>
