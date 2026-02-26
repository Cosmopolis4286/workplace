<template>
  <div>
    <PageHeader
      title="Configuración"
      description="Personaliza tu experiencia y gestiona las opciones del sistema"
      :icon="CogIcon"
    />

    <!-- Loading skeleton -->
    <div v-if="loading" class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div v-for="i in 4" :key="i" class="card-premium p-6 animate-pulse">
        <div class="h-6 bg-gray-200 rounded-lg w-1/2 mb-6" />
        <div class="space-y-4">
          <div class="h-10 bg-gray-200 rounded-xl" />
          <div class="h-10 bg-gray-200 rounded-xl" />
          <div class="h-10 bg-gray-200 rounded-xl" />
        </div>
      </div>
    </div>

    <!-- Error banner -->
    <div
      v-if="error"
      class="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3 text-red-700"
    >
      <ExclamationTriangleIcon class="h-5 w-5 flex-shrink-0" />
      <span class="text-sm font-medium">{{ error }}</span>
      <button class="ml-auto text-red-400 hover:text-red-600" @click="error = null">
        <XMarkIcon class="h-4 w-4" />
      </button>
    </div>

    <!-- Success banner -->
    <Transition name="fade">
      <div
        v-if="successMsg"
        class="mb-6 p-4 bg-green-50 border border-green-200 rounded-xl flex items-center gap-3 text-green-700"
      >
        <CheckCircleIcon class="h-5 w-5 flex-shrink-0" />
        <span class="text-sm font-medium">{{ successMsg }}</span>
      </div>
    </Transition>

    <div v-if="!loading" class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <!-- ── Información del Restaurante ────────────────────────────────── -->
      <div class="card-premium p-6">
        <div class="flex items-center mb-6">
          <div class="p-3 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg mr-3">
            <BuildingStorefrontIcon class="h-6 w-6 text-white" />
          </div>
          <h3 class="text-xl font-bold text-gray-900">Información del Restaurante</h3>
        </div>

        <div class="space-y-5">
          <div>
            <label class="block text-sm font-semibold text-gray-700 mb-2">Nombre del Restaurante</label>
            <input
              v-model="restaurantForm.name"
              type="text"
              class="input-field"
              placeholder="Mi Restaurante"
            >
          </div>

          <div>
            <label class="block text-sm font-semibold text-gray-700 mb-2">Tipo de Establecimiento</label>
            <input
              v-model="restaurantForm.type"
              type="text"
              class="input-field"
              placeholder="Restaurante, Cafetería, Fast Food..."
            >
          </div>

          <div>
            <label class="block text-sm font-semibold text-gray-700 mb-2">Dirección</label>
            <input
              v-model="restaurantForm.address"
              type="text"
              class="input-field"
              placeholder="Av. Principal 123, Col. Centro"
            >
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-semibold text-gray-700 mb-2">Teléfono</label>
              <input
                v-model="restaurantForm.phone"
                type="tel"
                class="input-field"
                placeholder="+52 123 456 7890"
              >
            </div>
            <div>
              <label class="block text-sm font-semibold text-gray-700 mb-2">Email</label>
              <input
                v-model="restaurantForm.email"
                type="email"
                class="input-field"
                placeholder="contacto@mirestaurante.com"
              >
            </div>
          </div>

          <div>
            <label class="block text-sm font-semibold text-gray-700 mb-2">Horario de Atención</label>
            <textarea
              v-model="restaurantForm.schedule"
              rows="3"
              class="input-field resize-none"
              placeholder="Lunes a Viernes: 9:00 - 22:00&#10;Sábados y Domingos: 10:00 - 23:00"
            />
          </div>

          <button
            :disabled="saving === 'restaurant'"
            class="btn-save btn-blue"
            @click="handleSaveRestaurant"
          >
            <span v-if="saving === 'restaurant'" class="flex items-center justify-center gap-2">
              <svg class="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
              </svg>
              Guardando...
            </span>
            <span v-else>Guardar Información</span>
          </button>
        </div>
      </div>

      <!-- ── Notificaciones ─────────────────────────────────────────────── -->
      <div class="card-premium p-6">
        <div class="flex items-center mb-6">
          <div class="p-3 bg-gradient-to-br from-green-500 to-green-600 rounded-xl shadow-lg mr-3">
            <BellIcon class="h-6 w-6 text-white" />
          </div>
          <h3 class="text-xl font-bold text-gray-900">Notificaciones</h3>
        </div>

        <div class="space-y-3">
          <div
            v-for="notif in notificationItems"
            :key="notif.key"
            class="flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors duration-200"
          >
            <div>
              <div class="font-semibold text-gray-900">{{ notif.title }}</div>
              <div class="text-sm text-gray-500">{{ notif.description }}</div>
            </div>
            <button
              :class="[
                'relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-300',
                notifForm[notif.key] ? 'bg-ifood-red' : 'bg-gray-300'
              ]"
              @click="toggleAndSaveNotification(notif.key)"
            >
              <span
                :class="[
                  'inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-300',
                  notifForm[notif.key] ? 'translate-x-6' : 'translate-x-1'
                ]"
              />
            </button>
          </div>
        </div>

        <p class="mt-4 text-xs text-gray-400 text-center">Los cambios se guardan automáticamente</p>
      </div>

      <!-- ── Configuración de Pagos ─────────────────────────────────────── -->
      <div class="card-premium p-6">
        <div class="flex items-center mb-6">
          <div class="p-3 bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-xl shadow-lg mr-3">
            <CurrencyDollarIcon class="h-6 w-6 text-white" />
          </div>
          <h3 class="text-xl font-bold text-gray-900">Configuración de Pagos</h3>
        </div>

        <div class="space-y-5">
          <div>
            <label class="block text-sm font-semibold text-gray-700 mb-2">Moneda</label>
            <select v-model="paymentForm.currency" class="input-field">
              <option value="MXN">MXN — Peso Mexicano</option>
              <option value="USD">USD — Dólar Estadounidense</option>
              <option value="EUR">EUR — Euro</option>
            </select>
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-semibold text-gray-700 mb-2">Impuesto (%)</label>
              <input
                v-model.number="paymentForm.tax"
                type="number"
                min="0"
                max="100"
                step="0.01"
                class="input-field"
              >
            </div>
            <div>
              <label class="block text-sm font-semibold text-gray-700 mb-2">Propina Sugerida (%)</label>
              <input
                v-model.number="paymentForm.suggestedTip"
                type="number"
                min="0"
                max="100"
                step="0.01"
                class="input-field"
              >
            </div>
          </div>

          <div>
            <label class="block text-sm font-semibold text-gray-700 mb-3">Métodos de Pago Aceptados</label>
            <div class="space-y-2">
              <div
                v-for="method in paymentMethodOptions"
                :key="method.id"
                class="flex items-center p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors cursor-pointer"
                @click="togglePaymentMethod(method.id)"
              >
                <div
                  :class="[
                    'h-5 w-5 rounded border-2 flex items-center justify-center mr-3 flex-shrink-0 transition-colors',
                    paymentForm.paymentMethods.includes(method.id)
                      ? 'bg-ifood-red border-ifood-red'
                      : 'bg-white border-gray-300'
                  ]"
                >
                  <CheckIcon v-if="paymentForm.paymentMethods.includes(method.id)" class="h-3 w-3 text-white" />
                </div>
                <span class="text-gray-900 font-medium">{{ method.name }}</span>
              </div>
            </div>
          </div>

          <button
            :disabled="saving === 'payment'"
            class="btn-save btn-yellow"
            @click="handleSavePayment"
          >
            <span v-if="saving === 'payment'" class="flex items-center justify-center gap-2">
              <svg class="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
              </svg>
              Guardando...
            </span>
            <span v-else>Guardar Configuración de Pagos</span>
          </button>
        </div>
      </div>

      <!-- ── Operaciones ─────────────────────────────────────────────────── -->
      <div class="card-premium p-6">
        <div class="flex items-center mb-6">
          <div class="p-3 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl shadow-lg mr-3">
            <ClockIcon class="h-6 w-6 text-white" />
          </div>
          <h3 class="text-xl font-bold text-gray-900">Operaciones</h3>
        </div>

        <div class="space-y-5">
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-semibold text-gray-700 mb-2">Tiempo Prep. (min)</label>
              <input
                v-model.number="operationForm.avgPrepTime"
                type="number"
                min="1"
                class="input-field"
              >
            </div>
            <div>
              <label class="block text-sm font-semibold text-gray-700 mb-2">Tiempo Entrega (min)</label>
              <input
                v-model.number="operationForm.avgDeliveryTime"
                type="number"
                min="1"
                class="input-field"
              >
            </div>
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-semibold text-gray-700 mb-2">Costo de Envío ($)</label>
              <input
                v-model.number="operationForm.deliveryFee"
                type="number"
                min="0"
                step="0.01"
                class="input-field"
              >
            </div>
            <div>
              <label class="block text-sm font-semibold text-gray-700 mb-2">Envío Gratis desde ($)</label>
              <input
                v-model.number="operationForm.freeDeliveryMinimum"
                type="number"
                min="0"
                step="0.01"
                class="input-field"
              >
            </div>
          </div>

          <!-- Quick reference card -->
          <div class="p-4 bg-orange-50 rounded-xl border border-orange-100">
            <p class="text-xs font-semibold text-orange-700 mb-2">Resumen de operaciones</p>
            <div class="grid grid-cols-2 gap-2 text-xs text-orange-600">
              <span>Prep promedio: <strong>{{ operationForm.avgPrepTime }} min</strong></span>
              <span>Entrega promedio: <strong>{{ operationForm.avgDeliveryTime }} min</strong></span>
              <span>Costo envío: <strong>${{ operationForm.deliveryFee }}</strong></span>
              <span>Gratis desde: <strong>${{ operationForm.freeDeliveryMinimum }}</strong></span>
            </div>
          </div>

          <button
            :disabled="saving === 'operations'"
            class="btn-save btn-orange"
            @click="handleSaveOperations"
          >
            <span v-if="saving === 'operations'" class="flex items-center justify-center gap-2">
              <svg class="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
              </svg>
              Guardando...
            </span>
            <span v-else>Guardar Configuración de Operaciones</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'
import {
  CogIcon,
  BuildingStorefrontIcon,
  BellIcon,
  CurrencyDollarIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  XMarkIcon,
  CheckCircleIcon,
  CheckIcon,
} from '@heroicons/vue/24/outline'
import PageHeader from '~/components/ui/PageHeader.vue'
import { useSettings } from '~/composables/useSettings'

const {
  restaurant,
  settings,
  loading,
  saving,
  error,
  successMsg,
  loadSettings,
  saveRestaurantInfo,
  savePaymentSettings,
  saveOperationSettings,
  saveNotificationSettings,
} = useSettings()

// ─── Local form copies (avoids mutating global state while editing) ──────────

const restaurantForm = ref({
  name: '',
  type: '',
  address: '',
  phone: '',
  email: '',
  schedule: '',
})

const paymentForm = ref({
  currency: 'MXN',
  tax: 16,
  suggestedTip: 10,
  paymentMethods: ['cash', 'card', 'transfer'] as string[],
})

const operationForm = ref({
  avgPrepTime: 20,
  avgDeliveryTime: 30,
  deliveryFee: 35,
  freeDeliveryMinimum: 200,
})

const notifForm = ref({
  notifyNewOrders: true,
  notifyLowStock: true,
  notifyDailyReports: false,
  notifyCustomerReviews: true,
})

// ─── Static data ─────────────────────────────────────────────────────────────

const paymentMethodOptions = [
  { id: 'cash', name: 'Efectivo' },
  { id: 'card', name: 'Tarjeta de Crédito/Débito' },
  { id: 'transfer', name: 'Transferencia Bancaria' },
  { id: 'digital-wallet', name: 'Monedero Digital' },
]

const notificationItems = [
  { key: 'notifyNewOrders' as const, title: 'Nuevos Pedidos', description: 'Recibir notificaciones de pedidos nuevos' },
  { key: 'notifyLowStock' as const, title: 'Stock Bajo', description: 'Alertas cuando productos están por agotarse' },
  { key: 'notifyDailyReports' as const, title: 'Reportes Diarios', description: 'Recibir resumen diario de ventas' },
  { key: 'notifyCustomerReviews' as const, title: 'Reseñas de Clientes', description: 'Notificaciones de nuevas reseñas' },
]

// ─── Sync global state → local forms ─────────────────────────────────────────

function syncForms() {
  if (restaurant.value) {
    restaurantForm.value = {
      name: restaurant.value.name ?? '',
      type: restaurant.value.type ?? '',
      address: restaurant.value.address ?? '',
      phone: restaurant.value.phone ?? '',
      email: restaurant.value.email ?? '',
      schedule: restaurant.value.schedule ?? '',
    }
  }
  if (settings.value) {
    paymentForm.value = {
      currency: settings.value.currency,
      tax: settings.value.tax,
      suggestedTip: settings.value.suggestedTip,
      paymentMethods: [...settings.value.paymentMethods],
    }
    operationForm.value = {
      avgPrepTime: settings.value.avgPrepTime,
      avgDeliveryTime: settings.value.avgDeliveryTime,
      deliveryFee: settings.value.deliveryFee,
      freeDeliveryMinimum: settings.value.freeDeliveryMinimum,
    }
    notifForm.value = {
      notifyNewOrders: settings.value.notifyNewOrders,
      notifyLowStock: settings.value.notifyLowStock,
      notifyDailyReports: settings.value.notifyDailyReports,
      notifyCustomerReviews: settings.value.notifyCustomerReviews,
    }
  }
}

watch([restaurant, settings], syncForms)

// ─── Handlers ─────────────────────────────────────────────────────────────────

async function handleSaveRestaurant() {
  await saveRestaurantInfo({ ...restaurantForm.value })
}

async function handleSavePayment() {
  await savePaymentSettings({ ...paymentForm.value })
}

async function handleSaveOperations() {
  await saveOperationSettings({ ...operationForm.value })
}

function togglePaymentMethod(id: string) {
  const idx = paymentForm.value.paymentMethods.indexOf(id)
  if (idx === -1) paymentForm.value.paymentMethods.push(id)
  else paymentForm.value.paymentMethods.splice(idx, 1)
}

async function toggleAndSaveNotification(key: keyof typeof notifForm.value) {
  notifForm.value[key] = !notifForm.value[key]
  await saveNotificationSettings({ ...notifForm.value })
}

// ─── Init ─────────────────────────────────────────────────────────────────────

onMounted(async () => {
  await loadSettings()
  syncForms()
})
</script>

<style scoped>
.input-field {
  @apply w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-ifood-red/20 focus:border-ifood-red transition-all duration-300 bg-white;
}

.btn-save {
  @apply w-full px-6 py-3 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100;
}

.btn-blue {
  @apply bg-gradient-to-r from-blue-500 to-blue-600;
}

.btn-yellow {
  @apply bg-gradient-to-r from-yellow-500 to-yellow-600;
}

.btn-orange {
  @apply bg-gradient-to-r from-orange-500 to-orange-600;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
