<template>
  <div
    :draggable="!disabled"
    @dragstart.stop="onDragStart"
    @dragover.prevent.stop="onDragOver"
    @dragleave.stop="onDragLeave"
    @drop.prevent.stop="onDrop"
    @dragend.stop="onDragEnd"
    class="transition-opacity duration-200"
    :class="[
      disabled ? '' : 'cursor-grab active:cursor-grabbing',
      isDragOver ? 'opacity-50 ring-2 ring-indigo-400 ring-offset-2 rounded-xl' : '',
    ]"
  >
    <slot />
  </div>
</template>

<script setup lang="ts">
// ID del widget que se está arrastrando actualmente (compartido entre instancias vía módulo)
let dragSourceId = ''

// .stop en todos los listeners del template: necesario para poder anidar
// este componente (ej. menu.vue — tarjetas de producto arrastrables DENTRO
// de una categoría también arrastrable). Sin .stop, soltar un producto
// sobre otro también dispara drop/dragover en el DraggableWidget padre (la
// categoría), emitiendo un drag-swap con un productId donde se esperaba un
// categoryId.

const props = withDefaults(defineProps<{ widgetId: string; disabled?: boolean }>(), { disabled: false })
const emit = defineEmits<{ 'drag-swap': [from: string, to: string] }>()

const isDragOver = ref(false)

function onDragStart(e: DragEvent) {
  if (props.disabled) return
  dragSourceId = props.widgetId
  e.dataTransfer!.effectAllowed = 'move'
  e.dataTransfer!.setData('text/plain', props.widgetId)
}

function onDragOver() {
  if (!props.disabled && dragSourceId !== props.widgetId) isDragOver.value = true
}

function onDragLeave() {
  isDragOver.value = false
}

function onDragEnd() {
  isDragOver.value = false
  dragSourceId = ''
}

function onDrop(e: DragEvent) {
  isDragOver.value = false
  const fromId = e.dataTransfer!.getData('text/plain')
  if (fromId && fromId !== props.widgetId) {
    emit('drag-swap', fromId, props.widgetId)
  }
}
</script>
