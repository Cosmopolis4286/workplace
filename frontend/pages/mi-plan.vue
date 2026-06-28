<template>
  <div>
    <PageHeader
      title="Mi Plan"
      description="Gestiona tu suscripción y conoce los planes disponibles"
      :icon="CreditCardIcon"
      :breadcrumb="[{ label: 'Mi Plan' }]"
      :stats="headerStats"
    >
      <template #actions>
        <NuxtLink
          to="/precios"
          class="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 hover:border-gray-300 transition-colors"
        >
          <ArrowTopRightOnSquareIcon class="h-3.5 w-3.5" />
          Ver página de precios
        </NuxtLink>
      </template>
    </PageHeader>

    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">

      <!-- ── Columna principal ────────────────────────────────────────────── -->
      <div class="lg:col-span-2 space-y-6">

        <!-- Plan actual: skeleton -->
        <div v-if="loading" class="card p-6 animate-pulse space-y-4">
          <div class="skeleton h-5 w-32 rounded" />
          <div class="skeleton h-10 w-48 rounded" />
          <div class="grid grid-cols-4 gap-4 mt-4">
            <div v-for="n in 4" :key="n" class="skeleton h-14 rounded-xl" />
          </div>
        </div>

        <!-- Plan actual: con suscripción -->
        <div
          v-else-if="mySubscription && myPlan"
          class="card overflow-hidden border-2"
          :style="{ borderColor: myPlan.color }"
        >
          <!-- Header con gradiente del plan -->
          <div
            class="px-6 py-5 flex flex-col sm:flex-row sm:items-start justify-between gap-4"
            :style="{ background: `linear-gradient(135deg, ${myPlan.color}18, ${myPlan.color}06)` }"
          >
            <div>
              <p class="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Tu plan actual</p>
              <div class="flex items-center gap-3 flex-wrap">
                <h2 class="text-2xl font-black text-gray-900">{{ myPlan.name }}</h2>
                <span class="badge text-xs font-semibold" :class="SUB_STATUS_CLASSES[mySubscription.status]">
                  {{ SUB_STATUS_LABELS[mySubscription.status] }}
                </span>
              </div>
              <p class="text-sm text-gray-500 mt-1">{{ myPlan.description }}</p>
            </div>
            <div class="text-right flex-shrink-0">
              <p class="text-3xl font-black" :style="{ color: myPlan.color }">{{ formatPrice(mySubscription.pricePaid) }}</p>
              <p class="text-xs text-gray-400 mt-0.5">/ {{ INTERVAL_LABELS[mySubscription.interval].toLowerCase() }}</p>
            </div>
          </div>

          <!-- Vencimiento -->
          <div
            v-if="mySubscription.endAt"
            class="px-6 py-3 flex items-center gap-2 text-sm border-t"
            :style="{ borderColor: myPlan.color + '30' }"
          >
            <CalendarIcon class="h-4 w-4 flex-shrink-0" :style="{ color: myPlan.color }" />
            <span class="text-gray-600">
              Vence el
              <strong>{{ new Date(mySubscription.endAt).toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' }) }}</strong>
            </span>
            <span
              v-if="daysRemaining(mySubscription.endAt) !== null"
              class="ml-1 font-semibold"
              :class="(daysRemaining(mySubscription.endAt) ?? 0) <= 7 ? 'text-red-600' : 'text-gray-500'"
            >
              ({{ daysRemaining(mySubscription.endAt) }} días restantes)
            </span>
          </div>

          <!-- Límites -->
          <div class="grid grid-cols-2 sm:grid-cols-4 divide-x divide-y sm:divide-y-0 divide-gray-100 border-t border-gray-100">
            <div v-for="lim in planLimits" :key="lim.label" class="p-4 text-center">
              <p class="text-xl font-black text-gray-900">{{ lim.value }}</p>
              <p class="text-xs text-gray-400 mt-0.5">{{ lim.label }}</p>
            </div>
          </div>

          <!-- Features -->
          <div class="px-6 pb-5 pt-4 flex flex-wrap gap-2">
            <span
              v-for="feat in myPlan.features"
              :key="feat"
              class="text-xs px-2.5 py-1 rounded-full border border-gray-200 bg-gray-50 text-gray-600 font-medium"
            >
              ✓ {{ feat }}
            </span>
          </div>
        </div>

        <!-- Sin suscripción -->
        <div v-else-if="!loading" class="card p-10 text-center border-2 border-dashed border-gray-200">
          <div class="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <CreditCardIcon class="h-7 w-7 text-gray-400" />
          </div>
          <h3 class="text-base font-semibold text-gray-900 mb-1">Sin plan activo</h3>
          <p class="text-sm text-gray-400">No tienes ningún plan activo. Contacta al administrador para adquirir uno.</p>
        </div>

        <!-- Planes disponibles -->
        <div>
          <h2 class="text-base font-semibold text-gray-900 mb-4">Planes disponibles</h2>

          <!-- Skeleton -->
          <div v-if="loading" class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div v-for="i in 4" :key="i" class="card p-5 animate-pulse space-y-3 h-56">
              <div class="skeleton h-5 w-28 rounded" />
              <div class="skeleton h-8 w-20 rounded" />
              <div class="space-y-2">
                <div v-for="n in 3" :key="n" class="skeleton h-3 w-full rounded" />
              </div>
            </div>
          </div>

          <div v-else class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div
              v-for="plan in plans"
              :key="plan.id"
              class="card border-2 overflow-hidden transition-shadow"
              :class="myPlan?.id === plan.id ? '' : 'hover:shadow-md'"
              :style="{ borderColor: plan.color }"
            >
              <!-- Cabecera del plan -->
              <div class="px-5 pt-5 pb-4 relative" :style="{ backgroundColor: plan.color + '10' }">
                <!-- Badge -->
                <span
                  v-if="myPlan?.id === plan.id"
                  class="absolute top-3 right-3 text-xs font-bold px-2 py-0.5 rounded-full text-white"
                  :style="{ backgroundColor: plan.color }"
                >Tu plan ✓</span>
                <span
                  v-else-if="plan.isPopular"
                  class="absolute top-3 right-3 badge bg-yellow-100 text-yellow-700"
                >Popular</span>

                <h3 class="text-base font-bold text-gray-900">{{ plan.name }}</h3>
                <p class="text-xs text-gray-500 mt-0.5 min-h-[2rem]">{{ plan.description }}</p>
                <div class="mt-3 flex items-baseline gap-1.5">
                  <span class="text-2xl font-black" :style="{ color: plan.color }">{{ formatPrice(plan.price) }}</span>
                  <span class="text-xs text-gray-400">/mes</span>
                  <span v-if="plan.priceAnnual" class="text-xs text-gray-400 ml-1">· {{ formatPrice(plan.priceAnnual) }}/año</span>
                </div>
              </div>

              <!-- Cuerpo del plan -->
              <div class="px-5 py-4 space-y-3">
                <!-- Límites en grid 2x2 -->
                <div class="grid grid-cols-2 gap-1 text-xs text-gray-500">
                  <span>📦 {{ formatLimit(plan.maxProducts) }} productos</span>
                  <span>👥 {{ formatLimit(plan.maxEmployees) }} empleados</span>
                  <span>🏢 {{ formatLimit(plan.maxBranches) }} sucursales</span>
                  <span>📋 {{ formatLimit(plan.maxOrders) }} pedidos/mes</span>
                </div>

                <!-- Features -->
                <div class="space-y-1.5">
                  <div
                    v-for="feat in plan.features.slice(0, 4)"
                    :key="feat"
                    class="flex items-start gap-2 text-xs text-gray-600"
                  >
                    <CheckIcon class="h-3.5 w-3.5 flex-shrink-0 mt-0.5" :style="{ color: plan.color }" />
                    {{ feat }}
                  </div>
                  <p v-if="plan.features.length > 4" class="text-xs text-gray-400 ml-5">
                    +{{ plan.features.length - 4 }} características más
                  </p>
                </div>

                <!-- CTA -->
                <div
                  v-if="myPlan?.id === plan.id"
                  class="mt-2 w-full py-2 text-xs text-center font-semibold rounded-lg text-white"
                  :style="{ backgroundColor: plan.color }"
                >Plan actual ✓</div>
                <p v-else class="text-xs text-gray-400 text-center mt-2">
                  Contacta a soporte para cambiar de plan
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- ── Sidebar ─────────────────────────────────────────────────────── -->
      <div class="space-y-4">

        <!-- Uso del plan -->
        <div v-if="myPlan && !loading" class="card p-5">
          <h3 class="text-sm font-semibold text-gray-700 mb-4">Uso del plan</h3>
          <div class="space-y-4">
            <div v-for="u in usageItems" :key="u.label">
              <div class="flex justify-between text-xs mb-1.5">
                <span class="text-gray-600">{{ u.label }}</span>
                <span class="font-bold text-gray-900">{{ u.value }}</span>
              </div>
              <div class="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  class="h-full rounded-full transition-all duration-700"
                  :class="u.color"
                  :style="{ width: u.pct + '%' }"
                />
              </div>
            </div>
          </div>
        </div>

        <!-- Info plan actual -->
        <div v-if="mySubscription && myPlan && !loading" class="card p-5 border-l-4" :style="{ borderLeftColor: myPlan.color }">
          <h3 class="text-sm font-semibold text-gray-700 mb-3">Detalles</h3>
          <div class="space-y-2.5 text-sm">
            <div class="flex justify-between">
              <span class="text-gray-500">Plan</span>
              <span class="font-semibold text-gray-900">{{ myPlan.name }}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-gray-500">Estado</span>
              <span class="badge" :class="SUB_STATUS_CLASSES[mySubscription.status]">{{ SUB_STATUS_LABELS[mySubscription.status] }}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-gray-500">Facturación</span>
              <span class="font-semibold text-gray-900">{{ INTERVAL_LABELS[mySubscription.interval] }}</span>
            </div>
            <div v-if="mySubscription.startAt" class="flex justify-between">
              <span class="text-gray-500">Inicio</span>
              <span class="font-semibold text-gray-900">{{ new Date(mySubscription.startAt).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' }) }}</span>
            </div>
            <div v-if="mySubscription.endAt" class="flex justify-between">
              <span class="text-gray-500">Vence</span>
              <span
                class="font-semibold"
                :class="(daysRemaining(mySubscription.endAt) ?? 999) <= 7 ? 'text-red-600' : 'text-gray-900'"
              >{{ new Date(mySubscription.endAt).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' }) }}</span>
            </div>
          </div>
        </div>

        <!-- Soporte -->
        <div class="card p-5">
          <h3 class="text-sm font-semibold text-gray-700 mb-2">¿Necesitas más?</h3>
          <p class="text-xs text-gray-500 mb-3">Contacta a soporte para cambiar tu plan o resolver dudas sobre tu suscripción.</p>
          <a
            href="mailto:soporte@workplace.com"
            class="btn-secondary w-full text-sm flex items-center justify-center gap-2"
          >
            <EnvelopeIcon class="h-4 w-4" />
            Contactar soporte
          </a>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { CreditCardIcon, CalendarIcon, CheckIcon, EnvelopeIcon, ArrowTopRightOnSquareIcon } from '@heroicons/vue/24/outline'
import PageHeader from '~/components/ui/PageHeader.vue'
import { usePlans, SUB_STATUS_LABELS, SUB_STATUS_CLASSES, INTERVAL_LABELS } from '~/composables/usePlans'

definePageMeta({ layout: 'default', middleware: ['auth'] })

const {
  plans, mySubscription, myPlan, loading,
  fetchMySubscription, fetchPublicPlans,
  formatLimit, formatPrice, daysRemaining,
} = usePlans()

// ─── Stats header ─────────────────────────────────────────────────────────────
const headerStats = computed(() => {
  if (!myPlan.value || !mySubscription.value) return []
  const days = mySubscription.value.endAt ? daysRemaining(mySubscription.value.endAt) : null
  return [
    { label: 'Plan',        value: myPlan.value.name },
    { label: 'Estado',      value: SUB_STATUS_LABELS[mySubscription.value.status] },
    { label: 'Facturación', value: INTERVAL_LABELS[mySubscription.value.interval] },
    { label: 'Días restantes', value: days !== null ? String(days) : '—' },
  ]
})

// ─── Límites del plan actual ──────────────────────────────────────────────────
const planLimits = computed(() => {
  if (!myPlan.value) return []
  return [
    { label: 'Productos',    value: formatLimit(myPlan.value.maxProducts) },
    { label: 'Empleados',    value: formatLimit(myPlan.value.maxEmployees) },
    { label: 'Sucursales',   value: formatLimit(myPlan.value.maxBranches) },
    { label: 'Pedidos/mes',  value: formatLimit(myPlan.value.maxOrders) },
  ]
})

// ─── Barras de uso (simbólico, relativo al plan) ──────────────────────────────
const usageItems = computed(() => {
  if (!myPlan.value) return []
  const plan = myPlan.value

  function pct(limit: number | null, used = 0) {
    if (!limit) return 0
    return Math.min(100, Math.round((used / limit) * 100))
  }

  function color(p: number) {
    return p >= 90 ? 'bg-red-500' : p >= 70 ? 'bg-yellow-500' : 'bg-green-500'
  }

  const items = [
    { label: 'Productos',   limit: plan.maxProducts,  used: 0 },
    { label: 'Empleados',   limit: plan.maxEmployees, used: 0 },
    { label: 'Sucursales',  limit: plan.maxBranches,  used: 0 },
    { label: 'Pedidos/mes', limit: plan.maxOrders,    used: 0 },
  ]

  return items.map(i => ({
    label: i.label,
    value: i.limit === null ? '∞' : `${i.used} / ${i.limit}`,
    pct:   i.limit === null ? 10 : pct(i.limit, i.used),
    color: i.limit === null ? 'bg-gray-300' : color(pct(i.limit, i.used)),
  }))
})

onMounted(() => Promise.all([fetchMySubscription(), fetchPublicPlans()]))
</script>
