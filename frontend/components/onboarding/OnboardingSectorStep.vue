<template>
  <div class="p-6">
    <h2 class="text-base font-bold text-gray-900 mb-0.5">¿En qué sector está tu negocio?</h2>
    <p class="text-sm text-gray-500 mb-5">Esto define qué módulos estarán disponibles para ti.</p>

    <label class="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2.5">Categoría</label>

    <div v-if="loading" class="flex justify-center py-10">
      <div class="w-6 h-6 border-2 border-red-600 border-t-transparent rounded-full animate-spin" />
    </div>
    <div v-else class="grid grid-cols-2 gap-2 max-h-52 overflow-y-auto pr-1 scrollbar-thin">
      <button
        v-for="cat in categories"
        :key="cat.id"
        type="button"
        class="flex items-center gap-2.5 px-3 py-3 rounded-xl border-2 text-left transition-all hover:border-red-400/50 hover:bg-red-50/50 active:scale-[0.98]"
        :class="selectedCategory === cat.id
          ? 'border-red-600 bg-red-50 shadow-sm shadow-red-100'
          : 'border-gray-200'"
        @click="$emit('select-category', cat.id)"
      >
        <span class="text-xl leading-none flex-shrink-0">{{ cat.icon || '🏢' }}</span>
        <span class="text-sm font-medium text-gray-700 leading-tight">{{ cat.name }}</span>
        <CheckCircleIcon
          v-if="selectedCategory === cat.id"
          class="h-4 w-4 text-red-600 ml-auto flex-shrink-0"
        />
      </button>

      <!-- Otro: el usuario no encontró su rubro, propone uno nuevo para revisión del admin -->
      <button
        type="button"
        class="flex items-center gap-2.5 px-3 py-3 rounded-xl border-2 border-dashed text-left transition-all hover:border-red-400/50 hover:bg-red-50/50 active:scale-[0.98]"
        :class="selectedCategory === OTHER
          ? 'border-red-600 bg-red-50 shadow-sm shadow-red-100'
          : 'border-gray-300'"
        @click="$emit('select-category', OTHER)"
      >
        <span class="text-xl leading-none flex-shrink-0">✏️</span>
        <span class="text-sm font-medium text-gray-700 leading-tight">Otro</span>
        <CheckCircleIcon
          v-if="selectedCategory === OTHER"
          class="h-4 w-4 text-red-600 ml-auto flex-shrink-0"
        />
      </button>
    </div>

    <Transition
      enter-active-class="duration-200 ease-out"
      enter-from-class="opacity-0 -translate-y-1"
      enter-to-class="opacity-100 translate-y-0"
    >
      <div v-if="selectedCategory === OTHER" class="mt-4">
        <textarea
          :value="otherCategoryText"
          rows="2"
          maxlength="200"
          placeholder="Cuéntanos a qué se dedica tu negocio, así lo agregamos al catálogo"
          class="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-400 resize-none"
          @input="$emit('update:otherCategoryText', ($event.target as HTMLTextAreaElement).value)"
        />
        <p class="mt-1.5 text-xs text-gray-400">
          Un administrador revisará tu propuesta. Mientras tanto, tu cuenta queda sin sector asignado.
        </p>
      </div>
    </Transition>

    <Transition
      enter-active-class="duration-200 ease-out"
      enter-from-class="opacity-0 -translate-y-1"
      enter-to-class="opacity-100 translate-y-0"
    >
      <div v-if="selectedCategory && selectedCategory !== OTHER && subcategories.length > 0" class="mt-5">
        <p class="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2.5">
          Subcategoría <span class="font-normal normal-case">(opcional)</span>
        </p>
        <div class="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto pr-1 scrollbar-thin">
          <button
            v-for="sub in subcategories"
            :key="sub.id"
            type="button"
            class="flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl border-2 text-left transition-all hover:border-red-400/50 hover:bg-red-50/50 active:scale-[0.98]"
            :class="selectedSubcategory === sub.id
              ? 'border-red-600 bg-red-50 shadow-sm shadow-red-100'
              : 'border-gray-200'"
            @click="$emit('update:selectedSubcategory', selectedSubcategory === sub.id ? '' : sub.id)"
          >
            <span class="text-sm font-medium text-gray-700">{{ sub.icon || '📄' }} {{ sub.name }}</span>
            <CheckCircleIcon v-if="selectedSubcategory === sub.id" class="h-4 w-4 text-red-600 flex-shrink-0" />
          </button>

          <!-- Otro: propone una subcategoría nueva bajo la categoría ya elegida -->
          <button
            type="button"
            class="flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl border-2 border-dashed text-left transition-all hover:border-red-400/50 hover:bg-red-50/50 active:scale-[0.98]"
            :class="selectedSubcategory === OTHER
              ? 'border-red-600 bg-red-50 shadow-sm shadow-red-100'
              : 'border-gray-300'"
            @click="$emit('update:selectedSubcategory', selectedSubcategory === OTHER ? '' : OTHER)"
          >
            <span class="text-sm font-medium text-gray-700">✏️ Otro</span>
            <CheckCircleIcon v-if="selectedSubcategory === OTHER" class="h-4 w-4 text-red-600 flex-shrink-0" />
          </button>
        </div>

        <Transition
          enter-active-class="duration-200 ease-out"
          enter-from-class="opacity-0 -translate-y-1"
          enter-to-class="opacity-100 translate-y-0"
        >
          <input
            v-if="selectedSubcategory === OTHER"
            :value="otherSubcategoryText"
            type="text"
            maxlength="80"
            placeholder="Nombre de la subcategoría"
            class="w-full mt-2.5 border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-400"
            @input="$emit('update:otherSubcategoryText', ($event.target as HTMLInputElement).value)"
          />
        </Transition>
      </div>
    </Transition>

    <p v-if="error" class="text-xs text-red-600 mt-4 flex items-center gap-1.5">
      <ExclamationCircleIcon class="h-3.5 w-3.5 flex-shrink-0" />{{ error }}
    </p>
  </div>
</template>

<script setup lang="ts">
import { CheckCircleIcon, ExclamationCircleIcon } from '@heroicons/vue/24/outline'

// Sentinel para la opción "Otro" — no es un id real, distingue la tarjeta
// especial de las categorías/subcategorías cargadas del backend.
const OTHER = '__OTHER__'

defineProps<{
  loading: boolean
  categories: { id: string; name: string; icon?: string }[]
  subcategories: { id: string; name: string; icon?: string }[]
  selectedCategory: string
  selectedSubcategory: string
  otherCategoryText: string
  otherSubcategoryText: string
  error: string
}>()

defineEmits<{
  'select-category': [id: string]
  'update:selectedSubcategory': [id: string]
  'update:otherCategoryText': [value: string]
  'update:otherSubcategoryText': [value: string]
}>()
</script>

<style scoped>
.scrollbar-thin::-webkit-scrollbar { width: 4px; }
.scrollbar-thin::-webkit-scrollbar-track { background: transparent; }
.scrollbar-thin::-webkit-scrollbar-thumb { background: #e5e7eb; border-radius: 99px; }
</style>
