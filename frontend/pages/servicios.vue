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
        <button @click="openModalitiesModal" class="mr-2 px-3 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors flex items-center">
          <svg class="h-4 w-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"/>
          </svg>
          Modalidades
        </button>
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

        <!-- Modalidades -->
        <div v-if="service.modalities?.length" class="flex flex-wrap gap-1">
          <span
            v-for="m in service.modalities"
            :key="m"
            class="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full font-medium"
          >
            {{ { PRESENCIAL: '📍 Presencial', REMOTO: '💻 Remoto', CUALQUIERA: '🤝 Cualquiera' }[m] ?? m }}
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

              <!-- Modalidades -->
              <div>
                <label class="block text-xs font-medium text-gray-700 mb-2">Modalidades que ofreces</label>
                <div class="grid grid-cols-3 gap-2">
                  <button
                    v-for="opt in ALL_MODALITIES"
                    :key="opt.value"
                    type="button"
                    class="flex flex-col items-center gap-1 py-3 px-2 rounded-xl border-2 text-xs font-semibold transition-all"
                    :class="form.modalities.includes(opt.value)
                      ? 'border-red-500 bg-red-50 text-red-700'
                      : 'border-gray-200 text-gray-500 hover:border-gray-300 hover:bg-gray-50'"
                    @click="form.modalities.includes(opt.value)
                      ? form.modalities.splice(form.modalities.indexOf(opt.value), 1)
                      : form.modalities.push(opt.value)"
                  >
                    <span class="text-lg">{{ opt.emoji }}</span>
                    {{ opt.label }}
                  </button>
                </div>
                <p class="mt-1.5 text-xs text-gray-400">Selecciona una o más. Los clientes solo verán las que hayas activado.</p>
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
                    placeholder="Ej: Marca, Modelo, Tipo de máquina..."
                    maxlength="40"
                    class="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-400"
                  />
                  <button
                    type="button"
                    @click="addItemField"
                    class="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-xl text-sm font-medium text-gray-700 transition-colors"
                  >
                    Agregar
                  </button>
                </div>
                <p class="mt-1.5 text-xs text-gray-400">
                  Define qué información pedirás por cada ítem/equipo que el cliente quiera reparar (ej. Marca, Modelo, Tipo de máquina). Déjalo vacío si tu servicio no maneja ítems individuales.
                </p>
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
      <Transition
        enter-active-class="duration-200 ease-out"
        enter-from-class="opacity-0"
        enter-to-class="opacity-100"
        leave-active-class="duration-150 ease-in"
        leave-from-class="opacity-100"
        leave-to-class="opacity-0"
      >
        <div
          v-if="metricsTarget"
          class="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
          @click.self="closeMetrics"
        >
          <div class="absolute inset-0 bg-black/50 backdrop-blur-sm" @click="closeMetrics" />

          <Transition
            enter-active-class="duration-300 ease-out"
            enter-from-class="opacity-0 translate-y-full sm:translate-y-4 sm:scale-95"
            enter-to-class="opacity-100 translate-y-0 sm:scale-100"
            leave-active-class="duration-200 ease-in"
            leave-from-class="opacity-100 translate-y-0 sm:scale-100"
            leave-to-class="opacity-0 translate-y-full sm:translate-y-4 sm:scale-95"
          >
            <div v-if="metricsTarget" class="relative w-full sm:max-w-lg bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl max-h-[92vh] overflow-y-auto">

              <!-- Handle mobile -->
              <div class="flex justify-center pt-3 pb-1 sm:hidden">
                <div class="w-10 h-1 rounded-full bg-gray-200" />
              </div>

              <!-- Header -->
              <div class="px-5 pt-4 pb-3 border-b border-gray-100">
                <div class="flex items-start justify-between gap-3">
                  <div class="flex items-center gap-3 min-w-0">
                    <div class="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center flex-shrink-0">
                      <ChartBarIcon class="h-5 w-5 text-purple-600" />
                    </div>
                    <div class="min-w-0">
                      <h3 class="text-sm font-bold text-gray-900 truncate">{{ metricsTarget.name }}</h3>
                      <div class="flex items-center gap-2 mt-0.5">
                        <span class="text-xs font-medium px-2 py-0.5 rounded-full" :class="SERVICE_STATUS_CLASSES[metricsTarget.status]">
                          {{ SERVICE_STATUS_LABELS[metricsTarget.status] }}
                        </span>
                        <span v-if="metricsTarget.category" class="text-xs text-gray-400 flex items-center gap-1">
                          <span class="w-1.5 h-1.5 rounded-full" :style="{ backgroundColor: metricsTarget.category.color }"></span>
                          {{ metricsTarget.category.name }}
                        </span>
                      </div>
                    </div>
                  </div>
                  <button @click="closeMetrics" class="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0">
                    <XMarkIcon class="h-5 w-5" />
                  </button>
                </div>
              </div>

              <!-- Cuerpo -->
              <div class="px-5 py-4 space-y-4">

                <!-- Skeleton -->
                <div v-if="metricsLoading" class="space-y-3 animate-pulse">
                  <div class="grid grid-cols-2 gap-3">
                    <div v-for="n in 6" :key="n" class="h-20 bg-gray-100 rounded-xl" />
                  </div>
                  <div class="h-28 bg-gray-100 rounded-xl" />
                  <div class="h-16 bg-gray-100 rounded-xl" />
                </div>

                <!-- Error -->
                <div v-else-if="metricsError" class="p-4 bg-red-50 border border-red-100 rounded-xl text-sm text-red-700 flex items-center gap-2">
                  <ExclamationCircleIcon class="h-4 w-4 flex-shrink-0" />
                  {{ metricsError }}
                </div>

                <template v-else-if="metricsData">

                  <!-- KPI grid 3×2 -->
                  <div class="grid grid-cols-3 gap-2.5">
                    <!-- Visualizaciones -->
                    <div class="bg-blue-50 rounded-2xl p-3.5 col-span-1">
                      <div class="flex items-center gap-1 mb-2">
                        <EyeIcon class="h-3.5 w-3.5 text-blue-500" />
                        <p class="text-[10px] text-blue-600 font-semibold uppercase tracking-wide">Vistas</p>
                      </div>
                      <p class="text-2xl font-black text-blue-900 leading-none">{{ metricsData.views }}</p>
                      <p class="text-[10px] text-blue-400 mt-1">históricas totales</p>
                    </div>

                    <!-- Visitas al perfil -->
                    <div class="bg-indigo-50 rounded-2xl p-3.5 col-span-1">
                      <div class="flex items-center gap-1 mb-2">
                        <UserIcon class="h-3.5 w-3.5 text-indigo-500" />
                        <p class="text-[10px] text-indigo-600 font-semibold uppercase tracking-wide">Perfil</p>
                      </div>
                      <p class="text-2xl font-black text-indigo-900 leading-none">{{ metricsData.profileVisits }}</p>
                      <p class="text-[10px] text-indigo-400 mt-1">visitas al perfil</p>
                    </div>

                    <!-- Solicitudes totales -->
                    <div class="bg-green-50 rounded-2xl p-3.5 col-span-1">
                      <div class="flex items-center gap-1 mb-2">
                        <ClipboardDocumentListIcon class="h-3.5 w-3.5 text-green-500" />
                        <p class="text-[10px] text-green-600 font-semibold uppercase tracking-wide">Solicitudes</p>
                      </div>
                      <p class="text-2xl font-black text-green-900 leading-none">{{ metricsData.requests }}</p>
                      <p class="text-[10px] text-green-400 mt-1">totales recibidas</p>
                    </div>

                    <!-- Conversión -->
                    <div class="bg-orange-50 rounded-2xl p-3.5 col-span-1">
                      <div class="flex items-center gap-1 mb-2">
                        <ArrowTrendingUpIcon class="h-3.5 w-3.5 text-orange-500" />
                        <p class="text-[10px] text-orange-600 font-semibold uppercase tracking-wide">Conversión</p>
                      </div>
                      <p class="text-2xl font-black text-orange-900 leading-none">{{ metricsData.conversionRate }}%</p>
                      <p class="text-[10px] text-orange-400 mt-1">vistas → solicitudes</p>
                    </div>

                    <!-- Interés -->
                    <div class="bg-violet-50 rounded-2xl p-3.5 col-span-1">
                      <div class="flex items-center gap-1 mb-2">
                        <SparklesIcon class="h-3.5 w-3.5 text-violet-500" />
                        <p class="text-[10px] text-violet-600 font-semibold uppercase tracking-wide">Interés</p>
                      </div>
                      <p class="text-2xl font-black text-violet-900 leading-none">{{ metricsData.interestRate ?? 0 }}%</p>
                      <p class="text-[10px] text-violet-400 mt-1">vistas → perfil</p>
                    </div>

                    <!-- Solicitudes 30 días -->
                    <div class="bg-rose-50 rounded-2xl p-3.5 col-span-1">
                      <div class="flex items-center gap-1 mb-2">
                        <CalendarDaysIcon class="h-3.5 w-3.5 text-rose-500" />
                        <p class="text-[10px] text-rose-600 font-semibold uppercase tracking-wide">30 días</p>
                      </div>
                      <p class="text-2xl font-black text-rose-900 leading-none">{{ metricsData.requestsLast30 ?? 0 }}</p>
                      <p class="text-[10px] text-rose-400 mt-1">solicitudes recientes</p>
                    </div>
                  </div>

                  <!-- Gráfico de barras — últimos 7 días con tendencia -->
                  <div class="bg-gray-50 rounded-2xl p-4">
                    <div class="flex items-center justify-between mb-3">
                      <p class="text-xs font-semibold text-gray-700">Vistas — últimos 7 días</p>
                      <!-- Badge tendencia -->
                      <div
                        v-if="metricsData.viewsTrend !== undefined"
                        class="flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full"
                        :class="metricsData.viewsTrend > 0
                          ? 'bg-green-100 text-green-700'
                          : metricsData.viewsTrend < 0
                            ? 'bg-red-100 text-red-600'
                            : 'bg-gray-100 text-gray-500'"
                      >
                        <ArrowTrendingUpIcon v-if="metricsData.viewsTrend > 0" class="h-3 w-3" />
                        <ArrowTrendingDownIcon v-else-if="metricsData.viewsTrend < 0" class="h-3 w-3" />
                        <span>{{ metricsData.viewsTrend > 0 ? '+' : '' }}{{ metricsData.viewsTrend }}%</span>
                        <span class="font-normal opacity-70">vs semana anterior</span>
                      </div>
                    </div>

                    <!-- Barras -->
                    <div class="flex items-end gap-1.5 h-16">
                      <template v-for="day in metricsData.viewsByDay" :key="day.date">
                        <div class="flex-1 flex flex-col items-center gap-1 group/bar relative">
                          <!-- Tooltip -->
                          <div class="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-[10px] rounded px-1.5 py-0.5 whitespace-nowrap opacity-0 group-hover/bar:opacity-100 transition-opacity pointer-events-none z-10">
                            {{ day.count }} vista{{ day.count !== 1 ? 's' : '' }}
                          </div>
                          <div
                            class="w-full rounded-t-md transition-all duration-500"
                            :class="day.count > 0 ? 'bg-blue-400 hover:bg-blue-500' : 'bg-gray-200'"
                            :style="{ height: maxDayViews > 0 ? `${Math.max(4, (day.count / maxDayViews) * 52)}px` : '4px' }"
                          />
                          <span class="text-[9px] text-gray-400 leading-none">{{ day.date.slice(5) }}</span>
                        </div>
                      </template>
                    </div>

                    <!-- Alcance semanal -->
                    <p v-if="(metricsData.weeklyReach ?? 0) > 0" class="text-[10px] text-gray-400 text-right mt-2">
                      {{ metricsData.weeklyReach }} vista{{ metricsData.weeklyReach !== 1 ? 's' : '' }} esta semana
                    </p>
                  </div>

                  <!-- Última solicitud recibida -->
                  <div v-if="metricsData.lastRequest" class="flex items-start gap-3 p-3.5 bg-green-50 border border-green-100 rounded-xl">
                    <div class="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0 text-sm font-bold text-green-700">
                      {{ metricsData.lastRequest.clientName[0].toUpperCase() }}
                    </div>
                    <div class="flex-1 min-w-0">
                      <p class="text-xs font-semibold text-gray-800">{{ metricsData.lastRequest.clientName }}</p>
                      <p class="text-[10px] text-gray-500 mt-0.5">
                        Última solicitud · {{ formatMetricsDate(metricsData.lastRequest.date) }}
                        <span v-if="metricsData.lastRequest.modality" class="ml-1">
                          · {{ { PRESENCIAL: '📍 Presencial', REMOTO: '💻 Remoto', CUALQUIERA: '🤝 Cualquiera' }[metricsData.lastRequest.modality] ?? metricsData.lastRequest.modality }}
                        </span>
                      </p>
                    </div>
                  </div>
                  <div v-else class="text-center py-3 text-[11px] text-gray-400">
                    Aún no has recibido solicitudes para este servicio
                  </div>

                  <!-- Consejo contextual -->
                  <div
                    v-if="metricsData.views > 0"
                    class="p-3.5 rounded-xl border text-xs leading-relaxed"
                    :class="metricsData.conversionRate >= 10
                      ? 'bg-green-50 border-green-100 text-green-700'
                      : metricsData.conversionRate >= 3
                        ? 'bg-yellow-50 border-yellow-100 text-yellow-700'
                        : 'bg-orange-50 border-orange-100 text-orange-700'"
                  >
                    <span class="font-semibold block mb-1">
                      {{ metricsData.conversionRate >= 10 ? '🎉 Excelente rendimiento' : metricsData.conversionRate >= 3 ? '📈 Buen avance' : '💡 Oportunidad de mejora' }}
                    </span>
                    {{ metricsData.conversionRate >= 10
                      ? 'Tu anuncio convierte muy bien. Considera subir el precio o añadir más servicios.'
                      : metricsData.conversionRate >= 3
                        ? 'Tu tasa de conversión es razonable. Mejorar las fotos o la descripción puede aumentarla.'
                        : 'Tienes vistas pero pocas solicitudes. Revisa el precio, añade descripción detallada y elige buenas fotos.' }}
                  </div>

                </template>
              </div>
            </div>
          </Transition>
        </div>
      </Transition>
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

    <!-- Modalidades management modal -->
    <Teleport to="body">
      <div
        v-if="showModalitiesModal"
        class="fixed inset-0 z-50 flex items-center justify-center p-4"
        @click.self="showModalitiesModal = false"
      >
        <div class="absolute inset-0 bg-black/40 backdrop-blur-sm"></div>
        <div class="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6">
          <div class="flex items-center justify-between mb-6">
            <h2 class="text-lg font-semibold text-gray-900">Gestionar Modalidades</h2>
            <button @click="showModalitiesModal = false" class="p-1 text-gray-400 hover:text-gray-600">
              <XMarkIcon class="h-5 w-5" />
            </button>
          </div>

          <!-- Nueva modalidad -->
          <div class="mb-6 p-4 bg-gray-50 rounded-xl">
            <h3 class="text-sm font-semibold text-gray-700 mb-3">Nueva Modalidad</h3>
            <div class="grid grid-cols-4 gap-3">
              <input
                v-model="newModality.name"
                type="text"
                placeholder="Nombre (ej: Presencial)"
                class="col-span-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500/20"
              />
              <input
                v-model="newModality.value"
                type="text"
                placeholder="Valor (ej: PRESENCIAL)"
                class="col-span-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500/20"
              />
              <input
                v-model="newModality.emoji"
                type="text"
                placeholder="Emoji (ej: 📍)"
                maxlength="2"
                class="col-span-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500/20"
              />
              <button
                @click="addModality"
                :disabled="!newModality.name || !newModality.value"
                class="col-span-1 px-3 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Agregar
              </button>
            </div>
          </div>

          <!-- Lista de modalidades -->
          <div class="space-y-2">
            <div
              v-for="modality in modalities"
              :key="modality.id"
              class="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50"
            >
              <div class="flex items-center gap-3">
                <span class="text-2xl">{{ modality.emoji || '📋' }}</span>
                <div>
                  <p class="font-medium text-gray-900">{{ modality.name }}</p>
                  <p class="text-xs text-gray-500">{{ modality.value }}</p>
                </div>
              </div>
              <div class="flex items-center gap-2">
                <button
                  @click="toggleModalityActive(modality)"
                  class="px-2 py-1 text-xs font-medium rounded"
                  :class="modality.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'"
                >
                  {{ modality.isActive ? 'Activo' : 'Inactivo' }}
                </button>
                <button
                  @click="deleteModality(modality.id)"
                  class="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  title="Eliminar"
                >
                  <TrashIcon class="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>

          <p class="mt-4 text-xs text-gray-500">
            Las modalidades activas aparecerán en el formulario de solicitud de servicios.
          </p>
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
  ArrowTrendingDownIcon,
  ClipboardDocumentListIcon,
  SparklesIcon,
  CalendarDaysIcon,
  ExclamationCircleIcon,
} from '@heroicons/vue/24/outline'
import PageHeader from '~/components/ui/PageHeader.vue'
import { useServicios, SERVICE_STATUS_LABELS, SERVICE_STATUS_CLASSES, type Service, type ServiceModality } from '~/composables/useServicios'

definePageMeta({ middleware: 'auth' })

const {
  services,
  catalogCategories,
  modalities,
  loading,
  error,
  stats,
  fetchServices,
  fetchCatalogCategories,
  fetchModalities,
  createService,
  updateService,
  toggleStatus: toggleServiceStatus,
  deleteService,
  createModality,
  updateModality,
  deleteModality: deleteModalityFn,
} = useServicios()

const search = ref('')
const filterStatus = ref('')
const showModal = ref(false)
const showModalitiesModal = ref(false)
const editing = ref<Service | null>(null)
const deleteTarget = ref<Service | null>(null)
const toggleTarget = ref<Service | null>(null)
const metricsTarget = ref<Service | null>(null)
const metricsData = ref<{
  views: number
  profileVisits: number
  requests: number
  conversionRate: number
  interestRate: number
  weeklyReach: number
  viewsTrend: number
  requestsLast30: number
  lastRequest: { date: string; clientName: string; modality: string } | null
  viewsByDay: { date: string; count: number }[]
} | null>(null)
const metricsLoading = ref(false)
const metricsError = ref<string | null>(null)
const saving = ref(false)
const formError = ref<string | null>(null)
const tagInput = ref('')
const newModality = ref({ name: '', value: '', emoji: '' })

const ALL_MODALITIES = [
  { value: 'PRESENCIAL', label: 'Presencial', emoji: '📍' },
  { value: 'REMOTO', label: 'Remoto', emoji: '💻' },
  { value: 'CUALQUIERA', label: 'Cualquiera', emoji: '🤝' },
]

const emptyForm = () => ({
  name: '',
  description: '',
  price: 0,
  priceUnit: '',
  duration: undefined as number | undefined,
  image: '',
  status: 'ACTIVO' as Service['status'],
  tags: [] as string[],
  modalities: [] as string[],
  itemFields: [] as string[],
  categoryId: '',
})

const form = ref(emptyForm())
const itemFieldInput = ref('')

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
    modalities: [...(service.modalities ?? [])],
    itemFields: [...(service.itemFields ?? [])],
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

function addItemField() {
  const f = itemFieldInput.value.trim()
  if (f && !form.value.itemFields.includes(f) && form.value.itemFields.length < 10) form.value.itemFields.push(f)
  itemFieldInput.value = ''
}

function removeItemField(field: string) {
  form.value.itemFields = form.value.itemFields.filter(f => f !== field)
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
      modalities: form.value.modalities,
      itemFields: form.value.itemFields,
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
    error.value = e?.message ?? 'Error al cambiar estado'
  } finally {
    saving.value = false
  }
}

async function openMetrics(service: Service) {
  metricsTarget.value = service
  metricsData.value = null
  metricsError.value = null
  metricsLoading.value = true
  const { get } = useApi()
  try {
    metricsData.value = await get<{
      views: number
      profileVisits: number
      requests: number
      conversionRate: number
      viewsByDay: { date: string; count: number }[]
    }>(`/services/${service.id}/metrics`)
  } catch (e: any) {
    metricsError.value = e?.message ?? 'No se pudieron cargar las métricas'
  } finally {
    metricsLoading.value = false
  }
}

function closeMetrics() {
  metricsTarget.value = null
  metricsData.value = null
  metricsError.value = null
}

function formatMetricsDate(iso: string) {
  return new Date(iso).toLocaleDateString('es-CO', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
}

function openModalitiesModal() {
  showModalitiesModal.value = true
  fetchModalities()
}

async function addModality() {
  if (!newModality.value.name || !newModality.value.value) return
  try {
    await createModality({
      name: newModality.value.name,
      value: newModality.value.value,
      emoji: newModality.value.emoji,
      sortOrder: modalities.value.length,
    })
    newModality.value = { name: '', value: '', emoji: '' }
  } catch (e: any) {
    error.value = e?.data?.message ?? 'Error al crear modalidad'
  }
}

async function toggleModalityActive(modality: ServiceModality) {
  try {
    await updateModality(modality.id, { isActive: !modality.isActive })
  } catch (e: any) {
    error.value = e?.data?.message ?? 'Error al actualizar modalidad'
  }
}

async function deleteModality(id: string) {
  if (!confirm('¿Estás seguro de eliminar esta modalidad?')) return
  try {
    await deleteModalityFn(id)
  } catch (e: any) {
    error.value = e?.data?.message ?? 'Error al eliminar modalidad'
  }
}

onMounted(async () => {
  await Promise.all([fetchServices(), fetchCatalogCategories()])
})
</script>
