<template>
  <!-- ─── Mobile overlay ────────────────────────────────────────────────── -->
  <Teleport to="body">
    <Transition name="overlay">
      <div v-if="open" class="fixed inset-0 z-50 lg:hidden">
        <!-- Backdrop -->
        <div
          class="absolute inset-0 bg-black/50 backdrop-blur-sm"
          @click="$emit('update:open', false)"
        />
        <!-- Drawer -->
        <Transition name="drawer">
          <div
            v-if="open"
            class="absolute inset-y-0 left-0 flex flex-col w-72 shadow-2xl transition-colors duration-300"
            :class="isDark ? 'bg-gray-900' : 'bg-white'"
          >
            <!-- Mobile header -->
            <div class="h-16 flex-shrink-0 flex items-center justify-between px-5 bg-gradient-to-r from-workplace-red to-red-700 shadow-md" style="padding-top: env(safe-area-inset-top)">
              <div class="flex items-center gap-3">
                <div class="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
                  <span class="text-white font-black text-sm">iF</span>
                </div>
                <div>
                  <p class="text-white font-bold text-sm leading-tight">WorkPlace Manager</p>
                  <p class="text-red-200 text-xs leading-tight">Panel de Control</p>
                </div>
              </div>
              <button
                @click="$emit('update:open', false)"
                class="w-8 h-8 rounded-lg bg-white/15 hover:bg-white/25 flex items-center justify-center transition-colors"
              >
                <XMarkIcon class="h-5 w-5 text-white" />
              </button>
            </div>
            <!-- Mobile nav -->
            <div class="flex-1 overflow-y-auto">
              <SidebarContent :dark="isDark" @navigate="$emit('update:open', false)" />
            </div>
          </div>
        </Transition>
      </div>
    </Transition>
  </Teleport>

  <!-- ─── Desktop rail ──────────────────────────────────────────────────── -->
  <div
    class="hidden lg:flex lg:flex-col lg:fixed lg:inset-y-0 z-30 rail transition-colors duration-300"
    :class="[
      open || hovered ? 'rail-open' : 'rail-closed',
      isDark ? 'bg-gray-900 border-white/10' : 'bg-white border-gray-200'
    ]"
    style="border-right-width: 1px; border-right-style: solid;"
    @mouseenter="hovered = true"
    @mouseleave="hovered = false"
  >
    <div class="flex flex-col h-full overflow-hidden shadow-xl">

      <!-- Rail header -->
      <div
        class="h-16 flex-shrink-0 flex items-center overflow-hidden transition-colors duration-300"
        :class="isDark ? 'border-b border-white/10' : 'border-b border-gray-100'"
      >
        <!-- Logo — siempre visible -->
        <div class="w-16 flex-shrink-0 flex items-center justify-center">
          <NuxtLink to="/dashboard" class="block">
            <div class="w-9 h-9 rounded-xl bg-workplace-red flex items-center justify-center shadow-lg ring-2 ring-workplace-red/30 hover:scale-105 transition-transform duration-200">
              <span class="text-white font-black text-sm">iF</span>
            </div>
          </NuxtLink>
        </div>

        <!-- Brand + pin — visibles al expandir -->
        <div class="flex-1 min-w-0 overflow-hidden">
          <Transition name="fade-slide">
            <div v-if="open || hovered" class="pr-3 flex items-center justify-between">
              <div class="min-w-0">
                <p class="font-bold text-sm leading-tight whitespace-nowrap" :class="isDark ? 'text-white' : 'text-gray-900'">WorkPlace</p>
                <p class="text-xs leading-tight whitespace-nowrap" :class="isDark ? 'text-gray-400' : 'text-gray-500'">Manager</p>
              </div>
              <!-- Pin toggle -->
              <button
                @click.stop="$emit('update:open', !open)"
                class="w-7 h-7 rounded-lg flex items-center justify-center transition-all flex-shrink-0"
                :class="[
                  open ? 'text-workplace-red' : (isDark ? 'text-gray-500 hover:text-gray-300' : 'text-gray-400 hover:text-gray-600'),
                  isDark ? 'hover:bg-white/10' : 'hover:bg-gray-100'
                ]"
                :title="open ? 'Desanclar sidebar' : 'Anclar sidebar'"
              >
                <svg class="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                  <path v-if="open" d="M16 12V4h1V2H7v2h1v8l-2 2v2h5.2v6h1.6v-6H18v-2l-2-2z"/>
                  <path v-else d="M17 12h-5V4h1V2H7v2h1v8l-2 2v2h5.2v6h1.6v-6H18v-2l-2-2zm-1.8 2H8.8l.7-.7.5-.5V4h3v9.8l.5.5.7.7z"/>
                </svg>
              </button>
            </div>
          </Transition>
        </div>
      </div>

      <!-- Nav content -->
      <div class="flex-1 min-h-0 overflow-y-auto overflow-x-hidden rail-scroll">
        <SidebarContent
          :collapsed="!open && !hovered"
          :dark="isDark"
        />
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { XMarkIcon } from '@heroicons/vue/24/outline'

defineProps({ open: Boolean })
const emit = defineEmits(['update:open', 'update:expanded'])

const { isDark } = useColorMode()
const hovered = ref(false)

watch(hovered, (val) => emit('update:expanded', val))
</script>

<style scoped>
.rail {
  transition: width 0.22s cubic-bezier(0.4, 0, 0.2, 1);
  will-change: width;
}
.rail-closed { width: 64px; }
.rail-open   { width: 272px; }

/* Drawer */
.drawer-enter-active,
.drawer-leave-active  { transition: transform 0.25s cubic-bezier(0.4, 0, 0.2, 1); }
.drawer-enter-from,
.drawer-leave-to      { transform: translateX(-100%); }

/* Overlay */
.overlay-enter-active,
.overlay-leave-active { transition: opacity 0.25s ease; }
.overlay-enter-from,
.overlay-leave-to     { opacity: 0; }

/* Brand fade-slide */
.fade-slide-enter-active { transition: opacity 0.18s ease, transform 0.18s ease; transition-delay: 0.05s; }
.fade-slide-leave-active { transition: opacity 0.12s ease, transform 0.12s ease; }
.fade-slide-enter-from   { opacity: 0; transform: translateX(-6px); }
.fade-slide-leave-to     { opacity: 0; transform: translateX(-4px); }

/* Scrollbar */
.rail-scroll::-webkit-scrollbar       { width: 3px; }
.rail-scroll::-webkit-scrollbar-track { background: transparent; }
.rail-scroll::-webkit-scrollbar-thumb { background: rgba(156,163,175,0.3); border-radius: 9999px; }
.rail-scroll::-webkit-scrollbar-thumb:hover { background: rgba(156,163,175,0.5); }
</style>
