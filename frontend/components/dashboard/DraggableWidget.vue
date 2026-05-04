<template>
  <div
    draggable="true"
    @dragstart="onDragStart"
    @dragover.prevent="onDragOver"
    @dragleave="onDragLeave"
    @drop.prevent="onDrop"
    @dragend="onDragEnd"
    class="transition-opacity duration-200 cursor-grab active:cursor-grabbing"
    :class="isDragOver ? 'opacity-50 ring-2 ring-indigo-400 ring-offset-2 rounded-xl' : ''"
  >
    <slot />
  </div>
</template>

<script setup lang="ts">
// ID del widget que se está arrastrando actualmente (compartido entre instancias vía módulo)
let dragSourceId = ''

const props = defineProps<{ widgetId: string }>()
const emit = defineEmits<{ 'drag-swap': [from: string, to: string] }>()

const isDragOver = ref(false)

function onDragStart(e: DragEvent) {
  dragSourceId = props.widgetId
  e.dataTransfer!.effectAllowed = 'move'
  e.dataTransfer!.setData('text/plain', props.widgetId)
}

function onDragOver() {
  if (dragSourceId !== props.widgetId) isDragOver.value = true
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
