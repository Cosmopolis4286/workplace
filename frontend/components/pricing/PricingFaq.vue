<template>
  <section class="mt-8 max-w-2xl mx-auto">
    <h2 class="text-xl font-black text-gray-900 text-center mb-6">Preguntas frecuentes</h2>
    <div class="space-y-3">
      <div
        v-for="(faq, i) in faqs"
        :key="i"
        class="card overflow-hidden"
      >
        <button
          class="w-full flex items-center justify-between px-5 py-4 text-left"
          @click="openFaq = openFaq === i ? null : i"
        >
          <span class="text-sm font-semibold text-gray-900">{{ faq.q }}</span>
          <ChevronDownIcon
            class="w-4 h-4 text-gray-400 flex-shrink-0 transition-transform duration-200"
            :class="openFaq === i ? 'rotate-180' : ''"
          />
        </button>
        <Transition
          enter-active-class="duration-200 ease-out"
          enter-from-class="opacity-0 -translate-y-2"
          enter-to-class="opacity-100 translate-y-0"
          leave-active-class="duration-150 ease-in"
          leave-from-class="opacity-100"
          leave-to-class="opacity-0"
        >
          <div v-if="openFaq === i" class="px-5 pb-4 text-sm text-gray-600 leading-relaxed border-t border-gray-100 pt-3">
            {{ faq.a }}
          </div>
        </Transition>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { ChevronDownIcon } from '@heroicons/vue/24/outline'

const openFaq = ref<number | null>(null)

const faqs = [
  { q: '¿Puedo cambiar de plan en cualquier momento?', a: 'Sí. Puedes actualizar o bajar de plan cuando quieras. Los cambios se aplican al inicio del siguiente período de facturación.' },
  { q: '¿Qué pasa cuando llego al límite de mi plan?', a: 'Recibirás un aviso cuando estés cerca del límite. Puedes actualizar tu plan para seguir usando todas las funciones sin interrupciones.' },
  { q: '¿El plan gratuito tiene fecha de vencimiento?', a: 'No. El plan gratuito no vence y no requiere tarjeta de crédito. Puedes usarlo indefinidamente con las funciones incluidas.' },
  { q: '¿Cómo funciona la facturación anual?', a: 'Al elegir facturación anual obtienes un 20% de descuento sobre el precio mensual. Se cobra un único pago al inicio del año.' },
  { q: '¿Puedo cancelar en cualquier momento?', a: 'Sí, sin penalizaciones ni contratos de permanencia. Puedes cancelar desde la sección "Mi Plan" de tu cuenta.' },
]
</script>
