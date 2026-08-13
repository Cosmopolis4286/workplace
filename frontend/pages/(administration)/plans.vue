<template>
  <div>
    <PageHeader
      title="Gestión de Planes"
      description="Administra los planes de suscripción del sistema"
      :icon="CreditCardIcon"
      :breadcrumb="[{ label: 'Planes' }]"
      :stats="headerStats"
    >
      <template #actions>
        <!-- Tabs en actions -->
        <div class="flex items-center bg-white border border-gray-200 rounded-xl p-1 gap-1 shadow-sm">
          <button
            v-for="tab in tabs" :key="tab.key"
            class="px-4 py-2 rounded-lg text-sm font-semibold transition-all"
            :class="activeTab === tab.key ? 'bg-red-600 text-white shadow-sm' : 'text-gray-500 hover:bg-gray-50'"
            @click="activeTab = tab.key"
          >{{ tab.label }}</button>
        </div>
        <HeaderActionButton variant="primary" :icon="PlusIcon" @click="openPlanModal()">
          Nuevo Plan
        </HeaderActionButton>
      </template>
    </PageHeader>

    <!-- Error -->
    <div v-if="error" class="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center justify-between">
      <p class="text-red-700 text-sm">{{ error }}</p>
      <button class="text-red-500 hover:text-red-700" @click="error = null"><XMarkIcon class="h-4 w-4" /></button>
    </div>

    <!-- ── Tab: Planes ──────────────────────────────────────────────────────── -->
    <div v-if="activeTab === 'plans'">
      <!-- Filtros por rol/audiencia y categoría de negocio -->
      <div class="card px-4 py-3 mb-4 flex flex-wrap items-center gap-3">
        <span class="text-xs font-semibold text-gray-500 uppercase tracking-wider">Filtrar:</span>
        <div class="flex items-center bg-gray-50 border border-gray-200 rounded-xl p-1 gap-1">
          <button
            v-for="opt in [
              { key: 'all',         label: 'Todos' },
              { key: 'COMMERCE',    label: 'Commerce' },
              { key: 'FREELANCER',  label: 'Freelancer' },
              { key: 'NORMAL',      label: 'Normal' },
            ]" :key="opt.key"
            class="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
            :class="roleFilter === opt.key ? 'bg-red-600 text-white shadow-sm' : 'text-gray-500 hover:bg-white'"
            @click="roleFilter = opt.key as typeof roleFilter"
          >{{ opt.label }}</button>
        </div>
        <select v-model="categoryFilter" class="input-field w-auto text-xs">
          <option value="all">Todas las categorías</option>
          <option v-for="cat in userCategories" :key="cat.id" :value="cat.id">{{ cat.name }}</option>
        </select>
        <span class="ml-auto text-xs text-gray-400">{{ filteredPlans.length }} de {{ plans.length }} planes</span>
      </div>

      <!-- Skeleton -->
      <div v-if="loading" class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        <div v-for="i in 4" :key="i" class="card p-5 animate-pulse space-y-3">
          <div class="skeleton h-5 w-32 rounded" /><div class="skeleton h-8 w-20 rounded" />
          <div class="skeleton h-3 w-full rounded" /><div class="skeleton h-3 w-3/4 rounded" />
        </div>
      </div>

      <!-- Vacío -->
      <div v-else-if="filteredPlans.length === 0" class="card p-12 text-center">
        <CreditCardIcon class="h-12 w-12 text-gray-300 mx-auto mb-3" />
        <p class="text-gray-500 font-medium">No hay planes que coincidan con los filtros</p>
      </div>

      <div v-else class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        <div
          v-for="plan in filteredPlans" :key="plan.id"
          class="card border-2 overflow-hidden transition-shadow hover:shadow-md"
          :style="{ borderColor: plan.status === 'ACTIVE' ? plan.color : '#e5e7eb' }"
        >
          <!-- Cabecera -->
          <div class="p-5" :style="{ backgroundColor: plan.color + '12' }">
            <div class="flex items-start justify-between gap-2">
              <div class="min-w-0">
                <div class="flex items-center gap-2 flex-wrap mb-0.5">
                  <span class="text-base font-bold text-gray-900">{{ plan.name }}</span>
                  <span v-if="plan.isPopular" class="badge bg-yellow-100 text-yellow-700">Popular</span>
                  <span class="badge" :class="plan.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'">
                    {{ plan.status === 'ACTIVE' ? 'Activo' : 'Inactivo' }}
                  </span>
                </div>
                <p class="text-xs text-gray-500">{{ plan.description }}</p>
              </div>
              <div class="flex gap-1 flex-shrink-0">
                <button class="p-1.5 hover:bg-white rounded-lg transition-colors text-gray-400 hover:text-gray-700" @click="openPlanModal(plan)">
                  <PencilIcon class="h-4 w-4" />
                </button>
                <button class="p-1.5 hover:bg-white rounded-lg transition-colors text-gray-400 hover:text-red-600" @click="confirmDeletePlan(plan)">
                  <TrashIcon class="h-4 w-4" />
                </button>
              </div>
            </div>

            <!-- Precio -->
            <div class="mt-3 flex items-baseline gap-1">
              <span class="text-3xl font-black" :style="{ color: plan.color }">{{ formatPrice(plan.price) }}</span>
              <span class="text-gray-400 text-sm">/mes</span>
              <span v-if="plan.priceAnnual" class="ml-1 text-xs text-gray-400">({{ formatPrice(plan.priceAnnual) }}/año)</span>
            </div>

            <!-- Para quién -->
            <div class="flex gap-1.5 mt-2 flex-wrap">
              <span v-if="plan.forCommerce"    class="badge bg-blue-100 text-blue-700">Commerce</span>
              <span v-if="plan.forFreelancer"  class="badge bg-green-100 text-green-700">Freelancer</span>
              <span v-if="plan.forNormal"      class="badge bg-purple-100 text-purple-700">Normal</span>
            </div>

            <!-- Categorías de negocio -->
            <div v-if="(plan.categoryIds ?? []).length > 0" class="flex gap-1.5 mt-1.5 flex-wrap">
              <span
                v-for="catId in plan.categoryIds" :key="catId"
                class="badge bg-white/70 text-gray-600 border border-gray-200 text-[10px]"
              >{{ categoryName(catId) }}</span>
            </div>
            <div v-else class="mt-1.5 text-[10px] text-gray-400 italic">Todas las categorías</div>
          </div>

          <!-- Límites en grid 2×2 -->
          <div class="px-5 py-3 border-t border-gray-100 grid grid-cols-2 gap-y-1.5 gap-x-4 text-xs text-gray-600">
            <span>📦 {{ formatLimit(plan.maxProducts) }} productos</span>
            <span>👥 {{ formatLimit(plan.maxEmployees) }} empleados</span>
            <span>🏢 {{ formatLimit(plan.maxBranches) }} sucursales</span>
            <span>📋 {{ formatLimit(plan.maxOrders) }} pedidos/mes</span>
          </div>

          <!-- Módulos -->
          <div class="px-5 pb-4">
            <p class="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Módulos</p>
            <div class="flex flex-wrap gap-1">
              <span
                v-for="mod in (plan.enabledModules ?? [])" :key="mod"
                class="badge bg-gray-100 text-gray-600 text-[10px]"
              >{{ MODULE_LABELS[mod] ?? mod }}</span>
              <span v-if="!plan.enabledModules?.length" class="text-xs text-gray-300 italic">Sin módulos</span>
            </div>
          </div>

          <!-- Footer -->
          <div class="px-5 py-3 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
            <span class="text-xs text-gray-400">{{ plan._count?.subscriptions ?? 0 }} suscripciones</span>
            <button class="text-xs text-red-600 hover:text-red-800 font-medium" @click="openAssignModal(plan)">
              Asignar →
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- ── Tab: Suscripciones ────────────────────────────────────────────────── -->
    <div v-if="activeTab === 'subscriptions'">
      <div class="card overflow-hidden">
        <!-- Filtros -->
        <div class="px-5 py-4 border-b border-gray-100 flex flex-wrap items-center gap-3">
          <select v-model="subFilter" class="input-field w-auto" @change="loadSubscriptions">
            <option value="">Todos los estados</option>
            <option value="ACTIVE">Activo</option>
            <option value="TRIAL">Prueba</option>
            <option value="EXPIRED">Expirado</option>
            <option value="CANCELLED">Cancelado</option>
          </select>
          <select v-model="planFilter" class="input-field w-auto" @change="loadSubscriptions">
            <option value="">Todos los planes</option>
            <option v-for="p in plans" :key="p.id" :value="p.id">{{ p.name }}</option>
          </select>
          <button class="btn-primary ml-auto text-sm flex items-center gap-2" @click="openAssignModal()">
            <PlusIcon class="h-4 w-4" />Asignar suscripción
          </button>
        </div>

        <!-- Skeleton -->
        <template v-if="loadingSubs">
          <div v-for="i in 5" :key="i" class="p-4 flex items-center gap-4 border-b border-gray-100">
            <div class="skeleton h-9 w-9 rounded-full flex-shrink-0" />
            <div class="flex-1 space-y-2"><div class="skeleton h-4 w-36 rounded" /><div class="skeleton h-3 w-48 rounded" /></div>
            <div class="skeleton h-6 w-16 rounded-full" />
          </div>
        </template>

        <!-- Vacío -->
        <div v-else-if="subscriptions.length === 0" class="p-12 text-center">
          <CreditCardIcon class="h-12 w-12 text-gray-300 mx-auto mb-3" />
          <p class="text-gray-500 font-medium">No hay suscripciones</p>
        </div>

        <!-- Filas -->
        <div v-else class="divide-y divide-gray-100">
          <div v-for="sub in subscriptions" :key="sub.id" class="px-5 py-3.5 flex items-center gap-4 hover:bg-gray-50 transition-colors">
            <!-- Avatar -->
            <div class="h-9 w-9 rounded-full bg-red-100 flex items-center justify-center font-bold text-sm text-red-700 flex-shrink-0">
              {{ sub.user?.firstName?.[0] ?? '?' }}
            </div>
            <!-- Usuario -->
            <div class="flex-1 min-w-0">
              <p class="text-sm font-semibold text-gray-900 truncate">{{ sub.user?.firstName }} {{ sub.user?.lastName }}</p>
              <p class="text-xs text-gray-400 truncate">{{ sub.user?.email }}</p>
            </div>
            <!-- Plan -->
            <span
              class="badge flex-shrink-0"
              :style="{ backgroundColor: (sub.plan?.color ?? '#6b7280') + '20', color: sub.plan?.color ?? '#6b7280' }"
            >{{ sub.plan?.name }}</span>
            <!-- Estado -->
            <span class="badge flex-shrink-0" :class="SUB_STATUS_CLASSES[sub.status]">{{ SUB_STATUS_LABELS[sub.status] }}</span>
            <!-- Intervalo + precio -->
            <div class="hidden sm:block text-right flex-shrink-0">
              <p class="text-sm font-bold text-gray-900">{{ formatPrice(sub.pricePaid) }}</p>
              <p class="text-xs text-gray-400">{{ INTERVAL_LABELS[sub.interval] }}</p>
            </div>
            <!-- Vencimiento -->
            <div class="hidden md:block text-right flex-shrink-0 text-xs text-gray-500">
              {{ sub.endAt ? new Date(sub.endAt).toLocaleDateString('es') : '—' }}
            </div>
            <!-- Cancelar -->
            <button
              v-if="sub.status === 'ACTIVE' || sub.status === 'TRIAL'"
              class="flex-shrink-0 text-xs text-red-500 hover:text-red-700 font-medium"
              @click="handleCancelSub(sub.id)"
            >Cancelar</button>
          </div>
        </div>

        <!-- Paginación -->
        <div v-if="totalSubs > 20" class="px-5 py-3 border-t border-gray-100 flex items-center justify-between">
          <span class="text-sm text-gray-500">{{ totalSubs }} suscripciones</span>
          <div class="flex gap-2">
            <button class="btn-secondary text-sm px-3 py-1" :disabled="subPage === 1" @click="goSubPage(subPage - 1)">Anterior</button>
            <button class="btn-secondary text-sm px-3 py-1" :disabled="subPage * 20 >= totalSubs" @click="goSubPage(subPage + 1)">Siguiente</button>
          </div>
        </div>
      </div>
    </div>

    <!-- ── Tab: Solicitudes ─────────────────────────────────────────────────── -->
    <div v-if="activeTab === 'requests'">
      <div v-if="requestActionError" class="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center justify-between">
        <p class="text-red-700 text-sm">{{ requestActionError }}</p>
        <button class="text-red-500 hover:text-red-700" @click="requestActionError = null"><XMarkIcon class="h-4 w-4" /></button>
      </div>

      <div class="card overflow-hidden">
        <!-- Skeleton -->
        <template v-if="loadingRequests">
          <div v-for="i in 3" :key="i" class="p-4 flex items-center gap-4 border-b border-gray-100">
            <div class="skeleton h-9 w-9 rounded-full flex-shrink-0" />
            <div class="flex-1 space-y-2"><div class="skeleton h-4 w-36 rounded" /><div class="skeleton h-3 w-48 rounded" /></div>
            <div class="skeleton h-8 w-24 rounded-lg" />
          </div>
        </template>

        <!-- Vacío -->
        <div v-else-if="pendingRequests.length === 0" class="p-12 text-center">
          <CheckIcon class="h-12 w-12 text-gray-300 mx-auto mb-3" />
          <p class="text-gray-500 font-medium">No hay solicitudes pendientes de aprobación</p>
        </div>

        <!-- Filas -->
        <div v-else class="divide-y divide-gray-100">
          <div v-for="sub in pendingRequests" :key="sub.id" class="px-5 py-3.5 flex items-center gap-4 hover:bg-gray-50 transition-colors flex-wrap">
            <!-- Avatar -->
            <div class="h-9 w-9 rounded-full bg-yellow-100 flex items-center justify-center font-bold text-sm text-yellow-700 flex-shrink-0">
              {{ sub.user?.firstName?.[0] ?? '?' }}
            </div>
            <!-- Usuario -->
            <div class="flex-1 min-w-0">
              <p class="text-sm font-semibold text-gray-900 truncate">{{ sub.user?.firstName }} {{ sub.user?.lastName }}</p>
              <p class="text-xs text-gray-400 truncate">{{ sub.user?.email }}</p>
            </div>
            <!-- Sector solicitado -->
            <span v-if="sub.user?.category" class="badge bg-gray-100 text-gray-600 flex-shrink-0">
              {{ sub.user.category.icon ? `${sub.user.category.icon} ` : '' }}{{ sub.user.category.name }}
            </span>
            <!-- Plan -->
            <span
              class="badge flex-shrink-0"
              :style="{ backgroundColor: (sub.plan?.color ?? '#6b7280') + '20', color: sub.plan?.color ?? '#6b7280' }"
            >{{ sub.plan?.name }}</span>
            <!-- Rol nuevo -->
            <span class="badge bg-orange-100 text-orange-700 flex-shrink-0">
              {{ sub.user?.role === 'NORMAL' ? 'Pendiente' : sub.user?.role }}
            </span>
            <!-- Intervalo + precio -->
            <div class="hidden sm:block text-right flex-shrink-0">
              <p class="text-sm font-bold text-gray-900">{{ formatPrice(sub.pricePaid) }}</p>
              <p class="text-xs text-gray-400">{{ INTERVAL_LABELS[sub.interval] }}</p>
            </div>
            <!-- Fecha de solicitud -->
            <div class="hidden md:block text-right flex-shrink-0 text-xs text-gray-500">
              {{ new Date(sub.createdAt).toLocaleDateString('es') }}
            </div>
            <!-- Acciones -->
            <div class="flex gap-2 flex-shrink-0">
              <button
                class="btn-secondary text-xs px-3 py-1.5 text-red-600 hover:bg-red-50"
                :disabled="processingRequest === sub.id"
                @click="handleRejectRequest(sub)"
              >Rechazar</button>
              <button
                class="btn-primary text-xs px-3 py-1.5"
                :disabled="processingRequest === sub.id"
                @click="handleApproveRequest(sub)"
              >Aprobar</button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- ── Modal Plan ──────────────────────────────────────────────────────── -->
    <Teleport to="body">
      <Transition enter-active-class="ease-out duration-200" enter-from-class="opacity-0" enter-to-class="opacity-100"
        leave-active-class="ease-in duration-150" leave-from-class="opacity-100" leave-to-class="opacity-0">
        <div v-if="showPlanModal" class="fixed inset-0 z-50 flex items-center justify-center p-4" @click.self="showPlanModal = false">
          <div class="absolute inset-0 bg-black/40" @click="showPlanModal = false" />
          <div class="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div class="sticky top-0 bg-white flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 class="text-base font-bold text-gray-900">{{ editingPlan ? 'Editar Plan' : 'Nuevo Plan' }}</h2>
              <button class="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400" @click="showPlanModal = false"><XMarkIcon class="h-5 w-5" /></button>
            </div>

            <form @submit.prevent="savePlan" class="p-6 space-y-5">
              <div class="grid grid-cols-2 gap-4">
                <div class="col-span-2">
                  <label class="block text-xs font-medium text-gray-700 mb-1">Nombre <span class="text-red-500">*</span></label>
                  <input v-model="planForm.name" required class="input-field" />
                </div>
                <div class="col-span-2">
                  <label class="block text-xs font-medium text-gray-700 mb-1">Descripción</label>
                  <textarea v-model="planForm.description" rows="2" class="input-field resize-none" />
                </div>
                <div>
                  <label class="block text-xs font-medium text-gray-700 mb-1">Precio mensual <span class="text-red-500">*</span></label>
                  <input v-model.number="planForm.price" type="number" min="0" step="0.01" required class="input-field" />
                </div>
                <div>
                  <label class="block text-xs font-medium text-gray-700 mb-1">Precio anual</label>
                  <input v-model.number="planForm.priceAnnual" type="number" min="0" step="0.01" class="input-field" />
                </div>
              </div>

              <div class="grid grid-cols-3 gap-4">
                <div>
                  <label class="block text-xs font-medium text-gray-700 mb-1">Color</label>
                  <input v-model="planForm.color" type="color" class="h-10 w-full border border-gray-200 rounded-xl cursor-pointer" />
                </div>
                <div>
                  <label class="block text-xs font-medium text-gray-700 mb-1">Estado</label>
                  <select v-model="planForm.status" class="input-field">
                    <option value="ACTIVE">Activo</option>
                    <option value="INACTIVE">Inactivo</option>
                  </select>
                </div>
                <div>
                  <label class="block text-xs font-medium text-gray-700 mb-1">Orden</label>
                  <input v-model.number="planForm.sortOrder" type="number" min="0" class="input-field" />
                </div>
              </div>

              <div class="flex gap-6 flex-wrap">
                <label class="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                  <input v-model="planForm.forCommerce" type="checkbox" class="w-4 h-4 rounded text-red-600" />Para Commerce
                </label>
                <label class="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                  <input v-model="planForm.forFreelancer" type="checkbox" class="w-4 h-4 rounded text-red-600" />Para Freelancer
                </label>
                <label class="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                  <input v-model="planForm.forNormal" type="checkbox" class="w-4 h-4 rounded text-red-600" />Para Normal
                </label>
                <label class="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                  <input v-model="planForm.isPopular" type="checkbox" class="w-4 h-4 rounded text-red-600" />Marcar como Popular
                </label>
              </div>

              <!-- Categorías de negocio -->
              <fieldset class="border border-gray-200 rounded-xl p-4">
                <legend class="text-xs font-semibold text-gray-700 px-1">Categorías de negocio (vacío = todas)</legend>
                <div v-if="userCategories.length === 0" class="text-xs text-gray-400 italic mt-1">No hay categorías registradas</div>
                <div v-else class="grid grid-cols-2 gap-1.5 mt-2">
                  <label
                    v-for="cat in userCategories" :key="cat.id"
                    class="flex items-center gap-2 text-sm text-gray-700 cursor-pointer hover:bg-gray-50 rounded px-1.5 py-1"
                  >
                    <input
                      type="checkbox"
                      :checked="(planForm.categoryIds ?? []).includes(cat.id)"
                      @change="toggleCategory(cat.id, ($event.target as HTMLInputElement).checked)"
                      class="w-4 h-4 rounded text-red-600"
                    />
                    {{ cat.icon ? `${cat.icon} ` : '' }}{{ cat.name }}
                  </label>
                </div>
              </fieldset>

              <!-- Límites -->
              <fieldset class="border border-gray-200 rounded-xl p-4">
                <legend class="text-xs font-semibold text-gray-700 px-1">Límites (-1 = ilimitado)</legend>
                <div class="grid grid-cols-2 gap-3 mt-2">
                  <div><label class="block text-xs text-gray-500 mb-1">Productos</label><input v-model.number="planForm.maxProducts" type="number" min="-1" class="input-field" /></div>
                  <div><label class="block text-xs text-gray-500 mb-1">Empleados</label><input v-model.number="planForm.maxEmployees" type="number" min="-1" class="input-field" /></div>
                  <div><label class="block text-xs text-gray-500 mb-1">Sucursales</label><input v-model.number="planForm.maxBranches" type="number" min="-1" class="input-field" /></div>
                  <div><label class="block text-xs text-gray-500 mb-1">Pedidos/mes</label><input v-model.number="planForm.maxOrders" type="number" min="-1" class="input-field" /></div>
                  <div><label class="block text-xs text-gray-500 mb-1">Almacenamiento (GB)</label><input v-model.number="planForm.maxStorage" type="number" min="0" class="input-field" /></div>
                </div>
              </fieldset>

              <!-- Módulos -->
              <fieldset class="border border-gray-200 rounded-xl p-4">
                <legend class="text-xs font-semibold text-gray-700 px-1">Módulos incluidos</legend>
                <div class="grid grid-cols-2 gap-1.5 mt-2">
                  <label
                    v-for="mod in ALL_MODULES" :key="mod"
                    class="flex items-center gap-2 text-sm text-gray-700 cursor-pointer hover:bg-gray-50 rounded px-1.5 py-1"
                  >
                    <input
                      type="checkbox"
                      :checked="(planForm.enabledModules ?? []).includes(mod)"
                      @change="toggleModule(mod, ($event.target as HTMLInputElement).checked)"
                      class="w-4 h-4 rounded text-red-600"
                    />
                    {{ MODULE_LABELS[mod] ?? mod }}
                  </label>
                </div>
              </fieldset>

              <!-- Features -->
              <div>
                <label class="block text-xs font-medium text-gray-700 mb-1">Features (una por línea)</label>
                <textarea
                  :value="(planForm.features ?? []).join('\n')"
                  @input="planForm.features = ($event.target as HTMLTextAreaElement).value.split('\n').filter(Boolean)"
                  rows="4"
                  placeholder="Dashboard básico&#10;Hasta 50 productos&#10;..."
                  class="input-field resize-none"
                />
              </div>

              <div v-if="formError" class="p-3 bg-red-50 border border-red-100 rounded-xl text-red-600 text-xs">{{ formError }}</div>

              <div class="flex justify-end gap-3 pt-2">
                <button type="button" class="btn-secondary" @click="showPlanModal = false">Cancelar</button>
                <button type="submit" :disabled="saving" class="btn-primary">
                  {{ saving ? 'Guardando...' : (editingPlan ? 'Actualizar' : 'Crear Plan') }}
                </button>
              </div>
            </form>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- ── Modal Asignar ──────────────────────────────────────────────────── -->
    <Teleport to="body">
      <Transition enter-active-class="ease-out duration-200" enter-from-class="opacity-0" enter-to-class="opacity-100"
        leave-active-class="ease-in duration-150" leave-from-class="opacity-100" leave-to-class="opacity-0">
        <div v-if="showAssignModal" class="fixed inset-0 z-50 flex items-center justify-center p-4" @click.self="showAssignModal = false">
          <div class="absolute inset-0 bg-black/40" @click="showAssignModal = false" />
          <div class="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <div class="flex items-center justify-between mb-5">
              <h2 class="text-base font-bold text-gray-900">Asignar Suscripción</h2>
              <button class="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400" @click="showAssignModal = false"><XMarkIcon class="h-5 w-5" /></button>
            </div>
            <form @submit.prevent="saveAssign" class="space-y-4">
              <div>
                <label class="block text-xs font-medium text-gray-700 mb-1">ID de Usuario <span class="text-red-500">*</span></label>
                <input v-model="assignForm.userId" required placeholder="UUID del usuario" class="input-field" />
              </div>
              <div>
                <label class="block text-xs font-medium text-gray-700 mb-1">Plan <span class="text-red-500">*</span></label>
                <select v-model="assignForm.planId" required class="input-field">
                  <option value="" disabled>Selecciona un plan</option>
                  <option v-for="p in plans.filter(p => p.status === 'ACTIVE')" :key="p.id" :value="p.id">
                    {{ p.name }} — {{ formatPrice(p.price) }}/mes
                  </option>
                </select>
              </div>
              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label class="block text-xs font-medium text-gray-700 mb-1">Intervalo</label>
                  <select v-model="assignForm.interval" class="input-field">
                    <option value="MONTHLY">Mensual</option>
                    <option value="ANNUAL">Anual</option>
                  </select>
                </div>
                <div>
                  <label class="block text-xs font-medium text-gray-700 mb-1">Estado</label>
                  <select v-model="assignForm.status" class="input-field">
                    <option value="ACTIVE">Activo</option>
                    <option value="TRIAL">Prueba</option>
                    <option value="PENDING">Pendiente</option>
                  </select>
                </div>
              </div>
              <div>
                <label class="block text-xs font-medium text-gray-700 mb-1">Precio pagado (opcional)</label>
                <input v-model.number="assignForm.pricePaid" type="number" min="0" step="0.01" placeholder="Usa precio del plan si vacío" class="input-field" />
              </div>
              <div>
                <label class="block text-xs font-medium text-gray-700 mb-1">Fecha fin (opcional)</label>
                <input v-model="assignForm.endAt" type="date" class="input-field" />
              </div>
              <div>
                <label class="block text-xs font-medium text-gray-700 mb-1">Notas</label>
                <input v-model="assignForm.notes" placeholder="Notas internas..." class="input-field" />
              </div>
              <div v-if="assignError" class="p-3 bg-red-50 border border-red-100 rounded-xl text-red-600 text-xs">{{ assignError }}</div>
              <div class="flex gap-3 pt-2">
                <button type="button" class="btn-secondary flex-1" @click="showAssignModal = false">Cancelar</button>
                <button type="submit" :disabled="assigning" class="btn-primary flex-1">
                  {{ assigning ? 'Asignando...' : 'Asignar' }}
                </button>
              </div>
            </form>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { CreditCardIcon, PlusIcon, XMarkIcon, PencilIcon, TrashIcon, CheckIcon } from '@heroicons/vue/24/outline'
import PageHeader from '~/components/ui/PageHeader.vue'
import HeaderActionButton from '~/components/ui/HeaderActionButton.vue'
import { usePlans, SUB_STATUS_LABELS, SUB_STATUS_CLASSES, INTERVAL_LABELS, type Plan, type Subscription } from '~/composables/commerce/usePlans'
import { useModuleCatalog } from '~/composables/commerce/useModuleCatalog'
import { useToast } from '~/composables/ui/useToast'
import { useConfirm } from '~/composables/ui/useConfirm'

definePageMeta({ layout: 'default', middleware: ['auth'] })

const toast = useToast()
const { confirm } = useConfirm()
const { invalidate: invalidateModules } = useModules()
const { labels: MODULE_LABELS, load: loadModuleCatalog } = useModuleCatalog()

// Módulos de NEGOCIO seleccionables al armar un plan — subset del catálogo
// completo (excluye módulos "de sistema" como users/permissions/audit, que
// no participan de plan∩categoría).
const ALL_MODULES = [
  'dashboard', 'menu', 'inventory', 'orders', 'customers', 'appointments',
  'delivery', 'expenses', 'analytics', 'reports', 'sales', 'employees',
  'branches', 'settings', 'notifications', 'services', 'service_requests', 'catalog',
  'corridas', 'wallets',
] as const

const {
  plans, subscriptions, stats, loading, loadingStats, loadingSubs, error,
  totalSubs, subPage,
  fetchPlans, createPlan, updatePlan, deletePlan,
  fetchSubscriptions, assignSubscription, cancelSubscription,
  approveSubscription, rejectSubscription,
  fetchStats, formatLimit, formatPrice,
} = usePlans()

const { get } = useApi()

// ─── Categorías de negocio ──────────────────────────────────────────────────────
interface UserCategory { id: string; name: string; icon?: string }
const userCategories = ref<UserCategory[]>([])

async function loadUserCategories() {
  try {
    userCategories.value = await get<UserCategory[]>('/users/categories')
  } catch {
    userCategories.value = []
  }
}

function categoryName(id: string): string {
  return userCategories.value.find(c => c.id === id)?.name ?? id
}

// ─── Estado ───────────────────────────────────────────────────────────────────
const activeTab  = ref<'plans' | 'subscriptions' | 'requests'>('plans')
const subFilter  = ref('')
const planFilter = ref('')

// Filtros de la grilla de planes: por rol/audiencia y por categoría de negocio
const roleFilter     = ref<'all' | 'COMMERCE' | 'FREELANCER' | 'NORMAL'>('all')
const categoryFilter = ref<string>('all')

const tabs = [
  { key: 'plans',         label: 'Planes'         },
  { key: 'subscriptions', label: 'Suscripciones'  },
  { key: 'requests',      label: 'Solicitudes'    },
]

const headerStats = computed(() => [
  { label: 'Total Planes',        value: String(stats.value?.totalPlans  ?? '—') },
  { label: 'Suscripciones',       value: String(stats.value?.activeSubs  ?? '—') },
  { label: 'Total subs',          value: String(stats.value?.totalSubs   ?? '—') },
  { label: 'Ingresos mensuales',  value: stats.value ? formatPrice(stats.value.monthlyRevenue) : '—' },
])

// Planes visibles en la grilla según los filtros de rol/categoría seleccionados
const filteredPlans = computed(() => {
  return plans.value.filter((plan) => {
    if (roleFilter.value === 'COMMERCE' && !plan.forCommerce) return false
    if (roleFilter.value === 'FREELANCER' && !plan.forFreelancer) return false
    if (roleFilter.value === 'NORMAL' && !plan.forNormal) return false

    if (categoryFilter.value !== 'all') {
      const ids = plan.categoryIds ?? []
      if (ids.length > 0 && !ids.includes(categoryFilter.value)) return false
    }

    return true
  })
})

// ─── Plan modal ───────────────────────────────────────────────────────────────
const showPlanModal = ref(false)
const editingPlan   = ref<Plan | null>(null)
const saving        = ref(false)
const formError     = ref<string | null>(null)

const defaultPlanForm = () => ({
  name: '', description: '', price: 0, priceAnnual: undefined as number | undefined,
  status: 'ACTIVE' as 'ACTIVE' | 'INACTIVE', isPopular: false, color: '#3B82F6', sortOrder: 0,
  forCommerce: true, forFreelancer: false, forNormal: false,
  categoryIds: [] as string[],
  maxProducts: 50, maxEmployees: 5, maxBranches: 1, maxOrders: -1, maxStorage: 1,
  features: [] as string[], enabledModules: [] as string[],
})

type PlanForm = ReturnType<typeof defaultPlanForm>
const planForm = ref<PlanForm>(defaultPlanForm())

function toggleModule(mod: string, checked: boolean) {
  const current = planForm.value.enabledModules ?? []
  planForm.value.enabledModules = checked
    ? [...current.filter(m => m !== mod), mod]
    : current.filter(m => m !== mod)
}

function toggleCategory(catId: string, checked: boolean) {
  const current = planForm.value.categoryIds ?? []
  planForm.value.categoryIds = checked
    ? [...current.filter(c => c !== catId), catId]
    : current.filter(c => c !== catId)
}

function openPlanModal(plan?: Plan) {
  editingPlan.value = plan ?? null
  formError.value   = null
  planForm.value    = plan
    ? { name: plan.name, description: plan.description ?? '', price: plan.price, priceAnnual: plan.priceAnnual ?? undefined, status: plan.status, isPopular: plan.isPopular, color: plan.color, sortOrder: plan.sortOrder, forCommerce: plan.forCommerce, forFreelancer: plan.forFreelancer, forNormal: plan.forNormal, categoryIds: [...(plan.categoryIds ?? [])], maxProducts: plan.maxProducts, maxEmployees: plan.maxEmployees, maxBranches: plan.maxBranches, maxOrders: plan.maxOrders, maxStorage: plan.maxStorage, features: [...plan.features], enabledModules: [...(plan.enabledModules ?? [])] }
    : defaultPlanForm()
  showPlanModal.value = true
}

async function savePlan() {
  saving.value = true; formError.value = null
  try {
    if (editingPlan.value) await updatePlan(editingPlan.value.id, planForm.value)
    else await createPlan(planForm.value)
    showPlanModal.value = false
    await fetchStats()
  } catch (e: any) { formError.value = e?.data?.message ?? e.message }
  finally { saving.value = false }
}

async function confirmDeletePlan(plan: Plan) {
  const ok = await confirm({
    title: 'Eliminar plan',
    message: `¿Eliminar el plan "${plan.name}"? Esta acción no se puede deshacer.`,
    confirmText: 'Eliminar',
    variant: 'danger',
  })
  if (!ok) return
  try { await deletePlan(plan.id); await fetchStats() }
  catch (e: any) { toast.error('Error', e?.data?.message ?? e.message) }
}

// ─── Assign modal ─────────────────────────────────────────────────────────────
const showAssignModal = ref(false)
const assigning       = ref(false)
const assignError     = ref<string | null>(null)

const defaultAssignForm = () => ({
  userId: '', planId: '', interval: 'MONTHLY' as 'MONTHLY' | 'ANNUAL',
  status: 'ACTIVE' as string, pricePaid: undefined as number | undefined, endAt: '', notes: '',
})
const assignForm = ref(defaultAssignForm())

function openAssignModal(plan?: Plan) {
  assignError.value = null
  assignForm.value  = defaultAssignForm()
  if (plan) assignForm.value.planId = plan.id
  showAssignModal.value = true
}

async function saveAssign() {
  assigning.value = true; assignError.value = null
  try {
    await assignSubscription({ ...assignForm.value, endAt: assignForm.value.endAt || undefined })
    showAssignModal.value = false
    invalidateModules(); await fetchStats()
    if (activeTab.value === 'subscriptions') await loadSubscriptions()
  } catch (e: any) { assignError.value = e?.data?.message ?? e.message }
  finally { assigning.value = false }
}

async function handleCancelSub(id: string) {
  const ok = await confirm({ title: 'Cancelar suscripción', message: '¿Cancelar esta suscripción?', confirmText: 'Sí, cancelar', cancelText: 'No', variant: 'danger' })
  if (!ok) return
  try { await cancelSubscription(id); invalidateModules(); await fetchStats() }
  catch (e: any) { toast.error('Error', e?.data?.message ?? e.message) }
}

async function loadSubscriptions() {
  await fetchSubscriptions({ status: subFilter.value || undefined, planId: planFilter.value || undefined })
}

function goSubPage(page: number) {
  fetchSubscriptions({ status: subFilter.value || undefined, planId: planFilter.value || undefined, page })
}

// ─── Solicitudes pendientes ─────────────────────────────────────────────────────
const pendingRequests = ref<Subscription[]>([])
const loadingRequests = ref(false)
const processingRequest = ref<string | null>(null)
const requestActionError = ref<string | null>(null)

async function loadPendingRequests() {
  loadingRequests.value = true
  try {
    const data = await get<{ subscriptions: Subscription[] }>('/plans/subscriptions?status=PENDING&limit=100')
    pendingRequests.value = data.subscriptions
  } catch (e: any) {
    requestActionError.value = e?.data?.message ?? e.message
  } finally {
    loadingRequests.value = false
  }
}

async function handleApproveRequest(sub: Subscription) {
  const ok = await confirm({
    title: 'Aprobar solicitud',
    message: `¿Aprobar la solicitud de ${sub.user?.firstName} ${sub.user?.lastName} para el plan "${sub.plan?.name}"?`,
    confirmText: 'Aprobar',
  })
  if (!ok) return
  processingRequest.value = sub.id
  requestActionError.value = null
  try {
    await approveSubscription(sub.id)
    pendingRequests.value = pendingRequests.value.filter(s => s.id !== sub.id)
    invalidateModules(); await fetchStats()
  } catch (e: any) {
    requestActionError.value = e?.data?.message ?? e.message
  } finally {
    processingRequest.value = null
  }
}

async function handleRejectRequest(sub: Subscription) {
  const ok = await confirm({
    title: 'Rechazar solicitud',
    message: `¿Rechazar la solicitud de ${sub.user?.firstName} ${sub.user?.lastName} para el plan "${sub.plan?.name}"?`,
    confirmText: 'Rechazar',
    variant: 'danger',
  })
  if (!ok) return
  processingRequest.value = sub.id
  requestActionError.value = null
  try {
    await rejectSubscription(sub.id)
    pendingRequests.value = pendingRequests.value.filter(s => s.id !== sub.id)
    await fetchStats()
  } catch (e: any) {
    requestActionError.value = e?.data?.message ?? e.message
  } finally {
    processingRequest.value = null
  }
}

watch(activeTab, (tab) => {
  if (tab === 'requests' && pendingRequests.value.length === 0) loadPendingRequests()
})

onMounted(async () => {
  await Promise.all([fetchPlans(), fetchStats(), loadUserCategories(), loadModuleCatalog()])
  await loadSubscriptions()
  await loadPendingRequests()
})
</script>
