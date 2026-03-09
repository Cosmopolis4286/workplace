<template>
  <div>
    <PageHeader
      title="Mis Servicios"
      description="Gestiona los servicios que ofreces"
      :icon="BriefcaseIcon"
      :breadcrumb="[{ label: 'Servicios' }]"
      :stats="headerStats"
    >
      <template #actions>
        <button @click="openCreate" class="btn-primary flex items-center">
          <PlusIcon class="h-5 w-5 mr-2" />
          Nuevo Servicio
        </button>
      </template>
    </PageHeader>

    <!-- Error banner -->
    <div v-if="error" class="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center justify-between">
      <p class="text-sm text-red-700">{{ error }}</p>
      <button @click="error = null"><XMarkIcon class="h-5 w-5 text-red-400" /></button>
    </div>

    <!-- Stats cards -->
    <div class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      <div class="card p-4">
        <p class="text-xs text-gray-500 mb-1">Total</p>
        <p class="text-2xl font-bold text-gray-900">{{ stats.total }}</p>
      </div>
      <div class="card p-4">
        <p class="text-xs text-gray-500 mb-1">Activos</p>
        <p class="text-2xl font-bold text-green-600">{{ stats.activos }}</p>
      </div>
      <div class="card p-4">
        <p class="text-xs text-gray-500 mb-1">Pausados</p>
        <p class="text-2xl font-bold text-yellow-600">{{ stats.pausados }}</p>
      </div>
      <div class="card p-4">
        <p class="text-xs text-gray-500 mb-1">Inactivos</p>
        <p class="text-2xl font-bold text-gray-400">{{ stats.inactivos }}</p>
      </div>
    </div>

    <!-- Filters -->
    <div class="card p-4 mb-6 flex flex-col sm:flex-row gap-3">
      <div class="relative flex-1">
        <MagnifyingGlassIcon class="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input
          v-model="search"
          @input="onSearch"
          type="text"
          placeholder="Buscar servicios..."
          class="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-400"
        />
      </div>
      <select
        v-model="filterStatus"
        @change="applyFilter"
        class="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 bg-white"
      >
        <option value="">Todos los estados</option>
        <option value="ACTIVO">Activos</option>
        <option value="PAUSADO">Pausados</option>
        <option value="INACTIVO">Inactivos</option>
      </select>
    </div>

    <!-- Loading skeleton -->
    <div v-if="loading" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <div v-for="n in 6" :key="n" class="card p-5 animate-pulse space-y-3">
        <div class="h-5 bg-gray-200 rounded w-3/4"></div>
        <div class="h-3 bg-gray-100 rounded w-full"></div>
        <div class="h-3 bg-gray-100 rounded w-2/3"></div>
        <div class="flex justify-between mt-2">
          <div class="h-6 bg-gray-200 rounded w-20"></div>
          <div class="h-6 bg-gray-100 rounded w-16"></div>
        </div>
      </div>
    </div>

    <!-- Empty state -->
    <div v-else-if="filteredServices.length === 0" class="card p-12 text-center">
      <BriefcaseIcon class="h-12 w-12 text-gray-300 mx-auto mb-4" />
      <h3 class="text-lg font-medium text-gray-900 mb-1">No hay servicios</h3>
      <p class="text-sm text-gray-500 mb-4">
        {{ search ? 'No se encontraron resultados para tu búsqueda.' : 'Crea tu primer servicio para comenzar.' }}
      </p>
      <button v-if="!search" @click="openCreate" class="btn-primary">
        <PlusIcon class="h-4 w-4 mr-2" />
        Nuevo Servicio
      </button>
    </div>

    <!-- Services grid -->
    <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <div
        v-for="service in filteredServices"
        :key="service.id"
        class="card p-5 flex flex-col gap-3 hover:shadow-md transition-shadow"
      >
        <!-- Image -->
        <div v-if="service.image" class="-mx-5 -mt-5 mb-1 h-40 bg-gray-100 rounded-t-2xl overflow-hidden">
          <img
            :src="service.image"
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
            ${{ service.price.toLocaleString('es') }}
            <span v-if="service.priceUnit" class="font-normal text-gray-500 text-xs">/ {{ service.priceUnit }}</span>
          </span>
          <span v-if="service.duration" class="text-gray-500 flex items-center gap-1">
            <ClockIcon class="h-3.5 w-3.5" />
            {{ formatDuration(service.duration) }}
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
            @click="confirmToggleStatus(service)"
            class="text-xs font-medium px-3 py-1.5 rounded-lg transition-colors"
            :class="service.status === 'ACTIVO'
              ? 'bg-yellow-50 text-yellow-700 hover:bg-yellow-100'
              : 'bg-green-50 text-green-700 hover:bg-green-100'"
          >
            {{ service.status === 'ACTIVO' ? 'Pausar' : 'Activar' }}
          </button>
          <div class="flex gap-1">
            <button
              @click="openMetrics(service)"
              class="p-1.5 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
              title="Ver métricas"
            >
              <ChartBarIcon class="h-4 w-4" />
            </button>
            <button
              @click="openEdit(service)"
              class="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              title="Editar"
            >
              <PencilIcon class="h-4 w-4" />
            </button>
            <button
              @click="confirmDelete(service)"
              class="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              title="Eliminar"
            >
              <TrashIcon class="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal crear/editar -->
    <Teleport to="body">
      <div
        v-if="showModal"
        class="fixed inset-0 z-50 flex items-center justify-center p-4"
        @click.self="showModal = false"
      >
        <div class="absolute inset-0 bg-black/40 backdrop-blur-sm"></div>
        <div class="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
          <div class="p-6">
            <div class="flex items-center justify-between mb-6">
              <h2 class="text-lg font-semibold text-gray-900">
                {{ editing ? 'Editar Servicio' : 'Nuevo Servicio' }}
              </h2>
              <button @click="showModal = false" class="p-1 text-gray-400 hover:text-gray-600">
                <XMarkIcon class="h-5 w-5" />
              </button>
            </div>

            <div v-if="formError" class="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {{ formError }}
            </div>

            <form @submit.prevent="handleSubmit" class="space-y-4">
              <!-- Nombre -->
              <div>
                <label class="block text-xs font-medium text-gray-700 mb-1">Nombre <span class="text-red-500">*</span></label>
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
                <label class="block text-xs font-medium text-gray-700 mb-1">Descripción</label>
                <textarea
                  v-model="form.description"
                  rows="3"
                  placeholder="Describe tu servicio..."
                  maxlength="1000"
                  class="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-400 resize-none"
                ></textarea>
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
                  <option value="ACTIVO">Activo</option>
                  <option value="PAUSADO">Pausado</option>
                  <option value="INACTIVO">Inactivo</option>
                </select>
              </div>

              <!-- Tags -->
              <div>
                <label class="block text-xs font-medium text-gray-700 mb-1">Etiquetas</label>
                <div class="flex flex-wrap gap-1.5 mb-2">
                  <span
                    v-for="tag in form.tags"
                    :key="tag"
                    class="flex items-center gap-1 text-xs bg-red-50 text-red-700 px-2 py-1 rounded-full"
                  >
                    {{ tag }}
                    <button type="button" @click="removeTag(tag)" class="hover:text-red-900">
                      <XMarkIcon class="h-3 w-3" />
                    </button>
                  </span>
                </div>
                <div class="flex gap-2">
                  <input
                    v-model="tagInput"
                    @keydown.enter.prevent="addTag"
                    type="text"
                    placeholder="Agregar etiqueta..."
                    class="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-400"
                  />
                  <button
                    type="button"
                    @click="addTag"
                    class="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-xl text-sm font-medium text-gray-700 transition-colors"
                  >
                    Agregar
                  </button>
                </div>
              </div>

              <!-- Image URL -->
              <div>
                <label class="block text-xs font-medium text-gray-700 mb-1">URL de imagen</label>
                <input
                  v-model="form.image"
                  type="text"
                  placeholder="https://ejemplo.com/imagen.jpg"
                  class="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-400"
                />
                <div v-if="form.image" class="mt-2 rounded-xl overflow-hidden border border-gray-200 h-32 bg-gray-50 flex items-center justify-center">
                  <img
                    :src="form.image"
                    alt="Preview"
                    class="h-full w-full object-cover"
                    @error="($event.target as HTMLImageElement).parentElement!.innerHTML = '<span class=\'text-xs text-gray-400\'>No se puede cargar la imagen</span>'"
                  />
                </div>
              </div>

              <!-- Buttons -->
              <div class="flex gap-3 pt-2">
                <button
                  type="button"
                  @click="showModal = false"
                  class="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  :disabled="saving"
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

    <!-- Confirm toggle status modal -->
    <Teleport to="body">
      <div
        v-if="toggleTarget"
        class="fixed inset-0 z-50 flex items-center justify-center p-4"
        @click.self="toggleTarget = null"
      >
        <div class="absolute inset-0 bg-black/40 backdrop-blur-sm"></div>
        <div class="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
          <div class="flex items-center gap-3 mb-3">
            <div
              class="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center"
              :class="toggleTarget.status === 'ACTIVO' ? 'bg-yellow-100' : 'bg-green-100'"
            >
              <PauseCircleIcon v-if="toggleTarget.status === 'ACTIVO'" class="h-5 w-5 text-yellow-600" />
              <PlayCircleIcon v-else class="h-5 w-5 text-green-600" />
            </div>
            <h3 class="text-lg font-semibold text-gray-900">
              {{ toggleTarget.status === 'ACTIVO' ? 'Pausar servicio' : 'Activar servicio' }}
            </h3>
          </div>
          <p class="text-sm text-gray-600 mb-6">
            ¿Estás seguro de que deseas
            <strong>{{ toggleTarget.status === 'ACTIVO' ? 'pausar' : 'activar' }}</strong>
            el servicio <strong>{{ toggleTarget.name }}</strong>?
            <span v-if="toggleTarget.status === 'ACTIVO'" class="block mt-1 text-yellow-700">
              El servicio dejará de ser visible para los clientes.
            </span>
            <span v-else class="block mt-1 text-green-700">
              El servicio volverá a ser visible para los clientes.
            </span>
          </p>
          <div class="flex gap-3">
            <button
              @click="toggleTarget = null"
              class="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              @click="doToggleStatus"
              :disabled="saving"
              class="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium text-white disabled:opacity-60"
              :class="toggleTarget.status === 'ACTIVO' ? 'bg-yellow-500 hover:bg-yellow-600' : 'bg-green-600 hover:bg-green-700'"
            >
              {{ saving ? 'Guardando...' : (toggleTarget.status === 'ACTIVO' ? 'Pausar' : 'Activar') }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Metrics modal -->
    <Teleport to="body">
      <div
        v-if="metricsTarget"
        class="fixed inset-0 z-50 flex items-center justify-center p-4"
        @click.self="closeMetrics"
      >
        <div class="absolute inset-0 bg-black/40 backdrop-blur-sm"></div>
        <div class="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
          <div class="flex items-center justify-between mb-5">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
                <ChartBarIcon class="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <h3 class="text-base font-semibold text-gray-900 truncate max-w-[220px]">{{ metricsTarget.name }}</h3>
                <p class="text-xs text-gray-400">Receptividad del anuncio</p>
              </div>
            </div>
            <button @click="closeMetrics" class="p-1 text-gray-400 hover:text-gray-600">
              <XMarkIcon class="h-5 w-5" />
            </button>
          </div>

          <!-- Status badge -->
          <div class="flex items-center gap-2 mb-5">
            <span class="text-xs font-medium px-2 py-1 rounded-full" :class="SERVICE_STATUS_CLASSES[metricsTarget.status]">
              {{ SERVICE_STATUS_LABELS[metricsTarget.status] }}
            </span>
            <span v-if="metricsTarget.category" class="text-xs text-gray-500 flex items-center gap-1">
              <span class="inline-block w-2 h-2 rounded-full" :style="{ backgroundColor: metricsTarget.category.color }"></span>
              {{ metricsTarget.category.name }}
            </span>
          </div>

          <!-- Loading -->
          <div v-if="metricsLoading" class="space-y-3">
            <div class="grid grid-cols-2 gap-3">
              <div v-for="n in 4" :key="n" class="h-20 bg-gray-100 rounded-xl animate-pulse"></div>
            </div>
            <div class="h-24 bg-gray-100 rounded-xl animate-pulse"></div>
          </div>

          <!-- Error -->
          <div v-else-if="metricsError" class="p-4 bg-red-50 rounded-xl text-sm text-red-700">
            {{ metricsError }}
          </div>

          <!-- Datos reales -->
          <template v-else-if="metricsData">
            <!-- KPI grid -->
            <div class="grid grid-cols-2 gap-3 mb-4">
              <div class="bg-blue-50 rounded-xl p-4">
                <p class="text-xs text-blue-600 font-medium mb-1 flex items-center gap-1">
                  <EyeIcon class="h-3.5 w-3.5" /> Visualizaciones
                </p>
                <p class="text-2xl font-bold text-blue-900">{{ metricsData.views }}</p>
                <p class="text-[11px] text-blue-500 mt-0.5">usuarios únicos (1h)</p>
              </div>
              <div class="bg-indigo-50 rounded-xl p-4">
                <p class="text-xs text-indigo-600 font-medium mb-1 flex items-center gap-1">
                  <UserIcon class="h-3.5 w-3.5" /> Visitas al perfil
                </p>
                <p class="text-2xl font-bold text-indigo-900">{{ metricsData.profileVisits }}</p>
                <p class="text-[11px] text-indigo-500 mt-0.5">desde este anuncio</p>
              </div>
              <div class="bg-green-50 rounded-xl p-4">
                <p class="text-xs text-green-600 font-medium mb-1 flex items-center gap-1">
                  <ClipboardDocumentListIcon class="h-3.5 w-3.5" /> Solicitudes
                </p>
                <p class="text-2xl font-bold text-green-900">{{ metricsData.requests }}</p>
                <p class="text-[11px] text-green-500 mt-0.5">totales recibidas</p>
              </div>
              <div class="bg-orange-50 rounded-xl p-4">
                <p class="text-xs text-orange-600 font-medium mb-1 flex items-center gap-1">
                  <ArrowTrendingUpIcon class="h-3.5 w-3.5" /> Conversión
                </p>
                <p class="text-2xl font-bold text-orange-900">{{ metricsData.conversionRate }}%</p>
                <p class="text-[11px] text-orange-500 mt-0.5">vistas → solicitudes</p>
              </div>
            </div>

            <!-- Mini gráfico de vistas últimos 7 días -->
            <div class="bg-gray-50 rounded-xl p-4">
              <p class="text-xs font-semibold text-gray-600 mb-3">Vistas — últimos 7 días</p>
              <div class="flex items-end gap-1.5 h-14">
                <template v-for="day in metricsData.viewsByDay" :key="day.date">
                  <div class="flex-1 flex flex-col items-center gap-1">
                    <div
                      class="w-full rounded-t-md bg-blue-400 transition-all duration-300"
                      :style="{ height: maxDayViews > 0 ? `${Math.max(4, (day.count / maxDayViews) * 48)}px` : '4px' }"
                      :title="`${day.date}: ${day.count} vista(s)`"
                    ></div>
                    <span class="text-[9px] text-gray-400">{{ day.date.slice(5) }}</span>
                  </div>
                </template>
              </div>
            </div>
          </template>
        </div>
      </div>
    </Teleport>

    <!-- Confirm delete modal -->
    <Teleport to="body">
      <div
        v-if="deleteTarget"
        class="fixed inset-0 z-50 flex items-center justify-center p-4"
        @click.self="deleteTarget = null"
      >
        <div class="absolute inset-0 bg-black/40 backdrop-blur-sm"></div>
        <div class="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
          <h3 class="text-lg font-semibold text-gray-900 mb-2">Eliminar servicio</h3>
          <p class="text-sm text-gray-600 mb-6">
            ¿Estás seguro de eliminar <strong>{{ deleteTarget.name }}</strong>? Esta acción no se puede deshacer.
          </p>
          <div class="flex gap-3">
            <button @click="deleteTarget = null" class="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50">
              Cancelar
            </button>
            <button @click="doDelete" :disabled="saving" class="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-medium disabled:opacity-60">
              {{ saving ? 'Eliminando...' : 'Eliminar' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import {
  BriefcaseIcon,
  PlusIcon,
  XMarkIcon,
  MagnifyingGlassIcon,
  PencilIcon,
  TrashIcon,
  ClockIcon,
  ChartBarIcon,
  PauseCircleIcon,
  PlayCircleIcon,
  EyeIcon,
  UserIcon,
  ArrowTrendingUpIcon,
  ClipboardDocumentListIcon,
} from '@heroicons/vue/24/outline'
import PageHeader from '~/components/ui/PageHeader.vue'
import { useServicios, SERVICE_STATUS_LABELS, SERVICE_STATUS_CLASSES, type Service } from '~/composables/useServicios'

definePageMeta({ middleware: 'auth' })

const {
  services,
  catalogCategories,
  loading,
  error,
  stats,
  fetchServices,
  fetchCatalogCategories,
  createService,
  updateService,
  toggleStatus: toggleServiceStatus,
  deleteService,
} = useServicios()

const search = ref('')
const filterStatus = ref('')
const showModal = ref(false)
const editing = ref<Service | null>(null)
const deleteTarget = ref<Service | null>(null)
const toggleTarget = ref<Service | null>(null)
const metricsTarget = ref<Service | null>(null)
const metricsData = ref<{
  views: number
  profileVisits: number
  requests: number
  conversionRate: number
  viewsByDay: { date: string; count: number }[]
} | null>(null)
const metricsLoading = ref(false)
const metricsError = ref<string | null>(null)
const saving = ref(false)
const formError = ref<string | null>(null)
const tagInput = ref('')

const emptyForm = () => ({
  name: '',
  description: '',
  price: 0,
  priceUnit: '',
  duration: undefined as number | undefined,
  image: '',
  status: 'ACTIVO' as Service['status'],
  tags: [] as string[],
  categoryId: '',
})

const form = ref(emptyForm())

const headerStats = computed(() => [
  { label: 'Servicios activos', value: String(stats.value.activos) },
  { label: 'Total servicios', value: String(stats.value.total) },
])

const maxDayViews = computed(() => {
  if (!metricsData.value?.viewsByDay.length) return 1
  return Math.max(1, ...metricsData.value.viewsByDay.map(d => d.count))
})

const filteredServices = computed(() => {
  let list = services.value
  if (filterStatus.value) list = list.filter(s => s.status === filterStatus.value)
  return list
})

let searchTimer: ReturnType<typeof setTimeout>
function onSearch() {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => fetchServices({ search: search.value }), 350)
}

function applyFilter() {
  fetchServices({ search: search.value })
}

function formatDuration(minutes: number) {
  if (minutes < 60) return `${minutes} min`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m ? `${h}h ${m}min` : `${h}h`
}

function openCreate() {
  editing.value = null
  form.value = emptyForm()
  formError.value = null
  showModal.value = true
}

function openEdit(service: Service) {
  editing.value = service
  form.value = {
    name: service.name,
    description: service.description ?? '',
    price: service.price,
    priceUnit: service.priceUnit ?? '',
    duration: service.duration,
    image: service.image ?? '',
    status: service.status,
    tags: [...service.tags],
    categoryId: service.categoryId ?? '',
  }
  formError.value = null
  showModal.value = true
}

function addTag() {
  const t = tagInput.value.trim().toLowerCase()
  if (t && !form.value.tags.includes(t)) form.value.tags.push(t)
  tagInput.value = ''
}

function removeTag(tag: string) {
  form.value.tags = form.value.tags.filter(t => t !== tag)
}

async function handleSubmit() {
  if (!form.value.name.trim() || form.value.price < 0) return
  saving.value = true
  formError.value = null
  try {
    const payload = {
      name: form.value.name.trim(),
      description: form.value.description || undefined,
      price: form.value.price,
      priceUnit: form.value.priceUnit || undefined,
      duration: form.value.duration || undefined,
      image: form.value.image || undefined,
      status: form.value.status,
      tags: form.value.tags,
      categoryId: form.value.categoryId || undefined,
    }
    if (editing.value) {
      await updateService(editing.value.id, payload)
    } else {
      await createService(payload)
    }
    showModal.value = false
  } catch (e: any) {
    formError.value = e?.data?.message ?? 'Error al guardar el servicio'
  } finally {
    saving.value = false
  }
}

function confirmDelete(service: Service) {
  deleteTarget.value = service
}

async function doDelete() {
  if (!deleteTarget.value) return
  saving.value = true
  try {
    await deleteService(deleteTarget.value.id)
    deleteTarget.value = null
  } catch (e: any) {
    error.value = e?.data?.message ?? 'Error al eliminar'
  } finally {
    saving.value = false
  }
}

function confirmToggleStatus(service: Service) {
  toggleTarget.value = service
}

async function doToggleStatus() {
  if (!toggleTarget.value) return
  saving.value = true
  try {
    await toggleServiceStatus(toggleTarget.value.id)
    toggleTarget.value = null
  } catch (e: any) {
    error.value = e?.data?.message ?? 'Error al cambiar estado'
  } finally {
    saving.value = false
  }
}

async function openMetrics(service: Service) {
  metricsTarget.value = service
  metricsData.value = null
  metricsError.value = null
  metricsLoading.value = true
  const { getHeaders, refreshAccessToken } = useAuth()
  const config = useRuntimeConfig()
  const apiUrl = config.public.apiUrl as string
  const fetchMetrics = () => $fetch<{
    views: number
    profileVisits: number
    requests: number
    conversionRate: number
    viewsByDay: { date: string; count: number }[]
  }>(`${apiUrl}/api/services/${service.id}/metrics`, {
    headers: { 'Content-Type': 'application/json', ...getHeaders() },
  })
  try {
    let res = await fetchMetrics().catch(async (err: any) => {
      const status = err?.status ?? err?.statusCode
      if (status === 401) {
        const ok = await refreshAccessToken()
        if (!ok) throw err
        return fetchMetrics()
      }
      throw err
    })
    metricsData.value = res
  } catch (e: any) {
    metricsError.value = e?.data?.message ?? 'No se pudieron cargar las métricas'
  } finally {
    metricsLoading.value = false
  }
}

function closeMetrics() {
  metricsTarget.value = null
  metricsData.value = null
  metricsError.value = null
}

onMounted(async () => {
  await Promise.all([fetchServices(), fetchCatalogCategories()])
})
</script>
