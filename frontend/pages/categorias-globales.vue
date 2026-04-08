<template>
  <div class="p-6">
    <!-- Header -->
    <div class="mb-6">
      <h1 class="text-3xl font-bold text-gray-900 mb-2">🌍 Categorías Globales</h1>
      <p class="text-gray-600">
        Gestiona las categorías y subcategorías globales del marketplace
      </p>
    </div>

    <!-- Botones de acción -->
    <div class="flex justify-between items-center mb-6">
      <div class="flex gap-3">
        <button
          @click="showCreateCategoryModal = true"
          class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
        >
          <span class="mr-2">➕</span>
          Nueva Categoría
        </button>
        <button
          @click="exportCategories"
          class="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
        >
          <span class="mr-2">📥</span>
          Exportar CSV
        </button>
        <button
          @click="showImportModal = true"
          class="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition"
        >
          <span class="mr-2">📤</span>
          Importar CSV
        </button>
      </div>
      
      <!-- Search -->
      <div class="relative">
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Buscar categorías..."
          class="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-64"
        />
        <span class="absolute left-3 top-2.5 text-gray-400">🔍</span>
      </div>
    </div>

    <!-- Grid de Categorías -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <div
        v-for="category in filteredCategories"
        :key="category.id"
        class="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow p-6 border border-gray-200"
      >
        <!-- Header de categoría -->
        <div class="flex items-center justify-between mb-4">
          <div class="flex items-center">
            <span class="text-2xl mr-3">{{ category.icon || '📁' }}</span>
            <div>
              <h3 class="font-semibold text-gray-900">{{ category.name }}</h3>
              <p class="text-sm text-gray-500">{{ category.subcategories?.length || 0 }} subcategorías</p>
            </div>
          </div>
          <div class="flex gap-2">
            <button
              @click="editCategory(category)"
              class="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
              title="Editar categoría"
            >
              ✏️
            </button>
            <button
              @click="deleteCategory(category)"
              class="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
              title="Eliminar categoría"
            >
              🗑️
            </button>
          </div>
        </div>

        <!-- Descripción -->
        <p v-if="category.description" class="text-gray-600 text-sm mb-4">
          {{ category.description }}
        </p>

        <!-- Color badge -->
        <div class="flex items-center mb-4">
          <span
            class="w-4 h-4 rounded-full mr-2"
            :style="{ backgroundColor: category.color }"
          ></span>
          <span class="text-sm text-gray-600">{{ category.color }}</span>
        </div>

        <!-- Subcategorías -->
        <div v-if="category.subcategories && category.subcategories.length > 0">
          <h4 class="font-medium text-gray-900 mb-2">Subcategorías:</h4>
          <div class="space-y-2">
            <div
              v-for="subcategory in category.subcategories.slice(0, 3)"
              :key="subcategory.id"
              class="flex items-center justify-between p-2 bg-gray-50 rounded-lg"
            >
              <div class="flex items-center">
                <span class="text-sm mr-2">📄</span>
                <span class="text-sm text-gray-700">{{ subcategory.name }}</span>
              </div>
              <div class="flex gap-1">
                <button
                  @click="editSubcategory(subcategory)"
                  class="p-1 text-blue-600 hover:bg-blue-50 rounded transition"
                  title="Editar subcategoría"
                >
                  ✏️
                </button>
                <button
                  @click="deleteSubcategory(subcategory)"
                  class="p-1 text-red-600 hover:bg-red-50 rounded transition"
                  title="Eliminar subcategoría"
                >
                  🗑️
                </button>
              </div>
            </div>
            <div
              v-if="category.subcategories.length > 3"
              class="text-sm text-gray-500 text-center p-2"
            >
              +{{ category.subcategories.length - 3 }} más...
            </div>
          </div>
        </div>

        <!-- Botón para agregar subcategoría -->
        <button
          @click="showCreateSubcategoryModal = true; selectedCategory = category"
          class="w-full mt-4 py-2 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-gray-400 hover:text-gray-700 transition"
        >
          <span class="mr-2">➕</span>
          Agregar Subcategoría
        </button>
      </div>
    </div>

    <!-- Estado vacío -->
    <div v-if="filteredCategories.length === 0" class="text-center py-12">
      <span class="text-6xl mb-4 block">📁</span>
      <h3 class="text-xl font-semibold text-gray-900 mb-2">
        {{ searchQuery ? 'No se encontraron categorías' : 'No hay categorías globales' }}
      </h3>
      <p class="text-gray-600">
        {{ searchQuery ? 'Intenta con otra búsqueda' : 'Crea tu primera categoría global para empezar' }}
      </p>
    </div>

    <!-- Modal Crear/Editar Categoría -->
    <div
      v-if="showCreateCategoryModal || editingCategory"
      class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
    >
      <div class="bg-white rounded-lg p-6 w-full max-w-md">
        <h3 class="text-xl font-bold mb-4">
          {{ editingCategory ? 'Editar Categoría' : 'Nueva Categoría' }}
        </h3>
        
        <form @submit.prevent="saveCategory">
          <div class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
              <input
                v-model="categoryForm.name"
                type="text"
                required
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
              <textarea
                v-model="categoryForm.description"
                rows="3"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              ></textarea>
            </div>
            
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Icono</label>
              <input
                v-model="categoryForm.icon"
                type="text"
                placeholder="📁"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Color</label>
              <input
                v-model="categoryForm.color"
                type="color"
                class="w-full h-10 border border-gray-300 rounded-lg cursor-pointer"
              />
            </div>
            
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Orden</label>
              <input
                v-model.number="categoryForm.sortOrder"
                type="number"
                min="0"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
          
          <div class="flex justify-end gap-3 mt-6">
            <button
              type="button"
              @click="cancelCategoryForm"
              class="px-4 py-2 text-gray-600 hover:text-gray-800 transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
            >
              {{ editingCategory ? 'Actualizar' : 'Crear' }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Modal Crear/Editar Subcategoría -->
    <div
      v-if="showCreateSubcategoryModal || editingSubcategory"
      class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
    >
      <div class="bg-white rounded-lg p-6 w-full max-w-md">
        <h3 class="text-xl font-bold mb-4">
          {{ editingSubcategory ? 'Editar Subcategoría' : 'Nueva Subcategoría' }}
        </h3>
        
        <form @submit.prevent="saveSubcategory">
          <div class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
              <input
                v-model="subcategoryForm.name"
                type="text"
                required
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
              <textarea
                v-model="subcategoryForm.description"
                rows="3"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              ></textarea>
            </div>
            
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Orden</label>
              <input
                v-model.number="subcategoryForm.sortOrder"
                type="number"
                min="0"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
          
          <div class="flex justify-end gap-3 mt-6">
            <button
              type="button"
              @click="cancelSubcategoryForm"
              class="px-4 py-2 text-gray-600 hover:text-gray-800 transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
            >
              {{ editingSubcategory ? 'Actualizar' : 'Crear' }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Modal Importar CSV -->
    <div
      v-if="showImportModal"
      class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
    >
      <div class="bg-white rounded-lg p-6 w-full max-w-md">
        <h3 class="text-xl font-bold mb-4">Importar Categorías</h3>
        
        <div class="mb-4">
          <p class="text-sm text-gray-600 mb-2">
            Sube un archivo CSV con las siguientes columnas:
          </p>
          <code class="block bg-gray-100 p-2 rounded text-sm">
            name,description,icon,color,sortOrder
          </code>
        </div>
        
        <input
          type="file"
          accept=".csv"
          @change="handleFileUpload"
          class="w-full mb-4"
        />
        
        <div class="flex justify-end gap-3">
          <button
            @click="showImportModal = false"
            class="px-4 py-2 text-gray-600 hover:text-gray-800 transition"
          >
            Cancelar
          </button>
          <button
            @click="importCategories"
            class="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition"
            :disabled="!selectedFile"
          >
            Importar
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { PageHeader } from '~/components/ui/PageHeader.vue'
import { ClipboardDocumentListIcon, ArrowDownTrayIcon, ArrowUpTrayIcon } from '@heroicons/vue/24/outline'
import { useAuth } from '~/composables/useAuth'
import { useApi } from '~/composables/useApi'
import { useAlert } from '~/composables/useAlert'

// Composables
const auth = useAuthStore()
const { showAlert } = useAlert()

// Estado
const categories = ref([])
const loading = ref(false)
const searchQuery = ref('')

// Modales
const showCreateCategoryModal = ref(false)
const showCreateSubcategoryModal = ref(false)
const showImportModal = ref(false)
const editingCategory = ref(null)
const editingSubcategory = ref(null)
const selectedCategory = ref(null)
const selectedFile = ref(null)

// Formularios
const categoryForm = ref({
  name: '',
  description: '',
  icon: '📁',
  color: '#6b7280',
  sortOrder: 0
})

const subcategoryForm = ref({
  name: '',
  description: '',
  sortOrder: 0
})

// Computadas
const filteredCategories = computed(() => {
  if (!searchQuery.value) return categories.value
  
  const query = searchQuery.value.toLowerCase()
  return categories.value.filter(category => 
    category.name.toLowerCase().includes(query) ||
    category.description?.toLowerCase().includes(query) ||
    category.subcategories?.some(sub => sub.name.toLowerCase().includes(query))
  )
})

// Métodos
const fetchCategories = async () => {
  try {
    loading.value = true
    const { get } = useApi()
    const response = await get('/api/categories-global')
    categories.value = response.data || []
    loading.value = false
  } catch (error) {
    console.error('Error fetching categories:', error)
    loading.value = false
  }
}

const saveCategory = async () => {
  try {
    const data = { ...categoryForm.value }
    
    if (editingCategory.value) {
      const { put } = useApi()
      await put(`/api/categories-global/${editingCategory.value.id}`, data)
      showAlert('Categoría actualizada', 'success')
    } else {
      const { post } = useApi()
      await post('/api/categories-global', data)
      showAlert('Categoría creada', 'success')
    }
    
    cancelCategoryForm()
    await fetchCategories()
  } catch (error) {
    console.error('Error saving category:', error)
    showAlert('Error al guardar categoría', 'error')
  }
}

const deleteCategory = async (category) => {
  if (!confirm(`¿Estás seguro de eliminar la categoría "${category.name}"?`)) return
  
  try {
    const { del } = useApi()
    await del(`/api/categories-global/${category.id}`)
    showAlert('Categoría eliminada', 'success')
    await fetchCategories()
  } catch (error) {
    console.error('Error deleting category:', error)
    showAlert('Error al eliminar categoría', 'error')
  }
}

const editCategory = (category) => {
  editingCategory.value = category
  categoryForm.value = {
    name: category.name,
    description: category.description || '',
    icon: category.icon || '📁',
    color: category.color || '#6b7280',
    sortOrder: category.sortOrder || 0
  }
}

const cancelCategoryForm = () => {
  showCreateCategoryModal.value = false
  editingCategory.value = null
  categoryForm.value = {
    name: '',
    description: '',
    icon: '📁',
    color: '#6b7280',
    sortOrder: 0
  }
}

const saveSubcategory = async () => {
  try {
    const data = { ...subcategoryForm.value }
    
    if (editingSubcategory.value) {
      const { put } = useApi()
      await put(`/api/categories-global/subcategories/${editingSubcategory.value.id}`, data)
      showAlert('Subcategoría actualizada', 'success')
    } else {
      const { post } = useApi()
      await post(`/api/categories-global/${selectedCategory.value.id}/subcategories`, data)
      showAlert('Subcategoría creada', 'success')
    }
    
    cancelSubcategoryForm()
    await fetchCategories()
  } catch (error) {
    console.error('Error saving subcategory:', error)
    showAlert('Error al guardar subcategoría', 'error')
  }
}

const deleteSubcategory = async (subcategory) => {
  if (!confirm(`¿Estás seguro de eliminar la subcategoría "${subcategory.name}"?`)) return
  
  try {
    const { del } = useApi()
    await del(`/api/categories-global/subcategories/${subcategory.id}`)
    showAlert('Subcategoría eliminada', 'success')
    await fetchCategories()
  } catch (error) {
    console.error('Error deleting subcategory:', error)
    showAlert('Error al eliminar subcategoría', 'error')
  }
}

const editSubcategory = (subcategory) => {
  editingSubcategory.value = subcategory
  subcategoryForm.value = {
    name: subcategory.name,
    description: subcategory.description || '',
    sortOrder: subcategory.sortOrder || 0
  }
}

const cancelSubcategoryForm = () => {
  showCreateSubcategoryModal.value = false
  editingSubcategory.value = null
  selectedCategory.value = null
  subcategoryForm.value = {
    name: '',
    description: '',
    sortOrder: 0
  }
}

const exportCategories = async () => {
  try {
    const { get } = useApi()
    const csvData = await get('/api/categories-global/export/csv')
    
    const blob = new Blob([csvData], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'categorias-globales.csv'
    a.click()
    window.URL.revokeObjectURL(url)
    
    showAlert('Categorías exportadas', 'success')
  } catch (error) {
    console.error('Error exporting categories:', error)
    showAlert('Error al exportar categorías', 'error')
  }
}

const handleFileUpload = (event) => {
  selectedFile.value = event.target.files[0]
}

const importCategories = async () => {
  if (!selectedFile.value) return
  
  try {
    const text = await selectedFile.value.text()
    const lines = text.split('\n')
    const headers = lines[0].split(',')
    
    const categories = []
    for (let i = 1; i < lines.length; i++) {
      if (lines[i].trim()) {
        const values = lines[i].split(',')
        categories.push({
          name: values[0]?.trim() || '',
          description: values[1]?.trim() || '',
          icon: values[2]?.trim() || '📁',
          color: values[3]?.trim() || '#6b7280',
          sortOrder: parseInt(values[4]) || 0
        })
      }
    }
    
    const formData = new FormData()
    formData.append('categories', JSON.stringify(categories))
    
    const { post } = useApi()
    await post('/api/categories-global/import/csv', formData)
    
    showAlert('Categorías importadas', 'success')
    showImportModal.value = false
    selectedFile.value = null
    await fetchCategories()
  } catch (error) {
    console.error('Error importing categories:', error)
    showAlert('Error al importar categorías', 'error')
  }
}

// Lifecycle
onMounted(() => {
  fetchCategories()
})
</script>
