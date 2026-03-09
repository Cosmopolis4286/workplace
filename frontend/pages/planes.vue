<template>
  <div class="min-h-screen bg-gray-50">
    <!-- Header -->
    <div class="bg-white border-b border-gray-200 px-6 py-4">
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-2xl font-bold text-gray-900">Gestión de Planes</h1>
          <p class="text-sm text-gray-500 mt-0.5">Administra los planes de suscripción del sistema</p>
        </div>
        <button
          @click="openPlanModal()"
          class="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition font-medium text-sm"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
          </svg>
          Nuevo Plan
        </button>
      </div>
    </div>

    <div class="p-6 space-y-6">
      <!-- Error -->
      <div v-if="error" class="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">
        {{ error }}
      </div>

      <!-- Stats cards -->
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div class="bg-white rounded-xl border border-gray-200 p-4">
          <p class="text-xs font-medium text-gray-500 uppercase tracking-wide">Total Planes</p>
          <p class="text-3xl font-bold text-gray-900 mt-1">{{ stats?.totalPlans ?? '—' }}</p>
        </div>
        <div class="bg-white rounded-xl border border-gray-200 p-4">
          <p class="text-xs font-medium text-gray-500 uppercase tracking-wide">Suscripciones Activas</p>
          <p class="text-3xl font-bold text-green-600 mt-1">{{ stats?.activeSubs ?? '—' }}</p>
        </div>
        <div class="bg-white rounded-xl border border-gray-200 p-4">
          <p class="text-xs font-medium text-gray-500 uppercase tracking-wide">Total Suscripciones</p>
          <p class="text-3xl font-bold text-gray-900 mt-1">{{ stats?.totalSubs ?? '—' }}</p>
        </div>
        <div class="bg-white rounded-xl border border-gray-200 p-4">
          <p class="text-xs font-medium text-gray-500 uppercase tracking-wide">Ingresos Mensuales</p>
          <p class="text-3xl font-bold text-indigo-600 mt-1">{{ stats ? formatPrice(stats.monthlyRevenue) : '—' }}</p>
        </div>
      </div>

      <!-- Tab bar -->
      <div class="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
        <button
          v-for="tab in tabs"
          :key="tab.key"
          @click="activeTab = tab.key"
          :class="[
            'px-4 py-2 rounded-lg text-sm font-medium transition',
            activeTab === tab.key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700',
          ]"
        >
          {{ tab.label }}
        </button>
      </div>

      <!-- Plans grid -->
      <div v-if="activeTab === 'plans'">
        <div v-if="loading" class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          <div v-for="i in 4" :key="i" class="bg-white rounded-xl border border-gray-200 p-5 animate-pulse">
            <div class="h-5 bg-gray-200 rounded w-1/2 mb-3"></div>
            <div class="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
            <div class="space-y-2">
              <div class="h-3 bg-gray-100 rounded w-full"></div>
              <div class="h-3 bg-gray-100 rounded w-3/4"></div>
            </div>
          </div>
        </div>

        <div v-else class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          <div
            v-for="plan in plans"
            :key="plan.id"
            class="bg-white rounded-xl border-2 overflow-hidden transition hover:shadow-md"
            :style="{ borderColor: plan.status === 'ACTIVE' ? plan.color : '#e5e7eb' }"
          >
            <!-- Plan header -->
            <div class="p-5" :style="{ backgroundColor: plan.color + '15' }">
              <div class="flex items-start justify-between">
                <div>
                  <div class="flex items-center gap-2">
                    <span class="text-lg font-bold text-gray-900">{{ plan.name }}</span>
                    <span v-if="plan.isPopular" class="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full font-medium">
                      Popular
                    </span>
                    <span
                      :class="plan.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'"
                      class="text-xs px-2 py-0.5 rounded-full font-medium"
                    >
                      {{ plan.status === 'ACTIVE' ? 'Activo' : 'Inactivo' }}
                    </span>
                  </div>
                  <p class="text-sm text-gray-500 mt-0.5">{{ plan.description }}</p>
                </div>
                <div class="flex gap-1 ml-2 shrink-0">
                  <button @click="openPlanModal(plan)" class="p-1.5 hover:bg-white rounded-lg transition text-gray-400 hover:text-gray-700">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                  <button @click="confirmDelete(plan)" class="p-1.5 hover:bg-white rounded-lg transition text-gray-400 hover:text-red-600">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>

              <div class="mt-3">
                <span class="text-3xl font-bold" :style="{ color: plan.color }">{{ formatPrice(plan.price) }}</span>
                <span class="text-gray-400 text-sm">/mes</span>
                <span v-if="plan.priceAnnual" class="ml-2 text-xs text-gray-500">
                  ({{ formatPrice(plan.priceAnnual) }}/año)
                </span>
              </div>

              <div class="flex gap-2 mt-2 text-xs">
                <span v-if="plan.forCommerce" class="bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">Commerce</span>
                <span v-if="plan.forFreelancer" class="bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Freelancer</span>
              </div>
            </div>

            <!-- Limits -->
            <div class="px-5 py-3 border-t border-gray-100 grid grid-cols-2 gap-2 text-xs">
              <div class="flex items-center gap-1.5 text-gray-600">
                <svg class="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
                {{ formatLimit(plan.maxProducts) }} productos
              </div>
              <div class="flex items-center gap-1.5 text-gray-600">
                <svg class="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                {{ formatLimit(plan.maxEmployees) }} empleados
              </div>
              <div class="flex items-center gap-1.5 text-gray-600">
                <svg class="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
                {{ formatLimit(plan.maxBranches) }} sucursales
              </div>
              <div class="flex items-center gap-1.5 text-gray-600">
                <svg class="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                {{ formatLimit(plan.maxOrders) }} pedidos/mes
              </div>
            </div>

            <!-- Features -->
            <div class="px-5 pb-4 space-y-1.5">
              <div class="flex items-center gap-1.5 text-xs" :class="plan.hasAnalytics ? 'text-gray-700' : 'text-gray-300'">
                <svg class="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" :d="plan.hasAnalytics ? 'M5 13l4 4L19 7' : 'M6 18L18 6M6 6l12 12'" />
                </svg>
                Analytics avanzado
              </div>
              <div class="flex items-center gap-1.5 text-xs" :class="plan.hasDelivery ? 'text-gray-700' : 'text-gray-300'">
                <svg class="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" :d="plan.hasDelivery ? 'M5 13l4 4L19 7' : 'M6 18L18 6M6 6l12 12'" />
                </svg>
                Módulo Delivery
              </div>
              <div class="flex items-center gap-1.5 text-xs" :class="plan.hasReports ? 'text-gray-700' : 'text-gray-300'">
                <svg class="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" :d="plan.hasReports ? 'M5 13l4 4L19 7' : 'M6 18L18 6M6 6l12 12'" />
                </svg>
                Reportes
              </div>
              <div class="flex items-center gap-1.5 text-xs" :class="plan.hasPrioritySupport ? 'text-gray-700' : 'text-gray-300'">
                <svg class="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" :d="plan.hasPrioritySupport ? 'M5 13l4 4L19 7' : 'M6 18L18 6M6 6l12 12'" />
                </svg>
                Soporte prioritario
              </div>
            </div>

            <!-- Footer -->
            <div class="px-5 py-3 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
              <span class="text-xs text-gray-400">
                {{ plan._count?.subscriptions ?? 0 }} suscripciones activas
              </span>
              <button
                @click="openAssignModal(plan)"
                class="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
              >
                Asignar a usuario →
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Subscriptions tab -->
      <div v-if="activeTab === 'subscriptions'" class="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <!-- Filters -->
        <div class="p-4 border-b border-gray-100 flex flex-wrap items-center gap-3">
          <select
            v-model="subFilter"
            @change="loadSubscriptions"
            class="text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-300"
          >
            <option value="">Todos los estados</option>
            <option value="ACTIVE">Activo</option>
            <option value="TRIAL">Prueba</option>
            <option value="EXPIRED">Expirado</option>
            <option value="CANCELLED">Cancelado</option>
          </select>
          <select
            v-model="planFilter"
            @change="loadSubscriptions"
            class="text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-300"
          >
            <option value="">Todos los planes</option>
            <option v-for="p in plans" :key="p.id" :value="p.id">{{ p.name }}</option>
          </select>
          <button
            @click="openAssignModal()"
            class="ml-auto flex items-center gap-2 bg-indigo-600 text-white px-3 py-2 rounded-lg hover:bg-indigo-700 transition text-sm font-medium"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
            </svg>
            Asignar suscripción
          </button>
        </div>

        <!-- Table -->
        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead class="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
              <tr>
                <th class="text-left px-4 py-3">Usuario</th>
                <th class="text-left px-4 py-3">Plan</th>
                <th class="text-left px-4 py-3">Estado</th>
                <th class="text-left px-4 py-3">Intervalo</th>
                <th class="text-left px-4 py-3">Precio Pagado</th>
                <th class="text-left px-4 py-3">Vence</th>
                <th class="text-left px-4 py-3">Acciones</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="loadingSubs">
                <td colspan="7" class="text-center py-8 text-gray-400">Cargando...</td>
              </tr>
              <tr v-else-if="subscriptions.length === 0">
                <td colspan="7" class="text-center py-8 text-gray-400">No hay suscripciones</td>
              </tr>
              <tr
                v-for="sub in subscriptions"
                :key="sub.id"
                class="border-t border-gray-100 hover:bg-gray-50"
              >
                <td class="px-4 py-3">
                  <div class="font-medium text-gray-900">{{ sub.user?.firstName }} {{ sub.user?.lastName }}</div>
                  <div class="text-gray-400 text-xs">{{ sub.user?.email }}</div>
                </td>
                <td class="px-4 py-3">
                  <span
                    class="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full"
                    :style="{ backgroundColor: (sub.plan?.color ?? '#6b7280') + '20', color: sub.plan?.color ?? '#6b7280' }"
                  >
                    {{ sub.plan?.name }}
                  </span>
                </td>
                <td class="px-4 py-3">
                  <span :class="['text-xs px-2 py-1 rounded-full font-medium', SUB_STATUS_CLASSES[sub.status]]">
                    {{ SUB_STATUS_LABELS[sub.status] }}
                  </span>
                </td>
                <td class="px-4 py-3 text-gray-600">{{ INTERVAL_LABELS[sub.interval] }}</td>
                <td class="px-4 py-3 text-gray-900 font-medium">{{ formatPrice(sub.pricePaid) }}</td>
                <td class="px-4 py-3 text-gray-500 text-xs">
                  {{ sub.endAt ? new Date(sub.endAt).toLocaleDateString('es-MX') : '—' }}
                </td>
                <td class="px-4 py-3">
                  <button
                    v-if="sub.status === 'ACTIVE' || sub.status === 'TRIAL'"
                    @click="handleCancelSub(sub.id)"
                    class="text-xs text-red-500 hover:text-red-700 font-medium"
                  >
                    Cancelar
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Pagination -->
        <div v-if="totalSubs > 20" class="px-4 py-3 border-t border-gray-100 flex items-center justify-between">
          <span class="text-xs text-gray-500">{{ totalSubs }} suscripciones</span>
          <div class="flex gap-1">
            <button
              :disabled="subPage === 1"
              @click="goSubPage(subPage - 1)"
              class="px-2 py-1 text-xs border rounded disabled:opacity-40"
            >←</button>
            <button
              :disabled="subPage * 20 >= totalSubs"
              @click="goSubPage(subPage + 1)"
              class="px-2 py-1 text-xs border rounded disabled:opacity-40"
            >→</button>
          </div>
        </div>
      </div>
    </div>

    <!-- Plan modal -->
    <Teleport to="body">
      <div v-if="showPlanModal" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
        <div class="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
          <div class="flex items-center justify-between px-6 py-4 border-b border-gray-100">
            <h2 class="text-lg font-bold text-gray-900">{{ editingPlan ? 'Editar Plan' : 'Nuevo Plan' }}</h2>
            <button @click="showPlanModal = false" class="p-2 hover:bg-gray-100 rounded-lg">
              <svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <form @submit.prevent="savePlan" class="p-6 space-y-5">
            <div class="grid grid-cols-2 gap-4">
              <div class="col-span-2">
                <label class="block text-sm font-medium text-gray-700 mb-1">Nombre *</label>
                <input v-model="form.name" required class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
              </div>
              <div class="col-span-2">
                <label class="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
                <textarea v-model="form.description" rows="2" class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 resize-none"></textarea>
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Precio mensual *</label>
                <input v-model.number="form.price" type="number" min="0" step="0.01" required class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Precio anual</label>
                <input v-model.number="form.priceAnnual" type="number" min="0" step="0.01" class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
              </div>
            </div>

            <div class="grid grid-cols-3 gap-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Color</label>
                <input v-model="form.color" type="color" class="h-10 w-full border border-gray-300 rounded-lg cursor-pointer" />
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Estado</label>
                <select v-model="form.status" class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300">
                  <option value="ACTIVE">Activo</option>
                  <option value="INACTIVE">Inactivo</option>
                </select>
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Orden</label>
                <input v-model.number="form.sortOrder" type="number" min="0" class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
              </div>
            </div>

            <div class="flex gap-6">
              <label class="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                <input v-model="form.forCommerce" type="checkbox" class="w-4 h-4 rounded text-indigo-600" />
                Para Commerce
              </label>
              <label class="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                <input v-model="form.forFreelancer" type="checkbox" class="w-4 h-4 rounded text-indigo-600" />
                Para Freelancer
              </label>
              <label class="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                <input v-model="form.isPopular" type="checkbox" class="w-4 h-4 rounded text-indigo-600" />
                Marcar como Popular
              </label>
            </div>

            <fieldset class="border border-gray-200 rounded-xl p-4">
              <legend class="text-sm font-semibold text-gray-700 px-1">Límites</legend>
              <div class="grid grid-cols-2 gap-3 mt-2">
                <div>
                  <label class="block text-xs text-gray-500 mb-1">Productos (-1 = ilimitado)</label>
                  <input v-model.number="form.maxProducts" type="number" min="-1" class="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200" />
                </div>
                <div>
                  <label class="block text-xs text-gray-500 mb-1">Empleados (-1 = ilimitado)</label>
                  <input v-model.number="form.maxEmployees" type="number" min="-1" class="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200" />
                </div>
                <div>
                  <label class="block text-xs text-gray-500 mb-1">Sucursales (-1 = ilimitado)</label>
                  <input v-model.number="form.maxBranches" type="number" min="-1" class="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200" />
                </div>
                <div>
                  <label class="block text-xs text-gray-500 mb-1">Pedidos/mes (-1 = ilimitado)</label>
                  <input v-model.number="form.maxOrders" type="number" min="-1" class="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200" />
                </div>
                <div>
                  <label class="block text-xs text-gray-500 mb-1">Almacenamiento (GB)</label>
                  <input v-model.number="form.maxStorage" type="number" min="0" class="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200" />
                </div>
              </div>
            </fieldset>

            <fieldset class="border border-gray-200 rounded-xl p-4">
              <legend class="text-sm font-semibold text-gray-700 px-1">Módulos incluidos</legend>
              <div class="grid grid-cols-2 gap-2 mt-2">
                <label class="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                  <input v-model="form.hasAnalytics" type="checkbox" class="w-4 h-4 rounded text-indigo-600" />
                  Analytics avanzado
                </label>
                <label class="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                  <input v-model="form.hasDelivery" type="checkbox" class="w-4 h-4 rounded text-indigo-600" />
                  Módulo Delivery
                </label>
                <label class="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                  <input v-model="form.hasReports" type="checkbox" class="w-4 h-4 rounded text-indigo-600" />
                  Reportes
                </label>
                <label class="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                  <input v-model="form.hasApiAccess" type="checkbox" class="w-4 h-4 rounded text-indigo-600" />
                  Acceso API
                </label>
                <label class="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                  <input v-model="form.hasPrioritySupport" type="checkbox" class="w-4 h-4 rounded text-indigo-600" />
                  Soporte prioritario
                </label>
              </div>
            </fieldset>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Features (una por línea)</label>
              <textarea
                :value="(form.features ?? []).join('\n')"
                @input="form.features = ($event.target as HTMLTextAreaElement).value.split('\n').filter(Boolean)"
                rows="4"
                placeholder="Dashboard básico&#10;Hasta 50 productos&#10;..."
                class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 resize-none"
              ></textarea>
            </div>

            <div v-if="formError" class="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">
              {{ formError }}
            </div>

            <div class="flex justify-end gap-3 pt-2">
              <button type="button" @click="showPlanModal = false" class="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 border border-gray-300 rounded-lg hover:bg-gray-50">
                Cancelar
              </button>
              <button type="submit" :disabled="saving" class="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-60 font-medium">
                {{ saving ? 'Guardando...' : (editingPlan ? 'Actualizar' : 'Crear Plan') }}
              </button>
            </div>
          </form>
        </div>
      </div>

      <!-- Assign subscription modal -->
      <div v-if="showAssignModal" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
        <div class="bg-white rounded-2xl shadow-2xl w-full max-w-md">
          <div class="flex items-center justify-between px-6 py-4 border-b border-gray-100">
            <h2 class="text-lg font-bold text-gray-900">Asignar Suscripción</h2>
            <button @click="showAssignModal = false" class="p-2 hover:bg-gray-100 rounded-lg">
              <svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <form @submit.prevent="saveAssign" class="p-6 space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">ID de Usuario *</label>
              <input v-model="assignForm.userId" required placeholder="UUID del usuario" class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Plan *</label>
              <select v-model="assignForm.planId" required class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300">
                <option value="" disabled>Selecciona un plan</option>
                <option v-for="p in plans.filter(p => p.status === 'ACTIVE')" :key="p.id" :value="p.id">{{ p.name }} — {{ formatPrice(p.price) }}/mes</option>
              </select>
            </div>
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Intervalo</label>
                <select v-model="assignForm.interval" class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300">
                  <option value="MONTHLY">Mensual</option>
                  <option value="ANNUAL">Anual</option>
                </select>
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Estado</label>
                <select v-model="assignForm.status" class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300">
                  <option value="ACTIVE">Activo</option>
                  <option value="TRIAL">Prueba</option>
                  <option value="PENDING">Pendiente</option>
                </select>
              </div>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Precio pagado (opcional)</label>
              <input v-model.number="assignForm.pricePaid" type="number" min="0" step="0.01" placeholder="Usa precio del plan si está vacío" class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Fecha fin (opcional)</label>
              <input v-model="assignForm.endAt" type="date" class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Notas</label>
              <input v-model="assignForm.notes" placeholder="Notas internas..." class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
            </div>

            <div v-if="assignError" class="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">
              {{ assignError }}
            </div>

            <div class="flex justify-end gap-3 pt-2">
              <button type="button" @click="showAssignModal = false" class="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50">
                Cancelar
              </button>
              <button type="submit" :disabled="assigning" class="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-60 font-medium">
                {{ assigning ? 'Asignando...' : 'Asignar' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { usePlans, SUB_STATUS_LABELS, SUB_STATUS_CLASSES, INTERVAL_LABELS, type Plan } from '~/composables/usePlans'

definePageMeta({ layout: 'default', middleware: ['auth'] })

const {
  plans, subscriptions, stats, loading, loadingStats, loadingSubs, error,
  totalSubs, subPage,
  fetchPlans, createPlan, updatePlan, deletePlan,
  fetchSubscriptions, assignSubscription, cancelSubscription,
  fetchStats, formatLimit, formatPrice,
} = usePlans()

const activeTab = ref<'plans' | 'subscriptions'>('plans')
const tabs = [
  { key: 'plans', label: 'Planes' },
  { key: 'subscriptions', label: 'Suscripciones' },
]

const subFilter = ref('')
const planFilter = ref('')

// Plan modal
const showPlanModal = ref(false)
const editingPlan = ref<Plan | null>(null)
const saving = ref(false)
const formError = ref<string | null>(null)

const defaultForm = () => ({
  name: '',
  description: '',
  price: 0,
  priceAnnual: undefined as number | undefined,
  status: 'ACTIVE' as 'ACTIVE' | 'INACTIVE',
  isPopular: false,
  color: '#3B82F6',
  sortOrder: 0,
  forCommerce: true,
  forFreelancer: false,
  maxProducts: 50,
  maxEmployees: 5,
  maxBranches: 1,
  maxOrders: -1,
  maxStorage: 1,
  features: [] as string[],
  hasAnalytics: false,
  hasDelivery: false,
  hasReports: false,
  hasApiAccess: false,
  hasPrioritySupport: false,
})

const form = ref(defaultForm())

function openPlanModal(plan?: Plan) {
  editingPlan.value = plan ?? null
  formError.value = null
  if (plan) {
    form.value = {
      name: plan.name,
      description: plan.description ?? '',
      price: plan.price,
      priceAnnual: plan.priceAnnual ?? undefined,
      status: plan.status,
      isPopular: plan.isPopular,
      color: plan.color,
      sortOrder: plan.sortOrder,
      forCommerce: plan.forCommerce,
      forFreelancer: plan.forFreelancer,
      maxProducts: plan.maxProducts,
      maxEmployees: plan.maxEmployees,
      maxBranches: plan.maxBranches,
      maxOrders: plan.maxOrders,
      maxStorage: plan.maxStorage,
      features: [...plan.features],
      hasAnalytics: plan.hasAnalytics,
      hasDelivery: plan.hasDelivery,
      hasReports: plan.hasReports,
      hasApiAccess: plan.hasApiAccess,
      hasPrioritySupport: plan.hasPrioritySupport,
    }
  } else {
    form.value = defaultForm()
  }
  showPlanModal.value = true
}

async function savePlan() {
  saving.value = true
  formError.value = null
  try {
    if (editingPlan.value) {
      await updatePlan(editingPlan.value.id, form.value)
    } else {
      await createPlan(form.value)
    }
    showPlanModal.value = false
    await fetchStats()
  } catch (e: any) {
    formError.value = e.message
  } finally {
    saving.value = false
  }
}

async function confirmDelete(plan: Plan) {
  if (!confirm(`¿Eliminar el plan "${plan.name}"? Esta acción no se puede deshacer.`)) return
  try {
    await deletePlan(plan.id)
    await fetchStats()
  } catch (e: any) {
    alert(e.message)
  }
}

// Assign modal
const showAssignModal = ref(false)
const assigning = ref(false)
const assignError = ref<string | null>(null)

const defaultAssignForm = () => ({
  userId: '',
  planId: '',
  interval: 'MONTHLY' as 'MONTHLY' | 'ANNUAL',
  status: 'ACTIVE' as string,
  pricePaid: undefined as number | undefined,
  endAt: '',
  notes: '',
})

const assignForm = ref(defaultAssignForm())

function openAssignModal(plan?: Plan) {
  assignError.value = null
  assignForm.value = defaultAssignForm()
  if (plan) assignForm.value.planId = plan.id
  showAssignModal.value = true
}

async function saveAssign() {
  assigning.value = true
  assignError.value = null
  try {
    await assignSubscription({
      ...assignForm.value,
      endAt: assignForm.value.endAt || undefined,
    })
    showAssignModal.value = false
    await fetchStats()
    if (activeTab.value === 'subscriptions') await loadSubscriptions()
  } catch (e: any) {
    assignError.value = e.message
  } finally {
    assigning.value = false
  }
}

async function handleCancelSub(id: string) {
  if (!confirm('¿Cancelar esta suscripción?')) return
  try {
    await cancelSubscription(id)
    await fetchStats()
  } catch (e: any) {
    alert(e.message)
  }
}

async function loadSubscriptions() {
  await fetchSubscriptions({ status: subFilter.value || undefined, planId: planFilter.value || undefined })
}

function goSubPage(page: number) {
  fetchSubscriptions({ status: subFilter.value || undefined, planId: planFilter.value || undefined, page })
}

onMounted(async () => {
  await Promise.all([fetchPlans(), fetchStats()])
  await loadSubscriptions()
})
</script>
