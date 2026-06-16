<template>
  <div class="min-h-screen flex">
    <!-- Left Panel: Brand / Marketing -->
    <div
      class="hidden lg:flex lg:w-[45%] xl:w-[42%] relative flex-col bg-gradient-to-br from-workplace-red via-red-600 to-workplace-darkRed overflow-hidden"
      role="complementary"
      aria-label="Panel de marketing y estado de la plataforma"
    >
      <!-- Geometric shapes (animated) -->
      <div class="absolute inset-0 overflow-hidden pointer-events-none">
        <div class="absolute -top-32 -right-32 w-96 h-96 bg-white/10 rounded-full blur-2xl animate-blob" style="will-change: transform;"></div>
        <div class="absolute -bottom-24 -left-24 w-80 h-80 bg-black/10 rounded-full blur-2xl animate-blob animation-delay-2000" style="will-change: transform;"></div>
        <div class="absolute top-1/3 left-1/4 w-64 h-64 bg-white/5 rounded-full blur-3xl animate-blob animation-delay-4000" style="will-change: transform;"></div>
        <!-- Decorative circles -->
        <div class="absolute top-16 left-16 w-4 h-4 bg-white/30 rounded-full animate-float"></div>
        <div class="absolute top-32 left-32 w-2 h-2 bg-white/20 rounded-full animate-float animation-delay-1000"></div>
        <div class="absolute bottom-24 right-12 w-6 h-6 bg-white/20 rounded-full animate-float animation-delay-2000"></div>
        <div class="absolute bottom-48 right-28 w-3 h-3 bg-white/30 rounded-full animate-float animation-delay-3000"></div>
        <!-- Grid pattern -->
        <svg class="absolute inset-0 w-full h-full opacity-[0.04]" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" stroke-width="1"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>
      </div>

      <!-- Content -->
      <div class="relative flex flex-col h-full px-12 py-16">
        <!-- Logo -->
        <div class="flex items-center gap-2.5">
          <div class="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center border border-white/30">
            <svg class="w-6 h-6 text-white" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm0 3a3 3 0 110 6 3 3 0 010-6zm0 14.2a7.2 7.2 0 01-6-3.22c.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08A7.2 7.2 0 0112 19.2z"/>
            </svg>
          </div>
          <span class="text-white font-black text-2xl tracking-tight">WorkPlace <span class="font-medium opacity-80">Manager</span></span>
        </div>

        <!-- Main content -->
        <div class="flex-1 flex flex-col justify-center space-y-8">
          <!-- Platform status badge -->
          <div class="flex items-center gap-3">
            <div
              class="inline-flex items-center px-3 py-1.5 backdrop-blur-sm rounded-full border transition-all duration-500"
              :class="healthStatus === 'up'
                ? 'bg-white/15 border-white/20'
                : healthStatus === 'degraded'
                  ? 'bg-amber-500/20 border-amber-400/30'
                  : 'bg-red-900/30 border-red-400/30'"
            >
              <span
                class="w-2 h-2 rounded-full mr-2"
                :class="healthStatus === 'up'
                  ? 'bg-green-400 animate-pulse'
                  : healthStatus === 'degraded'
                    ? 'bg-amber-400 animate-pulse'
                    : 'bg-red-400'"
              ></span>
              <span class="text-white/90 text-xs font-medium">{{ healthLabel }}</span>
            </div>
          </div>

          <!-- Contextual headline -->
          <div class="space-y-4">
            <Transition name="slide-up" mode="out-in">
              <div :key="panelCtx.headline" class="space-y-3">
                <h1 class="text-4xl xl:text-5xl font-black text-white leading-tight">
                  {{ panelCtx.headline }}
                </h1>
                <p class="text-white/70 text-lg leading-relaxed max-w-sm">
                  {{ panelCtx.subline }}
                </p>
              </div>
            </Transition>
          </div>

          <!-- Step indicator (register/verify flow) -->
          <div v-if="panelCtx.steps.length > 0" class="space-y-2">
            <p class="text-white/50 text-xs font-semibold uppercase tracking-widest mb-3">Tu progreso</p>
            <div class="space-y-2">
              <div
                v-for="(step, i) in panelCtx.steps"
                :key="i"
                class="flex items-center gap-3"
              >
                <div
                  class="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold border transition-all duration-300"
                  :class="step.done
                    ? 'bg-green-400 border-green-400 text-white'
                    : step.current
                      ? 'bg-white border-white text-workplace-red'
                      : 'bg-white/10 border-white/20 text-white/40'"
                >
                  <CheckIcon v-if="step.done" class="w-3.5 h-3.5 stroke-[3]" />
                  <span v-else>{{ i + 1 }}</span>
                </div>
                <span
                  class="text-sm transition-all duration-300"
                  :class="step.done
                    ? 'text-green-300 line-through opacity-70'
                    : step.current
                      ? 'text-white font-semibold'
                      : 'text-white/40'"
                >{{ step.label }}</span>
              </div>
            </div>
          </div>

          <!-- Feature list or testimonial (when no steps) -->
          <div v-else class="space-y-4">
            <!-- Testimonial rotativo -->
            <Transition name="fade-up" mode="out-in">
              <div v-if="showTestimonial && currentTestimonial" :key="currentTestimonial.id" class="space-y-4">
                <div class="bg-white/10 backdrop-blur-sm rounded-2xl p-5 border border-white/15 space-y-3">
                  <div class="flex gap-0.5">
                    <StarIcon v-for="n in 5" :key="n" class="w-3.5 h-3.5 text-yellow-400" />
                  </div>
                  <p class="text-white/85 text-sm leading-relaxed italic">"{{ currentTestimonial.quote }}"</p>
                  <div class="flex items-center gap-2.5 pt-1 border-t border-white/10">
                    <div
                      class="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 text-white"
                      :style="{ backgroundColor: currentTestimonial.avatarColor + '99' }"
                    >
                      {{ currentTestimonial.initials }}
                    </div>
                    <div>
                      <p class="text-white text-xs font-bold">{{ currentTestimonial.name }}</p>
                      <p class="text-white/50 text-[11px]">{{ currentTestimonial.role }}</p>
                    </div>
                  </div>
                </div>
                <!-- Dots -->
                <div class="flex gap-1.5 justify-center" role="tablist" aria-label="Testimonios">
                  <button
                    v-for="(_, i) in testimonials"
                    :key="i"
                    type="button"
                    role="tab"
                    :aria-label="`Testimonio ${i + 1} de ${testimonials.length}`"
                    :aria-selected="i === testimonialIndex"
                    class="rounded-full transition-all duration-300"
                    :class="i === testimonialIndex
                      ? 'w-5 h-1.5 bg-white'
                      : 'w-1.5 h-1.5 bg-white/30 hover:bg-white/50'"
                    @click="testimonialIndex = i; resetTestimonialTimer()"
                  />
                </div>
              </div>

              <!-- Features fallback -->
              <div v-else key="features" class="space-y-4">
                <div v-for="feature in features" :key="feature.label" class="flex items-center space-x-4 group">
                  <div class="w-10 h-10 bg-white/15 backdrop-blur-sm rounded-xl flex items-center justify-center border border-white/20 flex-shrink-0 group-hover:bg-white/25 transition-colors duration-200">
                    <component :is="feature.icon" class="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p class="text-white font-semibold text-sm">{{ feature.label }}</p>
                    <p class="text-white/60 text-xs">{{ feature.desc }}</p>
                  </div>
                </div>
              </div>
            </Transition>
          </div>
        </div>

        <!-- Stats row -->
        <div class="grid grid-cols-3 gap-4 pt-8 border-t border-white/15">
          <div v-for="stat in stats" :key="stat.label" class="text-center">
            <Transition name="fade" mode="out-in">
              <p :key="stat.value" class="text-white font-black text-2xl">{{ stat.value }}</p>
            </Transition>
            <p class="text-white/60 text-xs mt-1">{{ stat.label }}</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Right Panel: Form -->
    <div class="flex-1 flex flex-col min-h-screen bg-gray-50">
      <!-- Top bar -->
      <div class="flex items-center justify-between px-6 sm:px-10 py-5 border-b border-gray-100 bg-white">
        <!-- Mobile logo -->
        <div class="lg:hidden">
          <AppLogo size="sm" />
        </div>
        <div class="hidden lg:block"></div>

        <!-- Nav links slot -->
        <slot name="header-action" />
      </div>

      <!-- Main form area -->
      <div class="flex-1 flex flex-col items-center justify-center px-6 sm:px-10 py-10">
        <div class="w-full max-w-md space-y-8">
          <!-- Page heading -->
          <div class="space-y-2">
            <h2 class="text-3xl font-black text-gray-900 tracking-tight">{{ title }}</h2>
            <p v-if="description" class="text-gray-500 text-base">{{ description }}</p>
          </div>

          <!-- Form card -->
          <div class="bg-white rounded-2xl border border-gray-200 shadow-sm p-8">
            <slot />
          </div>

          <!-- Footer links -->
          <div class="text-center">
            <slot name="footer" />
          </div>
        </div>
      </div>

      <!-- Bottom footer -->
      <div class="px-6 py-5 border-t border-gray-100 bg-white">
        <div class="flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-gray-400 max-w-md mx-auto w-full">
          <p>&copy; {{ currentYear }} WorkPlace Manager. Todos los derechos reservados.</p>
          <div class="flex items-center space-x-4">
            <NuxtLink to="/privacidad" class="hover:text-gray-600 transition-colors duration-150">Privacidad</NuxtLink>
            <NuxtLink to="/terminos" class="hover:text-gray-600 transition-colors duration-150">Términos</NuxtLink>
            <NuxtLink to="/soporte" class="hover:text-gray-600 transition-colors duration-150">Soporte</NuxtLink>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import {
  ChartBarIcon,
  ShoppingBagIcon,
  UsersIcon,
  TruckIcon,
  BriefcaseIcon,
  WrenchScrewdriverIcon,
  CheckIcon,
} from '@heroicons/vue/24/outline'
import { StarIcon } from '@heroicons/vue/24/solid'

defineProps({
  title: { type: String, required: true },
  description: { type: String, default: '' }
})

// SSR-safe year
const currentYear = useState('currentYear', () => new Date().getFullYear())
const route = useRoute()
const { user } = useAuth()
const role = computed(() => user.value?.role ?? null)

// ─── Health check realtime ────────────────────────────────────────────────────

type HealthStatus = 'up' | 'degraded' | 'down'
const healthStatus = ref<HealthStatus>('up') // optimistic initial state

const healthLabel = computed(() => ({
  up: 'Plataforma activa',
  degraded: 'Servicio degradado',
  down: 'Servicio interrumpido',
}[healthStatus.value] ?? 'Plataforma activa'))

// apiUrl extracted at setup level — not inside setInterval callback
const config = useRuntimeConfig()
const apiUrl = config.public.apiUrl as string

let healthTimer: ReturnType<typeof setInterval> | null = null

async function checkHealth() {
  try {
    const res = await $fetch<{ status: string }>(`${apiUrl}/health`, { timeout: 4000 })
    healthStatus.value = res.status === 'ok' ? 'up' : 'degraded'
  } catch {
    healthStatus.value = 'down'
  }
}

// ─── Stats dinámicas ──────────────────────────────────────────────────────────

const { stats: landingStats, testimonials: landingTestimonials, load: loadStats } = useLandingContent()

const stats = computed(() =>
  landingStats.value.slice(0, 3).map(s => ({ value: s.value, label: s.label }))
)

// ─── Testimonial rotativo ─────────────────────────────────────────────────────

const testimonials = computed(() => landingTestimonials.value)
const testimonialIndex = ref(0)
const showTestimonial = computed(() => testimonials.value.length > 0)
const currentTestimonial = computed(() => testimonials.value[testimonialIndex.value] ?? null)

let testimonialTimer: ReturnType<typeof setInterval> | null = null

function resetTestimonialTimer() {
  if (testimonialTimer) clearInterval(testimonialTimer)
  if (testimonials.value.length > 1) {
    testimonialTimer = setInterval(() => {
      testimonialIndex.value = (testimonialIndex.value + 1) % testimonials.value.length
    }, 6000)
  }
}

// Start timer only once testimonials data has loaded (avoids race condition)
const unwatchTestimonials = watch(testimonials, (val) => {
  if (val.length > 0) {
    resetTestimonialTimer()
    unwatchTestimonials()
  }
})

onMounted(() => {
  loadStats()
  checkHealth()
  healthTimer = setInterval(checkHealth, 60_000)
})

onUnmounted(() => {
  if (healthTimer) clearInterval(healthTimer)
  if (testimonialTimer) clearInterval(testimonialTimer)
})

// ─── Features por rol (fallback si no hay testimonios) ───────────────────────

const COMMERCE_FEATURES = [
  { icon: ChartBarIcon, label: 'Analytics en tiempo real', desc: 'Métricas y reportes al instante' },
  { icon: ShoppingBagIcon, label: 'Gestión de pedidos', desc: 'Control total del flujo de órdenes' },
  { icon: UsersIcon, label: 'CRM de clientes', desc: 'Segmentación y fidelización' },
  { icon: TruckIcon, label: 'Módulo de delivery', desc: 'Seguimiento de repartidores' },
]

const FREELANCER_FEATURES = [
  { icon: WrenchScrewdriverIcon, label: 'Catálogo de servicios', desc: 'Publica y gestiona tus servicios' },
  { icon: UsersIcon, label: 'Gestión de clientes', desc: 'Historial y seguimiento de solicitudes' },
  { icon: ChartBarIcon, label: 'Reportes de actividad', desc: 'Visualiza tus ingresos y métricas' },
]

const NORMAL_FEATURES = [
  { icon: ShoppingBagIcon, label: 'Marketplace', desc: 'Encuentra productos y servicios' },
  { icon: BriefcaseIcon, label: 'Bolsa de trabajo', desc: 'Descubre oportunidades laborales' },
  { icon: UsersIcon, label: 'Perfiles públicos', desc: 'Conecta con comercios y freelancers' },
]

const features = computed(() => {
  if (role.value === 'FREELANCER') return FREELANCER_FEATURES
  if (role.value === 'NORMAL') return NORMAL_FEATURES
  return COMMERCE_FEATURES
})

// ─── Contexto por ruta ────────────────────────────────────────────────────────

interface PanelStep { label: string; done: boolean; current: boolean }
interface PanelContext {
  headline: string
  subline: string
  steps: PanelStep[]
}

const panelCtx = computed<PanelContext>(() => {
  const name = route.name as string | undefined

  if (name === 'register') {
    return {
      headline: 'Empieza gratis\nhoy mismo',
      subline: 'Crea tu cuenta en menos de 2 minutos y ten tu restaurante operativo desde el primer día.',
      steps: [
        { label: 'Crea tu cuenta', done: false, current: true },
        { label: 'Verifica tu correo', done: false, current: false },
        { label: 'Configura tu negocio', done: false, current: false },
      ],
    }
  }

  if (name === 'verify-email') {
    return {
      headline: 'Revisa\ntu correo',
      subline: 'Un clic y ya podrás acceder a tu panel completo. Revisa también la carpeta de spam.',
      steps: [
        { label: 'Crea tu cuenta', done: true, current: false },
        { label: 'Verifica tu correo', done: false, current: true },
        { label: 'Configura tu negocio', done: false, current: false },
      ],
    }
  }

  if (name === 'recover-password') {
    return {
      headline: 'Recupera\ntu acceso',
      subline: 'Te enviamos un enlace seguro para restablecer tu contraseña en segundos.',
      steps: [],
    }
  }

  if (name === 'reset-password') {
    return {
      headline: 'Nueva\ncontraseña',
      subline: 'Elige una contraseña segura. Recomendamos combinar letras, números y símbolos.',
      steps: [],
    }
  }

  if (name === 'auth-2fa-verify') {
    return {
      headline: 'Verificación\nen dos pasos',
      subline: 'Tu cuenta está protegida con autenticación de dos factores. Ingresa el código de tu app.',
      steps: [],
    }
  }

  // login (default)
  return {
    headline: 'Gestiona tu\nrestaurante\ncon precisión',
    subline: 'Todo lo que necesitas para administrar pedidos, inventario, clientes y más en un solo lugar.',
    steps: [],
  }
})
</script>

<style scoped>
/* Blob animation */
@keyframes blob {
  0%, 100% { transform: translate(0, 0) scale(1); }
  33% { transform: translate(20px, -20px) scale(1.05); }
  66% { transform: translate(-15px, 15px) scale(0.97); }
}
.animate-blob { animation: blob 12s ease-in-out infinite; }

/* Float animation for decorative dots */
@keyframes float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-8px); }
}
.animate-float { animation: float 4s ease-in-out infinite; }

/* Delay utilities */
.animation-delay-1000 { animation-delay: 1s; }
.animation-delay-2000 { animation-delay: 2s; }
.animation-delay-3000 { animation-delay: 3s; }
.animation-delay-4000 { animation-delay: 4s; }

/* Slide-up transition for headline */
.slide-up-enter-active,
.slide-up-leave-active {
  transition: all 0.4s ease;
}
.slide-up-enter-from {
  opacity: 0;
  transform: translateY(12px);
}
.slide-up-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}

/* Fade-up for testimonials */
.fade-up-enter-active,
.fade-up-leave-active {
  transition: all 0.5s ease;
}
.fade-up-enter-from {
  opacity: 0;
  transform: translateY(10px);
}
.fade-up-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}

/* Fade for stats numbers */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* Headline preserves newlines */
h1 { white-space: pre-line; }
</style>
