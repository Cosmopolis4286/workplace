<template>
  <div class="max-w-4xl mx-auto space-y-6 pb-8">

    <!-- Page header -->
    <div class="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <div class="h-1.5 bg-gradient-to-r from-blue-500 to-indigo-400" />
      <div class="px-8 py-8">
        <div class="flex items-start gap-4">
          <div class="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center flex-shrink-0">
            <svg class="w-6 h-6 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          </div>
          <div>
            <h1 class="text-2xl font-bold text-gray-900">Centro de Soporte</h1>
            <p class="text-sm text-gray-400 mt-1">Estamos aquí para ayudarte</p>
            <p class="text-gray-500 mt-3 leading-relaxed">
              Encuentra respuestas a tus preguntas, reporta problemas o contáctanos directamente.
              Nuestro equipo responde en menos de 24 horas hábiles.
            </p>
          </div>
        </div>
      </div>
    </div>

    <!-- Contact cards -->
    <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <a
        v-for="channel in contactChannels"
        :key="channel.label"
        :href="channel.href"
        class="group bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex flex-col items-center text-center gap-3 hover:border-blue-200 hover:shadow-md transition-all duration-200 cursor-pointer"
      >
        <div :class="`w-11 h-11 ${channel.bg} rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-200`">
          <svg :class="`w-5 h-5 ${channel.color}`" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" :d="channel.iconPath" />
          </svg>
        </div>
        <div>
          <p class="text-sm font-semibold text-gray-800">{{ channel.label }}</p>
          <p class="text-xs text-gray-400 mt-0.5">{{ channel.description }}</p>
        </div>
        <span :class="`text-xs font-medium px-2.5 py-1 rounded-full ${channel.badgeBg} ${channel.badgeText}`">
          {{ channel.badge }}
        </span>
      </a>
    </div>

    <!-- Contact form + FAQ side by side -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">

      <!-- Contact form -->
      <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <h2 class="text-base font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <svg class="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
          Enviar mensaje
        </h2>

        <form class="space-y-4" @submit.prevent="submitForm">
          <div>
            <label class="block text-xs font-medium text-gray-600 mb-1.5">Asunto</label>
            <select
              v-model="form.subject"
              class="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent bg-white text-gray-700"
            >
              <option value="">Selecciona un asunto…</option>
              <option v-for="opt in subjectOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
            </select>
          </div>

          <div>
            <label class="block text-xs font-medium text-gray-600 mb-1.5">Tu nombre</label>
            <input
              v-model="form.name"
              type="text"
              placeholder="Nombre completo"
              class="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent placeholder-gray-300"
            />
          </div>

          <div>
            <label class="block text-xs font-medium text-gray-600 mb-1.5">Correo electrónico</label>
            <input
              v-model="form.email"
              type="email"
              placeholder="tu@comercio.com"
              class="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent placeholder-gray-300"
            />
          </div>

          <div>
            <label class="block text-xs font-medium text-gray-600 mb-1.5">Mensaje</label>
            <textarea
              v-model="form.message"
              rows="4"
              placeholder="Describe tu consulta o problema con el mayor detalle posible…"
              class="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent placeholder-gray-300 resize-none"
            />
          </div>

          <!-- Success toast -->
          <div
            v-if="submitted"
            class="flex items-center gap-2 bg-green-50 border border-green-200 rounded-xl px-4 py-3"
          >
            <svg class="w-4 h-4 text-green-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
            </svg>
            <p class="text-sm text-green-700 font-medium">¡Mensaje enviado! Te responderemos pronto.</p>
          </div>

          <button
            type="submit"
            :disabled="!isFormValid || sending"
            class="w-full py-2.5 bg-blue-500 text-white text-sm font-semibold rounded-xl hover:bg-blue-600 active:scale-95 transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
          >
            <span v-if="sending" class="flex items-center justify-center gap-2">
              <svg class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Enviando…
            </span>
            <span v-else>Enviar mensaje</span>
          </button>
        </form>
      </div>

      <!-- FAQ -->
      <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <h2 class="text-base font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <svg class="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Preguntas frecuentes
        </h2>

        <div class="space-y-2">
          <div
            v-for="faq in faqs"
            :key="faq.question"
            class="border border-gray-100 rounded-xl overflow-hidden"
          >
            <button
              type="button"
              class="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-gray-50 transition-colors duration-150"
              @click="faq.open = !faq.open"
            >
              <span class="text-sm font-medium text-gray-700">{{ faq.question }}</span>
              <svg
                :class="['w-4 h-4 text-gray-400 transition-transform duration-200 flex-shrink-0 ml-2', faq.open ? 'rotate-180' : '']"
                fill="none" stroke="currentColor" viewBox="0 0 24 24"
              >
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            <div v-if="faq.open" class="px-4 pb-3 border-t border-gray-50">
              <p class="text-sm text-gray-500 leading-relaxed pt-2">{{ faq.answer }}</p>
            </div>
          </div>
        </div>
      </div>

    </div>

    <!-- Status bar -->
    <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4">
      <div class="flex items-center gap-2">
        <span class="relative flex h-2.5 w-2.5">
          <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
          <span class="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500" />
        </span>
        <span class="text-sm font-medium text-gray-700">Todos los sistemas operativos</span>
      </div>
      <div class="hidden sm:block w-px h-4 bg-gray-200" />
      <p class="text-sm text-gray-400">Tiempo de respuesta promedio: <span class="font-medium text-gray-600">~4 horas hábiles</span></p>
      <div class="hidden sm:block w-px h-4 bg-gray-200" />
      <p class="text-sm text-gray-400">Soporte disponible: <span class="font-medium text-gray-600">Lun–Vie 9:00–18:00</span></p>
    </div>

  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'public' })
useHead({ title: 'Soporte — WorkPlace Manager' })

const contactChannels = [
  {
    label: 'Chat en vivo',
    description: 'Respuesta inmediata',
    href: '#chat',
    iconPath: 'M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z',
    bg: 'bg-blue-50',
    color: 'text-blue-500',
    badge: 'En línea',
    badgeBg: 'bg-green-100',
    badgeText: 'text-green-600',
  },
  {
    label: 'Correo electrónico',
    description: 'soporte@workplace-manager.app',
    href: 'mailto:soporte@workplace-manager.app',
    iconPath: 'M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z',
    bg: 'bg-indigo-50',
    color: 'text-indigo-500',
    badge: '< 24 h',
    badgeBg: 'bg-indigo-100',
    badgeText: 'text-indigo-600',
  },
  {
    label: 'WhatsApp',
    description: '+52 55 0000 0000',
    href: 'https://wa.me/5550000000',
    iconPath: 'M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z M12 0C5.373 0 0 5.373 0 12c0 2.122.554 4.118 1.522 5.852L0 24l6.293-1.495A11.945 11.945 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0z',
    bg: 'bg-green-50',
    color: 'text-green-500',
    badge: 'Lun–Vie',
    badgeBg: 'bg-green-100',
    badgeText: 'text-green-600',
  },
]

const subjectOptions = [
  { value: 'billing', label: 'Facturación o pagos' },
  { value: 'bug', label: 'Reportar un error' },
  { value: 'feature', label: 'Solicitar una funcionalidad' },
  { value: 'account', label: 'Problema con mi cuenta' },
  { value: 'data', label: 'Exportar o migrar datos' },
  { value: 'other', label: 'Otro' },
]

const form = reactive({
  subject: '',
  name: '',
  email: '',
  message: '',
})

const sending = ref(false)
const submitted = ref(false)

const isFormValid = computed(() =>
  form.subject && form.name.trim() && form.email.trim() && form.message.trim().length >= 10
)

async function submitForm() {
  if (!isFormValid.value) return
  sending.value = true
  await new Promise(resolve => setTimeout(resolve, 1000))
  sending.value = false
  submitted.value = true
  form.subject = ''
  form.name = ''
  form.email = ''
  form.message = ''
  setTimeout(() => { submitted.value = false }, 5000)
}

const faqs = reactive([
  {
    question: '¿Cómo restablezco mi contraseña?',
    answer: 'Ve a la pantalla de inicio de sesión y haz clic en "¿Olvidaste tu contraseña?". Te enviaremos un enlace de restablecimiento al correo asociado a tu cuenta.',
    open: false,
  },
  {
    question: '¿Puedo exportar mis datos?',
    answer: 'Sí. Desde el módulo de Analytics puedes exportar reportes en JSON. Para una exportación completa, contáctanos y te ayudamos con la migración.',
    open: false,
  },
  {
    question: '¿Cuántos usuarios puede tener mi cuenta?',
    answer: 'El plan base incluye 1 usuario administrador. Los planes superiores permiten múltiples roles (gerente, cajero, repartidor, etc.) con permisos diferenciados.',
    open: false,
  },
  {
    question: '¿WorkPlace Manager funciona sin internet?',
    answer: 'Actualmente WorkPlace Manager requiere conexión a internet. Estamos trabajando en un modo offline para operaciones críticas como pedidos y caja.',
    open: false,
  },
  {
    question: '¿Cómo cancelo mi suscripción?',
    answer: 'Puedes cancelar en cualquier momento desde Configuración → Facturación. Tu cuenta permanecerá activa hasta el final del período pagado.',
    open: false,
  },
])
</script>
