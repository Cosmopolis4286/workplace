<template>
  <div class="min-h-screen flex items-center justify-center bg-gray-50 p-4">
    <div class="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 text-center">
      <div class="mb-4">
        <span class="inline-block px-3 py-1 text-xs font-semibold uppercase tracking-wide bg-amber-100 text-amber-700 rounded-full">
          Financiamiento simulado
        </span>
      </div>
      <h1 class="text-xl font-bold text-gray-900 mb-2">Resolución de prueba</h1>
      <p class="text-sm text-gray-500 mb-6">
        Esta página simula la pantalla de aprobación de Cashea/Krece mientras no hay credenciales reales.
        Úsala solo para probar el flujo completo de checkout.
      </p>

      <div v-if="resolved" class="p-4 rounded-xl mb-4" :class="resolved === 'APROBADA' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'">
        {{ resolved === 'APROBADA' ? 'Financiamiento aprobado' : 'Financiamiento rechazado' }}
      </div>

      <div v-else class="flex flex-col gap-3">
        <button class="btn-primary" :disabled="loading" @click="resolve('APROBADA')">
          Aprobar (simulado)
        </button>
        <button class="btn-secondary" :disabled="loading" @click="resolve('RECHAZADA')">
          Rechazar (simulado)
        </button>
      </div>

      <p v-if="error" class="mt-4 text-sm text-red-600">{{ error }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

// Página pública: quien recibe este link es el cliente final, no un usuario
// autenticado del comercio. `ref` en la ruta es el externalReference generado
// por SimulatedAdapter.initiate() (va embebido en checkoutUrl). No usa
// useApi() a propósito: ese composable exige sesión y redirige a /login en
// 401, lo cual no aplica a un visitante sin cuenta en este sistema.
definePageMeta({ layout: false })

const route = useRoute()
const externalReference = route.params.ref as string
const config = useRuntimeConfig()

const loading = ref(false)
const resolved = ref<'APROBADA' | 'RECHAZADA' | null>(null)
const error = ref<string | null>(null)

async function resolve(status: 'APROBADA' | 'RECHAZADA') {
  loading.value = true
  error.value = null
  try {
    const res = await fetch(`${config.public.apiUrl}/bnpl/simulate/${externalReference}/resolve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    if (!res.ok) throw new Error(`Error ${res.status}`)
    resolved.value = status
  } catch (e: any) {
    error.value = e?.message ?? 'No se pudo resolver la transacción simulada'
  } finally {
    loading.value = false
  }
}
</script>
