<template>
  <div class="p-6 max-w-5xl mx-auto space-y-8">

    <!-- Header -->
    <PageHeader
      title="Contenido de la Landing"
      description="Gestiona estadísticas, testimonios, funciones y pasos que se muestran en la página principal."
      :icon="HomeIcon"
      :breadcrumb="[{ label: 'Landing' }]"
      :stats="headerStats"
    />

    <!-- ─── Estadísticas públicas ──────────────────────────────────────────── -->
    <div class="bg-white rounded-2xl border border-gray-200 shadow-sm">
      <div class="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
        <h2 class="font-bold text-gray-900">Estadísticas públicas</h2>
        <button
          @click="saveStats"
          :disabled="savingStats"
          class="text-sm font-semibold bg-workplace-red text-white px-4 py-2 rounded-lg hover:bg-red-700 disabled:opacity-60 transition-colors"
        >
          {{ savingStats ? 'Guardando…' : 'Guardar todo' }}
        </button>
      </div>

      <div class="divide-y divide-gray-50">
        <div
          v-for="stat in editableStats"
          :key="stat.key"
          class="px-6 py-4 grid grid-cols-3 gap-4 items-center"
        >
          <div>
            <p class="text-xs text-gray-400 font-medium mb-1">Clave</p>
            <code class="text-sm text-gray-600 bg-gray-50 px-2 py-0.5 rounded">{{ stat.key }}</code>
          </div>
          <div>
            <p class="text-xs text-gray-400 font-medium mb-1">Etiqueta</p>
            <input
              v-model="stat.label"
              class="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-200"
            />
          </div>
          <div>
            <p class="text-xs text-gray-400 font-medium mb-1">
              Valor
              <span v-if="stat.isDynamic" class="ml-1 text-green-600 font-semibold">(automático)</span>
            </p>
            <div class="flex items-center gap-2">
              <input
                v-model="stat.value"
                :disabled="stat.isDynamic"
                class="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-200 disabled:bg-gray-50 disabled:text-gray-400"
              />
              <button
                @click="stat.isDynamic = !stat.isDynamic"
                class="text-xs px-2 py-1.5 rounded border border-gray-200 hover:border-gray-300 text-gray-500 whitespace-nowrap"
                :title="stat.isDynamic ? 'Cambiar a valor manual' : 'Calcular automáticamente'"
              >
                {{ stat.isDynamic ? 'Manual' : 'Auto' }}
              </button>
            </div>
          </div>
        </div>

        <div v-if="editableStats.length === 0" class="px-6 py-10 text-center text-sm text-gray-400">
          No hay estadísticas configuradas. Se usarán los valores por defecto.
        </div>
      </div>

      <!-- Add stat -->
      <div class="px-6 py-4 border-t border-gray-100 flex items-center gap-3">
        <input v-model="newStatKey" placeholder="clave (ej: restaurants)" class="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-200 w-40" />
        <input v-model="newStatLabel" placeholder="Etiqueta" class="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-200 flex-1" />
        <input v-model="newStatValue" placeholder="Valor (ej: 500+)" class="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-200 w-28" />
        <button
          @click="addStat"
          :disabled="!newStatKey || !newStatLabel"
          class="text-sm font-semibold border border-gray-200 px-4 py-2 rounded-lg hover:bg-gray-50 disabled:opacity-50"
        >
          Agregar
        </button>
      </div>
    </div>

    <!-- ─── Reseñas reportadas ─────────────────────────────────────────────── -->
    <div class="bg-white rounded-2xl border border-gray-200 shadow-sm">
      <div class="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
        <h2 class="font-bold text-gray-900">Reseñas reportadas</h2>
        <span v-if="reportedReviews.length > 0" class="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-600">
          {{ reportedReviews.length }} pendiente{{ reportedReviews.length === 1 ? '' : 's' }}
        </span>
      </div>

      <div v-if="loadingReports" class="px-6 py-10 text-center text-sm text-gray-400">Cargando…</div>

      <div v-else class="divide-y divide-gray-50">
        <div v-for="report in reportedReviews" :key="report.id" class="px-6 py-4 space-y-2">
          <div class="flex items-center justify-between">
            <p class="text-sm text-gray-700">
              <span class="font-bold">{{ report.review.author.firstName }} {{ report.review.author.lastName }}</span>
              reseñó a
              <span class="font-bold">{{ report.review.target.firstName }} {{ report.review.target.lastName }}</span>
              — {{ report.review.rating }}★
              <span v-if="report.review.isHidden" class="ml-1 text-xs font-semibold text-gray-400">(oculta)</span>
            </p>
          </div>
          <p v-if="report.review.comment" class="text-sm text-gray-500 italic">"{{ report.review.comment }}"</p>
          <p class="text-xs text-gray-400">Motivo del reporte: {{ report.reason }}</p>
          <div class="flex gap-2 pt-1">
            <button
              v-if="!report.review.isHidden"
              @click="moderate(report.review.id, 'HIDE')"
              class="text-xs font-semibold border border-gray-200 px-3 py-1.5 rounded-lg hover:bg-gray-50"
            >
              Ocultar reseña
            </button>
            <button
              v-else
              @click="moderate(report.review.id, 'RESTORE')"
              class="text-xs font-semibold border border-gray-200 px-3 py-1.5 rounded-lg hover:bg-gray-50"
            >
              Restaurar reseña
            </button>
            <button
              @click="moderate(report.review.id, 'DISMISS_REPORTS')"
              class="text-xs font-semibold text-gray-500 px-3 py-1.5 rounded-lg hover:bg-gray-50"
            >
              Descartar reporte
            </button>
          </div>
        </div>

        <div v-if="reportedReviews.length === 0 && !loadingReports" class="px-6 py-10 text-center text-sm text-gray-400">
          No hay reseñas reportadas pendientes.
        </div>
      </div>
    </div>

    <!-- ─── Reportes de usuarios (pedidos, servicios, app general) ───────────── -->
    <div class="bg-white rounded-2xl border border-gray-200 shadow-sm">
      <div class="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
        <h2 class="font-bold text-gray-900">Reportes de usuarios</h2>
        <div class="flex items-center gap-2">
          <select v-model="reportStatusFilter" class="text-xs border border-gray-200 rounded-lg px-2 py-1.5" @change="loadUserReports">
            <option value="">Todos</option>
            <option value="PENDING">Pendientes</option>
            <option value="IN_REVIEW">En revisión</option>
            <option value="RESOLVED">Resueltos</option>
            <option value="DISMISSED">Descartados</option>
          </select>
        </div>
      </div>

      <div v-if="loadingUserReports" class="px-6 py-10 text-center text-sm text-gray-400">Cargando…</div>

      <div v-else class="divide-y divide-gray-50">
        <div v-for="r in userReports" :key="r.id" class="px-6 py-4 space-y-2">
          <div class="flex items-center justify-between gap-3">
            <p class="text-sm text-gray-700">
              <span class="font-bold">{{ r.reporter.firstName }} {{ r.reporter.lastName }}</span>
              reportó
              <span class="font-semibold">{{ ENTITY_TYPE_LABELS[r.entityType] }}</span>
            </p>
            <span class="text-xs font-semibold px-2 py-0.5 rounded-full" :class="REPORT_STATUS_CLASSES[r.status]">
              {{ REPORT_STATUS_LABELS[r.status] }}
            </span>
          </div>
          <p class="text-sm text-gray-900 font-medium">{{ r.reason }}</p>
          <p v-if="r.description" class="text-sm text-gray-500 italic">"{{ r.description }}"</p>
          <p v-if="r.adminNotes" class="text-xs text-gray-400">Nota interna: {{ r.adminNotes }}</p>

          <div v-if="r.status === 'PENDING' || r.status === 'IN_REVIEW'" class="flex gap-2 pt-1">
            <button
              v-if="r.status === 'PENDING'"
              @click="moderateUserReport(r.id, 'IN_REVIEW')"
              class="text-xs font-semibold border border-gray-200 px-3 py-1.5 rounded-lg hover:bg-gray-50"
            >
              Marcar en revisión
            </button>
            <button
              @click="moderateUserReport(r.id, 'RESOLVED')"
              class="text-xs font-semibold bg-green-600 text-white px-3 py-1.5 rounded-lg hover:bg-green-700"
            >
              Marcar resuelto
            </button>
            <button
              @click="moderateUserReport(r.id, 'DISMISSED')"
              class="text-xs font-semibold text-gray-500 px-3 py-1.5 rounded-lg hover:bg-gray-50"
            >
              Descartar
            </button>
          </div>
        </div>

        <div v-if="userReports.length === 0 && !loadingUserReports" class="px-6 py-10 text-center text-sm text-gray-400">
          No hay reportes de usuarios.
        </div>
      </div>
    </div>

    <!-- ─── Testimonios ────────────────────────────────────────────────────── -->
    <div class="bg-white rounded-2xl border border-gray-200 shadow-sm">
      <div class="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
        <h2 class="font-bold text-gray-900">Testimonios</h2>
        <div class="flex items-center gap-2">
          <button
            @click="showCandidatesModal = true; loadReviewCandidates()"
            class="text-sm font-semibold border border-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Crear desde reseña verificada
          </button>
          <button
            @click="openTestimonialModal(null)"
            class="text-sm font-semibold bg-workplace-red text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
          >
            + Nuevo
          </button>
        </div>
      </div>

      <div v-if="loadingTestimonials" class="px-6 py-10 text-center text-sm text-gray-400">Cargando…</div>

      <div v-else class="divide-y divide-gray-50">
        <div
          v-for="(t, idx) in testimonials"
          :key="t.id"
          class="px-6 py-4 flex items-start gap-4"
        >
          <!-- Reorder -->
          <div class="flex flex-col gap-0.5 flex-shrink-0">
            <button
              :disabled="idx === 0"
              @click="moveTestimonial(idx, -1)"
              class="p-0.5 text-gray-300 hover:text-gray-600 disabled:opacity-30 disabled:hover:text-gray-300"
            >
              <ChevronUpIcon class="w-4 h-4" />
            </button>
            <button
              :disabled="idx === testimonials.length - 1"
              @click="moveTestimonial(idx, 1)"
              class="p-0.5 text-gray-300 hover:text-gray-600 disabled:opacity-30 disabled:hover:text-gray-300"
            >
              <ChevronDownIcon class="w-4 h-4" />
            </button>
          </div>

          <!-- Avatar preview -->
          <div
            class="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
            :style="{ backgroundColor: t.avatarColor }"
          >
            {{ t.initials }}
          </div>

          <div class="flex-1 min-w-0">
            <p class="text-sm font-bold text-gray-900">
              {{ t.name }} <span class="font-normal text-gray-400 text-xs">— {{ t.role }}</span>
              <span v-if="t.sourceReviewId" class="ml-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-green-50 text-green-600" title="Originado de una reseña real verificada">
                ✓ Verificado
              </span>
            </p>
            <p class="text-sm text-gray-500 mt-1 line-clamp-2 italic">"{{ t.quote }}"</p>
            <p class="text-[11px] text-gray-400 mt-1">Creado el {{ formatTestimonialDate(t.createdAt) }}</p>
          </div>

          <div class="flex items-center gap-2 flex-shrink-0">
            <span
              class="text-xs font-semibold px-2 py-0.5 rounded-full"
              :class="t.isActive ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-gray-400'"
            >
              {{ t.isActive ? 'Activo' : 'Oculto' }}
            </span>
            <button @click="openTestimonialModal(t)" class="p-1.5 text-gray-400 hover:text-gray-600 rounded">
              <PencilIcon class="w-4 h-4" />
            </button>
            <button @click="deleteTestimonial(t.id)" class="p-1.5 text-gray-400 hover:text-red-500 rounded">
              <TrashIcon class="w-4 h-4" />
            </button>
          </div>
        </div>

        <div v-if="testimonials.length === 0 && !loadingTestimonials" class="px-6 py-10 text-center text-sm text-gray-400">
          No hay testimonios. Crea el primero.
        </div>
      </div>
    </div>

    <!-- ─── Funciones ──────────────────────────────────────────────────────── -->
    <div class="bg-white rounded-2xl border border-gray-200 shadow-sm">
      <div class="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
        <h2 class="font-bold text-gray-900">Funciones</h2>
        <button
          @click="openFeatureModal(null)"
          class="text-sm font-semibold bg-workplace-red text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
        >
          + Nueva
        </button>
      </div>

      <div v-if="loadingFeatures" class="px-6 py-10 text-center text-sm text-gray-400">Cargando…</div>

      <div v-else class="divide-y divide-gray-50">
        <div
          v-for="f in features"
          :key="f.id"
          class="px-6 py-4 flex items-start gap-4"
        >
          <div :class="['w-10 h-10 rounded-xl flex items-center justify-center text-white text-xs font-bold flex-shrink-0', f.bg]">
            {{ f.icon.replace('Icon', '').slice(0, 2) }}
          </div>

          <div class="flex-1 min-w-0">
            <p class="text-sm font-bold text-gray-900">{{ f.title }}</p>
            <p class="text-sm text-gray-500 mt-1 line-clamp-2">{{ f.description }}</p>
          </div>

          <div class="flex items-center gap-2 flex-shrink-0">
            <span
              class="text-xs font-semibold px-2 py-0.5 rounded-full"
              :class="f.isActive ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-gray-400'"
            >
              {{ f.isActive ? 'Activo' : 'Oculto' }}
            </span>
            <button @click="openFeatureModal(f)" class="p-1.5 text-gray-400 hover:text-gray-600 rounded">
              <PencilIcon class="w-4 h-4" />
            </button>
            <button @click="deleteFeature(f.id)" class="p-1.5 text-gray-400 hover:text-red-500 rounded">
              <TrashIcon class="w-4 h-4" />
            </button>
          </div>
        </div>

        <div v-if="features.length === 0 && !loadingFeatures" class="px-6 py-10 text-center text-sm text-gray-400">
          No hay funciones configuradas. Crea la primera.
        </div>
      </div>
    </div>

    <!-- ─── Cómo funciona ──────────────────────────────────────────────────── -->
    <div class="bg-white rounded-2xl border border-gray-200 shadow-sm">
      <div class="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
        <h2 class="font-bold text-gray-900">Cómo funciona</h2>
        <button
          @click="openStepModal(null)"
          class="text-sm font-semibold bg-workplace-red text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
        >
          + Nuevo
        </button>
      </div>

      <div v-if="loadingSteps" class="px-6 py-10 text-center text-sm text-gray-400">Cargando…</div>

      <div v-else class="divide-y divide-gray-50">
        <div
          v-for="(s, idx) in steps"
          :key="s.id"
          class="px-6 py-4 flex items-start gap-4"
        >
          <div class="w-10 h-10 rounded-xl bg-red-50 border border-red-100 flex items-center justify-center text-workplace-red text-sm font-black flex-shrink-0">
            {{ idx + 1 }}
          </div>

          <div class="flex-1 min-w-0">
            <p class="text-sm font-bold text-gray-900">{{ s.title }}</p>
            <p class="text-sm text-gray-500 mt-1 line-clamp-2">{{ s.desc }}</p>
          </div>

          <div class="flex items-center gap-2 flex-shrink-0">
            <span
              class="text-xs font-semibold px-2 py-0.5 rounded-full"
              :class="s.isActive ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-gray-400'"
            >
              {{ s.isActive ? 'Activo' : 'Oculto' }}
            </span>
            <button @click="openStepModal(s)" class="p-1.5 text-gray-400 hover:text-gray-600 rounded">
              <PencilIcon class="w-4 h-4" />
            </button>
            <button @click="deleteStep(s.id)" class="p-1.5 text-gray-400 hover:text-red-500 rounded">
              <TrashIcon class="w-4 h-4" />
            </button>
          </div>
        </div>

        <div v-if="steps.length === 0 && !loadingSteps" class="px-6 py-10 text-center text-sm text-gray-400">
          No hay pasos configurados. Crea el primero.
        </div>
      </div>
    </div>

    <!-- ─── Modal Candidatos a testimonio (reseñas verificadas) ──────────────── -->
    <Teleport to="body">
      <div v-if="showCandidatesModal" class="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div class="absolute inset-0 bg-black/40 backdrop-blur-sm" @click="showCandidatesModal = false" />
        <div class="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          <h3 class="font-black text-gray-900 text-lg">Reseñas verificadas con buen rating</h3>
          <p class="text-sm text-gray-500">Solo se muestran reseñas de 4-5★ con comentario, originadas en una compra o servicio real, aún no usadas como testimonio.</p>

          <div v-if="loadingCandidates" class="text-center text-sm text-gray-400 py-6">Cargando…</div>
          <div v-else-if="reviewCandidates.length === 0" class="text-center text-sm text-gray-400 py-6">
            No hay reseñas verificadas disponibles por ahora.
          </div>
          <div v-else class="space-y-2">
            <div v-for="c in reviewCandidates" :key="c.id" class="border border-gray-100 rounded-xl p-3 flex items-start justify-between gap-3">
              <div class="min-w-0">
                <p class="text-sm font-bold text-gray-900">{{ c.author.firstName }} {{ c.author.lastName }} <span class="text-amber-500">{{ '★'.repeat(c.rating) }}</span></p>
                <p class="text-sm text-gray-500 italic line-clamp-2">"{{ c.comment }}"</p>
              </div>
              <button
                @click="useAsTestimonial(c.id)"
                :disabled="creatingFromReview === c.id"
                class="text-xs font-semibold bg-workplace-red text-white px-3 py-1.5 rounded-lg disabled:opacity-50 flex-shrink-0"
              >
                {{ creatingFromReview === c.id ? 'Creando…' : 'Usar' }}
              </button>
            </div>
          </div>

          <button @click="showCandidatesModal = false" class="w-full border border-gray-200 text-gray-700 font-semibold py-2.5 rounded-xl hover:bg-gray-50 text-sm">
            Cerrar
          </button>
        </div>
      </div>
    </Teleport>

    <!-- ─── Modal Testimonio ───────────────────────────────────────────────── -->
    <Teleport to="body">
      <div v-if="showModal" class="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div class="absolute inset-0 bg-black/40 backdrop-blur-sm" @click="showModal = false" />
        <div class="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 space-y-4">
          <h3 class="font-black text-gray-900 text-lg">{{ editingId ? 'Editar testimonio' : 'Nuevo testimonio' }}</h3>

          <div class="space-y-3">
            <div>
              <label class="text-xs font-semibold text-gray-500 uppercase tracking-wide">Cita</label>
              <textarea v-model="form.quote" rows="3" class="mt-1 w-full text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-200 resize-none" placeholder="Escribe el testimonio…" />
            </div>
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="text-xs font-semibold text-gray-500 uppercase tracking-wide">Nombre</label>
                <input v-model="form.name" class="mt-1 w-full text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-200" />
              </div>
              <div>
                <label class="text-xs font-semibold text-gray-500 uppercase tracking-wide">Cargo / Restaurante</label>
                <input v-model="form.role" class="mt-1 w-full text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-200" />
              </div>
            </div>
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="text-xs font-semibold text-gray-500 uppercase tracking-wide">Iniciales (auto)</label>
                <input v-model="form.initials" placeholder="Ej: LM" class="mt-1 w-full text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-200" />
              </div>
              <div>
                <label class="text-xs font-semibold text-gray-500 uppercase tracking-wide">Color avatar</label>
                <div class="mt-1 flex items-center gap-2">
                  <input type="color" v-model="form.avatarColor" class="w-10 h-9 rounded border border-gray-200 cursor-pointer p-0.5" />
                  <input v-model="form.avatarColor" class="flex-1 text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-200" />
                </div>
              </div>
            </div>
            <div class="flex items-center gap-2">
              <input type="checkbox" id="isActive" v-model="form.isActive" class="rounded" />
              <label for="isActive" class="text-sm text-gray-700">Mostrar en landing</label>
            </div>
          </div>

          <div class="flex gap-3 pt-2">
            <button @click="showModal = false" class="flex-1 border border-gray-200 text-gray-700 font-semibold py-2.5 rounded-xl hover:bg-gray-50 text-sm">
              Cancelar
            </button>
            <button
              @click="saveTestimonial"
              :disabled="savingModal || !form.quote || !form.name"
              class="flex-1 bg-workplace-red text-white font-semibold py-2.5 rounded-xl hover:bg-red-700 disabled:opacity-60 text-sm"
            >
              {{ savingModal ? 'Guardando…' : (editingId ? 'Actualizar' : 'Crear') }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- ─── Modal Función ──────────────────────────────────────────────────── -->
    <Teleport to="body">
      <div v-if="showFeatureModal" class="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div class="absolute inset-0 bg-black/40 backdrop-blur-sm" @click="showFeatureModal = false" />
        <div class="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 space-y-4">
          <h3 class="font-black text-gray-900 text-lg">{{ editingFeatureId ? 'Editar función' : 'Nueva función' }}</h3>

          <div class="space-y-3">
            <div>
              <label class="text-xs font-semibold text-gray-500 uppercase tracking-wide">Título</label>
              <input v-model="featureForm.title" class="mt-1 w-full text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-200" placeholder="Ej: Gestión de Pedidos" />
            </div>
            <div>
              <label class="text-xs font-semibold text-gray-500 uppercase tracking-wide">Descripción</label>
              <textarea v-model="featureForm.description" rows="3" class="mt-1 w-full text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-200 resize-none" />
            </div>
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="text-xs font-semibold text-gray-500 uppercase tracking-wide">Ícono</label>
                <select v-model="featureForm.icon" class="mt-1 w-full text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-200">
                  <option v-for="i in ICON_OPTIONS" :key="i" :value="i">{{ i }}</option>
                </select>
              </div>
              <div>
                <label class="text-xs font-semibold text-gray-500 uppercase tracking-wide">Color de fondo</label>
                <select v-model="featureForm.bg" class="mt-1 w-full text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-200">
                  <option v-for="b in BG_OPTIONS" :key="b" :value="b">{{ b }}</option>
                </select>
              </div>
            </div>
            <div class="flex items-center gap-2">
              <input type="checkbox" id="featureIsActive" v-model="featureForm.isActive" class="rounded" />
              <label for="featureIsActive" class="text-sm text-gray-700">Mostrar en landing</label>
            </div>
          </div>

          <div class="flex gap-3 pt-2">
            <button @click="showFeatureModal = false" class="flex-1 border border-gray-200 text-gray-700 font-semibold py-2.5 rounded-xl hover:bg-gray-50 text-sm">
              Cancelar
            </button>
            <button
              @click="saveFeature"
              :disabled="savingFeatureModal || !featureForm.title || !featureForm.description"
              class="flex-1 bg-workplace-red text-white font-semibold py-2.5 rounded-xl hover:bg-red-700 disabled:opacity-60 text-sm"
            >
              {{ savingFeatureModal ? 'Guardando…' : (editingFeatureId ? 'Actualizar' : 'Crear') }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- ─── Modal Paso ─────────────────────────────────────────────────────── -->
    <Teleport to="body">
      <div v-if="showStepModal" class="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div class="absolute inset-0 bg-black/40 backdrop-blur-sm" @click="showStepModal = false" />
        <div class="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 space-y-4">
          <h3 class="font-black text-gray-900 text-lg">{{ editingStepId ? 'Editar paso' : 'Nuevo paso' }}</h3>

          <div class="space-y-3">
            <div>
              <label class="text-xs font-semibold text-gray-500 uppercase tracking-wide">Título</label>
              <input v-model="stepForm.title" class="mt-1 w-full text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-200" placeholder="Ej: Crea tu cuenta" />
            </div>
            <div>
              <label class="text-xs font-semibold text-gray-500 uppercase tracking-wide">Descripción</label>
              <textarea v-model="stepForm.desc" rows="3" class="mt-1 w-full text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-200 resize-none" />
            </div>
            <div>
              <label class="text-xs font-semibold text-gray-500 uppercase tracking-wide">Ícono</label>
              <select v-model="stepForm.icon" class="mt-1 w-full text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-200">
                <option v-for="i in ICON_OPTIONS" :key="i" :value="i">{{ i }}</option>
              </select>
            </div>
            <div class="flex items-center gap-2">
              <input type="checkbox" id="stepIsActive" v-model="stepForm.isActive" class="rounded" />
              <label for="stepIsActive" class="text-sm text-gray-700">Mostrar en landing</label>
            </div>
          </div>

          <div class="flex gap-3 pt-2">
            <button @click="showStepModal = false" class="flex-1 border border-gray-200 text-gray-700 font-semibold py-2.5 rounded-xl hover:bg-gray-50 text-sm">
              Cancelar
            </button>
            <button
              @click="saveStep"
              :disabled="savingStepModal || !stepForm.title || !stepForm.desc"
              class="flex-1 bg-workplace-red text-white font-semibold py-2.5 rounded-xl hover:bg-red-700 disabled:opacity-60 text-sm"
            >
              {{ savingStepModal ? 'Guardando…' : (editingStepId ? 'Actualizar' : 'Crear') }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>

  </div>
</template>

<script setup lang="ts">
import { PencilIcon, TrashIcon, ChevronUpIcon, ChevronDownIcon, HomeIcon } from '@heroicons/vue/24/outline'
import { useApi } from '~/composables/useApi'
import PageHeader from '~/components/ui/PageHeader.vue'

definePageMeta({ middleware: ['auth'] })

interface ReportedReview {
  id: string
  reason: string
  review: {
    id: string
    rating: number
    comment?: string
    isHidden: boolean
    author: { firstName: string; lastName: string }
    target: { firstName: string; lastName: string }
  }
}

interface UserReport {
  id: string
  entityType: 'CATALOG_ORDER' | 'SERVICE_REQUEST' | 'ORDER' | 'GENERAL'
  reason: string
  description?: string
  status: 'PENDING' | 'IN_REVIEW' | 'RESOLVED' | 'DISMISSED'
  adminNotes?: string
  reporter: { firstName: string; lastName: string }
  createdAt: string
}

interface Testimonial {
  id: string
  quote: string
  name: string
  role: string
  initials: string
  avatarColor: string
  isActive: boolean
  sortOrder: number
  sourceReviewId?: string | null
  createdAt: string
}

interface ReviewCandidate {
  id: string
  rating: number
  comment: string
  author: { firstName: string; lastName: string }
}

interface AdminStat {
  id?: string
  key: string
  label: string
  value: string
  isDynamic: boolean
  sortOrder: number
}

interface Feature {
  id: string
  title: string
  description: string
  icon: string
  bg: string
  isActive: boolean
  sortOrder: number
}

interface Step {
  id: string
  title: string
  desc: string
  icon: string
  isActive: boolean
  sortOrder: number
}

function formatTestimonialDate(dateStr: string) {
  return new Date(dateStr).toLocaleString('es-CO', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

// El guard de rol (SUPERADMIN/ADMIN) vive en middleware/auth.ts (ADMIN_ONLY_ROUTES)

// ─── Stats ────────────────────────────────────────────────────────────────────
const editableStats = ref<AdminStat[]>([])
const savingStats = ref(false)
const newStatKey = ref('')
const newStatLabel = ref('')
const newStatValue = ref('')

async function loadStats() {
  try {
    const { get } = useApi()
    editableStats.value = await get<AdminStat[]>('/landing/admin/stats')
  } catch {}
}

async function saveStats() {
  savingStats.value = true
  try {
    const { patch } = useApi()
    await Promise.all(
      editableStats.value.map((s) =>
        patch(`/landing/admin/stats/${s.key}`, { label: s.label, value: s.value, isDynamic: s.isDynamic }),
      ),
    )
  } finally {
    savingStats.value = false
  }
}

async function addStat() {
  if (!newStatKey.value || !newStatLabel.value) return
  editableStats.value.push({
    key: newStatKey.value.trim(),
    label: newStatLabel.value.trim(),
    value: newStatValue.value.trim(),
    isDynamic: false,
    sortOrder: editableStats.value.length,
  })
  newStatKey.value = ''
  newStatLabel.value = ''
  newStatValue.value = ''
}

// ─── Reseñas reportadas ─────────────────────────────────────────────────────
const reportedReviews = ref<ReportedReview[]>([])
const loadingReports = ref(false)

async function loadReportedReviews() {
  loadingReports.value = true
  try {
    const { get } = useApi()
    reportedReviews.value = await get<ReportedReview[]>('/profiles/admin/reviews/reported')
  } finally {
    loadingReports.value = false
  }
}

async function moderate(reviewId: string, action: 'HIDE' | 'RESTORE' | 'DISMISS_REPORTS') {
  const { patch } = useApi()
  await patch(`/profiles/admin/reviews/${reviewId}/moderate`, { action })
  await loadReportedReviews()
}

// ─── Reportes de usuarios (pedidos, servicios, app general) ────────────────
const userReports = ref<UserReport[]>([])
const loadingUserReports = ref(false)
const reportStatusFilter = ref('')

const ENTITY_TYPE_LABELS: Record<UserReport['entityType'], string> = {
  CATALOG_ORDER: 'un pedido de catálogo',
  SERVICE_REQUEST: 'una solicitud de servicio',
  ORDER: 'un pedido de restaurante',
  GENERAL: 'un problema general de la app',
}

const REPORT_STATUS_LABELS: Record<UserReport['status'], string> = {
  PENDING: 'Pendiente',
  IN_REVIEW: 'En revisión',
  RESOLVED: 'Resuelto',
  DISMISSED: 'Descartado',
}

const REPORT_STATUS_CLASSES: Record<UserReport['status'], string> = {
  PENDING: 'bg-yellow-50 text-yellow-700',
  IN_REVIEW: 'bg-blue-50 text-blue-700',
  RESOLVED: 'bg-green-50 text-green-700',
  DISMISSED: 'bg-gray-100 text-gray-400',
}

async function loadUserReports() {
  loadingUserReports.value = true
  try {
    const query = reportStatusFilter.value ? `?status=${reportStatusFilter.value}` : ''
    const { get } = useApi()
    userReports.value = await get<UserReport[]>(`/reports/admin${query}`)
  } finally {
    loadingUserReports.value = false
  }
}

async function moderateUserReport(id: string, status: UserReport['status']) {
  const { patch } = useApi()
  await patch(`/reports/admin/${id}`, { status })
  await loadUserReports()
}

// ─── Testimonials ─────────────────────────────────────────────────────────────
const testimonials = ref<Testimonial[]>([])
const loadingTestimonials = ref(false)
const showModal = ref(false)
const savingModal = ref(false)
const editingId = ref<string | null>(null)

const form = reactive({
  quote: '',
  name: '',
  role: '',
  initials: '',
  avatarColor: '#EF4444',
  isActive: true,
})

async function loadTestimonials() {
  loadingTestimonials.value = true
  try {
    const { get } = useApi()
    testimonials.value = await get<Testimonial[]>('/landing/admin/testimonials')
  } finally {
    loadingTestimonials.value = false
  }
}

function openTestimonialModal(t: Testimonial | null) {
  editingId.value = t?.id ?? null
  Object.assign(form, {
    quote: t?.quote ?? '',
    name: t?.name ?? '',
    role: t?.role ?? '',
    initials: t?.initials ?? '',
    avatarColor: t?.avatarColor ?? '#EF4444',
    isActive: t?.isActive ?? true,
  })
  showModal.value = true
}

async function saveTestimonial() {
  if (!form.quote || !form.name) return
  savingModal.value = true
  try {
    const { put, post } = useApi()
    if (editingId.value) {
      const updated = await put<Testimonial>(`/landing/admin/testimonials/${editingId.value}`, { ...form })
      const idx = testimonials.value.findIndex((t) => t.id === editingId.value)
      if (idx !== -1) testimonials.value[idx] = updated
    } else {
      const created = await post<Testimonial>('/landing/admin/testimonials', { ...form })
      testimonials.value.push(created)
    }
    showModal.value = false
  } finally {
    savingModal.value = false
  }
}

async function deleteTestimonial(id: string) {
  if (!confirm('¿Eliminar este testimonio?')) return
  const { del } = useApi()
  await del(`/landing/admin/testimonials/${id}`)
  testimonials.value = testimonials.value.filter((t) => t.id !== id)
}

const showCandidatesModal = ref(false)
const reviewCandidates = ref<ReviewCandidate[]>([])
const loadingCandidates = ref(false)
const creatingFromReview = ref<string | null>(null)

async function loadReviewCandidates() {
  loadingCandidates.value = true
  try {
    const { get } = useApi()
    reviewCandidates.value = await get<ReviewCandidate[]>('/landing/admin/testimonials/review-candidates')
  } finally {
    loadingCandidates.value = false
  }
}

async function useAsTestimonial(reviewId: string) {
  creatingFromReview.value = reviewId
  try {
    const { post } = useApi()
    const created = await post<Testimonial>(`/landing/admin/testimonials/from-review/${reviewId}`, {})
    testimonials.value.push(created)
    reviewCandidates.value = reviewCandidates.value.filter((c: ReviewCandidate) => c.id !== reviewId)
  } finally {
    creatingFromReview.value = null
  }
}

async function moveTestimonial(idx: number, direction: -1 | 1) {
  const targetIdx = idx + direction
  if (targetIdx < 0 || targetIdx >= testimonials.value.length) return
  const reordered = [...testimonials.value]
  ;[reordered[idx], reordered[targetIdx]] = [reordered[targetIdx], reordered[idx]]
  testimonials.value = reordered
  const { patch } = useApi()
  await patch('/landing/admin/testimonials/reorder', { orderedIds: reordered.map((t) => t.id) })
}

// ─── Features ─────────────────────────────────────────────────────────────────
const features = ref<Feature[]>([])
const loadingFeatures = ref(false)
const showFeatureModal = ref(false)
const savingFeatureModal = ref(false)
const editingFeatureId = ref<string | null>(null)

const ICON_OPTIONS = ['ShoppingCartIcon', 'CubeIcon', 'ChartBarIcon', 'DocumentTextIcon', 'UsersIcon', 'TruckIcon', 'UserPlusIcon', 'CogIcon', 'RocketLaunchIcon']
const BG_OPTIONS = ['bg-blue-500', 'bg-violet-500', 'bg-green-500', 'bg-amber-500', 'bg-pink-500', 'bg-teal-500']

const featureForm = reactive({
  title: '',
  description: '',
  icon: ICON_OPTIONS[0],
  bg: BG_OPTIONS[0],
  isActive: true,
})

async function loadFeatures() {
  loadingFeatures.value = true
  try {
    const { get } = useApi()
    features.value = await get<Feature[]>('/landing/admin/features')
  } finally {
    loadingFeatures.value = false
  }
}

function openFeatureModal(f: Feature | null) {
  editingFeatureId.value = f?.id ?? null
  Object.assign(featureForm, {
    title: f?.title ?? '',
    description: f?.description ?? '',
    icon: f?.icon ?? ICON_OPTIONS[0],
    bg: f?.bg ?? BG_OPTIONS[0],
    isActive: f?.isActive ?? true,
  })
  showFeatureModal.value = true
}

async function saveFeature() {
  if (!featureForm.title || !featureForm.description) return
  savingFeatureModal.value = true
  try {
    const { put, post } = useApi()
    if (editingFeatureId.value) {
      const updated = await put<Feature>(`/landing/admin/features/${editingFeatureId.value}`, { ...featureForm })
      const idx = features.value.findIndex((f) => f.id === editingFeatureId.value)
      if (idx !== -1) features.value[idx] = updated
    } else {
      const created = await post<Feature>('/landing/admin/features', { ...featureForm, sortOrder: features.value.length })
      features.value.push(created)
    }
    showFeatureModal.value = false
  } finally {
    savingFeatureModal.value = false
  }
}

async function deleteFeature(id: string) {
  if (!confirm('¿Eliminar esta función?')) return
  const { del } = useApi()
  await del(`/landing/admin/features/${id}`)
  features.value = features.value.filter((f) => f.id !== id)
}

// ─── Steps (Cómo funciona) ──────────────────────────────────────────────────
const steps = ref<Step[]>([])
const loadingSteps = ref(false)
const showStepModal = ref(false)
const savingStepModal = ref(false)
const editingStepId = ref<string | null>(null)

const stepForm = reactive({
  title: '',
  desc: '',
  icon: ICON_OPTIONS[0],
  isActive: true,
})

async function loadSteps() {
  loadingSteps.value = true
  try {
    const { get } = useApi()
    steps.value = await get<Step[]>('/landing/admin/steps')
  } finally {
    loadingSteps.value = false
  }
}

function openStepModal(s: Step | null) {
  editingStepId.value = s?.id ?? null
  Object.assign(stepForm, {
    title: s?.title ?? '',
    desc: s?.desc ?? '',
    icon: s?.icon ?? ICON_OPTIONS[0],
    isActive: s?.isActive ?? true,
  })
  showStepModal.value = true
}

async function saveStep() {
  if (!stepForm.title || !stepForm.desc) return
  savingStepModal.value = true
  try {
    const { put, post } = useApi()
    if (editingStepId.value) {
      const updated = await put<Step>(`/landing/admin/steps/${editingStepId.value}`, { ...stepForm })
      const idx = steps.value.findIndex((s) => s.id === editingStepId.value)
      if (idx !== -1) steps.value[idx] = updated
    } else {
      const created = await post<Step>('/landing/admin/steps', { ...stepForm, sortOrder: steps.value.length })
      steps.value.push(created)
    }
    showStepModal.value = false
  } finally {
    savingStepModal.value = false
  }
}

async function deleteStep(id: string) {
  if (!confirm('¿Eliminar este paso?')) return
  const { del } = useApi()
  await del(`/landing/admin/steps/${id}`)
  steps.value = steps.value.filter((s) => s.id !== id)
}

// ─── Header stats ─────────────────────────────────────────────────────────────
const headerStats = computed(() => [
  { label: 'Testimonios', value: testimonials.value.length },
  { label: 'Funciones', value: features.value.length },
  { label: 'Reseñas reportadas', value: reportedReviews.value.length },
  { label: 'Reportes de usuarios', value: userReports.value.length },
])

// ─── Init ─────────────────────────────────────────────────────────────────────
onMounted(() => {
  loadStats()
  loadReportedReviews()
  loadUserReports()
  loadTestimonials()
  loadFeatures()
  loadSteps()
})
</script>
